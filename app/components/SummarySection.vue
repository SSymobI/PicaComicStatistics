<script setup lang="ts">
import BusinessSummarySection from './business/SummarySection.vue';

const emit = defineEmits<{ (event: 'enable'): void }>();
</script>

<template>
  <BusinessSummarySection v-bind="$attrs" @enable="emit('enable')">
    <slot />
  </BusinessSummarySection>
</template>
