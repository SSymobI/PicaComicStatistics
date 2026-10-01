import type { AiSummary } from '@types-project/ai';
import type { CacheRead, CacheRecord, CacheRecordType, CacheTtlOptions, CacheType, CacheWriteResult, DetailCacheValue, FavouriteCacheValue, HotCacheValue, StatsCacheValue } from '@types-project/cache';
import type { Favourite, PicaComicDetail } from '@types-project/domain';
import type { StatsResult } from '@types-project/stats';
import { toRaw } from 'vue';
import { StorageKeys } from '@/constants/routes';
import { ClientConfig } from '@/constants/statistics';

export const CACHE_DB_NAME = StorageKeys.IDB_NAME;
export const CACHE_DB_VERSION = StorageKeys.IDB_VERSION;
export const GLOBAL_CACHE_USER_ID = '__global__';
export const CACHE_STORES = ['favourites', 'details', 'stats', 'aiSummary', 'cacheRecord', 'hot'] as const;
export const DEFAULT_CACHE_TTL: Required<CacheTtlOptions> = {
  favouriteStats: 24 * 60 * 60 * 1000,
  hotData: 6 * 60 * 60 * 1000,
  comicDetail: 7 * 24 * 60 * 60 * 1000,
  aiSummary: 24 * 60 * 60 * 1000,
};

type StoreName = typeof CACHE_STORES[number];
type DbLike = IDBDatabase;

function assertUserId(userId: string) {
  if (typeof userId !== 'string' || !userId.trim())
    throw new TypeError('userId is required for private cache access');
  return userId;
}
const asIso = (value?: string | Date) => value instanceof Date ? value.toISOString() : value || new Date().toISOString();
function parseTime(value: string) { const time = Date.parse(value); return Number.isFinite(time) ? time : 0; }
const isQuotaError = (error: unknown) => error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22) || (error as { name?: string })?.name === 'QuotaExceededError';
const detailRecordType = (comicId: string): CacheRecordType => `details:${comicId}`;

function toCloneable<T>(value: T): T {
  if (Array.isArray(value))
    return value.map(item => toCloneable(toRaw(item))) as T;
  if (value && typeof value === 'object') {
    const source = toRaw(value) as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source))
      result[key] = toCloneable(item);
    return result as T;
  }
  return value;
}

function request<T>(req: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error || new Error('IndexedDB request failed')); }); }
function transaction(tx: IDBTransaction): Promise<void> { return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed')); tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted')); }); }

export function openCacheDb(): Promise<DbLike> {
  if (typeof indexedDB === 'undefined')
    return Promise.reject(new Error('IndexedDB is unavailable'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('favourites'))
        db.createObjectStore('favourites', { keyPath: 'userId' });
      if (!db.objectStoreNames.contains('details'))
        db.createObjectStore('details', { keyPath: ['userId', 'comicId'] });
      if (!db.objectStoreNames.contains('stats'))
        db.createObjectStore('stats', { keyPath: 'userId' });
      if (!db.objectStoreNames.contains('aiSummary'))
        db.createObjectStore('aiSummary', { keyPath: 'userId' });
      if (!db.objectStoreNames.contains('cacheRecord'))
        db.createObjectStore('cacheRecord', { keyPath: ['userId', 'cacheType'] });
      if (!db.objectStoreNames.contains('hot'))
        db.createObjectStore('hot', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Unable to open IndexedDB'));
  });
}

export class CacheStore {
  private dbPromise: Promise<DbLike> | null;
  private ttl: Required<CacheTtlOptions>;
  constructor(options: { db?: DbLike; ttl?: CacheTtlOptions } = {}) {
    this.dbPromise = options.db ? Promise.resolve(options.db) : null;
    this.ttl = { ...DEFAULT_CACHE_TTL, ...options.ttl };
  }

  private getDb(): Promise<DbLike> {
    if (!this.dbPromise)
      this.dbPromise = openCacheDb();
    return this.dbPromise;
  }

  async close() { if (this.dbPromise) { const db = await this.getDb(); db.close(); this.dbPromise = null; } }

  private async write<T extends { userId: string }>(store: StoreName, value: T, meta: CacheRecord): Promise<CacheWriteResult> {
    try {
      const db = await this.getDb();
      const tx = db.transaction([store, 'cacheRecord'], 'readwrite');
      const done = transaction(tx);
      tx.objectStore(store).put(value);
      tx.objectStore('cacheRecord').put(meta);
      await done;
      return { ok: true, degraded: false };
    }
    catch (error) {
      if (isQuotaError(error))
        return { ok: false, degraded: true, error };
      throw error;
    }
  }

