import type { AiSummary } from '~/types/ai';
import type { StatsResult } from '~/types/stats';
import { useRuntimeConfig } from '#imports';
import { createError, defineEventHandler, getHeader, readBody } from 'h3';
import OpenAI from 'openai';
import { AiDefaults, AiErrorCode, AiErrorMessages, AiLimits, AiPrompts } from '~/server/constants/ai';
import { ApiErrorCode, ApiErrorMessages, HttpStatus } from '~/server/constants/errors';
import { requireAuthorization, toApiError } from '~/server/utils/apiHelpers';
import { picaProfile, unwrapPicaData } from '~/server/utils/picComicAPI';
import { parseStatsResult } from '~/server/utils/statsSchema';

const dailyUsage = new Map<string, { day: string; count: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function profileUserId(value: unknown): string | undefined {
  if (!isRecord(value))
    return undefined;
  const direct = value.userId ?? value._id ?? value.id;
  if (typeof direct === 'string' && direct.trim())
    return direct;
  for (const key of ['user', 'data', 'profile', 'userInfo']) {
    const nested = profileUserId(value[key]);
    if (nested)
      return nested;
  }
  return undefined;
}

function formatItems(value: unknown): string {
  if (!Array.isArray(value))
    return AiDefaults.MISSING_DATA_PLACEHOLDER;
  const result = value.slice(0, 10).map((item) => {
    if (!isRecord(item))
      return '';
    const label = item.name ?? item.title ?? item.label ?? item.year ?? item.key ?? AiDefaults.MISSING_DATA_PLACEHOLDER;
    const metric = item.count ?? item.totalViews ?? item.totalLikes ?? item.percent ?? '';
    return `${String(label)}${metric === '' ? '' : `(${String(metric)})`}`;
  }).filter(Boolean).join('、');
  return result || AiDefaults.MISSING_DATA_PLACEHOLDER;
}

function fillPrompt(stats: StatsResult): string {
  const { overview, words, length, popularity, interaction, hotRelation, keywordRelation } = stats;
  const replacements: Record<string, string> = {
    totalComics: String(overview.totalComics),
    authorCount: String(overview.authorCount),
    categoryCount: String(overview.categoryCount),
    tagCount: String(overview.tagCount),
    finishedCount: String(overview.finishedCount),
    unfinishedCount: String(overview.unfinishedCount),
    categoryWordCloud: formatItems(words.category.cloudItems),
    tagWordCloud: formatItems(words.tag.cloudItems),
    authorWordCloud: formatItems(words.author.cloudItems),
    viewsTop10: formatItems(popularity.viewsTop),
    likesTop10: formatItems(popularity.likesTop),
    highLikeRateSummary: `小众高质量 ${popularity.highLikeRateCount} 本，高热度 ${popularity.highHeatCount} 本`,
    avgEps: String(length.avgEps),
    avgPages: String(length.avgPages),
    maxEps: String(length.maxEps),
    maxPages: String(length.maxPages),
    longFormRatio: String(length.longFormRatio),
    shortFormRatio: String(length.shortFormRatio),
    createYearDist: stats.lifecycle ? formatItems(stats.lifecycle.createYearDist) : AiDefaults.NO_DEEP_ANALYSIS_NOTE,
    updateStatus: stats.lifecycle ? formatItems(stats.lifecycle.updateBuckets) : AiDefaults.NO_DEEP_ANALYSIS_NOTE,
    commentsTop10: interaction.deepAnalysis ? formatItems(interaction.commentsTop) : AiDefaults.NO_DEEP_ANALYSIS_NOTE,
    avgComments: interaction.deepAnalysis ? String(interaction.avgComments) : AiDefaults.NO_DEEP_ANALYSIS_NOTE,
    interactionIndex: interaction.deepAnalysis ? `互动指数条目 ${interaction.interactionItems.length}` : AiDefaults.NO_DEEP_ANALYSIS_NOTE,
    hotHitCount: String(hotRelation.hitCount),
    categoryHotOverlap: String(hotRelation.category.userOverlapPercent),
    tagHotOverlap: String(hotRelation.tag.userOverlapPercent),
    authorHotOverlap: String(hotRelation.author.userOverlapPercent),
    keywordMatch: `${keywordRelation.hitKeywordList.join('、') || AiDefaults.MISSING_DATA_PLACEHOLDER}，匹配比例 ${keywordRelation.interestMatchRatio}`,
  };
  return AiPrompts.userTemplate.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => replacements[key] ?? AiDefaults.MISSING_DATA_PLACEHOLDER);
}

function localDay(timezone: string | undefined): string {
  const resolved = timezone?.trim() || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: resolved, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year ?? '0000'}-${values.month ?? '00'}-${values.day ?? '00'}`;
  }
  catch {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year ?? '0000'}-${values.month ?? '00'}-${values.day ?? '00'}`;
  }
}

function parseOutput(content: string, statsGeneratedAt: string): Omit<AiSummary, 'userId'> {
  let paragraphs = content.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);
  if (paragraphs.length === 1) {
    const lines = paragraphs[0]?.split(/\r?\n/).map(item => item.trim()).filter(Boolean) ?? [];
    if (lines.length >= AiDefaults.PARAGRAPH_COUNT)
      paragraphs = [lines[0] ?? '', lines.slice(1).join('\n')];
  }
  if (paragraphs.length < AiDefaults.PARAGRAPH_COUNT)
    throw createError({ statusCode: HttpStatus.BAD_GATEWAY, statusMessage: AiErrorMessages.AI_GENERATION_FAILED, data: { code: AiErrorCode.AI_GENERATION_FAILED } });
  return { generatedAt: new Date().toISOString(), statsGeneratedAt, persona: paragraphs[0] ?? '', analysis: paragraphs.slice(1).join('\n\n') };
}

