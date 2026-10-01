<div align="center">
  <h1>PicaComicStatistics</h1>
  <img src="./public/logo.ico" width="150" align="center" alt="PicaComicStatistics 图标" />
  <br/> <br/>
  <strong>哔咔收藏统计</strong>
</div>

### 介绍

PicaComicStatistics 是一个 Nuxt 4 SPA，用于通过哔咔漫画服务端代理读取用户的个人收藏数据，并在浏览器本地环境处理这些收藏数据进而以图表、词云等形式展示给用户，并生成根据统计信息生成的用户收藏画像。

### 技术栈

- Node.js 24.x、pnpm 11.5.0、TypeScript strict
- Nuxt 4、Vue 3、Pinia
- Tailwind CSS 4、Neubrutalism/BoldKit 风格
- ECharts 5、vue-echarts 7、echarts-wordcloud 2
- Vitest、Husky + lint-staged、OpenAI-compatible AI API

### 命令

``` bash
pnpm install --frozen-lockfile      // 安装依赖
pnpm run dev                        // 启动开发环境
pnpm run build:node                 // 构建 Node.js 版本
pnpm run build:cf                   // 构建 Cloudflare Worker 版本
pnpm run build:docker               // 构建 Docker 镜像
pnpm run lint                       // 代码风格检查
pnpm run typecheck                  // 类型检查
pnpm run test:unit                  // 单元测试
```

默认应用端口为`3000`。运行时配置可从 .env.example 复制，AI 相关变量可为空，缺少 AI 配置不会阻止构建或统计功能启动。

提交前 husky 的 `pre-commit` 钩子会执行 lint-staged，对暂存文件运行 `eslint --fix`：可自动修复的问题会被修正并重新暂存，修复后仍存在的错误会中断本次提交。钩子由 `pnpm install` 触发的 `prepare` 脚本（`husky`）自动安装，新克隆的仓库无需额外操作。

Node 产物位于 .output/，可使用 node .output/server/index.mjs 启动。Docker 构建使用仓库中的多阶段 Dockerfile，运行时监听 3000 端口。

### 环境变量

- NUXT_AI_API_KEY: 第三方 AI 模型服务的 API Key
- NUXT_AI_BASE_URL: 第三方 AI 模型服务的 Base URL
- NUXT_AI_MODEL: 第三方 AI 模型服务的模型名称
- NUXT_AI_TEMPERATURE: 第三方 AI 模型服务的温度参数
- NUXT_AI_MAX_TOKENS: 第三方 AI 模型服务的最大 Token 数
- NUXT_AI_TIMEOUT_MS: 第三方 AI 模型服务的超时时间（毫秒）
- NUXT_PICA_UPSTREAM_TIMEOUT_MS: 哔咔漫画服务端代理的超时时间（毫秒）
- NITRO_PORT: 服务端口
- NITRO_HOST: 服务主机

### 特别感谢

> 哔咔漫画的服务接口文档来源于 [PicaComicNow](https://github.com/FreeNowOrg/PicaComicNow) 项目，十分感谢。

### Cloudflare 部署注意

> 在控制台中 `构建` 下 `Workers 和 Pages` 中创建应用程序里选择 `想要部署 Pages？开始使用` 方式部署。

### 隐私与数据范围

统计计算在浏览器完成，收藏和统计缓存保存在当前浏览器的 IndexedDB。只有登录、收藏读取、详情读取和用户主动生成 AI 画像时，相关数据才会经服务端代理发送到上游服务；AI 画像请求使用已计算的统计摘要，不应将密钥写入前端代码。
