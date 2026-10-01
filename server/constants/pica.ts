/**
 * 哔咔上游接口的固定参数。签名密钥只在服务端代码中使用，绝不暴露到 public runtimeConfig。
 */
export const PicaUpstreamDefaults = {
  /** `NUXT_PICA_UPSTREAM_TIMEOUT_MS` 未设置或非法时生效。 */
  TIMEOUT_MS: 8000,
} as const;

export const PicaComicAPIEndpoint = {
  SIGN_IN: 'auth/sign-in',
  PROFILE: 'users/profile',
  FAVOURITE: 'users/favourite',
  LEADERBOARD: 'comics/leaderboard',
  KEYWORDS: 'keywords',
  COMIC_DETAIL: 'comics',
} as const;

export const PicaComicAPIConfig = {
  BASE_URL: 'https://picaapi.picacomic.com/',
  API_KEY: 'C69BAF41DA5ABD1FFEDC6D2FEA56B',
  SIGNATURE_KEY: '~d}$Q7$eIni=V)9\\RK/P.RM4;9[7|@/CA}b~OW!3?EV`:<>M7pddUBL5n|0/*Cn',
  ACCEPT: 'application/vnd.picacomic.com.v1+json',
  APP_CHANNEL: '2',
  APP_VERSION: '2.2.1.2.3.3',
  APP_UUID: 'defaultUuid',
  APP_PLATFORM: 'android',
  APP_BUILD_VERSION: '44',
  USER_AGENT: 'okhttp/3.8.1',
  IMAGE_QUALITY: 'original',
  CONTENT_TYPE: 'application/json; charset=UTF-8',
} as const;

export const FavouriteSort = {
  DEFAULT: 'ua',
  NEWEST: 'dd',
  OLDEST: 'da',
  MOST_LIKES: 'ld',
  MOST_VIEWS: 'vd',
} as const;

export const LeaderboardParam = {
  TIME_H24: 'H24',
  TIME_D7: 'D7',
  TIME_D30: 'D30',
  DEFAULT_TIME_RANGE: 'D7',
  COUNT_TYPE: 'VC',
} as const;

export const FetchPacing = {
  FAVOURITE_PAGE_SIZE: 20,
  FAVOURITE_PAGE_INTERVAL_MS: 400,
  DETAIL_BATCH_SIZE: 40,
  DETAIL_ITEM_INTERVAL_MS: 250,
  BATCH_INTERVAL_MS: 1500,
  MAX_RETRY_PER_ITEM: 2,
} as const;

export const BatchErrorCode = {
  BATCH_LIMIT_EXCEEDED: 'BATCH_LIMIT_EXCEEDED',
  UPSTREAM_FAILED: 'UPSTREAM_FAILED',
} as const;

export const RuntimeCapabilities = {
  CF: {
    canAggregateFavouritePages: false,
    maxFavouritePagesPerCall: 1,
    maxDetailBatchSize: FetchPacing.DETAIL_BATCH_SIZE,
    pacingProfile: 'conservative',
  },
  NODE: {
    canAggregateFavouritePages: true,
    maxFavouritePagesPerCall: 5,
    maxDetailBatchSize: FetchPacing.DETAIL_BATCH_SIZE,
    pacingProfile: 'aggressive',
  },
} as const;

export const PacingProfiles = {
  conservative: {
    FAVOURITE_PAGE_INTERVAL_MS: 400,
    DETAIL_ITEM_INTERVAL_MS: 250,
    BATCH_INTERVAL_MS: 1500,
  },
  aggressive: {
    FAVOURITE_PAGE_INTERVAL_MS: 150,
    DETAIL_ITEM_INTERVAL_MS: 100,
    BATCH_INTERVAL_MS: 500,
  },
} as const;

export type FavouriteSortValue = typeof FavouriteSort[keyof typeof FavouriteSort];
export type LeaderboardTimeRange = typeof LeaderboardParam[keyof Pick<typeof LeaderboardParam, 'TIME_H24' | 'TIME_D7' | 'TIME_D30'>];
