import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{vue,ts}', './app/components/**/*.{vue,ts}', './components/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans SC', 'PingFang SC', 'system-ui', 'sans-serif'],
        display: ['Archivo Black', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
} satisfies Config;
