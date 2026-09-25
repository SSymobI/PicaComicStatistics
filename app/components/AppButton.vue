<script setup lang="ts">
import BusinessAppButton from './business/AppButton.vue';
</script>

<template>
  <BusinessAppButton v-bind="$attrs">
    <slot />
  </BusinessAppButton>
</template>
