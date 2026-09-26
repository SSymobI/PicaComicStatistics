import type { PicaComicDetail } from '~/types/domain';
import type { PicaComicData } from '~/types/pica-api';
import { createError, defineEventHandler, getQuery } from 'h3';
import { ApiErrorCode, ApiErrorMessages, HttpStatus } from '~/server/constants/errors';
import { BatchErrorCode, FetchPacing } from '~/server/constants/pica';
import { requireAuthorization, toApiError } from '~/server/utils/apiHelpers';
import { picaComicDetail, PicaUpstreamError, unwrapPicaData } from '~/server/utils/picComicAPI';
import { getRuntimePacing } from '~/server/utils/runtimeCapabilities';

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
      throw createError({ statusCode: HttpStatus.BAD_REQUEST, statusMessage: ApiErrorMessages.BOOK_ID_REQUIRED, data: { code: ApiErrorCode.INVALID_REQUEST } });
    }
    if (bookIds.length > FetchPacing.DETAIL_BATCH_SIZE) {
      throw createError({
        statusCode: HttpStatus.BAD_GATEWAY,
        statusMessage: ApiErrorMessages.DETAIL_BATCH_SIZE_EXCEEDED,
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
          if (error instanceof PicaUpstreamError && error.statusCode === HttpStatus.UNAUTHORIZED)
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
