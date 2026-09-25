import { describe, expect, it } from 'vitest';
import { computeComicLengthStats, computeInteractionStats, computeKeywordRelationStats, computePopularityStats, computeWordStats, normalizeName } from './stats';

describe('stats pure functions', () => {
  it('normalizes full-width text and whitespace', () => {
    expect(normalizeName('  ＡＢＣ　  Tag  ')).toBe('abc tag');
  });

  it('builds word stats with stable ordering and pie remainder', () => {
    const comics = Array.from({ length: 12 }, (_, i) => ({ categories: [`c${String(i).padStart(2, '0')}`], tags: [], author: '' }));
    const stats = computeWordStats(comics, 'category');
    expect(stats.items).toHaveLength(12);
    expect(stats.topItems.at(-1)).toMatchObject({ name: '其他', count: 2 });
    expect(stats.cloudItems).toHaveLength(12);
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

  it('matches keywords by normalized exact equality only', () => {
    const stats = computeKeywordRelationStats([{ categories: [' 科幻 '], tags: ['冒险'] }], ['科幻', '科', '冒险']);
    expect(stats.hitKeywordList).toEqual(['科幻', '冒险']);
    expect(stats.userRelatedTagCount).toBe(2);
    expect(stats.interestMatchRatio).toBeCloseTo(2 / 3);
  });
});
