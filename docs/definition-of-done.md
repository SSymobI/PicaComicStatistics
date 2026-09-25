# 完成定义（Definition of Done）与决策台账

本文件定义「一个功能什么时候才算真正完成」，并集中登记全部未决事项。

相关文件: `./PROJECT_SPEC.md`（质量门禁与测试规格）、`./deployment-spec.md`（CI/CD）。

## 一、完成定义

一个功能只有**同时**满足以下四组条件才算完成。任一条不满足即视为未完成。

### 1. 静态检查与构建

| 项 | 判据 | 如何验证 |
|---|---|---|
| Lint | `pnpm lint` 通过, 无 warning 残留 | CI 与本地 |
| Type Check | `pnpm typecheck` 通过, `strict` 模式无错误 | CI 与本地 |
| 类型约束 | 无 `any`; 自定义 type / interface / declare 均在 `types/` 下（`app/components/ui/` 豁免区除外） | 代码审查 |
| 魔法值 | 业务代码无硬编码色值、文案、阈值; 全部从枚举读取 | 代码审查 |
| 枚举 | 未使用 TypeScript `enum`; 一律 `export const X = {} as const` | 代码审查 |
| 构建 | `build:node` / `build:cf` / `build:docker` 三者均成功 | CI |

### 2. 测试

| 项 | 判据 |
|---|---|
| 单元测试 | `pnpm test:unit` 通过 |
| 测试范围 | 仅当功能涉及**核心统计函数**时才要求新增单测; 其余功能不强制 |
| 测试规模 | 每个函数少量代表性用例覆盖主要分支, 不做过度单测 |
| 测试解耦 | 统计函数必须为纯函数, 不直接读写 IndexedDB |
| 不做的测试 | 集成测试 / 端到端测试 / 组件测试 / 覆盖率门槛, 均不要求 |

### 3. 规格一致性

| 项 | 判据 |
|---|---|
| 统计口径 | 与 `PROJECT_SPEC.md` 统计指标定义的公式、边界、排序规则完全一致 |
| API Contract | 路径、方法、参数、响应结构、HTTP 状态码、业务错误码与接口契约一致 |
| 数据模型 | 字段、类型、nullable、默认值与 `docs/data-model.md` 一致 |
| 缓存 | Object Store、keyPath、TTL 起算点与 `PROJECT_SPEC.md` 缓存机制一致; 无跨用户读取路径 |
| 安全边界 | 无凭证类数据外发; 无未声明的对外接口; 关键密钥不进入客户端 |
| 视觉 | 符合 `docs/design-guid.md`; 无 `border-radius`; 配色取自主题变量 |
| 登录协议 | 用户协议必须打开全文后才能勾选; 未同意时登录按钮禁用; 密码不由应用明文持久化 |

### 4. 用户体验与错误状态

| 项 | 判据 |
|---|---|
| 加载态 | 有加载表现（骨架屏或进度条）, 不出现无反馈的空白等待 |
| 空态 | 数据为空时显示空态, 不显示 `NaN` / `Infinity` / 破图 |
| 错误态 | 请求失败时有明确提示与恢复入口（重试 / 重新登录）, 不静默失败 |
| 窄屏 | 在 `<600px` 下无横向滚动、无内容溢出、图表不塌陷 |
| 首页布局 | `/` 在 `<600px` 视口内无纵向或横向滚动条; 此限制不适用于 `/summary` |
| 大数据量 | 500+ 收藏规模下页面可正常渲染, 词云按降级规则处理 |

### 5. 文档同步

| 变更类型 | 必须同步的文档 |
|---|---|
| 统计口径变化 | `PROJECT_SPEC.md` 统计指标定义 |
| API 变化 | `PROJECT_SPEC.md` 接口契约 |
| 数据模型变化 | `docs/data-model.md` |
| 缓存结构变化 | `PROJECT_SPEC.md` 缓存机制 + `./data-model.md` |
| 认证行为变化 | `docs/auth-spec.md` |
| 视觉规范变化 | `docs/design-guid.md` |
| CI / 部署变化 | `docs/deployment-spec.md` |
| 新增技术决策 | 对应规格文档 + 本文件第二节决策台账 |

