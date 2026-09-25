export interface Thumb {
  originalName?: string;
  path?: string;
  fileServer?: string;
  fileUrl?: string;
}

export interface PicaComic {
  _id?: string;
  title?: string;
  author?: string;
  totalViews?: number;
  totalLikes?: number;
  pagesCount?: number;
  epsCount?: number;
  finished?: boolean;
  categories?: string[];
  tags?: string[];
  thumb?: Thumb | null;
  likesCount?: number;
  leaderboardCount?: number;
  viewsCount?: number;
}

export interface PicaComicDetail extends PicaComic {
  description?: string;
  chineseTeam?: string;
  _creator?: Record<string, unknown>;
  updated_at?: string;
  created_at?: string;
  allowDownload?: boolean;
  allowComment?: boolean;
  totalComments?: number;
  commentsCount?: number;
  isFavourite?: boolean;
  isLiked?: boolean;
}

export interface PicaUser {
  _id: string;
  email?: string;
  name?: string;
  birthday?: string;
  gender?: string;
  slogan?: string;
  title?: string;
  verified?: boolean;
  exp?: number;
  level?: number;
  characters?: string[];
  created_at?: string;
  avatar?: Thumb;
  isPunched?: boolean;
}

export interface CacheMeta {
  userId?: string;
  fetchedAt: string;
}

export interface Favourite extends CacheMeta {
  docs: PicaComic[];
  total?: number;
  limit?: number;
  page?: number;
  pages?: number;
}

export interface Leaderboard extends CacheMeta {
  docs: PicaComic[];
  timeRange: 'H24' | 'D7' | 'D30';
  total?: number;
  limit?: number;
  page?: number;
  pages?: number;
}

export interface Keyword extends CacheMeta {
  keywords: Array<string | { keyword?: string; name?: string }>;
}
