import type { PicaLoginResponse } from '../../../types/pica-api';
import { createError, defineEventHandler, readBody } from 'h3';
import { toApiError } from '../../utils/apiHelpers';
import { picaLogin, PicaUpstreamError, unwrapPicaData } from '../../utils/picComicAPI';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<LoginBody>(event);
    if (typeof body?.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password) {
      throw createError({ statusCode: 400, statusMessage: 'email and password are required', data: { code: 'INVALID_REQUEST' } });
    }
    const response = await picaLogin(event, body.email.trim(), body.password);
    const data = unwrapPicaData<PicaLoginResponse>(response);
    if (!data || typeof data.token !== 'string' || !data.token) {
      throw createError({ statusCode: 502, statusMessage: 'Invalid login response', data: { code: 'UPSTREAM_FAILED' } });
    }
    return data;
  }
  catch (error) {
    const upstreamPayload = error instanceof PicaUpstreamError && typeof error.payload === 'object' && error.payload !== null
      ? error.payload as { error?: unknown; message?: unknown }
      : undefined;
    if (error instanceof PicaUpstreamError && (upstreamPayload?.error === '1004' || upstreamPayload?.message === 'invalid email or password')) {
      throw createError({ statusCode: 401, statusMessage: '账号或密码错误', data: { code: 'INVALID_CREDENTIALS' } });
    }
    throw toApiError(error);
  }
});