function aiProviderError(error: unknown): { statusCode: number; statusMessage: string; code: string } {
  if (!(error instanceof OpenAI.APIError))
    return { statusCode: HttpStatus.BAD_GATEWAY, statusMessage: AiErrorMessages.AI_GENERATION_FAILED, code: AiErrorCode.AI_GENERATION_FAILED };
  if (error.status === HttpStatus.UNAUTHORIZED || error.status === HttpStatus.FORBIDDEN)
    return { statusCode: HttpStatus.BAD_GATEWAY, statusMessage: AiErrorMessages.AI_PROVIDER_AUTH_FAILED, code: AiErrorCode.AI_PROVIDER_AUTH_FAILED };
  if (error.status === HttpStatus.NOT_FOUND)
    return { statusCode: HttpStatus.BAD_GATEWAY, statusMessage: AiErrorMessages.AI_PROVIDER_NOT_FOUND, code: AiErrorCode.AI_PROVIDER_NOT_FOUND };
  if (error.status === HttpStatus.TOO_MANY_REQUESTS)
    return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, statusMessage: AiErrorMessages.AI_PROVIDER_RATE_LIMITED, code: AiErrorCode.AI_PROVIDER_RATE_LIMITED };
  if (error.status === HttpStatus.BAD_REQUEST)
    return { statusCode: HttpStatus.BAD_GATEWAY, statusMessage: AiErrorMessages.AI_PROVIDER_BAD_REQUEST, code: AiErrorCode.AI_PROVIDER_BAD_REQUEST };
  if (error.status && error.status >= HttpStatus.INTERNAL_SERVER_ERROR)
    return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, statusMessage: AiErrorMessages.AI_PROVIDER_UNAVAILABLE, code: AiErrorCode.AI_PROVIDER_UNAVAILABLE };
  return { statusCode: HttpStatus.BAD_GATEWAY, statusMessage: AiErrorMessages.AI_GENERATION_FAILED, code: AiErrorCode.AI_GENERATION_FAILED };
}

export default defineEventHandler(async (event) => {
  let token: string;
  try {
    token = requireAuthorization(event);
  }
  catch (error) {
    throw toApiError(error);
  }
  let stats: StatsResult;
  try {
    stats = parseStatsResult(await readBody<unknown>(event));
  }
  catch {
    throw createError({ statusCode: HttpStatus.BAD_REQUEST, statusMessage: AiErrorMessages.INVALID_STATS, data: { code: AiErrorCode.INVALID_STATS } });
  }
  const config = useRuntimeConfig(event);
  if (!config.aiApiKey || !config.aiBaseUrl || !config.aiModel)
    throw createError({ statusCode: HttpStatus.UNPROCESSABLE_ENTITY, statusMessage: AiErrorMessages.AI_NOT_CONFIGURED, data: { code: AiErrorCode.AI_NOT_CONFIGURED } });
  let userId: string;
  try {
    userId = profileUserId(unwrapPicaData(await picaProfile(event, token))) || '';
    if (!userId)
      throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: ApiErrorMessages.PICA_PROFILE_MISSING_USER_ID, data: { code: ApiErrorCode.UNAUTHORIZED } });
  }
  catch (error) {
    throw toApiError(error);
  }
  const day = localDay(getHeader(event, 'x-timezone'));
  const usage = dailyUsage.get(userId);
  if (usage?.day === day && usage.count >= AiLimits.DAILY_LIMIT)
    throw createError({ statusCode: HttpStatus.TOO_MANY_REQUESTS, statusMessage: AiErrorMessages.AI_DAILY_LIMIT_EXCEEDED, data: { code: AiErrorCode.AI_DAILY_LIMIT_EXCEEDED } });
  const temperature = Math.min(AiLimits.TEMPERATURE_MAX, Math.max(AiLimits.TEMPERATURE_MIN, Number(config.aiTemperature) || 0.8));
  const maxTokens = Math.min(AiLimits.MAX_TOKENS_MAX, Math.max(AiLimits.MAX_TOKENS_MIN, Number(config.aiMaxTokens) || 1000));
  try {
    const client = new OpenAI({ apiKey: config.aiApiKey, baseURL: config.aiBaseUrl, timeout: Number(config.aiTimeoutMs) || 30000, maxRetries: 0 });
    const response = await client.chat.completions.create({ model: config.aiModel, temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: AiPrompts.system }, { role: 'user', content: fillPrompt(stats) }] });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content)
      throw createError({ statusCode: HttpStatus.BAD_GATEWAY, statusMessage: AiErrorMessages.AI_EMPTY_RESPONSE, data: { code: AiErrorCode.AI_EMPTY_RESPONSE } });
    const result = { userId, ...parseOutput(content, stats.generatedAt) };
    dailyUsage.set(userId, usage?.day === day ? { day, count: usage.count + 1 } : { day, count: 1 });
    return result;
  }
  catch (error) {
    if (isRecord(error) && 'statusCode' in error)
      throw error;
    const diagnostic = aiProviderError(error);
    if (error instanceof OpenAI.APIError) {
      console.error('[ai-summary] Provider request failed', {
        status: error.status,
        code: error.code,
        type: error.type,
        requestId: error.requestID,
      });
    }
    else {
      console.error('[ai-summary] Generation failed', error instanceof Error ? error.name : 'Unknown error');
    }
    throw createError({ statusCode: diagnostic.statusCode, statusMessage: diagnostic.statusMessage, data: { code: diagnostic.code } });
  }
});
