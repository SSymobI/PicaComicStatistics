# 部署与 CI/CD 规格

本文件是 `PROJECT_SPEC.md`「项目架构设计」中构建产物与 CI 流水线的展开规格。

对应主文档: `./PROJECT_SPEC.md` 项目架构设计、代码质量要求 / 质量门禁、环境变量。

## 一、运行环境版本

| 项 | 版本 | 说明 |
|---|---|---|
| Node.js | `24.x`(LTS) | 本地当前为 `v24.20.0`; Node 20.19+ 起 `crypto.subtle` 作为全局可用 |
| pnpm | `11.5.0` | 通过 `package.json` 的 `packageManager` 字段固定, 供 Corepack 与 CI 使用 |
| lockfile | `pnpm-lock.yaml` | 必须提交入库; 安装一律使用 `--frozen-lockfile` |

## 二、构建产物与命令

| 产物 | 构建命令 | 输出位置 | 校验方式 |
|---|---|---|---|
| Node 服务器 | `NITRO_PRESET=node-server nuxi build` | `.output/` | 产物存在 `server/index.mjs` |
| Cloudflare Pages | `nuxi build --preset=cloudflare-pages` | `dist/`（含 `_worker.js` Functions 入口与静态资源） | 产物存在 `dist/_worker.js/index.js`、`dist/_nuxt/` 与 `_routes.json` |
| Docker 镜像 | 上述 Node 产物 + 多阶段 Dockerfile | 本地镜像 | `docker build` 成功 |

Windows 下设置环境变量的写法与类 Unix 不同, 需在 `package.json` 脚本中通过 `cross-env` 或 Nuxt 的 `--preset` 参数表达, 避免依赖 shell 语法差异:

``` json
{
  "scripts": {
    "build:node": "nuxi build --preset=node-server",
    "build:cf": "nuxi build --preset=cloudflare-pages",
    "build:docker": "docker build -t picacomic-statistics:ci ."
  }
}
```

具体命令名以实现阶段实际配置为准, 但三个产物必须各自有独立可执行的脚本, 不得只保留一个默认 `build`。

## 三、CI 流程

### 3.1 PR 检查

触发条件: 向 `master` 发起或更新 PR。

| 步骤 | 命令 | 说明 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 使用 Node 24 与 pnpm 11.5.0 |
| 2 | `pnpm lint` | 不允许 warning 残留 |
| 3 | `pnpm typecheck` | `nuxt typecheck` |
| 4 | `pnpm test:unit` | 执行全部单元测试, 失败由人工判断原因 |
| 5 | `pnpm build:node` | Node 产物构建可行性 |
| 6 | `pnpm build:cf` | Cloudflare Pages 产物构建可行性 |
| 7 | `pnpm build:docker` | Docker 镜像构建可行性 |

约束:

- 上述 7 步全部必须在 PR 阶段执行, 不做「Docker/CF 只在 master 跑」的削减。
- 全部构建步骤**禁止注入真实密钥**, 也不得因缺少密钥而失败。缺失时按空值构建。
- 不产生覆盖率报告。单元测试失败即失败, 由人工判断是代码缺陷还是用例问题。
- 不执行冒烟测试, 不执行端到端测试。
- 允许启用依赖缓存与 pnpm store 缓存, 但需注意 GitHub 公开仓库的 Actions 配额限制, 缓存以不超配额为前提。
- 同一分支产生新提交时, 允许取消上一次仍在运行的流程, 以节省配额。

pnpm 11.5 的非交互环境会默认阻止依赖安装脚本。工作区根目录 `pnpm-workspace.yaml` 的 `allowBuilds` 明确允许 `esbuild`、`unrs-resolver` 和 `vue-demi` 构建；Docker 依赖层必须复制该文件，确保本地、GitHub Actions 与 Docker 的 frozen install 行为一致。不得在 CI 中调用交互式 `pnpm approve-builds`。

### 3.2 master 发布

触发条件: PR 合并进入 `master`。

**已确认的发布方式: Cloudflare Pages Git 集成。**

| 步骤 | 执行方 | 内容 |
|---|---|---|
| 1 | GitHub Actions | 重复 PR 检查的全部步骤（含三个产物的构建可行性校验） |
| 2 | Cloudflare Pages | 检测到 `master` 分支新提交后自动构建并发布 |

约束:

- **Docker 与 Node 产物仅做构建可行性校验, 不推送镜像、不上传 release、不产出交付物。**
- GitHub Actions **不执行任何发布动作**, 不调用 wrangler, 不配置任何部署类 secret。
- Cloudflare 侧承担构建与发布; 因此 `master` 的构建会执行两次（Actions 一次做可行性校验, Cloudflare 一次做发布）——这是已确认方式下的既定代价, 换取「GitHub 中不存在 Cloudflare 凭据」。
- Cloudflare 的构建命令与输出目录见 `./cloudflare-pages-guide.md` 第四节。

## 四、仓库与 GitHub 配置项

### 4.1 仓库信息

| 项 | 值 |
|---|---|
| GitHub 仓库名 | `PicaComicStatistics` |
| 生产分支 | `master` |
| 仓库状态 | 尚未在 GitHub 创建, 需由维护者创建后推送 |

### 4.2 Actions 使用的 secrets

**无。** 由于发布方式为 Git 集成, GitHub Actions 中不配置任何 secret:

- 不使用 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。
- 仓库中不得配置用于构建的真实模型密钥。模型密钥只在运行时目标环境的配置面板中设置。
- PR 检查的全部构建步骤在无密钥环境下执行, 且必须成功。

### 4.3 依赖缓存

| 缓存对象 | 键 |
|---|---|
| pnpm store | `pnpm-lock.yaml` 的哈希 |
| Node 依赖安装结果 | 同上 |

## 五、部署环境变量

三个目标环境注入环境变量的位置不同, 变量名保持一致。

| 环境 | 注入位置 |
|---|---|
| Node 服务器 / Docker | 进程环境变量(`.env` 或容器 `-e`), 由部署者提供 |
| Cloudflare Pages | Cloudflare 控制台项目的环境变量设置(区分 Production 与 Preview), 详见 `./cloudflare-pages-guide.md` |

- Cloudflare 环境中 `NUXT_AI_API_KEY` 必须配置为加密变量(Secret 类型), 不得使用明文变量。
- 所有环境均要求密钥为运行时注入, 不得写入仓库、不得写入 Dockerfile、不得作为构建参数传入。

## 六、已确认

| 编号 | 内容 | 结论 |
|---|---|---|
| D-01 | CF Pages 发布方式 | **Git 集成** |
| D-02 | 仓库名与生产分支 | 仓库 `PicaComicStatistics`; 生产分支 `master` |
| D-05 | Docker 基础镜像与分层 | 基础镜像 `node:24-alpine`; 三阶段构建（依赖安装 → 构建 → 运行时） |

## 七、待验证

1. Cloudflare Pages 线上构建环境的产物目录映射。当前本地 Nitro 版本实际输出为 `dist/`，包含 `dist/_worker.js/index.js` 与静态 `_nuxt/`；部署前仍需在 CF 控制台确认对应输出目录配置。
2. 本项目在 CF 免费档下跑完整统计（500+ 收藏分页拉取）是否触及限额。验证方法: 部署后用真实账号执行一次完整统计并记录请求数与耗时。
3. Cloudflare 侧的构建是否能在无环境变量的情况下成功（本项目要求构建期不需要密钥, 需实测确认 Nuxt/Nitro 构建不会因缺少 `NUXT_AI_*` 而失败）。
4. Docker 多阶段构建的实际分层是否可收敛（需实测镜像体积与构建时间）。
