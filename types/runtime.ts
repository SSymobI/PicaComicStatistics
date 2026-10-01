/** 深度分析队列状态（与 `docs/PROJECT_SPEC.md` 的枚举 `QueueStatus` 一致）。 */
export const QueueStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  CANCELLED: 'cancelled',
  PARTIAL: 'partial',
  DONE: 'done',
} as const;

export type QueueStatusValue = typeof QueueStatus[keyof typeof QueueStatus];

export interface RuntimeCapabilities {
  canAggregateFavouritePages: boolean;
  maxFavouritePagesPerCall: number;
  maxDetailBatchSize: number;
  pacingProfile: 'conservative' | 'aggressive';
}

export interface FavouritePageResult {
  comics: {
    docs: import('./domain').PicaComic[];
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface SummaryReportState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  page: number;
  pages: number;
  favourites: import('./domain').PicaComic[];
  stats?: import('./stats').StatsResult;
  errorMessage: string;
  generatedAt?: string;
  fromCache: boolean;
  cacheStale: boolean;
  leaderboard: import('./domain').PicaComic[];
  keywords: Array<string | { keyword?: string; name?: string }>;
  details: import('./domain').PicaComicDetail[];
  deepAnalysis: boolean;
  deepStatus: QueueStatusValue;
  deepCompleted: number;
  deepTotal: number;
  deepFailed: string[];
  aiStatus: 'idle' | 'loading' | 'ready' | 'error';
  aiErrorMessage?: string;
  aiPersona?: string;
  aiAnalysis?: string;
}
