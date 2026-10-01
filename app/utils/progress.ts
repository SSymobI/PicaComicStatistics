import { UiRouteProgress } from '@/constants/ui';

/**
 * 把 0~100 的进度百分比换算成 `transform: scaleX()` 的倍率。
 * 进度值理论上已被收敛在 [0, 100]，这里仍做一次夹取与有限性检查，
 * 避免异常值把进度条拉出视口或反向；非有限值按 0 处理。
 */
export function toProgressScale(percent: number): number {
  if (!Number.isFinite(percent))
    return 0;
  return Math.min(1, Math.max(0, percent / UiRouteProgress.PERCENT_FULL));
}
