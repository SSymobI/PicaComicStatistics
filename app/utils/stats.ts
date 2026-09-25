import type { PicaComic, PicaComicDetail } from '../../types/domain';
import type { ComicLengthStats, DistributionPair, FavouriteStats, HotRelationStats, InteractionItem, InteractionStats, KeywordRelationStats, LifecycleStats, LikeRateItem, PopularityStats, StatsInput, StatsResult, TopComicItem, UpdateBucket, WordStatItem, WordStats, YearBucket } from '../../types/stats';
import { ClientConfig, ComicLengthThresholds, InteractionWeights, NormalizeConfig, StatThresholds, UpdateRecencyBuckets } from '~/constants/statistics';

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const n = (v: unknown) => finite(v) ? v : 0;
const text = (v: unknown) => typeof v === 'string' ? v : '';
const idOf = (c: PicaComic) => text(c._id);
const titleOf = (c: PicaComic) => text(c.title);
const authorOf = (c: PicaComic) => text(c.author);
const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Trim, convert full-width ASCII to half-width, collapse whitespace and lower-case for comparisons. */
export function normalizeName(value: unknown): string {
  return text(value).trim().replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/\u3000/g, ' ').replace(/\s+/g, ' ').replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim().toLocaleLowerCase();
}

export function splitAuthors(value: unknown): string[] {
  const raw = text(value).replace(/\band\b/gi, ',').split(/[,，/、&]/g).map(x => x.trim()).filter(Boolean);
  return raw.length ? raw : [];
}

function displayName(raw: string, normalized: string) { return raw.trim() || normalized; }

