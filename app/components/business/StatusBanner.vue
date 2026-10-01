<script setup lang="ts">
import type { StatusBannerProps } from '@types-project/ui';

withDefaults(defineProps<StatusBannerProps>(), { tone: 'info', title: '' });
</script>

<template>
  <div class="border-[3px] border-ink p-3 shadow-brutal-sm" :class="tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-brand-green' : 'bg-info'" role="status">
    <strong v-if="title">{{ title }}</strong>
    <slot />
  </div>
</template>
