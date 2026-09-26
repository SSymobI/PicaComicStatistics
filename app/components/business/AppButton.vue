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
    class="cursor-pointer border-[3px] border-black px-5 py-3 font-black shadow-[5px_5px_0_#000] transition-transform hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-[.55] disabled:shadow-[3px_3px_0_#000]"
    :class="variant === 'secondary' ? 'bg-white' : variant === 'danger' ? 'bg-[var(--danger)]' : 'bg-[var(--brand-pink)]'"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
