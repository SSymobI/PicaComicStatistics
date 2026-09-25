<script setup lang="ts">
import BusinessStatusBanner from './business/StatusBanner.vue';
</script>

<template>
  <BusinessStatusBanner v-bind="$attrs">
    <slot />
  </BusinessStatusBanner>
</template>
