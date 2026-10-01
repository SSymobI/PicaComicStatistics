# PicaComicStatistics 工程约定

本文件是 AI Agent 在本仓库工作的入口约定，内容是 `docs/` 规格的**摘要与执行约束**，不复制规格正文；冲突时以 `docs/` 原文为准。

- 主要规格: [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)（文档索引、统计口径、接口契约、枚举的唯一真源）
- 完成定义与未决事项台账: [`docs/definition-of-done.md`](docs/definition-of-done.md)
- 功能推进时**必须同步更新本文件**（新增目录、目录迁移、约束或门禁变化）。

## 一、项目定位

通过服务端代理读取哔咔漫画用户收藏数据，在**浏览器本地**完成统计，并以图表、词云与 AI 画像形式展示的 Nuxt 4 **SPA**。

| 路由 | 作用 | 关键约束 |
|---|---|---|
| `/` | 首页，介绍项目功能 | 公开页面；必须含本地存储承诺说明与进入统计的主 CTA；`<600px` 视口内不得出现横向或纵向滚动条 |
| `/login` | 登录页 | 未登录或凭证失效时的入口；用户协议必须打开全文后才能勾选，未勾选禁止提交登录 |
| `/summary` | 统计报告页（主业务页） | 受全局路由中间件保护；单页纵向长滚动 + 顶部固定操作栏 + 页内锚点导航 |

页面数量固定为三个，**不新增 404 / 500 等错误页，不引入侧边栏布局**。

数据流：浏览器 → `server/api/*`（Nuxt 全栈代理哔咔接口并加工）→ 上游哔咔。用户收藏原始数据与统计结果只留在浏览器本地，不上传、不保存到部署的服务器。

## 二、技术栈与版本锁定

