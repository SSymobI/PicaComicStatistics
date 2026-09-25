import type { StatsFieldSchema as Schema } from '../../types/ai-schema';
import type { StatsResult } from '../../types/stats';

const stringArray: Schema = { array: 'string' };
const thumb: Schema = { nullable: { fields: { originalName: 'string', path: 'string', fileServer: 'string', fileUrl: 'string' }, optional: ['originalName', 'path', 'fileServer', 'fileUrl'] } };
const wordItem: Schema = { fields: { name: 'string', count: 'number', percent: 'number' } };
const wordItems: Schema = { array: wordItem };
const wordStats: Schema = { fields: { total: 'number', uniqueCount: 'number', items: wordItems, topItems: wordItems, cloudItems: wordItems, excludedZeroCount: 'number' }, optional: ['excludedZeroCount'] };
const topComic: Schema = { fields: { comicId: 'string', title: 'string', author: 'string', totalViews: 'number', totalLikes: 'number', categories: stringArray, tags: stringArray, thumb } };
const likeRateItem: Schema = { fields: { ...(topComic as { fields: Record<string, Schema> }).fields, likeRate: 'number' } };
const interactionItem: Schema = { fields: { comicId: 'string', title: 'string', author: 'string', totalViews: 'number', totalLikes: 'number', totalComments: 'number', interactionIndex: 'number', interactionIndexNormalized: 'number', thumb } };
const distribution: Schema = { fields: { userDistribution: wordItems, hotDistribution: wordItems, overlapNames: stringArray, overlapCount: 'number', userOverlapPercent: 'number', hotOverlapPercent: 'number' } };

const statsSchema: Schema = {
  fields: {
    generatedAt: 'string',
    deepAnalysis: 'boolean',
    overview: { fields: { totalComics: 'number', authorCount: 'number', categoryCount: 'number', tagCount: 'number', finishedCount: 'number', unfinishedCount: 'number', finishedRatio: 'number' } },
    words: { fields: { category: wordStats, tag: wordStats, author: wordStats } },
    length: { fields: { validRecordCount: 'number', avgEps: 'number', avgPages: 'number', maxEps: 'number', maxPages: 'number', shortCount: 'number', midCount: 'number', longCount: 'number', shortFormRatio: 'number', longFormRatio: 'number', missingLengthCount: 'number' } },
    popularity: { fields: { viewsTop: { array: topComic }, likesTop: { array: topComic }, likeRateItems: { array: likeRateItem }, avgLikeRate: 'number', excludedZeroViewsCount: 'number', highLikeRateCount: 'number', highHeatCount: 'number' } },
    lifecycle: { fields: { timezone: 'string', validDateCount: 'number', missingDateCount: 'number', createYearDist: { array: { fields: { year: 'number', count: 'number', percent: 'number' } } }, updateBuckets: { array: { fields: { key: 'string', label: 'string', count: 'number', percent: 'number' } } }, firstCreatedAt: { nullable: 'string' }, lastUpdatedAt: { nullable: 'string' } } },
    interaction: { fields: { deepAnalysis: 'boolean', validCommentCount: 'number', commentsTop: { array: interactionItem }, totalComments: 'number', avgComments: 'number', interactionItems: { array: interactionItem }, shallowLabel: { nullable: 'string' } } },
    hotRelation: { fields: { timeRange: 'string', hotTotal: 'number', hitCount: 'number', hitRate: 'number', hitComicIds: stringArray, category: distribution, tag: distribution, author: distribution } },
    keywordRelation: { fields: { totalKeywords: 'number', hitKeywordCount: 'number', hitKeywordList: stringArray, userRelatedTagCount: 'number', interestMatchRatio: 'number', matchedItems: wordItems } },
  },
  optional: ['lifecycle'],
};

function parseValue(value: unknown, schema: Schema): unknown {
  if (typeof schema === 'string') {
    const valid = schema === 'number'
      ? typeof value === 'number' && Number.isFinite(value)
      : schema === 'string' ? typeof value === 'string' : typeof value === 'boolean';
    if (!valid)
      throw new Error('Invalid StatsResult field');
    return value;
  }
  if ('nullable' in schema)
    return value === null ? null : parseValue(value, schema.nullable);
  if ('array' in schema) {
    if (!Array.isArray(value))
      throw new Error('Invalid StatsResult array');
    return value.map(item => parseValue(item, schema.array));
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid StatsResult object');
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.fields)) {
    if (record[key] === undefined && schema.optional?.includes(key))
      continue;
    result[key] = parseValue(record[key], field);
  }
  return result;
}

// Parse into a new object so undeclared fields (including nested credentials)
// cannot reach any prompt interpolation or model-provider request.
export function parseStatsResult(value: unknown): StatsResult {
  return parseValue(value, statsSchema) as StatsResult;
}
