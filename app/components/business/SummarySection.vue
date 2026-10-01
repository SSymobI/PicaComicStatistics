<script setup lang="ts">
import type { SummarySectionProps } from '@types-project/ui';
import { QueueMessages } from '@/constants/routes';
import { UiMessages } from '@/constants/ui';

withDefaults(defineProps<SummarySectionProps>(), {
  description: '',
  loading: false,
  locked: false,
  metrics: () => [],
});
</script>

<template>
  <section :id="id" class="summary-section brutal-card scroll-mt-20">
    <h2>{{ title }}</h2>
    <p v-if="description" class="section-description">
      {{ description }}
    </p>
    <Transition name="fade-rise" mode="out-in">
      <div v-if="loading" class="skeleton-grid" :aria-label="UiMessages.LOADING">
        <span v-for="index in 3" :key="index" class="skeleton" />
      </div>
      <div v-else-if="locked" class="locked-state">
        <p>{{ QueueMessages.NO_DEEP_ANALYSIS }}</p>
      </div>
      <div v-else-if="metrics.length" class="metric-grid">
        <article v-for="metric in metrics" :key="metric.label" class="metric-card">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small v-if="metric.note">{{ metric.note }}</small>
        </article>
      </div>
      <EmptyState v-else :title="UiMessages.EMPTY_SECTION" />
    </Transition>
  </section>
</template>

<style scoped>
.summary-section h2 { display: inline-block; margin: 0 0 1rem; padding: .1rem .35rem; border-bottom: 3px solid var(--color-ink); background: var(--color-brand-yellow); font-size: 1.25rem; }
.section-description { margin: 0 0 1rem; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: .8rem; }
.metric-card { border: 2px solid var(--color-ink); padding: .8rem; background: var(--color-cream); }
.metric-card span, .metric-card small { display: block; }
.metric-card strong { display: block; margin: .25rem 0; font-size: 1.5rem; }
.locked-state { display: grid; gap: .7rem; justify-items: start; }
.locked-state p { margin: 0; font-weight: 700; }
.skeleton-grid { display: grid; gap: .8rem; }
.skeleton { display: block; height: 3rem; background: var(--color-skeleton); animation: pulse 1.2s ease-in-out infinite alternate; }
@keyframes pulse { to { opacity: .45; } }
</style>
