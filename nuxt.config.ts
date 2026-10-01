import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { AiModelDefaults } from './server/constants/ai';
import { PicaUpstreamDefaults } from './server/constants/pica';

/**
 * 构建命令通过 `--preset=<name>` 传给 Nitro（如 `nuxt build --preset=cloudflare-pages`），
 * 该参数不写入 `process.env`，故显式解析后放进 runtimeConfig，供服务端「运行时能力矩阵」判定。
 */
function buildPreset(): string {
  const fromArgv = process.argv.find(argument => argument.startsWith('--preset='))?.slice('--preset='.length) ?? '';
  return fromArgv || process.env.NITRO_PRESET || '';
}

export default defineNuxtConfig({
  compatibilityDate: '2025-01-15',
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
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
    runtimePreset: buildPreset(),
    // 以下均为非敏感默认值：密钥与地址一律由**运行时**环境变量注入
    // （Nuxt 按 `NUXT_*` → runtimeConfig 的规则在运行时覆盖，缺失时按空值/默认值运行）。
    // 构建期不读取这些环境变量，否则真实密钥会被编译进产物（见 docs/deployment-spec.md 第五节）。
    picaBaseUrl: '',
    picaUpstreamTimeoutMs: PicaUpstreamDefaults.TIMEOUT_MS,
    aiApiKey: '',
    aiBaseUrl: '',
    aiModel: '',
    aiTemperature: AiModelDefaults.TEMPERATURE,
    aiMaxTokens: AiModelDefaults.MAX_TOKENS,
    aiTimeoutMs: AiModelDefaults.TIMEOUT_MS,
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
