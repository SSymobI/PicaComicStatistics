<script setup lang="ts">
import type { StatusBannerProps } from '../../../types/ui';

withDefaults(defineProps<StatusBannerProps>(), { tone: 'info', title: '' });
</script>

<template>
  <div class="border-[3px] border-black p-3 shadow-[4px_4px_0_#000]" :class="tone === 'danger' ? 'bg-[var(--danger)]' : tone === 'success' ? 'bg-[var(--brand-green)]' : 'bg-[var(--info)]'" role="status">
    <strong v-if="title">{{ title }}</strong>
    <slot />
  </div>
</template>
