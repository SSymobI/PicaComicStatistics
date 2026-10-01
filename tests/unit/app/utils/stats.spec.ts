import { describe, expect, it } from 'vitest';
import {
  computeComicLengthStats,
  computeFavouriteStats,
  computeHotRelationStats,
  computeInteractionStats,
  computeKeywordRelationStats,
  computeLifecycleStats,
  computePopularityStats,
  computeStatsResult,
  computeWordStats,
  normalizeName,
  splitAuthors,
} from '@/utils/stats';

describe('stats pure functions', () => {
  it('normalizes full-width text and whitespace', () => {
    expect(normalizeName('  ＡＢＣ　  Tag  ')).toBe('abc tag');
  });

  it('splits author aliases, dedupes by normalized name and skips the unknown-author placeholder', () => {
    expect(splitAuthors('A and B/C、D')).toEqual(['A', 'B', 'C', 'D']);
    expect(splitAuthors('   ')).toEqual([]);

    const comics = [
      { _id: '1', author: 'Alice & Bob', categories: ['科幻'], tags: ['冒险'], finished: true },
      { _id: '2', author: 'alice，BOB', categories: [' 科幻 '], tags: [' 冒险 '], finished: false },
      { _id: '3', author: '未知作者', categories: [], tags: [], finished: false },
      { _id: '4', author: 'Alice', categories: [], tags: [] },
    ];
    const overview = computeFavouriteStats(comics);
    expect(overview).toMatchObject({ totalComics: 4, authorCount: 2, categoryCount: 1, tagCount: 1, finishedCount: 1, unfinishedCount: 3 });
    expect(overview.finishedRatio).toBeCloseTo(0.25);

    const authors = computeWordStats(comics, 'author');
    expect(authors.items.map(item => [item.name.toLowerCase(), item.count])).toEqual([['alice', 3], ['bob', 2]]);
    expect(authors.excludedZeroCount).toBe(1);
    // 同一作者的多种写法按出现次数取展示名（2:1 时无平局，结果稳定）
    expect(computeWordStats([{ _id: 'x', author: 'Alice' }, { _id: 'y', author: 'Alice' }, { _id: 'z', author: 'alice' }], 'author').items[0]!.name).toBe('Alice');
    expect(computeFavouriteStats([]).finishedRatio).toBe(0);
  });

  it('builds word stats with stable ordering and pie remainder', () => {
    const comics = Array.from({ length: 12 }, (_, i) => ({ categories: [`c${String(i).padStart(2, '0')}`], tags: [], author: '' }));
    const stats = computeWordStats(comics, 'category');
    expect(stats.items).toHaveLength(12);
    expect(stats.topItems.at(-1)).toMatchObject({ name: '其他', count: 2 });
    expect(stats.cloudItems).toHaveLength(12);
  });

  it('keeps a single remaining entry instead of merging it into 其他', () => {
    // 11 个分类 → TOP10 之外仅剩 1 项，规格要求不合并（MIN_MERGE_REMAINING = 2）
    const comics = Array.from({ length: 11 }, (_, i) => ({ categories: [`c${String(i).padStart(2, '0')}`], tags: [], author: '' }));
    const stats = computeWordStats(comics, 'category');
    expect(stats.topItems).toHaveLength(11);
    expect(stats.topItems.some(item => item.name === '其他')).toBe(false);
    expect(stats.topItems.at(-1)?.name).toBe('c10');
  });

  it('breaks equal counts by name ascending', () => {
    const comics = [{ categories: ['b'] }, { categories: ['a'] }, { categories: ['b'] }, { categories: ['a'] }];
    expect(computeWordStats(comics, 'category').items.map(item => item.name)).toEqual(['a', 'b']);
  });

  it('caps the word cloud independently of the pie remainder', () => {
    const comics = Array.from({ length: 40 }, (_, i) => ({ categories: [`c${String(i).padStart(2, '0')}`], tags: [], author: '' }));
    const stats = computeWordStats(comics, 'category');
    expect(stats.items).toHaveLength(40);
    expect(stats.cloudItems).toHaveLength(30); // WORDCLOUD_TOP_LIMITS.category
    expect(stats.topItems.at(-1)).toMatchObject({ name: '其他', count: 30 });
  });

  it('uses pages boundaries and valid-record denominator', () => {
    const stats = computeComicLengthStats([
      { pagesCount: 49, epsCount: 1 },
      { pagesCount: 50, epsCount: 2 },
      { pagesCount: 99, epsCount: 3 },
      { pagesCount: 100, epsCount: 4 },
      { pagesCount: undefined, epsCount: 5 },
    ]);
    expect(stats).toMatchObject({ validRecordCount: 4, shortCount: 1, midCount: 2, longCount: 1, missingLengthCount: 1, maxPages: 100 });
    expect(stats.shortFormRatio).toBe(0.25);
  });

  it('excludes non-positive views from like-rate statistics', () => {
    const stats = computePopularityStats([{ _id: 'a', totalViews: 0, totalLikes: 10 }, { _id: 'b', totalViews: 10, totalLikes: 0 }]);
    expect(stats.excludedZeroViewsCount).toBe(1);
    expect(stats.likeRateItems).toHaveLength(1);
    expect(stats.likeRateItems[0]!.likeRate).toBe(0);
    expect(stats.avgLikeRate).toBe(0);
  });

  it('supports shallow/deep interaction modes and log weights', () => {
    const comics = [{ _id: 'a', totalViews: 9, totalLikes: 9, title: 'A' }, { _id: 'b', totalViews: 1, totalLikes: 1, title: 'B' }];
    const shallow = computeInteractionStats(comics, [], false);
    expect(shallow.shallowLabel).toBe('浅层互动指数');
    expect(shallow.interactionItems[0]!.totalComments).toBe(0);
    expect(shallow.interactionItems[0]!.interactionIndex).toBeCloseTo(4 * Math.log10(10));
    const deep = computeInteractionStats(comics, [{ _id: 'a', totalComments: 99 }, { _id: 'b', totalComments: 0 }], true);
    expect(deep.totalComments).toBe(99);
    expect(deep.commentsTop[0]!.comicId).toBe('a');
    expect(deep.interactionItems[0]!.interactionIndexNormalized).toBe(100);
  });

  it('weights comments at 5 and sorts interaction items by the raw index', () => {
    const comics = [{ _id: 'a', title: 'A', totalViews: 0, totalLikes: 0 }, { _id: 'b', title: 'B', totalViews: 99, totalLikes: 0 }];
    const deep = computeInteractionStats(comics, [{ _id: 'a', totalComments: 99 }, { _id: 'b', totalComments: 0 }], true);
    const itemA = deep.interactionItems.find(item => item.comicId === 'a')!;

    // 评论权重为 5，且与 views/likes 一样先取 log10
    expect(itemA.interactionIndex).toBeCloseTo(5 * Math.log10(100));
    // 排序按原始分（未归一化）降序
    expect(deep.interactionItems.map(item => item.comicId)).toEqual(['a', 'b']);
    expect(deep.shallowLabel).toBeNull();
  });

  it('keeps empty category and tag arrays free of NaN', () => {
    const stats = computeStatsResult([{ _id: 'a', categories: [], tags: [], author: '' }]);
    expect(stats.words.category).toMatchObject({ total: 0, uniqueCount: 0, items: [], topItems: [] });
    expect(stats.words.tag.topItems).toEqual([]);
    expect(stats.words.author.excludedZeroCount).toBe(1);
    for (const value of [stats.words.tag.total, stats.popularity.avgLikeRate, stats.length.avgPages, stats.keywordRelation.interestMatchRatio])
      expect(Number.isNaN(value)).toBe(false);
  });

  it('buckets lifecycle years and update recency in the user timezone', () => {
    const comics = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
    const details = [
      // 上海时间 2024-01-01 04:00（UTC 仍是 2023-12-31）；更新于 now 当天
      { _id: 'a', created_at: '2023-12-31T20:00:00.000Z', updated_at: '2026-02-14T00:00:00.000Z' },
      // 更新距今 20 天，落在「最近30天」桶
      { _id: 'b', created_at: '2024-06-01T00:00:00.000Z', updated_at: '2026-01-25T00:00:00.000Z' },
    ];
    const stats = computeLifecycleStats(comics, details, 'Asia/Shanghai', new Date('2026-02-14T00:00:00.000Z'));

    expect(stats.timezone).toBe('Asia/Shanghai');
    expect(stats.createYearDist).toEqual([{ year: 2024, count: 2, percent: 1 }]);
    expect(stats.validDateCount).toBe(2);
    expect(stats.missingDateCount).toBe(1);
    expect(stats.updateBuckets.map(bucket => [bucket.key, bucket.count])).toEqual([['recent7', 1], ['recent30', 1], ['recent365', 0], ['stale', 0]]);
    expect(stats.firstCreatedAt).toBe('2023-12-31T20:00:00.000Z');
    expect(stats.lastUpdatedAt).toBe('2026-02-14T00:00:00.000Z');

    const empty = computeLifecycleStats([], [], 'Asia/Shanghai', new Date('2026-02-14T00:00:00.000Z'));
    expect(empty).toMatchObject({ validDateCount: 0, missingDateCount: 0, createYearDist: [], updateBuckets: [], firstCreatedAt: null, lastUpdatedAt: null });
  });

  it('computes hot-leaderboard hits by comic id with overlap distributions', () => {
    const favourites = [{ _id: 'a', categories: ['科幻'], tags: ['冒险'] }, { _id: 'b', categories: ['恋爱'], tags: [] }];
    const leaderboard = [{ _id: 'a', categories: ['科幻'], tags: ['冒险'] }, { _id: 'z', categories: ['科幻'], tags: [] }];
    const stats = computeHotRelationStats(favourites, leaderboard, 'D7');

    expect(stats).toMatchObject({ timeRange: 'D7', hotTotal: 2, hitCount: 1, hitComicIds: ['a'] });
    expect(stats.hitRate).toBeCloseTo(0.5);
    expect(stats.category.overlapNames).toEqual(['科幻']);
    expect(stats.category.overlapCount).toBe(1);
    expect(stats.tag.overlapNames).toEqual(['冒险']);
    expect(computeHotRelationStats([], []).hitRate).toBe(0);
  });

  it('aggregates every block and emits lifecycle only for deep analysis', () => {
    const comics = [{ _id: 'a', title: 'A', totalViews: 5, totalLikes: 1, categories: ['科幻'], tags: ['冒险'] }];
    const shallow = computeStatsResult(comics, { generatedAt: '2026-02-14T00:00:00.000Z' });

    expect(shallow.deepAnalysis).toBe(false);
    expect(shallow.lifecycle).toBeUndefined();
    expect(shallow.generatedAt).toBe('2026-02-14T00:00:00.000Z');
    expect(shallow.interaction.deepAnalysis).toBe(false);
    expect(computeStatsResult(comics).generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const deep = computeStatsResult(comics, {
      deepAnalysis: true,
      details: [{ _id: 'a', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2026-02-01T00:00:00.000Z' }],
      timezone: 'UTC',
      now: '2026-02-14T00:00:00.000Z',
    });
    expect(deep.deepAnalysis).toBe(true);
    expect(deep.lifecycle?.validDateCount).toBe(1);
    expect(deep.interaction.deepAnalysis).toBe(true);
  });

  it('matches keywords by normalized exact equality only', () => {
    const stats = computeKeywordRelationStats([{ categories: [' 科幻 '], tags: ['冒险'] }], ['科幻', '科', '冒险']);
    expect(stats.hitKeywordList).toEqual(['科幻', '冒险']);
    expect(stats.userRelatedTagCount).toBe(2);
    expect(stats.interestMatchRatio).toBeCloseTo(2 / 3);
  });
});
