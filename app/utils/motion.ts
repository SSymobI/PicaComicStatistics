const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 用户是否声明减少动态效果；服务端与无 matchMedia 环境按「减少」处理。 */
export function prefersReducedMotion(): boolean {
  if (!import.meta.client || typeof window.matchMedia !== 'function')
    return true;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
