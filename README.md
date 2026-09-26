# PicaComicStatistics

PicaComicStatistics 是一个 Nuxt 4 SPA，用于通过哔咔漫画服务端代理读取个人收藏，并在浏览器本地生成统计图表、词云和 AI 收藏画像。

## 技术栈

- Node.js 24.x、pnpm 11.5.0、TypeScript strict
- Nuxt 4、Vue 3、Pinia
- Tailwind CSS 4、Neubrutalism/BoldKit 风格
- ECharts 5、vue-echarts 7、echarts-wordcloud 2
- Vitest、OpenAI-compatible AI API

## 页面

- `/`：应用入口和数据准备状态
- `/login`：哔咔账号登录
- `/summary`：收藏概览、作者/分类/标签分布、词云、排行榜和 AI 画像

收藏原始数据和统计结果按用户 ID 隔离缓存在浏览器 IndexedDB 中。账号凭证只提交到本项目服务端代理，不会写入 IndexedDB；请仅在可信的部署环境使用。

## 本地开发

```bash
corepack enable
corepack prepare pnpm@11.5.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

默认访问 <http://localhost:3000>。运行时配置可从 `.env.example` 复制，AI 相关变量可为空，缺少 AI 配置不会阻止构建或统计功能启动。

## 构建与部署

```bash
pnpm build:node
pnpm build:cf
pnpm build:docker
```

Node 产物位于 `.output/`，可使用 `node .output/server/index.mjs` 启动。Docker 构建使用仓库中的多阶段 `Dockerfile`，运行时监听 3000 端口。

## 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:node
pnpm build:cf
```

GitHub Actions 会在 Pull Request 和 `master` 推送时执行上述检查及 Docker 构建。

## 环境变量

服务端运行时支持 `NUXT_PICA_BASE_URL`、`NUXT_PICA_UPSTREAM_TIMEOUT_MS`、`NUXT_AI_API_KEY`、`NUXT_AI_BASE_URL`、`NUXT_AI_MODEL`、`NUXT_AI_TEMPERATURE`、`NUXT_AI_MAX_TOKENS`、`NUXT_AI_TIMEOUT_MS`、`NITRO_PORT` 和 `NITRO_HOST`。请通过部署平台的密钥管理注入 `NUXT_AI_API_KEY`，不要提交真实密钥或 `.env` 文件。

## 隐私与数据范围

统计计算在浏览器完成，收藏和统计缓存保存在当前浏览器的 IndexedDB。只有登录、收藏读取、详情读取和用户主动生成 AI 画像时，相关数据才会经服务端代理发送到上游服务；AI 画像请求使用已计算的统计摘要，不应将密钥写入前端代码。
