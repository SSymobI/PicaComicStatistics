import type { PicaProfileData } from '~/types/pica-api';
import { defineEventHandler } from 'h3';
import { requireAuthorization, toApiError } from '~/server/utils/apiHelpers';
import { picaProfile, unwrapPicaData } from '~/server/utils/picComicAPI';

export default defineEventHandler(async (event) => {
  try {
    const response = await picaProfile(event, requireAuthorization(event));
    return unwrapPicaData<PicaProfileData>(response);
  }
  catch (error) {
    throw toApiError(error);
  }
});