function wordStats(values: string[], limit: number, split = false): WordStats {
  const counts = new Map<string, { count: number; variants: Map<string, number> }>();
  let excludedZeroCount = 0;
  for (const source of values) {
    const parts = split ? splitAuthors(source) : [source];
    if (!parts.length) { excludedZeroCount++; continue; }
    for (const raw of parts) {
      const key = normalizeName(raw);
      if (!key || key === normalizeName(NormalizeConfig.UNKNOWN_AUTHOR)) { excludedZeroCount++; continue; }
      const display = displayName(raw, key); const item = counts.get(key);
      if (item) { item.count++; item.variants.set(display, (item.variants.get(display) || 0) + 1); }
      else {
        counts.set(key, { count: 1, variants: new Map([[display, 1]]) });
      }
    }
  }
  const total = [...counts.values()].reduce((s, x) => s + x.count, 0);
  const items = [...counts.values()].map(x => ({ name: [...x.variants].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans'))[0]![0], count: x.count, percent: total ? x.count / total : 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans'));
  const top = items.slice(0, StatThresholds.PIE_TOP_LIMIT);
  const rest = items.slice(StatThresholds.PIE_TOP_LIMIT);
  const restCount = rest.reduce((s, x) => s + x.count, 0);
  const topItems = rest.length >= StatThresholds.MIN_MERGE_REMAINING ? [...top, { name: StatThresholds.MERGE_OTHER_LABEL, count: restCount, percent: total ? restCount / total : 0 }] : [...top, ...rest];
  return { total, uniqueCount: items.length, items, topItems, cloudItems: items.slice(0, limit), excludedZeroCount };
}

export function computeFavouriteStats(comics: PicaComic[]): FavouriteStats {
  const list = Array.isArray(comics) ? comics : [];
  const authors = new Set<string>(); const categories = new Set<string>(); const tags = new Set<string>();
  let finishedCount = 0;
  for (const comic of list) {
    for (const a of splitAuthors(comic.author)) {
      const key = normalizeName(a); if (key && key !== normalizeName(NormalizeConfig.UNKNOWN_AUTHOR))
        authors.add(key);
    }
    for (const x of arr(comic.categories)) {
      const key = normalizeName(x); if (key)
        categories.add(key);
    }
    for (const x of arr(comic.tags)) {
      const key = normalizeName(x); if (key)
        tags.add(key);
    }
    if (comic.finished === true)
      finishedCount++;
  }
  const totalComics = list.length;
  return { totalComics, authorCount: authors.size, categoryCount: categories.size, tagCount: tags.size, finishedCount, unfinishedCount: totalComics - finishedCount, finishedRatio: totalComics ? finishedCount / totalComics : 0 };
}

export function computeWordStats(comics: PicaComic[], kind: 'category' | 'tag' | 'author'): WordStats {
  const values = (Array.isArray(comics) ? comics : []).flatMap(c => kind === 'author' ? [authorOf(c)] : (kind === 'category' ? arr(c.categories) : arr(c.tags)));
  return wordStats(values, StatThresholds.WORDCLOUD_TOP_LIMITS[kind], kind === 'author');
}

export function computeComicLengthStats(comics: PicaComic[]): ComicLengthStats {
  let validRecordCount = 0; let sumEps = 0; let sumPages = 0; let maxEps = 0; let maxPages = 0; let shortCount = 0; let midCount = 0; let longCount = 0; let missingLengthCount = 0;
  for (const comic of Array.isArray(comics) ? comics : []) {
    const pagesValid = finite(comic.pagesCount); const epsValid = finite(comic.epsCount);
    if (!pagesValid)
      missingLengthCount++;
    if (!pagesValid || !epsValid)
      continue;
    const pages = comic.pagesCount as number; const eps = comic.epsCount as number;
    validRecordCount++; sumPages += pages; sumEps += eps; maxPages = Math.max(maxPages, pages); maxEps = Math.max(maxEps, eps);
    if (pages < ComicLengthThresholds.SHORT_BELOW)
      shortCount++; else if (pages < ComicLengthThresholds.LONG_FROM)
      midCount++; else longCount++;
  }
  return { validRecordCount, avgEps: validRecordCount ? sumEps / validRecordCount : 0, avgPages: validRecordCount ? sumPages / validRecordCount : 0, maxEps, maxPages, shortCount, midCount, longCount, shortFormRatio: validRecordCount ? shortCount / validRecordCount : 0, longFormRatio: validRecordCount ? longCount / validRecordCount : 0, missingLengthCount };
}

function topItem(c: PicaComic): TopComicItem {
  return { comicId: idOf(c), title: titleOf(c), author: authorOf(c), totalViews: n(c.totalViews), totalLikes: n(c.totalLikes), categories: arr(c.categories), tags: arr(c.tags), thumb: c.thumb ?? null };
}
const titleSort = (a: TopComicItem, b: TopComicItem) => b.totalViews - a.totalViews || b.totalLikes - a.totalLikes || a.title.localeCompare(b.title, 'zh-Hans') || a.comicId.localeCompare(b.comicId);

export function computePopularityStats(comics: PicaComic[]): PopularityStats {
  const list = Array.isArray(comics) ? comics : [];
  const viewsTop = list.map(topItem).sort((a, b) => b.totalViews - a.totalViews || a.title.localeCompare(b.title, 'zh-Hans')).slice(0, StatThresholds.RANKING_TOP_LIMIT);
  const likesTop = list.map(topItem).sort((a, b) => b.totalLikes - a.totalLikes || a.title.localeCompare(b.title, 'zh-Hans')).slice(0, StatThresholds.RANKING_TOP_LIMIT);
  const valid: LikeRateItem[] = []; let excludedZeroViewsCount = 0;
  for (const comic of list) { const views = n(comic.totalViews); const likes = n(comic.totalLikes); if (views <= 0) { excludedZeroViewsCount++; continue; }; valid.push({ ...topItem(comic), likeRate: likes / views }); }
  const avgLikeRate = valid.length ? valid.reduce((s, x) => s + x.likeRate, 0) / valid.length : 0;
  const sortedViews = valid.map(x => x.totalViews).sort((a, b) => a - b); const median = sortedViews.length ? (sortedViews.length % 2 ? sortedViews[Math.floor(sortedViews.length / 2)]! : (sortedViews[sortedViews.length / 2 - 1]! + sortedViews[sortedViews.length / 2]!) / 2) : 0;
  const highLikeRateCount = valid.filter(x => x.likeRate > avgLikeRate && x.totalViews < median).length;
  const highHeatCount = valid.filter(x => x.totalViews > median && x.likeRate > avgLikeRate).length;
  return { viewsTop, likesTop, likeRateItems: valid.sort((a, b) => b.likeRate - a.likeRate || a.title.localeCompare(b.title, 'zh-Hans')), avgLikeRate, excludedZeroViewsCount, highLikeRateCount, highHeatCount };
}

function dateParts(date: Date, timezone: string) {
  try { const p = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); return { year: Number(p.find(x => x.type === 'year')?.value), month: Number(p.find(x => x.type === 'month')?.value), day: Number(p.find(x => x.type === 'day')?.value) }; }
  catch { return dateParts(date, ClientConfig.FALLBACK_TIMEZONE); }
}
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date))
    return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d;
}

function localDayOrdinal(date: Date, timezone: string): number {
  const parts = dateParts(date, timezone);
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000;
}

