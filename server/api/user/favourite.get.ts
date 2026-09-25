import type { PicaFavouriteData } from '../../../types/pica-api';
import type { FavouriteSortValue } from '../../constants/pica';
import { createError, defineEventHandler, getQuery } from 'h3';
import { FavouriteSort } from '../../constants/pica';
import { requireAuthorization, toApiError } from '../../utils/apiHelpers';
import { picaFavourite, unwrapPicaData } from '../../utils/picComicAPI';

const validSorts = new Set<string>(Object.values(FavouriteSort));

function parsePage(value: unknown): number {
  const page = Number(value ?? 1);
  if (!Number.isInteger(page) || page < 1) {
    throw createError({ statusCode: 400, statusMessage: 'page must be a positive integer', data: { code: 'INVALID_REQUEST' } });
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
