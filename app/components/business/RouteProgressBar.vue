<script setup lang="ts">
import { UiRouteProgress } from '@/constants/ui';
import { prefersReducedMotion } from '@/utils/motion';
import { toProgressScale } from '@/utils/progress';

/**
 * 减少动效时进度恒定：进度条仍出现并表达「正在加载」, 但不做连续增长。
 * 该分支同时是服务端与无 matchMedia 环境下的取值。
 */
function staticProgress(): number {
  return UiRouteProgress.REDUCED_MOTION_PERCENT;
}

// Nuxt 的页面加载状态：`page:loading:start` / `page:loading:end` 在 SPA 客户端导航时同样触发。
const { progress, isLoading } = useLoadingIndicator({
  duration: UiRouteProgress.DURATION_MS,
  throttle: UiRouteProgress.THROTTLE_MS,
  hideDelay: UiRouteProgress.HIDE_DELAY_MS,
  resetDelay: UiRouteProgress.RESET_DELAY_MS,
  estimatedProgress: prefersReducedMotion() ? staticProgress : undefined,
});

const fillScale = computed(() => toProgressScale(progress.value));
</script>

<template>
  <!-- 纯加载反馈: 固定定位不参与文档流, 对读屏软件隐藏, 不拦截指针事件 -->
  <div class="route-progress" :class="{ 'is-active': isLoading }" aria-hidden="true">
    <div class="route-progress-fill" :style="{ transform: `scaleX(${fillScale})` }" />
  </div>
</template>

<style scoped>
/* 顶部细条: 3px 墨色下边框 + 主色填充, 与页头同底色, 出现时表现为页头顶边被填充 */
.route-progress { position: fixed; top: 0; right: 0; left: 0; z-index: 7; height: .5rem; border-bottom: 3px solid var(--color-ink); background: var(--color-surface); pointer-events: none; opacity: 0; transition: opacity var(--motion-duration-leave) var(--motion-ease-in); }
/* 进入走 fast/ease-out, 退出回落到基础规则的 leave/ease-in（进入慢、退出快） */
.route-progress.is-active { opacity: 1; transition: opacity var(--motion-duration-fast) var(--motion-ease-out); }
/* 增长只动 transform: 宽度一律用 scaleX 表达, 不触发布局 */
.route-progress-fill { height: 100%; background: var(--color-brand-pink); transform: scaleX(0); transform-origin: left center; transition: transform var(--motion-duration-instant) var(--motion-ease-out); }
</style>