export function computeLifecycleStats(comics: PicaComic[], details: PicaComicDetail[] | Record<string, PicaComicDetail | undefined> = [], timezone: string = ClientConfig.FALLBACK_TIMEZONE, now: Date | string = new Date()): LifecycleStats {
  const map = Array.isArray(details) ? new Map(details.map(d => [idOf(d), d])) : new Map(Object.entries(details));
  const list = Array.isArray(comics) ? comics : []; const years = new Map<number, number>(); let validDateCount = 0; let missingDateCount = 0; let firstCreatedAt: string | null = null; let lastUpdatedAt: string | null = null;
  const updates: Date[] = [];
  for (const comic of list) {
    const detail = map.get(idOf(comic)); const created = parseDate(detail?.created_at); const updated = parseDate(detail?.updated_at);
    if (created) {
      validDateCount++; const year = dateParts(created, timezone).year; years.set(year, (years.get(year) || 0) + 1); if (!firstCreatedAt || created.getTime() < new Date(firstCreatedAt).getTime())
        firstCreatedAt = created.toISOString();
    }
    else {
      missingDateCount++;
    }
    if (updated) {
      updates.push(updated); if (!lastUpdatedAt || updated.getTime() > new Date(lastUpdatedAt).getTime())
        lastUpdatedAt = updated.toISOString();
    }
  }
  const yearDist: YearBucket[] = [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count, percent: validDateCount ? count / validDateCount : 0 }));
  const nowDate = parseDate(now) || new Date(); const nowDay = localDayOrdinal(nowDate, timezone); const counts = [0, 0, 0, 0];
  for (const updated of updates) {
    const age = Math.max(0, nowDay - localDayOrdinal(updated, timezone)); if (age < UpdateRecencyBuckets.RECENT_DAYS)
      counts[0]!++; else if (age <= UpdateRecencyBuckets.RECENT_DAYS_30)
      counts[1]!++; else if (age <= UpdateRecencyBuckets.STALE_OVER_YEAR)
      counts[2]!++; else counts[3]!++;
  }
  const labels = UpdateRecencyBuckets.LABELS; const keys = UpdateRecencyBuckets.KEYS as readonly UpdateBucket['key'][];
  const updateBuckets: UpdateBucket[] = validDateCount ? counts.map((count, i) => ({ key: keys[i]!, label: labels[i]!, count, percent: count / validDateCount })) : [];
  return { timezone, validDateCount, missingDateCount, createYearDist: yearDist, updateBuckets, firstCreatedAt, lastUpdatedAt };
}

function detailMap(details: PicaComicDetail[] | Record<string, PicaComicDetail | undefined> = []) { return Array.isArray(details) ? new Map(details.map(d => [idOf(d), d])) : new Map(Object.entries(details)); }
export function computeInteractionStats(comics: PicaComic[], details: PicaComicDetail[] | Record<string, PicaComicDetail | undefined> = [], deepAnalysis = false): InteractionStats {
  const map = detailMap(details); const source = Array.isArray(comics) ? comics : []; const items: InteractionItem[] = []; let totalComments = 0; let validCommentCount = 0;
  for (const comic of source) {
    const detail = map.get(idOf(comic)); const commentValue = detail?.totalComments ?? detail?.commentsCount;
    const hasComment = finite(commentValue); const comments = hasComment ? commentValue as number : 0;
    if (deepAnalysis && hasComment) { validCommentCount++; totalComments += comments; }
    const index = Math.log10(n(comic.totalViews) + 1) * InteractionWeights.VIEWS + Math.log10(n(comic.totalLikes) + 1) * InteractionWeights.LIKES + (deepAnalysis ? Math.log10(comments + 1) * InteractionWeights.COMMENTS : 0);
    items.push({ comicId: idOf(comic), title: titleOf(comic), author: authorOf(comic), totalViews: n(comic.totalViews), totalLikes: n(comic.totalLikes), totalComments: deepAnalysis ? comments : 0, interactionIndex: index, interactionIndexNormalized: 0, thumb: comic.thumb ?? null });
  }
  const maxIndex = items.reduce((m, x) => Math.max(m, x.interactionIndex), 0); for (const item of items) item.interactionIndexNormalized = maxIndex > 0 ? item.interactionIndex / maxIndex * 100 : 0;
  items.sort((a, b) => b.interactionIndex - a.interactionIndex || a.title.localeCompare(b.title, 'zh-Hans'));
  return { deepAnalysis, validCommentCount, commentsTop: deepAnalysis ? [...items].sort((a, b) => b.totalComments - a.totalComments || a.title.localeCompare(b.title, 'zh-Hans')).slice(0, StatThresholds.RANKING_TOP_LIMIT) : [], totalComments, avgComments: validCommentCount ? totalComments / validCommentCount : 0, interactionItems: items, shallowLabel: deepAnalysis ? null : '浅层互动指数' };
}

