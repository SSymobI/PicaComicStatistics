export const ClientFetchPacing = {
  DETAIL_BATCH_SIZE: 40,
  BATCH_INTERVAL_MS: 1500,
  /** 与 `RuntimeCapabilities.pacingProfile` 对应的前端拉取节奏（与 PROJECT_SPEC PacingProfiles 一致）。 */
  PROFILES: {
    conservative: { FAVOURITE_PAGE_INTERVAL_MS: 400, BATCH_INTERVAL_MS: 1500 },
    aggressive: { FAVOURITE_PAGE_INTERVAL_MS: 150, BATCH_INTERVAL_MS: 500 },
  },
} as const;

export const ClientConfig = {
  FALLBACK_TIMEZONE: 'Asia/Shanghai',
  /** 本地缓存的用户账号数量上限（超出按最后登录时间升序淘汰）。 */
  MAX_LOCAL_USER_PROFILES: 3,
} as const;

/** 未开启深度分析时的互动指数标注（与 `AiDefaults.SHALLOW_LABEL` 同值，单一来源）。 */
export const SHALLOW_INTERACTION_LABEL = '浅层互动指数';

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