  private async read<T>(store: StoreName, key: IDBValidKey | IDBKeyRange, userId: string, cacheType: CacheType, ttl: number, comicId?: string): Promise<CacheRead<T> | null> {
    assertUserId(userId);
    const db = await this.getDb();
    const tx = db.transaction([store, 'cacheRecord'], 'readonly');
    const valueRequest = tx.objectStore(store).get(key);
    const metaRequest = tx.objectStore('cacheRecord').get([userId, comicId ? detailRecordType(comicId) : cacheType]);
    const value = await request(valueRequest) as T | undefined;
    const meta = await request(metaRequest) as CacheRecord | undefined;
    if (!value || !meta)
      return null;
    const stale = !parseTime(meta.fetchedAt) || Date.now() - parseTime(meta.fetchedAt) >= ttl;
    return { data: value, meta, stale };
  }

  async saveFavourites(userId: string, value: Omit<FavouriteCacheValue, 'userId'> | Favourite, fetchedAt?: string | Date): Promise<CacheWriteResult> {
    assertUserId(userId); const plain = toCloneable(value); const record: FavouriteCacheValue = { ...(plain as Omit<FavouriteCacheValue, 'userId'>), userId }; return this.write('favourites', record, { userId, cacheType: 'favourites', fetchedAt: asIso(fetchedAt), itemCount: record.docs?.length || 0 });
  }

  getFavourites(userId: string): Promise<CacheRead<FavouriteCacheValue> | null> { return this.read('favourites', userId, userId, 'favourites', this.ttl.favouriteStats); }

  async saveDetail(userId: string, comicId: string, detail: PicaComicDetail, fetchedAt?: string | Date): Promise<CacheWriteResult> {
    assertUserId(userId); if (!comicId.trim())
      throw new TypeError('comicId is required for detail cache access'); const value: DetailCacheValue = { userId, comicId, detail: toCloneable(detail) }; return this.write('details', value, { userId, cacheType: detailRecordType(comicId), comicId, fetchedAt: asIso(fetchedAt), itemCount: 1 });
  }

  getDetail(userId: string, comicId: string): Promise<CacheRead<DetailCacheValue> | null> { assertUserId(userId); return this.read('details', [userId, comicId], userId, 'details', this.ttl.comicDetail, comicId); }

  async saveStats(userId: string, result: StatsResult, generatedAt = result.generatedAt): Promise<CacheWriteResult> {
    assertUserId(userId); const value: StatsCacheValue = { userId, result: toCloneable(result) }; return this.write('stats', value, { userId, cacheType: 'stats', fetchedAt: asIso(generatedAt) });
  }

  getStats(userId: string): Promise<CacheRead<StatsCacheValue> | null> { return this.read('stats', userId, userId, 'stats', this.ttl.favouriteStats); }

  async saveAiSummary(userId: string, summary: Omit<AiSummary, 'userId'> | AiSummary, generatedAt = summary.generatedAt): Promise<CacheWriteResult> {
    assertUserId(userId); const value = { ...toCloneable(summary as Omit<AiSummary, 'userId'>), userId } as AiSummary; return this.write('aiSummary', value, { userId, cacheType: 'aiSummary', fetchedAt: asIso(generatedAt) });
  }

  getAiSummary(userId: string): Promise<CacheRead<AiSummary> | null> { return this.read('aiSummary', userId, userId, 'aiSummary', this.ttl.aiSummary); }

  async saveHot(value: Omit<HotCacheValue, 'key'>, fetchedAt?: string | Date): Promise<CacheWriteResult> {
    // 热榜 / 热搜来自响应式 state，必须先解包再写入，否则结构化克隆会抛 DataCloneError
    const record: HotCacheValue = { ...toCloneable(value), key: 'hot' }; try { const db = await this.getDb(); const tx = db.transaction(['hot', 'cacheRecord'], 'readwrite'); const done = transaction(tx); tx.objectStore('hot').put(record); tx.objectStore('cacheRecord').put({ userId: GLOBAL_CACHE_USER_ID, cacheType: 'hot', fetchedAt: asIso(fetchedAt) } satisfies CacheRecord); await done; return { ok: true, degraded: false }; }
    catch (error) {
      if (isQuotaError(error))
        return { ok: false, degraded: true, error }; throw error;
    }
  }

