import type { PicaComic, PicaComicDetail, PicaUser } from './domain';

export interface PicaPagination<T> {
  docs: T[];
  total: number;
  limit: number;
  page: number;
  pages: number;
}

export interface PicaApiEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

export type PicaApiResponse<T> = PicaApiEnvelope<T>;

export interface PicaLoginResponse {
  token: string;
}

export interface PicaLoginRequest {
  email: string;
  password: string;
}

export interface PicaFavouriteQuery {
  page: number;
  s: string;
}

export interface PicaLeaderboardQuery {
  tt: 'H24' | 'D7' | 'D30';
  ct: 'VC';
}

export interface PicaFavouriteData {
  comics: PicaPagination<PicaComic>;
}

export interface PicaLeaderboardData {
  comics: PicaComic[];
}

export interface PicaKeywordsData {
  keywords: string[];
}

export interface PicaComicData {
  comic: PicaComicDetail;
}

export interface PicaCategory {
  title: string;
  thumb?: import('./domain').Thumb | null;
  isWeb?: boolean;
  active?: boolean;
  link?: string;
}

export interface PicaCategoriesData {
  categories: PicaCategory[];
}

export interface PicaCollection {
  title: string;
  comics: PicaComic[];
}

export interface PicaCollectionsData {
  collections: PicaCollection[];
}

export interface PicaBanner {
  _id: string;
  title?: string;
  shortDescription?: string;
  type?: string;
  link?: string;
  thumb?: import('./domain').Thumb | null;
}

export interface PicaBannersData {
  banners: PicaBanner[];
}

export interface PicaEpsItem {
  _id: string;
  title: string;
  order: number;
  updated_at?: string;
}

export interface PicaPageItem {
  media: import('./domain').Thumb;
  [key: string]: unknown;
}

export type PicaProfileData = PicaUser;
