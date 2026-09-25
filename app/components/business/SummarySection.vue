<script setup lang="ts">
import type { SummarySectionProps } from '../../../types/ui';

withDefaults(defineProps<SummarySectionProps>(), {
  description: '',
  loading: false,
  locked: false,
  deepRunning: false,
  metrics: () => [],
});

defineEmits<{ enable: [] }>();
</script>

<template>
  <section :id="id" class="summary-section">
    <h2>{{ title }}</h2>
    <p v-if="description" class="section-description">
      {{ description }}
    </p>
    <div v-if="loading" class="skeleton-grid" aria-label="加载中">
      <span v-for="index in 3" :key="index" class="skeleton" />
    </div>
    <div v-else-if="locked" class="locked-state">
      <p>开启深度分析后可见</p>
      <AppButton variant="secondary" :disabled="deepRunning" @click="$emit('enable')">
        {{ deepRunning ? '正在深度分析' : '开启深度分析' }}
      </AppButton>
    </div>
    <div v-else-if="metrics.length" class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small v-if="metric.note">{{ metric.note }}</small>
      </article>
    </div>
    <EmptyState v-else title="暂无可展示数据" />
  </section>
</template>

<style scoped>
.summary-section { border: 3px solid #000; box-shadow: 6px 6px 0 #000; background: #fff; padding: 1.2rem; scroll-margin-top: 5rem; }
.summary-section h2 { display: inline-block; margin: 0 0 1rem; padding: .1rem .35rem; border-bottom: 3px solid #000; background: var(--brand-yellow); font-size: 1.25rem; }
.section-description { margin: 0 0 1rem; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: .8rem; }
.metric-card { border: 2px solid #000; padding: .8rem; background: var(--cream); }
.metric-card span, .metric-card small { display: block; }
.metric-card strong { display: block; margin: .25rem 0; font-size: 1.5rem; }
.locked-state { display: grid; gap: .7rem; justify-items: start; }
.locked-state p { margin: 0; font-weight: 700; }
.skeleton-grid { display: grid; gap: .8rem; }
.skeleton { display: block; height: 3rem; background: #eee; animation: pulse 1.2s ease-in-out infinite alternate; }
@keyframes pulse { to { opacity: .45; } }
</style>
