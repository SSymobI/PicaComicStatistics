<script setup lang="ts">
import type { EmptyStateProps } from '@types-project/ui';

withDefaults(defineProps<EmptyStateProps>(), { title: '暂无数据', description: '' });
</script>

<template>
  <div class="empty-state">
    <div class="empty-mark" aria-hidden="true">
      ○
    </div>
    <strong>{{ title }}</strong>
    <p v-if="description">
      {{ description }}
    </p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state { display: grid; place-items: center; gap: .45rem; min-height: 10rem; border: 3px dashed #000; padding: 1rem; text-align: center; background: #fff; }
.empty-mark { font-size: 2rem; font-weight: 900; }
.empty-state p { margin: 0; }
</style>