function distributionPair(user: PicaComic[], hot: PicaComic[], kind: 'category' | 'tag' | 'author'): DistributionPair {
  const userStats = computeWordStats(user, kind); const hotStats = computeWordStats(hot, kind); const userNames = new Map(userStats.items.map(x => [normalizeName(x.name), x])); const hotNames = new Map(hotStats.items.map(x => [normalizeName(x.name), x])); const overlapNames = [...userNames.keys()].filter(x => hotNames.has(x)).map(x => userNames.get(x)!.name).sort((a, b) => a.localeCompare(b, 'zh-Hans')); const overlap = new Set(overlapNames.map(normalizeName)); const userCount = userStats.items.filter(x => overlap.has(normalizeName(x.name))).reduce((s, x) => s + x.count, 0); const hotCount = hotStats.items.filter(x => overlap.has(normalizeName(x.name))).reduce((s, x) => s + x.count, 0);
  return { userDistribution: userStats.items, hotDistribution: hotStats.items, overlapNames, overlapCount: overlapNames.length, userOverlapPercent: userStats.total ? userCount / userStats.total : 0, hotOverlapPercent: hotStats.total ? hotCount / hotStats.total : 0 };
}

export function computeHotRelationStats(favourites: PicaComic[], leaderboard: PicaComic[] = [], timeRange: 'H24' | 'D7' | 'D30' = 'D7'): HotRelationStats {
  const fav = Array.isArray(favourites) ? favourites : []; const hot = Array.isArray(leaderboard) ? leaderboard : []; const hotIds = new Set(hot.map(idOf).filter(Boolean)); const hitComicIds = fav.map(idOf).filter(id => id && hotIds.has(id)); return { timeRange, hotTotal: hot.length, hitCount: hitComicIds.length, hitRate: fav.length ? hitComicIds.length / fav.length : 0, hitComicIds, category: distributionPair(fav, hot, 'category'), tag: distributionPair(fav, hot, 'tag'), author: distributionPair(fav, hot, 'author') };
}

export function computeKeywordRelationStats(comics: PicaComic[], keywords: Array<string | { keyword?: string; name?: string }> = []): KeywordRelationStats {
  const keys = (Array.isArray(keywords) ? keywords : []).map(k => typeof k === 'string' ? k : text(k.keyword ?? k.name)).filter(Boolean); const userValues = (Array.isArray(comics) ? comics : []).flatMap(c => [...arr(c.categories), ...arr(c.tags)]); const userStats = wordStats(userValues, Math.max(userValues.length, 1)); const userMap = new Map(userStats.items.map(x => [normalizeName(x.name), x])); const hitKeywordList: string[] = []; const matched = new Map<string, WordStatItem>();
  for (const keyword of keys) { const key = normalizeName(keyword); const item = userMap.get(key); if (item) { hitKeywordList.push(keyword); matched.set(key, item); } }
  return { totalKeywords: keys.length, hitKeywordCount: hitKeywordList.length, hitKeywordList, userRelatedTagCount: matched.size, interestMatchRatio: keys.length ? hitKeywordList.length / keys.length : 0, matchedItems: [...matched.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans')) };
}

export function computeStatsResult(input: StatsInput | PicaComic[], options: Omit<StatsInput, 'favourites'> = {}): StatsResult {
  const cfg: StatsInput = Array.isArray(input) ? { ...options, favourites: input } : input; const favourites = Array.isArray(cfg.favourites) ? cfg.favourites : []; const deepAnalysis = cfg.deepAnalysis === true; const generatedAt = cfg.generatedAt || new Date().toISOString(); const details = cfg.details || []; const words = { category: computeWordStats(favourites, 'category'), tag: computeWordStats(favourites, 'tag'), author: computeWordStats(favourites, 'author') };
  const result: StatsResult = { generatedAt, deepAnalysis, overview: computeFavouriteStats(favourites), words, length: computeComicLengthStats(favourites), popularity: computePopularityStats(favourites), interaction: computeInteractionStats(favourites, details, deepAnalysis), hotRelation: computeHotRelationStats(favourites, cfg.leaderboard || [], cfg.timeRange || 'D7'), keywordRelation: computeKeywordRelationStats(favourites, cfg.keywords || []) };
  if (deepAnalysis)
    result.lifecycle = computeLifecycleStats(favourites, details, cfg.timezone || ClientConfig.FALLBACK_TIMEZONE, cfg.now || new Date());
  return result;
}

export const calculateStats = computeStatsResult;
export const buildStatsResult = computeStatsResult;
export const calculateFavouriteStats = computeFavouriteStats;
export const calculateWordStats = computeWordStats;
export const calculateComicLengthStats = computeComicLengthStats;
export const calculatePopularityStats = computePopularityStats;
export const calculateLifecycleStats = computeLifecycleStats;
export const calculateInteractionStats = computeInteractionStats;
export const calculateHotRelationStats = computeHotRelationStats;
export const calculateKeywordRelationStats = computeKeywordRelationStats;
export const normalizeText = normalizeName;
