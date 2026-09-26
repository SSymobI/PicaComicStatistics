import type { LeaderboardTimeRange } from '~/server/constants/pica';
import type { PicaLeaderboardData } from '~/types/pica-api';
import { defineEventHandler, getQuery } from 'h3';
import { LeaderboardParam } from '~/server/constants/pica';
import { requireAuthorization, toApiError } from '~/server/utils/apiHelpers';
import { picaLeaderboard, unwrapPicaData } from '~/server/utils/picComicAPI';

const validRanges = new Set<string>([
  LeaderboardParam.TIME_H24,
  LeaderboardParam.TIME_D7,
  LeaderboardParam.TIME_D30,
]);

export default defineEventHandler(async (event) => {
  try {
    const value = getQuery(event).tt;
    const timeRange = typeof value === 'string' && validRanges.has(value)
      ? value as LeaderboardTimeRange
      : LeaderboardParam.DEFAULT_TIME_RANGE;
    const response = await picaLeaderboard(event, requireAuthorization(event), timeRange);
    return unwrapPicaData<PicaLeaderboardData>(response);
  }
  catch (error) {
    throw toApiError(error);
  }
});
