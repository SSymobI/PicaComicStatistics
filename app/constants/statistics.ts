export const ClientFetchPacing = {
  DETAIL_BATCH_SIZE: 40,
  BATCH_INTERVAL_MS: 1500,
} as const;

export const ClientConfig = {
  FALLBACK_TIMEZONE: 'Asia/Shanghai',
} as const;

export const StatThresholds = {
  PIE_TOP_LIMIT: 10,
  WORDCLOUD_TOP_LIMITS: { category: 30, tag: 80, author: 50 },
  RANKING_TOP_LIMIT: 10,
  MERGE_OTHER_LABEL: '其他',
  MIN_MERGE_REMAINING: 2,
} as const;

export const ComicLengthThresholds = { SHORT_BELOW: 50, LONG_FROM: 100 } as const;
export const NormalizeConfig = { UNKNOWN_AUTHOR: '未知作者' } as const;
export const InteractionWeights = { VIEWS: 1, LIKES: 3, COMMENTS: 5 } as const;
export const UpdateRecencyBuckets = {
  RECENT_DAYS: 7,
  RECENT_DAYS_30: 30,
  STALE_OVER_YEAR: 365,
  LABELS: ['最近7天', '最近30天', '最近365天', '超过一年未更新'],
  KEYS: ['recent7', 'recent30', 'recent365', 'stale'],
} as const;

export const DeepAnalysisMessages = {
  IN_PROGRESS: '正在获取漫画详情',
  PARTIAL: '深度分析未完成',
  COMPLETE: '深度分析已完成',
} as const;
