import type { PicaLeaderboardData } from '../../../types/pica-api';
import type { LeaderboardTimeRange } from '../../constants/pica';
import { defineEventHandler, getQuery } from 'h3';
import { LeaderboardParam } from '../../constants/pica';
import { requireAuthorization, toApiError } from '../../utils/apiHelpers';
import { picaLeaderboard, unwrapPicaData } from '../../utils/picComicAPI';

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
