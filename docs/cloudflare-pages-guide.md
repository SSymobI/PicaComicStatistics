# Cloudflare Pages 部署帮助文档

本文件面向初次接触 Cloudflare Pages 的维护者, 说明本项目为什么需要 Pages Functions、两种部署方式如何选择, 以及从零到发布成功的完整步骤。

相关文件: `./deployment-spec.md`(CI/CD 总规格)、`./PROJECT_SPEC.md`(项目架构设计与环境变量)。

## 一、基本概念

| 名词 | 含义 | 在本项目中的角色 |
|---|---|---|
| Cloudflare Pages | 静态站点托管服务, 可从 Git 仓库自动构建, 也可由命令行上传产物 | 托管前端页面资源 |
| Pages Functions | Cloudflare 在 Pages 项目中提供的服务端能力, 由产物中的 Functions 入口承载 | 承载本项目 `server/api/*` 全部接口 |
| Workers | Cloudflare 的无服务器运行时, Pages Functions 底层即运行于 Workers | 提供 `crypto.subtle`、`fetch` 等运行时能力 |
| wrangler | Cloudflare 官方命令行工具 | 用于手动上传产物 |

## 二、本项目为什么需要 Functions

本项目渲染模式为 SPA(`ssr: false`), 但**并非纯静态站点**:

- 前端页面本身是静态资源。
- 所有数据请求都经过 `/api/*` 接口由服务端代理完成(登录、收藏、热榜、热搜、详情、AI 总结、运行时能力探测)。
- 因此部署到 Pages 时必须同时提供 Functions 入口, 否则 `/api/*` 会返回 404, 站点无法工作。

构建产物结构(以 `cloudflare-pages` 预设构建):

``` text

dist/
├── _nuxt/                  # 前端静态资源
├── _worker.js/index.js     # Functions 入口(承载 server/api/*)
├── _routes.json            # Pages 路由映射
└── nitro.json              # Nitro 产物元数据

```

> 本项目当前实际验证命令为 `pnpm build:cf`，产物目录是仓库根目录的 `dist/`，Functions 入口为 `dist/_worker.js/index.js`。Nitro 版本升级后仍应重新核对。

## 三、两种部署方式对比

