/** `v-reveal` 指令的绑定值。 */
export interface RevealOptions {
  /** 入场延迟（毫秒），用于同屏多元素的错位呈现。 */
  delay?: number;
  /** 是否只播放一次，默认 true。 */
  once?: boolean;
}

export type RevealBinding = RevealOptions | undefined;

/** 单个被观察元素的指令状态。 */
export interface RevealState {
  once: boolean;
}
