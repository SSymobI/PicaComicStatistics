import { beforeEach, describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import { CACHE_DB_NAME, CacheStore } from './cache';

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
    const store = new CacheStore({ ttl: { comicDetail: 10, hotData: 10 } });
    await store.saveDetail('user-a', 'comic-a', { _id: 'comic-a', title: 'A' }, new Date(Date.now() - 1000));
    await store.saveDetail('user-a', 'comic-b', { _id: 'comic-b', title: 'B' }, new Date());
    expect((await store.getDetail('user-a', 'comic-a'))?.stale).toBe(true);
    expect((await store.getDetail('user-a', 'comic-b'))?.stale).toBe(false);
    await store.saveHot({ leaderboard: { docs: [], timeRange: 'D7', fetchedAt: '' } }, new Date());
    expect((await store.getHot())?.data.key).toBe('hot');
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
});
