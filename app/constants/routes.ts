export const AppRoutes = {
  HOME: '/',
  LOGIN: '/login',
  SUMMARY: '/summary',
} as const;

/** 前端调用的服务端接口（与 `docs/PROJECT_SPEC.md` 接口契约一致）。 */
export const ApiRoutes = {
  LOGIN: '/api/user/login',
  PROFILE: '/api/user/profile',
  FAVOURITE: '/api/user/favourite',
  LEADERBOARD: '/api/pica/leaderboard',
  KEYWORDS: '/api/pica/keywords',
  COMIC_BATCH: '/api/pica/comic',
  AI_SUMMARY: '/api/ai/summary',
  CAPABILITIES: '/api/runtime/capabilities',
} as const;

export const StorageKeys = {
  TOKEN: 'pcs:token',
  REMEMBERED_ACCOUNT: 'pcs:remembered-account',
  /** 重新生成计数 key = `${REGENERATION_PREFIX}:${userId}:${yyyymmdd}`（本地自然日）。 */
  REGENERATION_PREFIX: 'pcs:regen',
  IDB_NAME: 'pcs-db',
  IDB_VERSION: 1,
} as const;

export const QueueMessages = {
  CANCELLED: '深度分析未完成',
  PARTIAL: '{failedCount} 本详情获取失败',
  NO_DEEP_ANALYSIS: '开启深度分析后可见',
  EMPTY_FAVOURITE: '当前账号暂无收藏数据',
  REGENERATING: '正在重新生成',
  REGENERATION_LIMIT: '喵～今天的重新生成次数已经用完啦（1/1），明天再让小咔帮你重新统计吧～',
} as const;

/** 认证状态文案（登录页与 auth store 共用，不得在业务脚本内硬编码）。 */
export const AuthMessages = {
  INVALID_CREDENTIALS: '账号或密码错误。',
  NETWORK_FAILED: '无法连接哔咔服务，请稍后重试或检查服务端网络连接。',
  VALIDATION_FAILED: '暂时无法校验登录状态，请稍后重试。',
} as const;

/** 统计报告页的状态与操作文案。 */
export const ReportMessages = {
  REQUEST_FAILED: '数据请求失败，请稍后重试。',
  CACHE_FALLBACK: '数据请求异常，当前展示的是本地缓存',
  CACHE_DEGRADED: '本地缓存空间不足，已继续展示本次统计结果。',
  AI_FAILED: 'AI 总结生成失败，请稍后重试。',
  FAVOURITE_PROGRESS: '正在拉取收藏数据',
  RETRY_DETAIL: '重试',
} as const;

export const CacheStaleNotice = {
  FALLBACK_MESSAGE: '数据请求异常，当前展示的是本地缓存（生成于 {generatedAt}）',
  STALE_MESSAGE: '这可能是很久前的统计信息',
  /** 报告生成时间与缓存提示统一使用的时间格式（按用户所在时区换算）。 */
  TIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  /** 时间戳缺失或无法解析时的回退文案。 */
  UNKNOWN_TIME: '未知时间',
} as const;
