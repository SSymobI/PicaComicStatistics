import { describe, expect, it } from 'vitest';
import { formatLocalDateTime } from '@/utils/datetime';

describe('formatLocalDateTime', () => {
  it('按指定时区换算并输出 YYYY-MM-DD HH:mm:ss', () => {
    expect(formatLocalDateTime('2026-02-14T00:30:05.000Z', 'Asia/Shanghai')).toBe('2026-02-14 08:30:05');
    expect(formatLocalDateTime('2026-02-14T00:30:05.000Z', 'UTC')).toBe('2026-02-14 00:30:05');
  });

  it('跨日时按目标时区取日期', () => {
    expect(formatLocalDateTime('2026-02-13T20:00:00.000Z', 'Asia/Shanghai')).toBe('2026-02-14 04:00:00');
    expect(formatLocalDateTime('2026-02-14T02:00:00.000Z', 'America/New_York')).toBe('2026-02-13 21:00:00');
  });

  it('接受 Date 与毫秒时间戳', () => {
    const date = new Date('2026-02-14T00:30:05.000Z');
    expect(formatLocalDateTime(date, 'Asia/Shanghai')).toBe('2026-02-14 08:30:05');
    expect(formatLocalDateTime(date.getTime(), 'Asia/Shanghai')).toBe('2026-02-14 08:30:05');
  });

  it('无法解析的输入返回空串', () => {
    expect(formatLocalDateTime('')).toBe('');
    expect(formatLocalDateTime('not-a-date')).toBe('');
  });
});