| 维度 | 方式一: Git 集成 | 方式二: GitHub Actions + wrangler |
|---|---|---|
| 谁执行构建 | Cloudflare 侧 | GitHub Actions |
| 是否需要 CF API Token | 不需要 | 需要 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` |
| 是否满足「PR 合并到 master 后自动发布」 | 满足(推送到生产分支即自动构建发布) | 满足(需自行编写 workflow) |
| 与 `deployment-spec.md` 的 PR 检查是否重复构建 | 会重复(CI 构建一次、CF 再构建一次) | 不重复 |
| 环境变量配置位置 | CF 控制台 | CF 控制台 + GitHub secrets |
| 首次上手难度 | 低(零配置) | 中 |
| 需要维护的 CI 配置量 | 少 | 多 |

**已确认采用方式一（Git 集成）。** 方式二仅作为后续可选替代保留在本文件中, 当前**不实施**。

理由: Nuxt/Nitro 在 Pages 上支持零配置识别, 上手成本最低, 且不需要在 GitHub 存放任何 Cloudflare 凭据。

> 采用方式一后, `deployment-spec.md` 第四节的 secrets 清单为**空**; GitHub Actions 不承担任何发布动作。代价是 `master` 的构建会执行两次（Actions 做可行性校验、Cloudflare 做发布）, 已确认接受。

## 四、方式一: Git 集成（本项目采用）

1. 注册并登录 Cloudflare 账号, 进入控制台的 **Workers & Pages**。
2. 选择 **Create** → **Pages** → **Connect to Git**。
3. 授权 GitHub, 选择本项目的仓库。
4. 配置构建参数:
   - **Production branch**: `master`
   - **Build command**: `pnpm build:cf`(即 `nuxi build --preset=cloudflare-pages`)。若使用 CF 的零配置识别, 也可直接填 `nuxi build`, 由 Cloudflare 自动判定预设。
   - **Build output directory**: `dist`
   - **环境变量**: 若构建期需要指定 pnpm 版本, 按 `deployment-spec.md` 的版本要求添加; 构建期**不需要**任何模型密钥。
5. 保存并等待首次构建。构建日志可在项目的 Deployments 页查看。
6. 构建成功后, 站点会分配一个 `*.pages.dev` 域名, 可直接访问验证。
7. 在项目的 **Settings → Environment variables** 中配置运行时变量(见第五节)。
8. 之后每次 PR 合并进 `master`, Cloudflare 会自动重新构建并发布; 其他分支的推送会生成 Preview 部署。

## 五、运行时环境变量配置

在 CF 控制台项目的 **Settings → Variables and Secrets** 中添加:

| 变量名 | 类型 | 说明 |
|---|---|---|
| `NUXT_AI_API_KEY` | **Secret**(加密) | 模型密钥, 必须为加密类型 |
| `NUXT_AI_BASE_URL` | 变量 | 模型厂商地址 |
| `NUXT_AI_MODEL` | 变量 | 模型名 |
| `NUXT_AI_TEMPERATURE` | 变量 | 可为空, 空则用默认值 |
| `NUXT_AI_MAX_TOKENS` | 变量 | 可为空 |
| `NUXT_AI_TIMEOUT_MS` | 变量 | 可为空 |
| `NUXT_PICA_UPSTREAM_TIMEOUT_MS` | 变量 | 可为空 |

注意:

- 变量需区分 **Production** 与 **Preview** 环境, 建议两处都配置, 否则 Preview 部署的 AI 功能不可用。
- 密钥类变量**绝不**配置在构建期环境变量中, 只配置运行时环境变量。
- Cloudflare 的 SPA 项目在浏览器端不会看到这些变量, 因为它们仅由 Functions 读取。

## 六、方式二: GitHub Actions + wrangler

1. 在 Cloudflare 控制台创建 API Token: **My Profile → API Tokens → Create Token**, 权限选择 `Cloudflare Pages: Edit`。
2. 获取 **Account ID**(控制台右侧栏或项目概览页)。
3. 在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 在 `master` 的 workflow 中执行构建并上传:

``` yaml
- name: Build for Cloudflare Pages
  run: pnpm build:cf

