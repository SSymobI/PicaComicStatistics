import { CacheStaleNotice } from '@/constants/routes';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 取指定时区下的年月日时分秒；时区标识非法等异常场景退化为浏览器本地时区。 */
function dateParts(date: Date, timeZone: string): Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string> {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)?.value ?? '';
    return {
      year: pick('year'),
      month: pick('month'),
      day: pick('day'),
      hour: pick('hour'),
      minute: pick('minute'),
      second: pick('second'),
    };
  }
  catch {
    return {
      year: String(date.getFullYear()),
      month: pad2(date.getMonth() + 1),
      day: pad2(date.getDate()),
      hour: pad2(date.getHours()),
      minute: pad2(date.getMinutes()),
      second: pad2(date.getSeconds()),
    };
  }
}

/**
 * 把时间戳按用户所在时区格式化为 `CacheStaleNotice.TIME_FORMAT`（YYYY-MM-DD HH:mm:ss）。
 * 无法解析的输入返回空串，回退文案由调用方补给。
 */
export function formatLocalDateTime(
  value: string | number | Date,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
  pattern: string = CacheStaleNotice.TIME_FORMAT,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()))
    return '';
  const parts = dateParts(date, timeZone);
  return pattern
    .replace('YYYY', parts.year)
    .replace('MM', parts.month)
    .replace('DD', parts.day)
    .replace('HH', parts.hour)
    .replace('mm', parts.minute)
    .replace('ss', parts.second);
}
