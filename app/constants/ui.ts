export const UiScroll = {
  /** 向下滚动超过该距离（像素）后显示「回到顶部」按钮。 */
  BACK_TO_TOP_OFFSET_PX: 480,
} as const;

/** 通用界面文案（空态、加载提示）。 */
export const UiMessages = {
  EMPTY_SECTION: '暂无可展示数据',
  LOADING: '加载中',
} as const;

/** 顶部路由切换进度条（`RouteProgressBar`）的参数，取值沿用 Nuxt `useLoadingIndicator` 的口径。 */
export const UiRouteProgress = {
  /** 显示节流（毫秒）：0 表示不节流，任何路由切换都立即出现进度条。 */
  THROTTLE_MS: 0,
  /** 进度估计时长（毫秒）：进度按渐近曲线逼近 100%，切换越快越看不到尾巴。 */
  DURATION_MS: 1200,
  /** 路由切换结束后进度条的保留时长（毫秒），避免快速切换时一闪而过。 */
  HIDE_DELAY_MS: 300,
  /** 隐藏后进度归零的延迟（毫秒），必须大于淡出时长，避免归零动画被看见。 */
  RESET_DELAY_MS: 400,
  /** 进度百分比上限，换算成 `scaleX` 倍率时使用。 */
  PERCENT_FULL: 100,
  /** `prefers-reduced-motion: reduce` 下的恒定进度（百分比）：只表达「正在加载」，不做增长动画。 */
  REDUCED_MOTION_PERCENT: 60,
} as const;