- name: Publish to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=<CF项目名>
```

5. 首次发布前需先在 CF 控制台创建同名 Pages 项目(可创建为不含 Git 集成的空项目)。

注意:

- `--project-name` 必须与 CF 控制台中的项目名完全一致。
- 若同时启用 Git 集成, 会出现双份部署, 必须二选一。
- wrangler 命令行参数随版本变化, **实现阶段需以 wrangler 官方文档与 `wrangler pages deploy --help` 的实际输出为准**。

## 七、免费额度与限制

以下为 Cloudflare Pages 官方文档（Last updated 2026-09-05）在 **Free 计划**下的限额:

| 项目 | Free 计划限额 | 对本项目的影响 |
|---|---|---|
| 构建并发 | 1 个构建 | 连续推送时排队, 不影响正确性 |
| 每月构建次数 | 500 次 | Git 集成方式下每次推送都触发构建, 频繁推送需注意 |
| 单次构建超时 | 20 分钟 | 依赖安装耗时需控制在限额内 |
| 站点文件数 | 20,000 | 前端静态产物通常远低于此 |
| 单文件大小 | 25 MiB | 占位图与字体资源需注意 |
| Preview 部署数 | 不限 | 无影响 |
| 自定义域名(每项目) | 100 | 无影响 |
| 项目数(每账号) | 100 | 无影响 |
| Functions 请求 | **计入 Workers 计划配额**, 使用 Standard 计费模型 | 免费档为每日 10 万请求量级; 精确数值以 Workers 定价页当前说明为准 |
| 单请求内 subrequest | 免费档 50 量级 | **决定了本项目收藏分页不在服务端单次请求内循环** |

**限额如何决定本项目的架构**:

- `FetchPacing.DETAIL_BATCH_SIZE = 40` 即为「单请求 subrequest 上限留余量」的产物。
- 收藏分页（528 本 = 27 页）采用**前端逐页循环**, 每次请求服务端只做 1 次上游调用, 因此不受单请求 subrequest 限制。
- 若把分页循环放进服务端单次请求, 27 次上游调用虽在 50 以内, 但收藏量增长到 1000 本以上即会超限——这正是本项目选择前端循环的原因。

> 除上表外, 其余数值以 Cloudflare 官方定价页当前说明为准, 不得写死到代码中。

## 八、部署后验证清单

1. 访问 `*.pages.dev` 首页, 确认页面正常渲染, 无 404 资源。
2. 访问一个 API 路由(如 `/api/runtime/capabilities`), 确认返回 JSON 而非 404。若返回 404, 说明 Functions 未生效, 需核对构建输出目录与预设。
3. 打开浏览器开发者工具的 Network 面板, 确认 `/api/*` 请求返回 200。
4. 执行一次登录流程, 确认能取到 token。
5. 触发一次统计, 确认图表可渲染、图片可加载。
6. 打开 CF 控制台的 Functions 实时日志(Real-time Logs), 观察请求是否命中 Functions 以及是否报错。
7. 确认环境变量已生效: 调用一次 AI 总结, 若返回「未配置AI模型相关参数」(422), 说明变量未配置或未作用于当前环境。

## 九、常见问题

| 现象 | 可能原因 | 处理 |
|---|---|---|
| 首页正常但 `/api/*` 全部 404 | 构建输出目录填错, 或预设未生效, Functions 入口未产出 | 核对 Build output directory 为 `dist`; 核对构建日志中预设为 cloudflare-pages |
| 构建失败且提示缺少密钥 | 构建期误把模型密钥当作必填 | 本项目要求构建期不需要密钥; 检查是否在构建命令中做了密钥校验 |
| AI 接口返回 422 | 运行时环境变量未配置或未作用于该环境 | 在 Settings → Variables and Secrets 中补配, 注意区分 Production/Preview |
| 站点白屏 | SPA 入口未正确路由, 或资源路径错误 | 核对 `index.html` 是否产出; 检查浏览器控制台报错 |
| 单次详情请求超时 | 一次处理的书本数过多 | 降低 `DETAIL_BATCH_SIZE`, 见 `PROJECT_SPEC.md` 的限速语义 |
| 发布后仍是旧版本 | 缓存或部署未完成 | 查看 Deployments 列表确认最新部署状态; 必要时重新部署 |

## 十、已确认与待办

### 已确认

1. 发布方式: **方式一(Git 集成)**, 不需要 CF API Token。
2. 生产分支: **`master`**。
3. GitHub 仓库名: **`PicaComicStatistics`**（尚未在 GitHub 创建, 需先创建仓库再接入 CF）。
4. Preview 环境: **需要**配置与 Production 同等的运行时环境变量。

### 待办

1. **创建 GitHub 仓库** `PicaComicStatistics` 并推送 `master`。
2. **创建 CF Pages 项目**并接入该仓库; CF 侧的项目名可与仓库名一致（`PicaComicStatistics`）或另取, 以实际创建结果为准。
3. **决定是否绑定自定义域名**; 若不绑定则使用默认 `*.pages.dev` 域名。
4. **已验证**: 本地 `pnpm build:cf` 输出 `dist/_worker.js/index.js`、`dist/_nuxt/` 与 `_routes.json`；线上项目仍需确认 CF 构建目录映射。
5. **验证**: CF 免费档下 500+ 收藏的分页拉取是否触及限额。方法: 部署后用真实账号跑一次完整统计并观察 Functions 日志。
6. **验证**: CF 侧构建在无任何环境变量时能否成功（本项目要求构建期不需要密钥）。
