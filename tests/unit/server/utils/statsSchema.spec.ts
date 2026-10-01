import { describe, expect, it } from 'vitest';
import { computeStatsResult } from '@/utils/stats';
import { parseStatsResult } from '~/server/utils/statsSchema';

/** 用真实统计输出作为合法载荷，避免手写大而全的 fixture。 */
function validPayload() {
  return computeStatsResult(
    [{ _id: 'a', title: 'A', author: 'Alice', totalViews: 10, totalLikes: 2, categories: ['科幻'], tags: ['冒险'], pagesCount: 120, epsCount: 3, finished: true }],
    { generatedAt: '2026-02-14T00:00:00.000Z', keywords: ['科幻'], leaderboard: [{ _id: 'a', categories: ['科幻'], tags: [] }] },
  );
}

describe('parseStatsResult', () => {
  it('剥离未声明字段（含嵌套凭证），只保留声明的结构', () => {
    const source = validPayload();
    const parsed = parseStatsResult({
      ...source,
      apiKey: 'secret',
      nested: { token: 'x' },
      overview: { ...source.overview, token: 'x' },
    });

    expect(parsed).not.toBe(source);
    expect(parsed).not.toHaveProperty('apiKey');
    expect(parsed).not.toHaveProperty('nested');
    expect(parsed.overview).not.toHaveProperty('token');
    expect(parsed.generatedAt).toBe('2026-02-14T00:00:00.000Z');
    // 顶层只允许声明的字段（lifecycle 为可选，浅层统计不产出）
    expect(Object.keys(parsed).sort()).toEqual(['deepAnalysis', 'generatedAt', 'hotRelation', 'interaction', 'keywordRelation', 'length', 'overview', 'popularity', 'words']);
  });

  it('拒绝类型不符或缺失必填字段的载荷', () => {
    const source = validPayload();
    expect(() => parseStatsResult({ ...source, overview: { ...source.overview, totalComics: '2' } })).toThrow();
    expect(() => parseStatsResult({ ...source, keywordRelation: { ...source.keywordRelation, hitKeywordList: [1] } })).toThrow();
    expect(() => parseStatsResult({})).toThrow();
  });
});
