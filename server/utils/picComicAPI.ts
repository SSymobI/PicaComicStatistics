import type { H3Event } from 'h3';
import type {
  PicaApiEnvelope,
  PicaComicData,
  PicaFavouriteData,
  PicaKeywordsData,
  PicaLeaderboardData,
  PicaLoginResponse,
  PicaProfileData,
} from '../../types/pica-api';
import { useRuntimeConfig } from '#imports';
import { $fetch } from 'ofetch';
import {
  FavouriteSort,
  LeaderboardParam,
  PicaComicAPIConfig,
  PicaComicAPIEndpoint,
} from '../constants/pica';
import { createPicaComicHeaders } from './picaComicHeaderHandler';

export type PicaHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class PicaUpstreamError extends Error {
  readonly statusCode: number;
  readonly payload: unknown;

  constructor(message: string, statusCode = 502, payload?: unknown) {
    super(message);
    this.name = 'PicaUpstreamError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function upstreamStatus(error: unknown): number {
  const record = asRecord(error);
  const response = asRecord(record?.response);
  const status = response?.status ?? record?.statusCode ?? record?.status;
  return typeof status === 'number' && Number.isFinite(status) ? status : 502;
}

function upstreamPayload(error: unknown): unknown {
  const record = asRecord(error);
  const response = asRecord(record?.response);
  return response?._data ?? record?.data;
}

function getUpstreamUrl(event: H3Event, path: string): string {
  const config = useRuntimeConfig(event);
  const configured = typeof config.picaBaseUrl === 'string' && config.picaBaseUrl.length > 0
    ? config.picaBaseUrl
    : PicaComicAPIConfig.BASE_URL;
  return `${configured.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function timeoutMs(event: H3Event): number {
  const configured = useRuntimeConfig(event).picaUpstreamTimeoutMs;
  return typeof configured === 'number' && Number.isFinite(configured) && configured > 0 ? configured : 8000;
}

async function requestPica<T>(
  event: H3Event,
  path: string,
  method: PicaHttpMethod,
  token?: string,
  body?: Record<string, unknown>,
): Promise<PicaApiEnvelope<T>> {
  const headers = await createPicaComicHeaders({ path, method, token });
  try {
    const result = await $fetch<PicaApiEnvelope<T>>(getUpstreamUrl(event, path), {
      method,
      headers,
      body,
      timeout: timeoutMs(event),
    });
    if (typeof result?.code === 'number' && result.code >= 400) {
      throw new PicaUpstreamError(result.message || 'Pica upstream rejected request', result.code, result);
    }
    return result;
  }
  catch (error) {
    if (error instanceof PicaUpstreamError)
      throw error;
    const statusCode = upstreamStatus(error);
    throw new PicaUpstreamError('Pica upstream request failed', statusCode, upstreamPayload(error));
  }
}

export function unwrapPicaData<T>(response: PicaApiEnvelope<T>): T {
  return response.data;
}

export async function picaLogin(event: H3Event, email: string, password: string): Promise<PicaApiEnvelope<PicaLoginResponse>> {
  return requestPica<PicaLoginResponse>(event, PicaComicAPIEndpoint.SIGN_IN, 'POST', undefined, { email, password });
}

export async function picaProfile(event: H3Event, token: string): Promise<PicaApiEnvelope<PicaProfileData>> {
  return requestPica<PicaProfileData>(event, PicaComicAPIEndpoint.PROFILE, 'GET', token);
}

export async function picaFavourite(
  event: H3Event,
  token: string,
  page = 1,
  sort: string = FavouriteSort.DEFAULT,
): Promise<PicaApiEnvelope<PicaFavouriteData>> {
  const path = `${PicaComicAPIEndpoint.FAVOURITE}?page=${page}&s=${sort}`;
  return requestPica<PicaFavouriteData>(event, path, 'GET', token);
}

export async function picaLeaderboard(
  event: H3Event,
  token: string,
  timeRange: string = LeaderboardParam.DEFAULT_TIME_RANGE,
): Promise<PicaApiEnvelope<PicaLeaderboardData>> {
  const path = `${PicaComicAPIEndpoint.LEADERBOARD}?tt=${timeRange}&ct=${LeaderboardParam.COUNT_TYPE}`;
  return requestPica<PicaLeaderboardData>(event, path, 'GET', token);
}

export async function picaKeywords(event: H3Event, token: string): Promise<PicaApiEnvelope<PicaKeywordsData>> {
  return requestPica<PicaKeywordsData>(event, PicaComicAPIEndpoint.KEYWORDS, 'GET', token);
}

export async function picaComicDetail(
  event: H3Event,
  token: string,
  bookId: string,
): Promise<PicaApiEnvelope<PicaComicData>> {
  if (!bookId)
    throw new PicaUpstreamError('bookId is required', 400);
  const path = `${PicaComicAPIEndpoint.COMIC_DETAIL}/${encodeURIComponent(bookId)}`;
  return requestPica<PicaComicData>(event, path, 'GET', token);
}

// Alias retained for callers that name the operation after its upstream endpoint.
export const picaComic = picaComicDetail;
