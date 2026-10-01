<script setup lang="ts">
import type { AppButtonProps } from '@types-project/ui';

withDefaults(defineProps<AppButtonProps>(), {
  type: 'button',
  disabled: false,
  variant: 'primary',
});
</script>

<template>
  <button
    class="brutal-press cursor-pointer border-[3px] border-ink px-5 py-3 font-black shadow-brutal-btn focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ink focus-visible:outline-offset-2"
    :class="variant === 'secondary' ? 'bg-surface' : variant === 'danger' ? 'bg-danger' : 'bg-brand-pink'"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