### 6. 提交规范

- 提交信息符合 Conventional Commits（见 `./commit-rule.md`）。
- 通过 PR 合入 `master`, 禁止直接推送。
- PR 描述按 `./pr-rule.md` 模板填写, **不得编造验证结论**。

## 二、未决事项台账

以下为全部尚未裁决或尚未验证的事项。**标注「阻塞」的项在其对应实现环节开始前必须先解决。**

### 2.1 已确认（本轮全部关闭）

| 编号 | 内容 | 确认结论 |
|---|---|---|
| ~~D-01~~ | Cloudflare Pages 发布方式 | **Git 集成**（不使用 wrangler / 不需要 `CLOUDFLARE_API_TOKEN`） |
| ~~D-02~~ | CF Pages 项目名与生产分支 | GitHub 仓库名 **`PicaComicStatistics`**（尚未创建）；生产分支 **`master`** |
| ~~D-03~~ | 前端常量目录名 | **`app/constants/`** |
| ~~D-04~~ | 是否接受自封装全部图表 | **接受**：使用 BoldKit 的 UI 组件, 数据图表自行封装 |
| ~~D-05~~ | Docker 基础镜像与分层 | **确认采用建议方案**：基础镜像 `node:24-alpine`, 三阶段构建（依赖安装 → 构建 → 运行时） |
| ~~D-06~~ | `WordStats.excludedZeroCount` 是否暴露 | **暴露**给前端与 AI 模块 |
| ~~D-07~~ | Preview 部署是否配置运行时变量 | **配置**（与 Production 同等配置） |

**D-05 结论**: 基础镜像 `node:24-alpine`, 三阶段构建（依赖安装 → 构建 → 运行时）。三阶段的分工: 第一阶段安装全部依赖, 第二阶段执行 `build:node` 产出 `.output/`, 第三阶段仅复制 `.output/` 与生产依赖并以非 root 用户启动。

### 2.1.1 由 D-01 / D-02 直接产生的约束

