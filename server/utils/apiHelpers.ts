import type { H3Event } from 'h3';
import { createError, getHeader, H3Error } from 'h3';
import { BatchErrorCode } from '../constants/pica';
import { PicaUpstreamError } from './picComicAPI';

export function requireAuthorization(event: H3Event): string {
  const token = getHeader(event, 'authorization')?.trim().replace(/^Bearer\s+/i, '');
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authorization required', data: { code: 'UNAUTHORIZED' } });
  }
  return token;
}

export function toApiError(error: unknown): H3Error {
  if (error instanceof H3Error)
    return error;
  if (error instanceof PicaUpstreamError) {
    const statusCode = error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 502;
    return createError({
      statusCode,
      statusMessage: statusCode === 401 ? 'Pica authorization failed' : 'Pica upstream request failed',
      data: { code: statusCode === 401 ? 'UNAUTHORIZED' : BatchErrorCode.UPSTREAM_FAILED, details: error.payload },
    });
  }
  return createError({ statusCode: 502, statusMessage: 'Upstream request failed', data: { code: BatchErrorCode.UPSTREAM_FAILED } });
}
