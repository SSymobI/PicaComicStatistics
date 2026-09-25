# PicaComicStatistics 工程约定

本项目是 Nuxt 4 SPA，用于在浏览器本地分析哔咔漫画收藏数据。实现前请先查阅 `docs/PROJECT_SPEC.md` 及其索引文档。

## 强制约束

- 使用 Node 24、pnpm 11.5、TypeScript strict；禁止 `any` 与 TypeScript `enum`。
- 自定义类型统一放在 `types/`；业务数据通过服务端代理访问哔咔接口，密钥只留在服务端。
- 收藏原始数据与统计结果按 userId 隔离保存在 IndexedDB；统计函数必须是纯函数。
- 项目内禁止删除文件；若确需移除，先迁移到 `older/`。
- 视觉采用 Neubrutalism，禁止 `border-radius`；图表使用 ECharts 5 与 `vue-echarts` 7。
- AI 密钥仅运行时注入，构建阶段不得要求密钥。

## 质量门禁

```text
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:node
pnpm build:cf
pnpm build:docker
```

统计口径、缓存结构、认证行为、部署方式发生变化时，同步更新 `docs/` 中对应规格和 `definition-of-done.md` 台账。
