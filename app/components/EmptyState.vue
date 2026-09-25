<script setup lang="ts">
import BusinessEmptyState from './business/EmptyState.vue';
</script>

<template>
  <BusinessEmptyState v-bind="$attrs">
    <slot />
  </BusinessEmptyState>
</template>
