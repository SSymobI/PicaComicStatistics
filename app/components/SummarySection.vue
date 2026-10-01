<script setup lang="ts">
import BusinessSummarySection from './business/SummarySection.vue';
</script>

<template>
  <BusinessSummarySection v-bind="$attrs">
    <slot />
  </BusinessSummarySection>
</template>