| 项 | 选型 | 说明 |
|---|---|---|
| 运行时 | Node.js `24.x`、pnpm `11.5.0` | 版本由 `packageManager` 固定；安装一律 `--frozen-lockfile`；lockfile 必须入库且不得由 CI 更新 |
| 框架 | Nuxt 4 + Vue 3 + Pinia + Vite | SPA（`ssr: false`），Nuxt 全栈模式（`server/api` 为后端） |
| 语言 | TypeScript `strict` | 禁 `any`；禁 TS `enum`，一律 `export const X = {} as const` |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`） | 令牌唯一真源 `app/assets/css/tailwind.css` 的 `@theme` |
| 图表 | ECharts `5.x` + vue-echarts `7.x` + echarts-wordcloud `2.x` | 全部图表**自封装**；**不得**引入要求 echarts 6 的图表组件（含 BoldKit 图表组件） |
| UI 组件 | BoldKit（非图表部分） | shadcn-vue registry **源码分发**到 `app/components/ui/`，不是 npm 运行时依赖；不使用任何整页 Block |
| 其他 | OpenAI SDK、Vitest、husky + lint-staged、@antfu/eslint-config | AI 调用只在服务端；仅做单元测试 |

- 移除 Naive UI：代码中不得出现 `naive-ui` 与 `N*` 组件。
- 引入 BoldKit 组件前先读 [`docs/boldkit-guide.md`](docs/boldkit-guide.md)；该目录当前尚未生成，属规格待落地项。

## 三、文档地图

| 变更类型 | 必须查阅 / 同步的文档 |
|---|---|
| 统计口径、TOP 阈值、权重、排序与边界 | [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)「统计指标定义」 |
| API 路由、参数、响应结构、状态码、业务错误码 | [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)「接口契约」 |
| 哔咔接口封装、签名与请求头 | [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)「API封装规范」+ [`docs/picacomic-api.md`](docs/picacomic-api.md) |
| 数据模型字段、三层模型、上游响应结构 | [`docs/data-model.md`](docs/data-model.md) |
| 缓存结构、Object Store、主键、TTL、用户隔离 | [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)「缓存机制」+ [`docs/data-model.md`](docs/data-model.md) |
| 认证行为、状态机、路由守卫、401 处理 | [`docs/auth-spec.md`](docs/auth-spec.md) |
| 视觉、动效、图表样式规范 | [`docs/design-guid.md`](docs/design-guid.md) |
| UI 组件引入方式与代码质量豁免边界 | [`docs/boldkit-guide.md`](docs/boldkit-guide.md) |
| 部署、CI/CD、环境变量注入 | [`docs/deployment-spec.md`](docs/deployment-spec.md)（CF 细节见 [`docs/cloudflare-pages-guide.md`](docs/cloudflare-pages-guide.md)） |
| AI 提示词与模型参数 | [`docs/prompt/`](docs/prompt/)（配合 PROJECT_SPEC「AI总结模块设计」） |
| 用户协议与数据使用说明文案 | [`docs/user-agreement.md`](docs/user-agreement.md) |
| 提交信息 | [`docs/commit-rule.md`](docs/commit-rule.md) |
| PR 标题与描述 | [`docs/pr-rule.md`](docs/pr-rule.md) |
| 任意变更完成后 | [`docs/definition-of-done.md`](docs/definition-of-done.md)（完成定义、文档同步对照表、未决事项台账） |

## 四、强制约束

### 1. 代码与类型

- 句末分号、字符串单引号；`@antfu/eslint-config` 统一格式，**不允许 warning 残留**。
- Vue 组件用大写驼峰 + Composition API；TS 文件与函数小驼峰；枚举名大驼峰。
- 所有自定义 `type` / `interface` / `declare` 集中在 `types/`，禁止在业务脚本与组件内定义。**唯一豁免区**：`app/components/ui/`（vendored BoldKit 源码）。
- 禁止魔法值：色值、文案、阈值、限速参数、错误码一律从常量读取。前端常量落 `app/constants/`（图表载体、阈值、动效、路由、文案），服务端常量落 `server/constants/`（签名、接口、AI、错误码），同一常量不得两处定义。
- 样式三处职责不得混淆：`tailwind.css` 的 `@theme` 是设计令牌唯一真源；`@utility` / `@layer components` 承载野兽派原子与跨组件动效契约类；组件结构样式留在 SFC 的 `<style scoped>`。组件内不得出现字面色值。
- 全项目禁止 `border-radius`（含样式与组件；BoldKit 由 `--radius: 0rem` 保证）。
- **禁止删除文件**：需要移除时迁移到项目根 `older/`（保留 `.gitkeep`），由用户决定是否删除。

### 2. 安全与密钥边界

- 前端不得直接请求哔咔**数据接口**，一律经 `server/api/*` 代理（二进制图片直连上游，不在此限，也不实现服务端图片代理）。
- `NUXT_AI_API_KEY` 等密钥只在服务端 `runtimeConfig`，绝不进 `runtimeConfig.public`；**构建期可为空**，任何产物缺少密钥都必须能成功构建。
- 以下内容**永不**进入发往模型厂商的请求体：Pica token 及派生字段、AI API Key、`SIGNATURE_KEY`、环境变量原值、email / password。
- `/api/ai/summary` 只接受并严格校验 `StatsResult`，按白名单字段填充；提示词模板由服务端从 `docs/prompt/` 读取，**不接受前端提交的提示词文本**。
- 密码不得写入 `localStorage` / `sessionStorage` / IndexedDB 或自有数据库；「记住账号」只存账号标识，记住密码交给浏览器凭证管理。
- CI 中不配置任何部署类 secret（Cloudflare 采用 Git 集成发布），也不得注入真实模型密钥。

### 3. 数据与缓存

- 私有数据（`favourites` / `details` / `stats` / `aiSummary`）的键必须包含 userId，**禁止**「取最后一条」这类跨用户回退；`hot` 为全局共享公共数据。
- TTL：收藏基础统计 24h、热榜 / 热搜 6h、漫画详情 7d、AI 总结 24h；起算点与过期粒度见 PROJECT_SPEC 缓存机制 4.0.3。
- 本地保留账号上限 3：登录成功后按最后登录时间升序淘汰，淘汰需覆盖该 userId 的全部 store 与重新生成计数。
- 登出不清空 IndexedDB；Raw 数据更新后统计结果必须重算。
- 统计函数必须是**纯函数**：只接受 Raw 入参，不读写 IndexedDB、不依赖运行时状态。
- 前端不硬编码判断部署环境，能力差异经 `/api/runtime/capabilities` 暴露；未声明支持的能力按保守路径执行，Cloudflare 为能力下界。

### 4. 页面与视觉

- 视觉采用 Neubrutalism：粗黑边框、实色偏移阴影、零圆角、高对比配色、粗体排版、按压反馈。
- 业务页面**不得直接引用** `app/components/ui/` 下的原语组件；只使用 `app/components/business/` 中封装的业务组件，由业务组件引用原语。
- 图表一律基于 ECharts 5 自封装：色值取自 CSS 变量、不使用渐变、坐标轴与网格线按 design-guid；词云窄屏降级规则见 design-guid 移动端策略。
- 动效只允许 `transform` 与 `opacity`，不得动画布局属性；时长与缓动取 `main.css` 的 `--motion-*` 令牌（JS 侧取 `app/constants/motion.ts`），并遵循 `prefers-reduced-motion`。
- 状态文案与空态文案统一由枚举提供，不得硬编码在组件内；时间统一按 `CacheStaleNotice.TIME_FORMAT` 与用户时区渲染。
- 页面状态必须齐备：加载态、空态、错误态（含恢复入口），不出现无反馈的空白等待或 `NaN` / `Infinity`。

### 5. 统计口径（最敏感区）

- 一切阈值、权重、排序与边界**只能**读 [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md) 与 `app/constants/statistics.ts`，不得凭直觉调整，例如：饼图 TOP10 + 「其他」（剩余仅 1 项不合并）、词云 TOP 30 / 80 / 50、排行 TOP10、互动指数权重 1:3:5 且取 `log10`、长短篇边界 50 / 100、`views<=0` 剔除、作者与标签归一化规则。
- 改动统计口径必须在 PR 描述中**原样引用**对应条款编号，并同步规格文档。

## 五、质量门禁

按顺序执行，任一失败视为未完成；与 [`.github/workflows/ci.yml`](.github/workflows/ci.yml) 的 PR 检查一致。

```bash
pnpm install --frozen-lockfile
pnpm lint          # @antfu/eslint-config，不允许 warning
pnpm typecheck     # nuxt prepare + tsc（应用 .nuxt/tsconfig.json，测试 tests/tsconfig.json）
pnpm test:unit     # vitest run
pnpm build:node    # .output/
pnpm build:cf      # dist/
pnpm build:docker  # docker build -t picacomic-statistics:ci .
```

- 本地提交前由 husky 的 `pre-commit` 钩子执行 lint-staged（`eslint --fix --no-warn-ignored`），自动修复后仍存在的错误中断提交。
- 测试规格：Vitest + `jsdom` + `fake-indexeddb`；**只做单元测试**（不做集成 / E2E / 组件 / 视觉回归，无覆盖率门槛）；测试文件放 `tests/unit/` 并镜像源码路径，共享初始化在 `tests/setup.ts`；禁止真实网络请求，上游必须 mock；统计函数与存储层解耦以便无浏览器环境测试。
- 未执行的门禁必须如实说明原因，**禁止编造验证结论**。例如本机 Docker 守护进程未运行时，`pnpm build:docker` 只能记为「未执行」。

## 六、AI Agent 执行流程约束

1. 禁止在本工程下执行文件删除；确需移除先迁移到 `older/`。
2. 需求描述不清或存在歧义时**先询问**，取得明确结论后给出执行计划，待用户确认再动手。
3. 修改业务实现、修复 bug、实现新功能时，**询问用户是否提交**当前修改；不得擅自提交或推送。
4. Windows 平台优先使用 PowerShell，注意输出乱码与版本间命令差异，避免同一命令被重复执行。
5. 功能实现与问题修复优先采用 Nuxt / Vue / TypeScript 生态中可靠且活跃的三方依赖方案，而不是在项目内重复造轮子。
6. 变更完成后回写文档并在未决事项台账登记新出现的未决项（见第七节）。

## 七、提交、PR 与台账

- `master` 为主分支：禁止直接推送或合并，功能变更一律走 PR；禁止使用高危 git 命令。
- 提交信息严格遵循 Conventional Commits（type：`feat` `fix` `refactor` `perf` `docs` `style` `test` `chore`），格式与 scope 建议见 [`docs/commit-rule.md`](docs/commit-rule.md) 与 [`docs/pr-rule.md`](docs/pr-rule.md)。
- PR 描述按 [`docs/pr-rule.md`](docs/pr-rule.md) 模板填写，「变更概述」与「验证情况」必填，未执行项写「未执行」。
- 未决事项台账位于 [`docs/definition-of-done.md`](docs/definition-of-done.md) 第二节：已确认决策（D-xx）、待验证项（V-xx）、已知规格空白（G-xx）。**开工前**检查是否有阻塞本环节的未决项，**收工后**登记新出现的未决项。
- 文档同步按 [`docs/definition-of-done.md`](docs/definition-of-done.md) 第一节第 5 条的对照表执行。

## 八、必须询问用户、不得自行决定的事项

- 产品行为与页面信息架构（页面数量、区块顺序、交互入口）。
- 安全模型与密钥边界（哪些数据可外发、密钥存放位置、代理范围）。
- API Contract：路由、方法、参数、响应结构、HTTP 状态码、业务错误码。
- 数据模型与缓存策略：字段与类型、Object Store、主键、TTL、用户隔离、本地账号上限。
- 统计口径：阈值、权重、排序规则、边界判定、归一化与合并规则。
- 推翻或修改 `docs/definition-of-done.md` 中已确认的决策（D-xx）。
- 新增运行时依赖、删除（迁移）既有文件、提交与推送代码。
