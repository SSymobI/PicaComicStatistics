import type { FavouriteSortValue } from '~/server/constants/pica';
import type { PicaFavouriteData } from '~/types/pica-api';
import { createError, defineEventHandler, getQuery } from 'h3';
import { ApiErrorCode, ApiErrorMessages, HttpStatus } from '~/server/constants/errors';
import { FavouriteSort } from '~/server/constants/pica';
import { requireAuthorization, toApiError } from '~/server/utils/apiHelpers';
import { picaFavourite, unwrapPicaData } from '~/server/utils/picComicAPI';

const validSorts = new Set<string>(Object.values(FavouriteSort));

function parsePage(value: unknown): number {
  const page = Number(value ?? 1);
  if (!Number.isInteger(page) || page < 1) {
    throw createError({ statusCode: HttpStatus.BAD_REQUEST, statusMessage: ApiErrorMessages.PAGE_POSITIVE_INTEGER, data: { code: ApiErrorCode.INVALID_REQUEST } });
  }
  return page;
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const page = parsePage(query.page);
    const sort = typeof query.s === 'string' && validSorts.has(query.s) ? query.s as FavouriteSortValue : FavouriteSort.DEFAULT;
    const response = await picaFavourite(event, requireAuthorization(event), page, sort);
    return unwrapPicaData<PicaFavouriteData>(response);
  }
  catch (error) {
    throw toApiError(error);
  }
});
