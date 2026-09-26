import type { PicaKeywordsData } from '~/types/pica-api';
import { defineEventHandler } from 'h3';
import { requireAuthorization, toApiError } from '~/server/utils/apiHelpers';
import { picaKeywords, unwrapPicaData } from '~/server/utils/picComicAPI';

export default defineEventHandler(async (event) => {
  try {
    const response = await picaKeywords(event, requireAuthorization(event));
    return unwrapPicaData<PicaKeywordsData>(response);
  }
  catch (error) {
    throw toApiError(error);
  }
});
