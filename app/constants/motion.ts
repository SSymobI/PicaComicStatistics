/**
 * 动效令牌（JS 侧）。
 * CSS 侧同名令牌见 `app/assets/css/main.css` 的 `:root`，两者必须保持同步；
 * 组件内不得出现硬编码的毫秒数、缓动或位移。
 * 升级原则：进入慢、退出快；按压等高频反馈不随内容体量放慢。
 */
export const MotionReveal = {
  THRESHOLD: 0.12,
  ROOT_MARGIN: '0px 0px -8% 0px',
} as const;

export const MotionChart = {
  /** ECharts 入场动画时长（毫秒），比常规组件更慢，让图表数据分布可被看清。 */
  DURATION_MS: 600,
  EASING: 'cubicOut',
  /** 多 series / 多分片动画的递进延迟（毫秒）。 */
  DELAY_STEP_MS: 80,
} as const;
