import type { PicaComic, PicaComicDetail, Thumb } from './domain';

export interface WordStatItem { name: string; count: number; percent: number }
export interface WordStats {
  total: number;
  uniqueCount: number;
  items: WordStatItem[];
  topItems: WordStatItem[];
  cloudItems: WordStatItem[];
  excludedZeroCount?: number;
}
export interface FavouriteStats {
  totalComics: number;
  authorCount: number;
  categoryCount: number;
  tagCount: number;
  finishedCount: number;
  unfinishedCount: number;
  finishedRatio: number;
}
export interface ComicLengthStats {
  validRecordCount: number;
  avgEps: number;
  avgPages: number;
  maxEps: number;
  maxPages: number;
  shortCount: number;
  midCount: number;
  longCount: number;
  shortFormRatio: number;
  longFormRatio: number;
  missingLengthCount: number;
}
export interface TopComicItem {
  comicId: string;
  title: string;
  author: string;
  totalViews: number;
  totalLikes: number;
  categories: string[];
  tags: string[];
  thumb: Thumb | null;
}
export interface LikeRateItem extends TopComicItem { likeRate: number }
export interface PopularityStats {
  viewsTop: TopComicItem[];
  likesTop: TopComicItem[];
  likeRateItems: LikeRateItem[];
  avgLikeRate: number;
  excludedZeroViewsCount: number;
  highLikeRateCount: number;
  highHeatCount: number;
}
export interface YearBucket { year: number; count: number; percent: number }
export interface UpdateBucket { key: 'recent7' | 'recent30' | 'recent365' | 'stale'; label: string; count: number; percent: number }
export interface LifecycleStats {
  timezone: string;
  validDateCount: number;
  missingDateCount: number;
  createYearDist: YearBucket[];
  updateBuckets: UpdateBucket[];
  firstCreatedAt: string | null;
  lastUpdatedAt: string | null;
}
export interface InteractionItem {
  comicId: string;
  title: string;
  author: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  interactionIndex: number;
  interactionIndexNormalized: number;
  thumb: Thumb | null;
}
export interface InteractionStats {
  deepAnalysis: boolean;
  validCommentCount: number;
  commentsTop: InteractionItem[];
  totalComments: number;
  avgComments: number;
  interactionItems: InteractionItem[];
  shallowLabel: string | null;
}
export interface DistributionPair {
  userDistribution: WordStatItem[];
  hotDistribution: WordStatItem[];
  overlapNames: string[];
  overlapCount: number;
  userOverlapPercent: number;
  hotOverlapPercent: number;
}
export interface HotRelationStats {
  timeRange: 'H24' | 'D7' | 'D30';
  hotTotal: number;
  hitCount: number;
  hitRate: number;
  hitComicIds: string[];
  category: DistributionPair;
  tag: DistributionPair;
  author: DistributionPair;
}
export interface KeywordRelationStats {
  totalKeywords: number;
  hitKeywordCount: number;
  hitKeywordList: string[];
  userRelatedTagCount: number;
  interestMatchRatio: number;
  matchedItems: WordStatItem[];
}
export interface StatsResult {
  generatedAt: string;
  deepAnalysis: boolean;
  overview: FavouriteStats;
  words: { category: WordStats; tag: WordStats; author: WordStats };
  length: ComicLengthStats;
  popularity: PopularityStats;
  lifecycle?: LifecycleStats;
  interaction: InteractionStats;
  hotRelation: HotRelationStats;
  keywordRelation: KeywordRelationStats;
}

export interface StatsInput {
  favourites: PicaComic[];
  details?: PicaComicDetail[] | Record<string, PicaComicDetail | undefined>;
  leaderboard?: PicaComic[];
  keywords?: Array<string | { keyword?: string; name?: string }>;
  deepAnalysis?: boolean;
  timezone?: string;
  timeRange?: 'H24' | 'D7' | 'D30';
  now?: Date | string;
  generatedAt?: string;
}
