import { describe, expect, it } from 'vitest';
import { toProgressScale } from '@/utils/progress';

describe('toProgressScale', () => {
  it('把百分比线性换算为 scaleX 倍率', () => {
    expect(toProgressScale(0)).toBe(0);
    expect(toProgressScale(25)).toBe(0.25);
    expect(toProgressScale(100)).toBe(1);
  });

  it('超出 0~100 的值被夹取', () => {
    expect(toProgressScale(-20)).toBe(0);
    expect(toProgressScale(160)).toBe(1);
  });

  it('非有限值按 0 处理', () => {
    expect(toProgressScale(Number.NaN)).toBe(0);
    expect(toProgressScale(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
