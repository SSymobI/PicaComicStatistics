import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // 测试统一放在 tests/ 下，目录结构镜像源码路径
    include: ['tests/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './app'),
      // 与 nuxt.config 的 alias 保持一致：~ 指向仓库根（服务端模块用 ~/server/...）
      '~': resolve(__dirname, './'),
      '@types-project': resolve(__dirname, './types'),
    },
  },
});