  async getHot(): Promise<CacheRead<HotCacheValue> | null> {
    const db = await this.getDb(); const tx = db.transaction(['hot', 'cacheRecord'], 'readonly'); const dataRequest = tx.objectStore('hot').get('hot'); const metaRequest = tx.objectStore('cacheRecord').get([GLOBAL_CACHE_USER_ID, 'hot']); const data = await request(dataRequest) as HotCacheValue | undefined; const meta = await request(metaRequest) as CacheRecord | undefined; if (!data || !meta)
      return null; return { data, meta, stale: Date.now() - parseTime(meta.fetchedAt) >= this.ttl.hotData };
  }

  async getCacheRecord(userId: string, cacheType: CacheType, comicId?: string): Promise<CacheRecord | null> { const db = await this.getDb(); const tx = db.transaction('cacheRecord', 'readonly'); const key = comicId ? detailRecordType(comicId) : cacheType; return (await request(tx.objectStore('cacheRecord').get([userId, key])) as CacheRecord | undefined) || null; }

  async markLogin(userId: string, at?: string | Date): Promise<CacheWriteResult> {
    assertUserId(userId); const now = asIso(at); try { const db = await this.getDb(); const tx = db.transaction('cacheRecord', 'readwrite'); const done = transaction(tx); tx.objectStore('cacheRecord').put({ userId, cacheType: 'account', fetchedAt: now, lastLoginAt: now } satisfies CacheRecord); await done; return { ok: true, degraded: false }; }
    catch (error) {
      if (isQuotaError(error))
        return { ok: false, degraded: true, error }; throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    assertUserId(userId); const db = await this.getDb(); const tx = db.transaction(['favourites', 'details', 'stats', 'aiSummary', 'cacheRecord'], 'readwrite'); tx.objectStore('favourites').delete(userId); tx.objectStore('stats').delete(userId); tx.objectStore('aiSummary').delete(userId); tx.objectStore('cacheRecord').delete([userId, 'account']); for (const store of ['details', 'cacheRecord'] as const) {
      const objectStore = tx.objectStore(store); const cursorReq = objectStore.openCursor(); cursorReq.onsuccess = () => {
        const cursor = cursorReq.result; if (!cursor)
          return; const key = cursor.primaryKey as IDBValidKey[]; if (Array.isArray(key) && key[0] === userId)
          cursor.delete(); cursor.continue();
      };
    } await transaction(tx);
  }

  async listAccountIds(): Promise<string[]> { const db = await this.getDb(); const tx = db.transaction('cacheRecord', 'readonly'); const records = await request(tx.objectStore('cacheRecord').getAll()) as CacheRecord[]; return records.filter(x => x.cacheType === 'account' && x.userId !== GLOBAL_CACHE_USER_ID).map(x => x.userId); }

  /** 统计该 userId 已缓存的详情条数：用于恢复缓存后还原「已完成本数 / 总数」。 */
  async countDetails(userId: string): Promise<number> {
    assertUserId(userId);
    const db = await this.getDb();
    const tx = db.transaction('details', 'readonly');
    const cursorRequest = tx.objectStore('details').openCursor();
    return await new Promise<number>((resolve, reject) => {
      let count = 0;
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve(count);
          return;
        }
        const key = cursor.primaryKey as IDBValidKey[];
        if (Array.isArray(key) && key[0] === userId)
          count += 1;
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error || new Error('IndexedDB cursor failed'));
    });
  }

  async enforceUserLimit(limit: number = ClientConfig.MAX_LOCAL_USER_PROFILES, currentUserId?: string): Promise<string[]> {
    if (limit < 1)
      return []; const db = await this.getDb(); const tx = db.transaction('cacheRecord', 'readonly'); const records = (await request(tx.objectStore('cacheRecord').getAll()) as CacheRecord[]).filter(x => x.cacheType === 'account' && x.userId !== GLOBAL_CACHE_USER_ID); records.sort((a, b) => parseTime(a.lastLoginAt || a.fetchedAt) - parseTime(b.lastLoginAt || b.fetchedAt)); const ids = [...new Set(records.map(x => x.userId))]; const keep = new Set(ids); if (currentUserId)
      keep.add(currentUserId); const removed: string[] = []; while (keep.size > limit) {
      const victim = records.find(x => keep.has(x.userId) && x.userId !== currentUserId); if (!victim)
        break; keep.delete(victim.userId); removed.push(victim.userId); await this.deleteUser(victim.userId);
    } return removed;
  }
}

export const cacheStore = new CacheStore();
export const createCacheStore = (options?: ConstructorParameters<typeof CacheStore>[0]) => new CacheStore(options);
