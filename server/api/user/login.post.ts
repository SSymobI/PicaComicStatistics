import type { PicaLoginResponse } from '~/types/pica-api';
import { createError, defineEventHandler, readBody } from 'h3';
import { ApiErrorCode, ApiErrorMessages, HttpStatus, PicaLoginError } from '~/server/constants/errors';
import { toApiError } from '~/server/utils/apiHelpers';
import { picaLogin, PicaUpstreamError, unwrapPicaData } from '~/server/utils/picComicAPI';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<LoginBody>(event);
    if (typeof body?.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password) {
      throw createError({ statusCode: HttpStatus.BAD_REQUEST, statusMessage: ApiErrorMessages.EMAIL_PASSWORD_REQUIRED, data: { code: ApiErrorCode.INVALID_REQUEST } });
    }
    const response = await picaLogin(event, body.email.trim(), body.password);
    const data = unwrapPicaData<PicaLoginResponse>(response);
    if (!data || typeof data.token !== 'string' || !data.token) {
      throw createError({ statusCode: HttpStatus.BAD_GATEWAY, statusMessage: ApiErrorMessages.INVALID_LOGIN_RESPONSE, data: { code: ApiErrorCode.UPSTREAM_FAILED } });
    }
    return data;
  }
  catch (error) {
    const upstreamPayload = error instanceof PicaUpstreamError && typeof error.payload === 'object' && error.payload !== null
      ? error.payload as { error?: unknown; message?: unknown }
      : undefined;
    if (error instanceof PicaUpstreamError && (upstreamPayload?.error === PicaLoginError.INVALID_CREDENTIALS_CODE || upstreamPayload?.message === PicaLoginError.INVALID_CREDENTIALS_MESSAGE)) {
      throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: ApiErrorMessages.INVALID_CREDENTIALS, data: { code: ApiErrorCode.INVALID_CREDENTIALS } });
    }
    throw toApiError(error);
  }
});
