import type { PicaComicDetail } from '../../../types/domain';
import type { PicaComicData } from '../../../types/pica-api';
import { createError, defineEventHandler, getQuery } from 'h3';
import { BatchErrorCode, FetchPacing } from '../../constants/pica';
import { requireAuthorization, toApiError } from '../../utils/apiHelpers';
import { picaComicDetail, PicaUpstreamError, unwrapPicaData } from '../../utils/picComicAPI';
import { getRuntimePacing } from '../../utils/runtimeCapabilities';

interface ComicBatchResult {
  comics: PicaComicDetail[];
  failedBookIds: string[];
}

function parseBookIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap(item => typeof item === 'string' ? item.split(',') : [])
    .map(item => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index);
}

function pause(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default defineEventHandler(async (event): Promise<ComicBatchResult> => {
  try {
    const bookIds = parseBookIds(getQuery(event).bookId);
    if (bookIds.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'bookId is required', data: { code: 'INVALID_REQUEST' } });
    }
    if (bookIds.length > FetchPacing.DETAIL_BATCH_SIZE) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Detail batch size exceeded',
        data: { code: BatchErrorCode.BATCH_LIMIT_EXCEEDED, max: FetchPacing.DETAIL_BATCH_SIZE },
      });
    }

    const token = requireAuthorization(event);
    const pacing = getRuntimePacing();
    const comics: PicaComicDetail[] = [];
    const failedBookIds: string[] = [];
    for (const [index, bookId] of bookIds.entries()) {
      if (index > 0)
        await pause(pacing.DETAIL_ITEM_INTERVAL_MS);
      let detail: PicaComicDetail | null = null;
      for (let attempt = 0; attempt <= FetchPacing.MAX_RETRY_PER_ITEM; attempt += 1) {
        try {
          const response = await picaComicDetail(event, token, bookId);
          const data = unwrapPicaData<PicaComicData>(response);
          if (data?.comic)
            detail = data.comic;
          break;
        }
        catch (error) {
          // Token 失效必须让前端进入 expired 状态，不能被降级成单本失败。
          if (error instanceof PicaUpstreamError && error.statusCode === 401)
            throw error;
          if (attempt >= FetchPacing.MAX_RETRY_PER_ITEM)
            break;
        }
      }
      if (detail)
        comics.push(detail);
      else failedBookIds.push(bookId);
    }
    return { comics, failedBookIds };
  }
  catch (error) {
    throw toApiError(error);
  }
});
