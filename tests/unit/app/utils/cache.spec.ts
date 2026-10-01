import type { HotCacheValue } from '@types-project/cache';
import { beforeEach, describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import { CACHE_DB_NAME, CacheStore, DEFAULT_CACHE_TTL } from '@/utils/cache';

async function clearDb() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(CACHE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('cacheStore', () => {
  beforeEach(async () => { await clearDb(); });

  it('keeps private cache isolated by user and records metadata separately', async () => {
    const store = new CacheStore();
    await store.saveFavourites('user-a', { docs: [{ _id: 'a' }], total: 1 }, '2026-01-01T00:00:00.000Z');
    await store.saveFavourites('user-b', { docs: [{ _id: 'b' }], total: 1 }, '2026-01-01T00:00:00.000Z');
    expect((await store.getFavourites('user-a'))?.data.docs?.[0]?._id).toBe('a');
    expect(await store.getFavourites('missing')).toBeNull();
    expect((await store.getCacheRecord('user-a', 'favourites'))?.itemCount).toBe(1);
    await store.close();
  });

  it('marks stale data from cacheRecord TTL rather than payload fields', async () => {
    const store = new CacheStore({ ttl: { favouriteStats: 10 } });
    await store.saveFavourites('user-a', { docs: [], total: 0 }, new Date(Date.now() - 1000));
    expect((await store.getFavourites('user-a'))?.stale).toBe(true);
    await store.close();
  });

  it('uses independent detail metadata and global hot cache', async () => {
    const store = new CacheStore({ ttl: { comicDetail: 10, hotData: 60_000 } });
    await store.saveDetail('user-a', 'comic-a', { _id: 'comic-a', title: 'A' }, new Date(Date.now() - 1000));
    await store.saveDetail('user-a', 'comic-b', { _id: 'comic-b', title: 'B' }, new Date());
    expect((await store.getDetail('user-a', 'comic-a'))?.stale).toBe(true);
    expect((await store.getDetail('user-a', 'comic-b'))?.stale).toBe(false);
    await store.saveHot({ leaderboard: { docs: [], timeRange: 'D7', fetchedAt: '' } }, new Date());
    const hot = await store.getHot();
    // 热榜 / 热搜为全局共享公共数据（固定主键、无 userId），并按自己的 TTL 判定新鲜度
    expect(hot?.meta.cacheType).toBe('hot');
    expect(hot?.meta.fetchedAt).toBeTruthy();
    expect(hot?.stale).toBe(false);
    expect(hot?.data.leaderboard?.docs).toEqual([]);
    await store.close();
  });

  it('keeps the default TTLs aligned with the spec table', () => {
    expect(DEFAULT_CACHE_TTL).toEqual({
      favouriteStats: 24 * 60 * 60 * 1000,
      hotData: 6 * 60 * 60 * 1000,
      comicDetail: 7 * 24 * 60 * 60 * 1000,
      aiSummary: 24 * 60 * 60 * 1000,
    });
  });

  it('counts cached details per user and drops them on eviction', async () => {
    const store = new CacheStore();
    await store.markLogin('a', '2026-01-01T00:00:00.000Z');
    await store.markLogin('b', '2026-01-02T00:00:00.000Z');
    await store.markLogin('c', '2026-01-03T00:00:00.000Z');
    await store.saveDetail('a', 'comic-1', { _id: 'comic-1', title: '1' });
    await store.saveDetail('a', 'comic-2', { _id: 'comic-2', title: '2' });
    await store.saveDetail('b', 'comic-9', { _id: 'comic-9', title: '9' });

    expect(await store.countDetails('a')).toBe(2);
    expect(await store.countDetails('b')).toBe(1);
    expect(await store.countDetails('missing')).toBe(0);

    const removed = await store.enforceUserLimit(3, 'd');
    expect(removed).toEqual(['a']);
    expect(await store.countDetails('a')).toBe(0);
    await store.close();
  });

  it('evicts the oldest account when enforcing the local user limit', async () => {
    const store = new CacheStore();
    await store.markLogin('a', '2026-01-01T00:00:00.000Z');
    await store.markLogin('b', '2026-01-02T00:00:00.000Z');
    await store.markLogin('c', '2026-01-03T00:00:00.000Z');
    await store.saveFavourites('a', { docs: [] });
    const removed = await store.enforceUserLimit(3, 'd');
    expect(removed).toEqual(['a']);
    expect(await store.getFavourites('a')).toBeNull();
    await store.close();
  });

  it('writes Vue reactive payloads as structured-cloneable records', async () => {
    const store = new CacheStore();
    const payload = reactive({ docs: [{ _id: 'reactive-comic', categories: ['Action'] }], total: 1 });
    await store.saveFavourites('reactive-user', payload);
    expect((await store.getFavourites('reactive-user'))?.data.docs?.[0]?._id).toBe('reactive-comic');
    await store.close();
  });

  it('writes reactive hot payloads instead of failing the structured clone', async () => {
    const store = new CacheStore();
    // 热榜 / 热搜来自响应式 state：未解包时 IndexedDB 的结构化克隆会抛 DataCloneError，
    // 该异常会被报告页的 catch 吞掉并误报「数据请求异常，当前展示的是本地缓存」。
    const payload: Omit<HotCacheValue, 'key'> = { leaderboard: { docs: [{ _id: 'hot-comic' }], timeRange: 'D7', fetchedAt: '' }, keywords: { keywords: [{ keyword: '热搜词' }], fetchedAt: '' } };
    const result = await store.saveHot(reactive(payload), new Date());

    expect(result).toMatchObject({ ok: true, degraded: false });
    const hot = await store.getHot();
    expect(hot?.data.leaderboard?.docs?.[0]?._id).toBe('hot-comic');
    expect(hot?.data.keywords?.keywords?.[0]).toEqual({ keyword: '热搜词' });
    await store.close();
  });
});
