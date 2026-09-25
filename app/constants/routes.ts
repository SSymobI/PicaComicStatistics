export const AppRoutes = {
  HOME: '/',
  LOGIN: '/login',
  SUMMARY: '/summary',
} as const;

export const StorageKeys = {
  TOKEN: 'pcs:token',
  REMEMBERED_ACCOUNT: 'pcs:remembered-account',
  REGENERATION_PREFIX: 'pcs:regeneration:',
} as const;

export const QueueMessages = {
  CANCELLED: '深度分析未完成',
  NO_DEEP_ANALYSIS: '开启深度分析后可见',
  EMPTY_FAVOURITE: '当前账号暂无收藏数据',
  REGENERATING: '正在重新生成',
  REGENERATION_LIMIT: '喵～今天的重新生成次数已经用完啦（1/1），明天再让小咔帮你重新统计吧～',
} as const;

export const CacheStaleNotice = {
  FALLBACK_MESSAGE: '数据请求异常，当前展示的是本地缓存（生成于 {generatedAt}）',
  STALE_MESSAGE: '这可能是很久前的统计信息',
} as const;
