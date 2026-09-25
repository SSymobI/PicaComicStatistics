import type { AiSummary } from './ai';
import type { Favourite, Keyword, Leaderboard, PicaComicDetail } from './domain';
import type { StatsResult } from './stats';

export type CacheType = 'favourites' | 'details' | 'stats' | 'aiSummary' | 'hot' | 'account';
export type CacheRecordType = CacheType | `details:${string}`;
export const GLOBAL_CACHE_USER_ID = '__global__' as const;

export interface CacheRecord {
  userId: string;
  cacheType: CacheRecordType;
  fetchedAt: string;
  lastLoginAt?: string;
  itemCount?: number;
  comicId?: string;
}

export interface FavouriteCacheValue extends Omit<Favourite, 'userId' | 'fetchedAt'> { userId: string }
export interface DetailCacheValue { userId: string; comicId: string; detail: PicaComicDetail }
export interface StatsCacheValue { userId: string; result: StatsResult }
export interface AiSummaryCacheValue extends AiSummary {}
export interface HotCacheValue { key: 'hot'; leaderboard?: Leaderboard; keywords?: Keyword; value?: unknown }

export interface CacheRead<T> {
  data: T;
  meta: CacheRecord;
  stale: boolean;
}

export interface CacheWriteResult {
  ok: boolean;
  degraded: boolean;
  error?: unknown;
}

export interface CacheTtlOptions {
  favouriteStats?: number;
  hotData?: number;
  comicDetail?: number;
  aiSummary?: number;
}
