import type { H3Event } from 'h3';
import { createError, getHeader, H3Error } from 'h3';
import { ApiErrorCode, ApiErrorMessages, HttpStatus } from '~/server/constants/errors';
import { BatchErrorCode } from '~/server/constants/pica';
import { PicaUpstreamError } from './picComicAPI';

export function requireAuthorization(event: H3Event): string {
  const token = getHeader(event, 'authorization')?.trim().replace(/^Bearer\s+/i, '');
  if (!token) {
    throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: ApiErrorMessages.AUTHORIZATION_REQUIRED, data: { code: ApiErrorCode.UNAUTHORIZED } });
  }
  return token;
}

export function toApiError(error: unknown): H3Error {
  if (error instanceof H3Error)
    return error;
  if (error instanceof PicaUpstreamError) {
    const statusCode = error.statusCode >= HttpStatus.BAD_REQUEST && error.statusCode < HttpStatus.BAD_GATEWAY ? error.statusCode : HttpStatus.BAD_GATEWAY;
    return createError({
      statusCode,
      statusMessage: statusCode === HttpStatus.UNAUTHORIZED ? ApiErrorMessages.PICA_AUTHORIZATION_FAILED : ApiErrorMessages.PICA_UPSTREAM_REQUEST_FAILED,
      data: { code: statusCode === HttpStatus.UNAUTHORIZED ? ApiErrorCode.UNAUTHORIZED : BatchErrorCode.UPSTREAM_FAILED, details: error.payload },
    });
  }
  return createError({ statusCode: HttpStatus.BAD_GATEWAY, statusMessage: ApiErrorMessages.UPSTREAM_REQUEST_FAILED, data: { code: BatchErrorCode.UPSTREAM_FAILED } });
}
