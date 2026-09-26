import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-01-15',
  app: {
    head: {
      title: '哔咔收藏统计',
      meta: [
        {
          name: 'description',
          content: '哔咔漫画PicaComic个人收藏数据统计分析，助你了解自己的XP',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/logo.ico',
        },
      ],
    },
  },
  devtools: { enabled: true },
  ssr: false,
  modules: ['@pinia/nuxt'],
  vite: {
    plugins: [tailwindcss()],
  },
  css: ['@/assets/css/tailwind.css', '@/assets/css/main.css'],
  typescript: {
    strict: true,
    typeCheck: false,
  },
  runtimeConfig: {
    runtimePreset: process.env.NITRO_PRESET || '',
    picaBaseUrl: process.env.NUXT_PICA_BASE_URL || 'https://picaapi.picacomic.com/',
    picaUpstreamTimeoutMs: Number(process.env.NUXT_PICA_UPSTREAM_TIMEOUT_MS || 8000),
    aiApiKey: process.env.NUXT_AI_API_KEY || '',
    aiBaseUrl: process.env.NUXT_AI_BASE_URL || '',
    aiModel: process.env.NUXT_AI_MODEL || '',
    aiTemperature: Number(process.env.NUXT_AI_TEMPERATURE || 0.8),
    aiMaxTokens: Number(process.env.NUXT_AI_MAX_TOKENS || 1000),
    aiTimeoutMs: Number(process.env.NUXT_AI_TIMEOUT_MS || 30000),
    public: {
      appName: 'PicaComicStatistics',
    },
  },
  nitro: {
    preset: process.env.NITRO_PRESET || undefined,
  },
  alias: {
    '@': resolve('app'),
    '~': resolve('.'),
    '@types-project': resolve('types'),
    '@types-project/*': `${resolve('types')}/*`,
    '@types-project/auth': resolve('types/auth.ts'),
    '@types-project/ui': resolve('types/ui.ts'),
  },
});