- GitHub Actions 中**不配置** `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。
- Cloudflare 侧通过 **Git 集成**在推送 `master` 时自动构建发布; GitHub Actions 的 master 环节**不重复发布**, 只需重复 PR 检查的全部步骤。
- GitHub Actions 中**不存在任何部署类 secret**; 模型密钥只配置在 Cloudflare 控制台的运行时环境变量中。
- 仓库地址固定为 `PicaComicStatistics`（GitHub 用户名待仓库创建后确定）。

### 2.2 待验证项（实现阶段执行，不需事先裁决）

| 编号 | 内容 | 验证方法 |
|---|---|---|
| V-01 | `echarts-wordcloud@2` 与所选 `echarts 5.x` 小版本的实际兼容性 | 实现词云组件后实测渲染 |
| V-02 | Cloudflare Pages 线上构建目录映射 | 本地已验证 `pnpm build:cf` 输出 `dist/_worker.js/index.js`、`dist/_nuxt/` 与 `_routes.json`；CF 控制台仍需确认目录映射 |
| V-03 | S3 图片服务器是否返回 `Access-Control-Allow-Origin` | 对任一图片发 `HEAD` 请求检查响应头 |
| V-04 | 上游是否对 query 参数做规范化排序 | 以两种参数顺序请求 leaderboard 比对结果 |
| V-05 | 非 ASCII query 值是否需 URL 编码后再参与签名 | 构造含中文 query 的 GET 请求分别签名测试 |
| V-06 | `shadcn-vue init` 在 Nuxt 4 下的实际组件目录与 `components.json` 配置 | 执行 init 后核对产物 |
| V-07 | CLI 实际生成的文件命名（`Button.vue` 还是 `button.vue`） | 执行 `add` 后查看产物 |
| V-08 | BoldKit 主题变量完整清单与 `--radius` 实际值 | 安装 `@styles` 后列出变量 |
| V-09 | `vue-echarts` 在 Nuxt 4 + SPA 下按需注册 ECharts 组件的推荐写法 | 查阅官方文档并实测包体积 |
| V-10 | `@antfu/eslint-config` 对单目录关闭「类型内联」「魔法值」规则的正确写法 | 配置后跑 lint 验证 |
| V-11 | ECharts 5 下散点图（528 点）的性能与可读性 | 实测; 不佳则启用双轴柱状图降级 |
| V-12 | 三个限速参数的实际取值是否被上游接受 | 真机大量拉取观察是否被限流 |
| V-13 | 页面关闭后任务队列的恢复行为 | 中途关闭页面再进入, 检查断点续传 |
| V-14 | `error` 态下本地既无缓存又无用户信息时的回退分支 | 实测该分支表现 |
| V-15 | ~~Cloudflare 免费档限额的当前实际数值~~ | **已确证**（2026-09-05 官方文档），见 `./cloudflare-pages-guide.md` 第七节 |
| V-16 | CF 免费档下完整统计是否触及限额 | 部署后跑一次完整统计并观察日志 |

### 2.2.1 相关说明

- **V-06 / V-07 / V-08** 仍需执行一次 CLI 才能得到确证结果（生成目录、文件命名、主题变量）。其中 D-03 已给出目标值 `app/constants/`；`app/components/ui/` 的最终路径与生成文件命名仍以 CLI 实际产物为准。
- **V-15 已关闭**：Cloudflare 免费档限额已确证, 见 `./cloudflare-pages-guide.md` 第七节。

### 2.3 待确认的次要项

暂无。D-06 与 D-07 已确认（见 2.1）。

### 2.4 已知规格空白

| 编号 | 内容 | 现状 | 建议 |
|---|---|---|---|
| ~~G-01~~ | `StatsResult` 六个统计分块的逐字段定义 | **已补齐**（`docs/data-model.md` 2.2.3 节, 含口径约束与 AI 占位符对应表） | — |
| **G-02** | IndexedDB 版本升级（`onupgradeneeded`）迁移策略未定义 | 当前 `IDB_VERSION: 1` | 首次需要新增 Object Store 或索引时定义 |
| **G-03** | IndexedDB 写入失败（`QuotaExceededError`）的用户可见行为未定义 | 528 本收藏 + 逐本详情可能触及配额 | 实现缓存写入层时定义失败提示与降级策略 |
| **G-04** | 500+ 数据点下图表是否采样或聚合未定义 | 散点图与年份分布桶数算法未定义 | 实现对应图表时实测后定义 |
| **G-05** | `/api/runtime/capabilities` 的响应缓存策略未定义 | 每次页面加载都调用还是缓存结果 | 实现能力探测时定义 |

## 三、AGENTS.md

- `AGENTS.md` **由 codex 工具生成与维护**, 本交互式规格审查流程不代为生成, 也不将其视为本流程的交付物。
- `PROJECT_SPEC.md` 的「AI Agent执行流程约束」与「文档索引」已注明该归属, 避免后续 Agent 误以为需要自行创建。
- 建议 codex 生成时覆盖以下内容（供参考, 不作为本流程的验收依据）：
  1. 项目定位与三个页面的作用。
  2. 技术栈与版本锁定（Node 24 / pnpm 11.5 / echarts 5 / Tailwind v4 / BoldKit 非图表组件）。
  3. 文档地图：哪类改动要查哪份文档（对应本文件第一节第 5 条的表格）。
  4. 强制约束摘要：禁止删除文件（迁移至 `./older/`）、禁止 `any`、类型集中 `types/`、UI 豁免区边界、禁止硬编码。
  5. 质量门禁命令与其执行顺序。
  6. 未决事项台账位置（指向本文件第二节）。
  7. 需要询问而非自行决定的事项清单（产品行为、安全模型、API Contract、数据模型、缓存策略、统计口径）。

## 四、使用方式

1. 开始实现某个功能前：检查本文件 2.1 节是否有阻塞该环节的未决项, 有则先解决。
2. 声称功能完成前：逐条核对第一节的 6 组条件。
3. 完成后：若引入了新的技术决策, 追加到第一节第 5 条对应的规格文档, 并在本文件 2.1 / 2.2 中登记新出现的未决事项。
