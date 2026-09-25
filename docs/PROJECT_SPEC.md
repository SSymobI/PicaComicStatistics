## 项目名称

PicaComicStatistics 哔咔漫画个人收藏统计

## 文档索引

- 主规格: 本文件 `./PROJECT_SPEC.md`
- 数据模型规格: ./data-model.md
- 认证规格: ./auth-spec.md
- 部署与 CI/CD 规格: ./deployment-spec.md
- Cloudflare Pages 部署帮助: ./cloudflare-pages-guide.md
- UI 组件方案与使用边界: ./boldkit-guide.md
- 完成定义与未决事项台账: ./definition-of-done.md
- 哔咔漫画接口: ./picacomic-api.md
- 页面风格: ./design-guid.md
- 提交信息规范: ./commit-rule.md
- PR 规范: ./pr-rule.md
- AI 提示词: ./prompt/
- 用户协议与数据使用说明: ./user-agreement.md
- 工程约定与执行约束: ../AGENTS.md (由 codex 工具生成并由其维护, 本项目文档体系不代为生成)

## 项目目标

根据用户提供的哔咔漫画登录凭证,通过哔咔漫画官方接口获取用户收藏夹中的数据进行统计,并将统计结果以词云,饼图等可视化形式和AI总结形式展示给用户

## 使用场景

用户可以使用移动设备或台式机访问项目部署的站点,项目应根据访问者所使用的设备自适应展示内容

## 技术栈

- nuxt4
- vite
- typescript
- pinia
- BoldKit (非图表 UI 组件)
- echarts (5.x)
- vue-echarts (7.x)
- echarts-wordcloud (2.x)
- openai
- @antfu/eslint-config
- tailwindcss (v4)
- vitest
- husky
- pnpm

### UI 组件方案

UI 组件采用 **BoldKit**（Neubrutalism 组件库, MIT, 基于 shadcn/ui 与 Reka UI）替代原 Naive UI。安装与使用规格见 ./boldkit-guide.md。

| 项 | 决定 |
|---|---|
| 组件分发方式 | **shadcn-vue registry 源码分发**, 组件源码进入仓库 `app/components/ui/`, 不作为 npm 运行时依赖 |
| 依赖面 | `shadcn-nuxt`、`reka-ui`、`class-variance-authority`、`clsx`、`tailwind-merge`、`lucide-vue-next`（另按需 `@tanstack/vue-table`、`vue-sonner`） |
| 样式体系 | Tailwind v4 + BoldKit 主题 CSS 变量（`@boldkit/styles`） |
| 零圆角 | 由 BoldKit 主题变量 `--radius: 0rem` 保证, 项目内禁止出现 `border-radius` |
| Naive UI | **移除**, 代码中不得出现 `naive-ui` 与 `N*` 组件 |
| 使用范围 | 仅使用 BoldKit 的**非图表** UI 组件 |

#### 图表方案与版本裁决

**已核实的关键事实**: `echarts-wordcloud` 最新版为 2.1.0（2022-11 发布, 此后未更新）, 其 `peerDependencies` 为 `echarts: ^5.0.1`, 官方说明为「echarts-wordcloud@2 is for echarts@5」。而 BoldKit 的 Vue 图表依赖 `echarts ^6.0.0` 与 `vue-echarts ^8.0.1`。**两者无法同时满足。**

裁决:

- **词云为本项目必需能力**（2.2 / 2.3 / 2.4 三项统计均依赖), 不可放弃。
- 因此锁定 **`echarts 5.x` + `vue-echarts 7.x` + `echarts-wordcloud 2.x`**。
- 由此**不采用 BoldKit 的图表组件**（它们要求 echarts 6), 仅采用其非图表 UI 组件。
- 全部图表（词云、饼图、柱状图、散点图、环形图）由项目内自行基于 ECharts 5 封装, 主题变量取自 BoldKit 主题以保证观感统一。
- 若日后 `echarts-wordcloud` 发布支持 echarts 6 的版本, 可重新评估改用 BoldKit 图表组件; 该变更需重新确认。

该代价已被接受: 自封装全部图表的工作量由本项目承担, 换取词云能力与 ECharts 版本一致。

## 项目架构设计

- Nuxt版本: nuxt4
- 渲染模式: SPA
- 是否需要SSR: 否
- 前后端结构: Nuxt全栈模式
- 部署环境: Docker,cloudflare page,Node.js服务器
- 在 cloudflare page 环境中考虑 Pages Functions/Workers 方案
- 提供github action矩阵用于ci流水线构建发布, 以及发起pr中的代码检查
- Cloudflare Pages 采用 **Git 集成**方式发布（不需要 CF API Token, GitHub Actions 不执行发布动作）, 详见 ./deployment-spec.md

### 目录约定

| 用途 | 路径 |
|---|---|
| 类型定义 | `types/` |
| 服务端常量 | `server/constants/` |
| 前端常量（图表载体、UI 相关枚举） | `app/constants/` |
| Vendored UI 组件（BoldKit 源码） | `app/components/ui/`（代码质量豁免区） |
| 业务组件 | `app/components/business/` |

项目目录结构: Nuxt官方结构

最终构建产物为:

| 产物                               | 命令                                         | 部署目标                                          |
| -------------------------------- | ------------------------------------------ | --------------------------------------------- |
| Cloudflare Pages (含 Functions 代理) | `NITRO_PRESET=cloudflare-pages nuxi build` | CF Pages，server/api 自动编译为 Pages Functions     |
| Node 服务器                         | `NITRO_PRESET=node-server nuxi build`      | `.output/` 直接 `node .output/server/index.mjs` |
| Docker 镜像 (提供dockerfile不用构建成品镜像)                        | 同上 + 多阶段 Dockerfile                        | 可运行docker容器的服务器                                |

CI 中 Docker 环节只做 `docker build` 与冒烟启动校验, 不推送镜像、不构建成品镜像交付物。

## 构建与运行时的密钥边界

- `NUXT_AI_API_KEY` 等模型密钥为**运行时**必填, **构建时不得为必填**。任何构建产物(CF Pages / Node / Docker)在缺少该密钥时必须能成功构建。
- 密钥校验发生在首次调用 AI 接口时的服务端运行时, 缺失时该接口返回明确错误, 不阻塞站点启动与统计功能。
- CI 的所有构建任务**禁止**注入真实密钥, 也不得因缺少密钥而失败。

## 代码质量要求

- 使用 @antfu/eslint-config 通用代码约束格式化
- 确保句末分号,项目中字符串引号使用单引号
- 禁止 any 类型, 启用TypeScript strict模式
- 所有枚举类不允许使用ts的enum, 使用 export const 枚举名 = {} as const
- Vue组件使用大写驼峰命名, 并使用Composition API
- typescript文件以及方法名使用小驼峰,枚举名使用大驼峰
- 所有自定义type,interface,declare等d.ts文件单独分类至于统一目录内,不允许在业务脚本内定义
- 禁止在vue组件和业务实现typescript文件中使用不必要的魔法值, 魔法值应从配置文件或枚举中读取

### 质量门禁

以下命令在 PR 检查与本地提交前均需通过, 任一失败视为未完成:

| 门禁 | 命令 | 说明 |
|---|---|---|
| Lint | `pnpm lint` | `@antfu/eslint-config`, 不允许 warning 残留 |
| Type Check | `pnpm typecheck` | `nuxt typecheck`(内部使用 `vue-tsc`), 启用 `strict` |
| Unit Test | `pnpm test:unit` | 仅核心统计函数, 见「测试规格」 |
| Build 可行性 | `pnpm build:node` / `pnpm build:cf` / `pnpm build:docker` | 三个产物均需构建成功 |

`@antfu/eslint-config` 的默认格式化偏好(分号、引号)与本节要求可能存在冲突, 需通过在 `nuxt.config`/`eslint.config` 中显式配置 stylistic 选项对齐为「句末分号 + 单引号」, 不得依赖默认值。

### 运行环境版本

| 项 | 版本 | 说明 |
|---|---|---|
| Node.js | `24.x`(LTS) | 本地与 CI 一致; 需 Node 20.19+ 才能使用全局 `crypto.subtle` |
| pnpm | `11.5.0` | 通过 `packageManager` 字段固定 |
| lockfile | `pnpm-lock.yaml` 提交入库 | CI 与本地安装一律使用 `--frozen-lockfile` |
| lockfileVersion | 随 pnpm 11 生成 | pnpm 主版本变更时需整体重新生成, 不允许混用版本 |

- 禁止在 CI 中使用 `pnpm install`(非 frozen) 或让 CI 更新 lockfile。
- 构建缓存允许启用(Node 依赖缓存与 pnpm store 缓存), 但需注意 GitHub 公开仓库的 Actions 资源配额限制, 缓存策略以不超出配额为前提。

## 代码分支管理要求

- master为主分支, 禁止向远程master分支直接合并, 如需合并功能则向master分支发起pr
- 提交信息严格按照 Conventional Commits 规范输出
- 禁止使用高危git命令
- 更详细的 pr 要求参考 ./pr-rule.md, Conventional Commits 规范参考 ./commit-rule.md

## AI Agent执行流程约束

- 禁止在该项目工程下执行文件删除操作,如果想要删除某些文件则将这些文件迁移至./older文件夹中由用户决定是否删除。该限制仅约束 AI Agent, 普通贡献者无需遵守; `./older/` 需加入 git 忽略文件, 且因 Git 不跟踪空目录, 该目录需保留一个 `.gitkeep` 占位文件
- 生成AGENTS.md文件, 当项目功能推进时同步更新AGENTS.md内容。该文件由 codex 工具生成与维护, 本项目的交互式规格审查流程不代为生成
- 在需要修改业务实现,修复bug,实现新功能时询问用户是否提交当前修改
- 对用户输入的提示词的功能描述不清晰,实现存在歧义的地方进行询问,得到精准确认的结论后提供执行计划供用户确认是否执行
- 在windows平台上终端优先使用 PowerShell 使用前考虑 PowerShell 的输入输出乱码问题以及不同版本间命令错误使用问题, 避免因为上述错误导致目标命令的重复执行
- 在三方依赖的引用上优先考虑支持Nuxt生态,Vue生态,TypeScript的活跃依赖。 功能实现,问题修复如有可靠且活跃的三方依赖解决方案则使用方案而不是项目内代码解决

### 哔咔漫画API文档

- 本地位置: ./picacomic-api.md
- 开源文档: https://github.com/FreeNowOrg/PicaComicNow/blob/master/docs/picacomic-api.md

## API封装规范

禁止前端页面直接在页面内请求哔咔漫画接口, 需通过请求后端服务由后端服务代理请求处理数据返回前端页面

哔咔漫画官方的接口封装至 picComicAPI.ts 例如

#### 签名请求头生成基准

- 通用请求头字段固定值从 `PicaComicAPIConfig` 枚举获取, `time` / `nonce` / `signature` 三项动态计算。
- `raw` 串拼接顺序、参数顺序与待验证项见「统计指标定义 / 1.1.1 签名 raw 参数顺序(待验证项)」。
- `raw` 串参与 HMAC 计算前统一转小写。
- 批量请求多个 `comics/{bookId}` 时, **每一次**上游请求都必须重新生成 `time`、`nonce` 与 `signature`, 严禁复用同一次签名。

``` typescript
// 封装哔咔漫画服务接口的方法
export function picaLogin(username: string, password: string): Promise<返回值类型> {
  //  哔咔漫画的API基址和接口地址从对应枚举中获取
  //  nuxt的请求封装配合自定义的请求头处理函数...
  //  返回处理结果
}
```

哔咔漫画接口请求头验证处理 picComicHeaderHandler.ts ,其中动态请求头处理方式如下

``` typescript
// 动态请求头处理方法需要调用提供请求的接口以用于处理中的 raw 生成逻辑
// 除了登录以外的所有接口请求时需要额外添加authorization字段，通用请求头有以下字段
// Accept, api-key, app-channel, app-version, app-uuid, app-platform, app-build-version, User-Agent, image-quality, Content-Type, time, nonce, signature
// 其中除了time, nonce, signature外请求头值为固定值，从对应枚举中获取，time, nonce, signature 三项需要动态计算，过程如下所示

// SIGNATURE_KEY为定值从枚举中获取
const SIGNATURE_KEY = '';
async function hmacSha256Hex(key, message) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    {
      name: 'HMAC',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
const time = Math.floor(Date.now() / 1000).toString();
const nonce = crypto.randomUUID()
  .replace(/-/g, '');
/*
    raw中 APIKEY 为请求头中的 api-key 从对应枚举获取
    当以GET方式携带参数请求一个哔咔漫画接口时如 users/favourite?page=1&s=ua 必须是带参全址
    如GET请求不携带参数如 users/profile 则与POST请求方式一样不需要接口地址中体现参数
    另一种情况POST方式请求时如 auth/sign-in 现在 GET 的位置需要替换为 POST
*/
const raw
  = `users/favourite?page=1&s=ua${
    time
  }${nonce
  }GET`
  + `APIKEY`;

const signature = await hmacSha256Hex(
  SIGNATURE_KEY,
  raw.toLowerCase()
);
// 返回处理完成后完整的请求头
```

server/api/目录下为前端业务请求接口,其中会调用封装的哔咔漫画接口并处理数据后返回前端

## 数据模型设计

使用pinia进行状态管理, 业务数据保存在使用用户本地设备上, 不保存该项目部署的服务器上。

完整数据模型定义见 ./data-model.md。

### 1.三层数据模型

为区分「原始数据」与「派生结果」, 数据模型按以下三层划分:

| 层级 | 名称 | 说明 | 是否持久化 |
|---|---|---|---|
| 第一层 | Raw 原始缓存 | 与上游哔咔漫画接口响应结构一致, 不做业务加工 | 持久化至 IndexedDB |
| 第二层 | StatsResult 统计结果 | 由第一层数据经纯函数派生的统计结果 | 持久化至 IndexedDB |
| 第三层 | Runtime 运行时状态 | pinia 中的登录态与页面态, 刷新即重建 | 不持久化(除凭证类) |

派生原则:

- 第一层数据变更后, 第二层统计结果**必须**重算, 不允许直接从上游数据跳过后重新展示旧统计结果。
- 第二层统计结果可以独立于上游数据重新计算, 即清空统计缓存时无需重新请求上游接口(详情类统计除外)。
- 第二层统计计算为前端纯函数, 不依赖运行时状态, 输入输出均为确定值, 便于单元测试。

### 2.类型定义目录

所有自定义 type、interface、declare 统一置于项目根目录 `types/` 下, 禁止在业务脚本与 Vue 组件内定义。目录文件划分与各模型字段定义见 ./data-model.md。

## 页面风格设计

详细页面风格设计参考 ./design-guid.md

## 登录认证设计

从pinia存用户登录token的store中获取token如果没有则让用户登录, 如果存在token则调用哔咔漫画接口的
users/profile确认token是否过期(token有7天的有效期), 如果失效则让用户重新登录

认证状态机与 token 生命周期完整规格见 ./auth-spec.md。

### 1.认证状态

认证状态由 pinia 的 auth store 作为唯一状态源维护, 全局仅允许处于以下 6 态之一:

| 状态 | 含义 |
|---|---|
| `anonymous` | 本地无 token |
| `logging-in` | 正在提交登录请求 |
| `authenticated` | 已有 token 且在本会话内校验通过 |
| `validating` | 正在调用 users/profile 校验 token |
| `expired` | token 存在但已失效 |
| `error` | 非 token 原因的失败(网络错误 / 上游异常) |

### 2.状态迁移

| 触发场景 | 迁移 |
|---|---|
| 应用启动 / 浏览器刷新 | 有 token 则 `validating`, 无 token 则 `anonymous`; 不从 localStorage 直接进入 `authenticated` |
| 提交登录 | `logging-in` |
| 登录成功 | `authenticated`, 写入 token 与 userId |
| 登录失败 | `anonymous`, 展示失败提示 |
| profile 校验通过 | `authenticated` |
| profile 校验返回 token 失效(401 或 JWT exp 已过) | `expired` |
| 上游返回 401 | `expired`, 清除 token, 重置 auth store, 导航至首页(见第 4 条) |
| 网络错误 / 上游 5xx | `error`, 保留 token 不自动登出 |
| 用户主动登出 | `anonymous`, 清除 token 与内存态, IndexedDB 数据保留(见缓存机制第 5 条) |
| 用户切换(登出后登录另一账号) | 清除上一个用户的全部内存态, IndexedDB 中两账号数据并存 |

### 3.路由守卫

由全局路由中间件守卫受保护页面, auth store 为状态核心源。访问受保护页面前必须确保状态为 `authenticated`, 否则按第 1 条取得状态后决定跳转。

### 4.401 与导航目标

- 上游返回 401 时, 清除本地 token 并导航至**首页** `/`。
- 首页为公开页面, 提供进入统计功能的入口; 用户再次进入受保护页面时因 `anonymous` 被引导至 `/login`。
- JWT exp 已过期同样按 401 处理。
- 网络错误与 5xx **不得**清除 token, 也不得触发导航。
- 处于 `error` 状态时, 允许用户使用本地未过期的缓存统计继续浏览, 但**必须显式告知该缓存数据的生成时间**, 不得让用户误以为是最新数据。提示文案固定为: `数据请求异常，当前展示的是本地缓存（生成于 YYYY-MM-DD hh:mm:ss）`。

### 5.token 读取顺序

token 以 localStorage 中的 `StorageKeys.TOKEN` 为持久真源, pinia 中的 token 为内存镜像。读取时以 localStorage 为准, 刷新页面后由 localStorage 水合至 pinia。不接受仅存在于内存的 token。

## 统计指标定义

### 1.数据涉及接口

#### 1.1 用户收藏夹请求 GET users/favourite?page={page}&s={sort}

参数信息为:

| 参数 | 说明 |
|---|---|
| `page` | 页码，从 1 开始 |
| `s` | 排序方式 |

排序方式为:

| 值 | 说明 |
|---|---|
| `ua` | 默认 |
| `dd` | 最新发布 |
| `da` | 最早发布 |
| `ld` | 最多喜欢 |
| `vd` | 最多浏览 |

请求成功后返回结果类似

``` json5
{
  "code": 200,
  "message": "success",
  "data": {
    "comics": {
      "pages": 27, // 总页数
      "total": 528, // 总计收藏漫画数
      "docs": [
        {
          "_id": "691605a329735b72b409634b", // 漫画id
          "title": "", // 标题
          "author": "", // 作者
          "totalViews": 153772, // 总浏览量
          "totalLikes": 1494, // 总点赞量
          "pagesCount": 81, // 漫画页数
          "epsCount": 1, // 漫画章节统计
          "finished": true, // 是否完结
          "categories": [], // 漫画分类
          "tags": [], // 漫画tags
          "thumb": {
            "originalName": "", // 缩略图名
            "path": "", // 缩略图路径
            "fileServer": "" // 图片服务器地址
          },
          "likesCount": 1494
        }
      ],
      "page": 1, // 当前页数
      "limit": 20 // 分页大小
    }
  }
}
```

分页获取用户所有收藏漫画基础信息, 基础数据直接保存至用户本地缓存, 用于生成基础统计结果。分页单页面固定大小为20

#### 1.1.1 签名 raw 参数顺序(待验证项)

- 参数顺序**以 Apifox 实测脚本为准**, 不采用字母序假设。按此结论, `comics/leaderboard` 的 raw 串为 `comics/leaderboard?tt=H24&ct=VC`, 其中 `tt` 在 `ct` 之前, 与字母序相反。
- 已实测通过的 raw 串形态如下, 作为实现基准:

``` typescript
// POST 且无 query 参数
const rawSignIn = `auth/sign-in${time}${nonce}POST${API_KEY}`;
// GET 且带 query 参数, 必须为带参全址
const rawFavourite = `users/favourite?page=1&s=ua${time}${nonce}GET${API_KEY}`;
// GET 且带 query 参数, 参数顺序按此固定模板
const rawLeaderboard = `comics/leaderboard?tt=H24&ct=VC${time}${nonce}GET${API_KEY}`;
```

- 待验证项(实现阶段需一次性探针实验确认, 不得由实现者凭经验假设):
  - 上游是否对 query 参数做规范化排序。验证方法: 使用同一 token 分别以 `tt=H24&ct=VC` 与 `ct=VC&tt=H24` 请求 leaderboard, 比较是否均返回 200。
  - query 值含非 ASCII 字符(如中文关键词、含 `/` 的分类名)时, raw 串使用原始值还是 URL 编码后的值。验证方法: 构造一个含中文 query 的 GET 请求, 分别以两种方式签名并请求, 记录结果。
- 在待验证项得出确定结论前, 各接口的 query 拼接顺序以 Apifox 实测模板为准, 且要求 raw 串与真实请求 URL 的 query 顺序保持一致。

#### 1.2 热门排行榜请求 GET comics/leaderboard?tt={timeRange}&ct={countType}

参数信息为:

| 参数 | 值 | 说明 |
|---|---|---|
| `tt` | `H24` | 过去 24 小时 |
| `tt` | `D7` | 过去 7 天 |
| `tt` | `D30` | 过去 30 天 |
| `ct` | `VC` | 按浏览量排行（目前唯一有效值） |

请求成功后返回结果类似

``` json5
{
  "code": 200,
  "message": "success",
  "data": {
    "comics": [
      {
        "_id": "6aa56bf1aa280b4a379b4865",
        "title": "",
        "author": "",
        "totalViews": 452096,
        "totalLikes": 6373,
        "pagesCount": 58,
        "epsCount": 1,
        "finished": true,
        "categories": [],
        "tags": [],
        "thumb": {
          "originalName": "",
          "path": "",
          "fileServer": ""
        },
        "leaderboardCount": 4340,
        "viewsCount": 4340
      }
    ]
  }
}
```

#### 1.3 热门搜索词请求 GET /keywords

请求成功后返回结果类似

``` json5
{
  "code": 200,
  "message": "success",
  "data": {
    "keywords": [] // 关键字字符串数组
  }
}
```

#### 1.4 漫画详情 GET /comics/{bookId}

响应字段 (comic 对象):

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 漫画 ID |
| `_creator` | object | 上传者信息 |
| `title` | string | 标题 |
| `description` | string | 简介 |
| `thumb` | Thumb | 封面 |
| `author` | string | 作者 |
| `chineseTeam` | string | 汉化组 |
| `categories` | string[] | 分类 |
| `tags` | string[] | 标签 |
| `pagesCount` | number | 总页数 |
| `epsCount` | number | 总章节数 |
| `finished` | boolean | 是否完结 |
| `updated_at` | string | 更新时间 |
| `created_at` | string | 创建时间 |
| `allowDownload` | boolean | 是否允许下载 |
| `allowComment` | boolean | 是否允许评论 |
| `totalLikes` | number | 总喜欢数 |
| `totalViews` | number | 总浏览数 |
| `totalComments` | number | 总评论数 |
| `viewsCount` | number | 浏览计数 |
| `likesCount` | number | 喜欢计数 |
| `commentsCount` | number | 评论计数 |
| `isFavourite` | boolean | 当前用户是否收藏 |
| `isLiked` | boolean | 当前用户是否喜欢 |

### 2.统计内容

#### 2.1 收藏概览统计

根据所有收藏漫画基础数据统计：

##### 2.1.1 收藏数量

统计用户收藏漫画总数量。

##### 2.1.2 作者数量

根据 author 字段去重统计收藏涉及作者数量。

##### 2.1.3 分类数量

根据 categories 数组去重统计收藏涉及分类数量。

##### 2.1.4 标签数量

根据 tags 数组去重统计收藏涉及标签数量。

##### 2.1.5 完结状态统计

根据 finished 字段统计：

- 已完结漫画数量
- 未完结漫画数量

返回供饼图展示的数据。

#### 2.2 分类词云

获取用户收藏的所有漫画详细信息。获取 docs 对象中的 categories 数组。按照分类名称统计出现次数。返回供 echarts-wordcloud 生成词云的数据格式。

#### 2.3 标签词云

获取用户收藏的所有漫画详细信息。获取 docs 对象中的 tags 数组。按照标签名称统计出现次数。返回供 echarts-wordcloud 生成词云的数据格式。

#### 2.4 作者词云

获取用户收藏的所有漫画详细信息。获取 docs 对象中的 author 字段。按照作者名称统计出现次数。返回供 echarts-wordcloud 生成词云的数据格式。

#### 2.5 分类、标签、作者分布统计

根据词云统计结果生成对应饼图数据。

统计内容包括：

- 分类收藏数量占比
- 标签收藏数量占比
- 作者作品数量占比

当分类、标签、作者数量过多时，仅展示 TOP 数据，其余合并为其他。

#### 2.6 收藏作品热度分析

根据收藏漫画基础数据中的：

- totalViews
- totalLikes

进行统计。

##### 2.6.1 浏览量排行榜

统计 totalViews 最大的 TOP10 漫画, 返回。

- 漫画标题
- 作者
- 浏览量
- 点赞量
- 分类
- 标签
- 缩略图

##### 2.6.2 点赞量排行榜

统计 totalLikes 最大的 TOP10 漫画。

- 漫画标题
- 作者
- 浏览量
- 点赞量
- 分类
- 标签
- 缩略图

##### 2.6.3 点赞率分析

*点赞率 = totalLikes / totalViews*

统计收藏漫画点赞率排行。

用于分析：

- 高热度作品
- 高认可度作品
- 小众高质量作品

返回供散点图展示的数据。

#### 2.7 收藏内容规模分析

根据：

- pagesCount
- epsCount

统计收藏漫画内容规模。

统计指标:

- 平均章节数量
- 平均页数
- 最大章节数量
- 最大页数
- 长篇漫画数量
- 短篇漫画数量

口径补充:

- 平均值与最大值的分母为**有效记录数**, 即 `pagesCount` / `epsCount` 为非 `null`、非 `undefined` 且为有限数字的收藏记录数。缺失值不按 0 计算。
- 有效记录数为 0 时, 平均值与最大值取 0, 不产生 `NaN`。
- `longFormRatio` = 长篇数量 / 有效记录数; `shortFormRatio` = 短篇数量 / 有效记录数。分母为 0 时取 0。
- 长短篇判定阈值见 3.3。中篇数量同时返回, 便于前端校验三段占比之和为 1。

返回供柱状图展示的数据。

#### 2.8 漫画详情增强数据获取

根据 漫画详情 接口 获取收藏基础接口不存在的扩展信息。

详情数据包括:

- 漫画创建时间
- 漫画更新时间
- 总评论数量

详情数据不作为首次收藏统计的必要数据。当用户收藏数量较大时，不一次性请求全部漫画详情。

采用以下策略:

- 1.首次获取收藏列表后立即生成基础统计。
- 2.用户开启深度分析后，按照任务队列逐步请求漫画详情。
- 3.已获取详情数据保存至本地缓存。
- 4.根据缓存时间判断是否重新请求详情数据。

#### 2.9 漫画生命周期分析

根据漫画详情中的创建时间、更新时间统计。

##### 2.9.1 创建年份分布

统计收藏漫画按照创建年份的数量。用于分析用户收藏作品年代偏好。

##### 2.9.2 最近更新时间分析

统计最近更新时间范围内的漫画数量。

例如:

- 最近7天更新
- 最近30天更新
- 最近365天更新
- 超过一年未更新

四档为互斥区间, 覆盖全部有有效更新时间的记录, 对应 `UpdateRecencyBuckets`。

返回供饼图或柱状图展示

#### 2.10 评论互动分析

根据漫画详情中的评论数量统计。

统计:

- 评论数量 TOP10 漫画
- 平均评论数量
- 收藏漫画评论总量

结合:

- totalViews
- totalLikes
- commentsCount

计算漫画互动指数。

*互动指数 = 浏览量权重 + 点赞量权重 + 评论量权重*

用于分析收藏作品活跃程度。

#### 2.11 热门排行榜关联分析

根据用户选择时间范围获取平台热门漫画。与用户收藏数据进行比较。统计:

##### 2.11.1 收藏热门命中数量

统计用户收藏漫画中存在于当前热门排行榜中的数量。

命中判定口径:

- 判定键为漫画 `_id`, 精确字符串相等。不允许按标题、作者或标题+作者匹配。
- 两侧数据均需在比较前剔除 `_id` 为空或缺失的记录。
- 排行榜返回条数上限为 40 条, 因此 `hitCount` 的理论上限为 40, 但展示时不得以 40 作为分母。
- 命中率分母为**收藏总数**, 即 `hitRate = hitCount / totalFavourites`。

##### 2.11.2 热门分类关联

比较：

- 用户收藏分类分布
- 平台热门分类分布

输出结构(结构化对象, 不返回单一百分比):

``` typescript

{
  userDistribution: WordStat[],   // 用户在对比范围内的分类分布
  hotDistribution: WordStat[],    // 平台热门在对比范围内的分类分布
  overlapNames: string[],         // 两侧同时出现的分类名(归一化后比较, 展示归一化名)
  overlapCount: number,           // overlapNames 的长度
  userOverlapPercent: number,     // overlapNames 覆盖的用户分类条目数 / 用户分类条目总数
  hotOverlapPercent: number       // overlapNames 覆盖的热门分类条目数 / 热门分类条目总数
}

```

- 两侧名称比较使用 3.6 的归一化规则。
- 分母为 0 时, 对应百分比取 0, 不产生 `NaN` 或 `Infinity`。

##### 2.11.3 热门标签关联

比较：

- 用户收藏标签分布
- 平台热门标签分布

输出结构与 2.11.2 完全一致, 仅数据源替换为 `tags`。

##### 2.11.4 热门作者关联

比较：

- 用户收藏作者
- 热门漫画作者

输出结构与 2.11.2 完全一致, 仅数据源替换为 `author`, 并按 3.6 的规则执行作者拆分与归一化; 「未知作者」不参与重合计算。

三项关联的对比范围: 用户侧取词云口径的全量分布, 热门侧取排行榜返回的全部条目。返回供对比柱状图展示。

#### 2.12 热门搜索词关联分析

根据 热门搜索词请求 接口获取平台当前热门搜索关键词。与用户收藏漫画的 `categories` 与 `tags` 进行匹配, 统计以下三项:

- 热门关键词命中数量
- 用户收藏相关标签数量
- 兴趣匹配比例

口径定义:

- 命中判定: 热搜关键词与用户 `categories` / `tags` 条目经 3.6 归一化后精确相等即视为命中。不做子串包含匹配。
- `hitKeywordCount` = 命中至少一次的热搜关键词数量。
- `userRelatedTagCount` = 被任意热搜关键词命中的用户分类与标签条目去重后的数量。
- `interestMatchRatio` = `hitKeywordCount / 热搜关键词总数`。热搜关键词总数为 0 时取 0。
- 另返回 `hitKeywordList`, 为命中关键词的原始写法列表, 供前端与 AI 模块展示。

返回供关联分析展示。

### 3.统计内容细节补充

#### 3.1 饼图 TOP 分布阈值

- 分类饼图: TOP 10

- 标签饼图: TOP 10

- 作者饼图: TOP 10

- 其余合并为「其他」

- 若剩余项只有 1 项，不合并，直接显示该项原名

- 排序：次数降序；次数相同按名称升序，保证结果稳定

- 词云可放宽为 分类 TOP 30、标签 TOP 80、作者 TOP 50

#### 3.2 互动指数权重

权重为: `浏览量 : 点赞量 : 评论量 = 1 : 3 : 5`

不直接用原始值加权, 建议取对数方式处理

``` typescript
const viewsScore = Math.log10(comic.totalViews + 1);
const likesScore = Math.log10(comic.totalLikes + 1);
const commentsScore = Math.log10(comic.totalComments + 1);

const interactionIndex
  = viewsScore * INTERACTION_WEIGHTS.views
    + likesScore * INTERACTION_WEIGHTS.likes
    + commentsScore * INTERACTION_WEIGHTS.comments;
```

同时返回归一化分, 供展示 0~100 分使用:

``` typescript
const normalized = maxIndex > 0 ? (interactionIndex / maxIndex) * 100 : 0;
```

归一化口径:

- 统计结果中**同时返回** `interactionIndex`(原始加权分)与 `interactionIndexNormalized`(0~100 归一化分)。
- `maxIndex` 取**当前统计集合内的最大值**(未开启深度分析时为浅层口径下的最大值)。
- 排序一律使用原始加权分 `interactionIndex`。归一化分只用于展示, 不参与排序、不参与比较。
- 集合内所有 `maxIndex` 为 0 时, 归一化分统一取 0。

未开启深度分析时没有评论数据，此时互动指数应标记为“浅层互动指数”，只使用浏览和点赞，评论项不参与。

#### 3.3 长短篇判定

按 pagesCount 判断, epsCount 只作为辅助统计

默认口径：

- 短篇: pagesCount < 50

- 中篇: 50 <= pagesCount < 100

- 长篇: pagesCount >= 100

统计时:

- 平均章节数、平均页数、最大章节数、最大页数照常计算。

- 长篇数量 = pagesCount >= longMinPages 即 >= 100

- 短篇数量 = pagesCount < shortMaxPages + 1, 即 < 50

#### 3.4 点赞率与 views=0

- views <= 0 的记录从点赞率排行中剔除。

- 平均点赞率也只统计 views > 0 的记录。

- 同时记录 excludedZeroViewsCount. 便于前端提示“已排除 N 条异常数据”。

- 若 views = 0 且 likes > 0, 视为异常数据, 不参与点赞率统计。

- 若 views > 0 且 likes = 0, 点赞率正常为 0。

- 排序时过滤 null 值。

#### 3.5 时区处理

- 生命周期分析、创建年份分布、最近更新时间，统一按浏览器本地时区计算。

- 统计逻辑在前端以纯函数实现, 服务端仅做无状态代理, 统前端应传入 IANA 时区，例如：`const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;`

- 服务端 fallback 为 Asia/Shanghai

- API 返回时间统一用 ISO 8601 字符串，展示时再转本地时区。

#### 3.6 作者去重与归一化

做归一化比较, 但展示保留原始写法

归一化规则:

- trim()

- 全角转半角

- 连续空白合并为单个空格

- 英文转小写

- 去除首尾多余标点

作者字段如果包含多个作者, 可按常见分隔符拆分："," "，" "/" "、" "&" "and" 拆分后再分别归一化、去重。展示名取出现次数最多的原始写法。分类和标签也建议同样处理，例如 NTR 和 ntr 应合并。空作者归为「未知作者」，但不计入去重作者数。

### 4.缓存机制

针对一次完整的数据统计考虑设计一个用户侧存储的数据存储机制, 使用pinia配合浏览器的IndexedDB存储, 并设置统计数据的过期时间。同时在前端页面上提供用户立即重新生成统计报告的功能并限制使用用户一天中重新生成的次数。该缓存机制中的可控配置以枚举方式形成。

#### 4.0 存储介质划分

- localStorage 仅存放轻量凭证与计数类数据: 登录 token、重新生成次数计数、用户偏好。
- IndexedDB 存放业务数据: 收藏列表、漫画详情、统计结果、热榜与热搜词、AI 总结。
- 任何业务数据都不上传、不保存至项目部署的服务器上。

#### 4.0.1 用户隔离

所有私有数据的分区键必须包含 userId, 严禁在未携带 userId 的条件下读写私有数据。

| Object Store | 数据归属 | keyPath |
|---|---|---|
| `favourites` | 私有 | `userId` |
| `details` | 私有 | `[userId, comicId]` 复合主键 |
| `stats` | 私有 | `userId` |
| `aiSummary` | 私有 | `userId` |
| `hot` | 全局共享 | 固定主键(热榜与热搜词为平台公共数据, 不含 userId) |

- 读取私有数据时必须携带 userId, 不允许出现「取最后一条」的回退逻辑, 以避免跨用户读取。
- 用户登出时**不**清空 IndexedDB 数据, 以便再次登录同一账号时复用未过期缓存。

#### 4.0.2 本地保留用户数量上限

- 允许保留本地缓存的用户账号数量存在上限, 默认 3 个。
- 上限判定时机为登录成功后; 若新账号不在现有缓存账号集合中且当前账号数已达上限, 则按「最后登录时间」升序淘汰最早的账号数据, 直至腾出空位。
- 淘汰需覆盖该 userId 在 `favourites`、`details`、`stats`、`aiSummary` 四个 store 中的全部记录, 以及 localStorage 中该 userId 的重新生成计数。
- 该上限以枚举形式提供, 当前默认值为 3。此处「淘汰」指删除浏览器中的运行时缓存记录, 与本项目源码文件无关。

#### 4.0.3 TTL 起算点

| 缓存类型 | TTL 起算点 | 过期粒度 |
|---|---|---|
| 收藏基础统计 | 该批统计结果生成时间 | 按 userId |
| 热门排行榜 / 热门关键词 | 各自最近一次成功获取时间 | 全局 |
| 漫画详情 | 该本详情最近一次成功获取时间 | 按 `[userId, comicId]`, 单本独立判定 |
| AI 总结 | 该总结生成时间 | 按 userId |

单本详情过期只影响该本漫画的重新请求判定, 不影响其他详情与基础统计。

完整的流程为:

情况1 用户从来没有登录过该项目网站:

- 1.登录成功后使用用户登录后的token执行收藏数据统计
- 2.配合pinia将统计结果保存在使用用户本地浏览器的IndexedDB并记录该批统计数据的创建时间
- 3.按照业务流程向前端返回统计数据

情况2 用户登录过该项目网站且统计数据没有过期:

- 1.配合pinia从使用用户本地浏览器的IndexedDB中获取该 userId 的缓存统计数据
- 2.按照业务流程向前端返回统计数据

情况3 用户登录过该项目网站但统计数据过期:

- 1.配合pinia从使用用户本地浏览器的IndexedDB中获取该 userId 的缓存统计数据
- 2.按照业务流程向前端返回统计数据
- 3.前端页面中显示标识提示用户这可能是很久前的统计信息并在提示信息中显示该缓存创建时间
- 4.用户如果点击重新生成则使用当前用户登录token重新执行收藏数据统计业务流程, 并将存储在使用用户本地浏览器的IndexedDB中该 userId 的旧缓存统计数据替换同时更新该缓存创建的日期

#### 4.1 缓存过期时间

| 缓存类型 | TTL |
|---|---|
|收藏基础统计|24 小时|
|热门排行榜 / 热门关键词|6 小时|
|漫画详情|7 天|
|AI 总结|	24 小时|

### 5.接口调用注意

以未登录过该项目的用户业务流程举例, 数据统计业务上应该优先考虑拉取该用户的所有收藏漫画数据, 默认时间范围的热榜数据, 热门关键词数据并返回前端根据这些数据的统计结果(2小结中涉及到的可以根据这些数据统计的内容)。而不优先拉取收藏夹中每一项漫画的详细信息,前端页面提供用户一个按钮用于生成详细报告, 这时在通过漫画详情接口继续拉取数据并进行统计。该数据统计模块需要考虑漫画接口方真对大量数据拉取的防治措施, 在设计时应考虑延长每次拉取数据间隔等预防措施和配合小结3中的缓存措施

#### 5.1 拉取归属与限速语义

| 环节 | 发起方 | 循环方 | 限速参数 |
|---|---|---|---|
| 收藏分页 | 前端 | 前端 | `FAVOURITE_PAGE_INTERVAL_MS`(页与页之间) |
| 详情批次 | 前端 | 前端 | `BATCH_INTERVAL_MS`(前端两次请求后端之间的间隔) |
| 单本详情 | 服务端 | 服务端 | `DETAIL_ITEM_INTERVAL_MS`(服务端两次请求上游哔咔接口之间的间隔) |

- `/api/user/favourite` 与 `/api/pica/comic` 均为**单次调用只处理一页/一批**, 不承担跨页循环。跨页与跨批的循环由前端负责。
- `BATCH_INTERVAL_MS` 是前端节流, 用于降低后端与上游的瞬时压力; `DETAIL_ITEM_INTERVAL_MS` 是服务端节流, 用于遵守上游对大量数据拉取的防治措施。二者作用层级不同, 需同时生效。
- `DETAIL_BATCH_SIZE` 为单次 `/api/pica/comic` 可接受的最大 `bookId` 数量。服务端必须强制校验, 超限时返回 502 与业务码 `BATCH_LIMIT_EXCEEDED`。
- `MAX_RETRY_PER_ITEM` 为单本详情在**服务端**的最大重试次数(即首次失败后的额外尝试次数)。前端批次级重试不重复消耗该额度。
- 三个限速参数的最终取值需在真机验证上游容忍度后确认, 当前值仅为初值。
- 非 Cloudflare 构建产物可按能力矩阵启用服务端多页聚合(`pages` 参数)与更激进的限速档位; 统计计算位置与统计口径不随产物变化, 详见「环境变量 / 运行时能力矩阵」。

#### 5.2 详情任务队列与取消语义

深度分析按任务队列拉取详情, 队列语义如下:

| 项 | 约定 |
|---|---|
| 分批 | 前端按 `DETAIL_BATCH_SIZE` 切分 `bookId`, 逐批请求 `/api/pica/comic` |
| 批次间隔 | 前端两次请求之间等待 `BATCH_INTERVAL_MS` |
| 单本间隔 | 服务端两次请求上游之间等待 `DETAIL_ITEM_INTERVAL_MS` |
| 取消 | 前端使用 `AbortController` 中止尚未发出的批次请求; 正在处理中的批次允许自然结束 |
| 取消后的数据 | **已成功获取的详情数据全部保留**并参与统计, 不因取消而丢弃 |
| 取消后的标注 | 统计结果与页面上明确标注「深度分析未完成」, 并展示已完成本数 |
| 部分成功 | 单本失败按 `MAX_RETRY_PER_ITEM` 重试后仍失败则记录该本 `bookId`, 不阻塞其余本数 |
| 失败展示 | 页面提示「N 本详情获取失败」并提供失败清单, 支持单本重试 |
| 单本重试 | 重试不受每日「重新生成」次数限制; 成功后就地更新该本详情与受影响统计 |
| 页面关闭 | 已写入 IndexedDB 的详情数据保留; 未完成的部分下次进入深度分析时继续 |
| 断点续传 | 重新进入深度分析时跳过已有且未过期的详情缓存, 只请求缺失或已过期的本数 |
| 并发 | 单次只处理一个批次, 不并发发送多个批次请求 |

## AI总结模块设计

AI模块根据结构化统计结果生成用户收藏画像总结。

系统提示词模板: ./prompt/summary-sys-prompt.md

用户提示词模板: ./prompt/summary-usr-prompt.md

配置说明文件: ./prompt/summary-prompt-config.md

预留模型配置配置文件, 自定义模型厂商, 密钥, 调用模型。并考虑不同构建部署环境下配置注入问题, 以及密钥安全问题

该模块需要考虑调用失败的情况以及收集数据异常情况, 并限制使用用户频繁调用大模型生成用户画像

#### 1.入参契约与数据发送范围

- `/api/ai/summary` 的请求体为 `StatsResult`, 服务端使用严格 schema 校验(zod 或等价方案)后才可使用。
- 服务端不接受、不转发前端提交的任何提示词文本。提示词模板由服务端从 `docs/prompt/` 对应的模板文件读取并自行填充, 前端无法影响系统提示词内容。
- 服务端仅从 `StatsResult` 中按白名单逐字段取值填充占位符, schema 未声明的字段一律忽略。
- 白名单之外的字段不得进入发往模型厂商的请求体。

#### 2.禁止发送给模型的数据

以下内容**永不**允许出现在发往模型厂商的请求体中, 该约束为硬性安全边界:

- Pica 登录 token 及由 token 派生的任何字段
- AI 服务商的 API Key
- 哔咔漫画请求签名密钥 SIGNATURE_KEY
- 任何环境变量原值
- 用户账号凭证类信息(email、password)

#### 3.缺失数据的占位符填充

- 占位符缺失时统一填充 `AiDefaults.MISSING_DATA_PLACEHOLDER`(即 `暂无数据`), **不省略段落**, 以保证提示词结构稳定。
- 未开启深度分析导致生命周期、评论互动、详情类统计缺失时, 对应占位符除填充占位符外, 还必须在提示词中显式标注「未开启深度分析」, 避免模型将「暂无数据」误解为「用户收藏为空」或「该维度无内容」。
- 该标注文案同样作为常量集中于枚举, 不得硬编码在业务脚本中。

#### 4.输出契约

- 模型输出必须解析为 `AiSummary`, 包含两段内容: 第一段为一句用户画像, 第二段为详细分析。
- 两段内容均需在响应中返回, 前端按段落分别渲染。
- `AiSummary` 不携带模型名与耗时等元信息。

#### 5.AI 缓存与失效

- AI 总结按 userId 缓存, TTL 为 24 小时。
- 若该 userId 的统计结果生成时间晚于 AI 总结生成时间, 则 AI 总结视为失效, 必须重新生成后才可展示。
- 不允许在统计结果已更新的情况下继续展示旧总结。

#### 6.失败、超时与限流

- 调用超时上限为 `NUXT_AI_TIMEOUT_MS`。超时视为失败, **不自动重试**(重试会产生二次计费)。
- `temperature` 与 `max_tokens` 需在服务端做 clamp 约束, 不接受超出建议区间的注入值。
- AI 生成失败时的页面表现: 保留已渲染的统计图表与数据, 展示失败提示与「重试」入口, 不阻塞页面、不清空统计结果。
- AI 调用限流独立于统计重算限次, 使用独立的每日次数配置, 不复用 `RegenerationLimit`。

#### 重新生成限次与超限文案

- 每天额外 1 次。
- 按浏览器本地时区的自然日计算，即本地时间 00:00 重置。
- 只限制“完整重新生成统计报告”，不限制单本详情重试。
- 计数存 localStorage, 按 userId + 日期 作为 key。
- 超限提示文案: 喵～今天的重新生成次数已经用完啦（1/1），明天再让小咔帮你重新统计吧～

## 页面清单

| 页面 | 功能 | 描述 |
|---|---|---|
| / | 首页 | 欢迎页面, 介绍项目功能 |
| /login | 登录页面 | 如果用户的登录凭证过期直接导航到登录页面 |
| /summary | 摘要结果页 | 主业务功能页面 |

页面数量固定为以上三个, **不新增 404 / 500 等独立错误页**, 不引入侧边栏布局。

首页内容约束:

- 必须包含一句**本地存储承诺说明**: 数据只保存在你的浏览器中, 不上传到服务器。
- 必须包含进入统计功能的主 CTA 按钮（未登录时进入 `/login`, 已登录时进入 `/summary`）。
- `/` 欢迎页必须在当前最小支持视口（宽度 `<600px`）内完整显示，不出现页面纵向或横向滚动条；实现时应限制首屏内容数量、文案长度和装饰高度。该约束仅适用于 `/`，`/summary` 仍允许纵向滚动。

### 1.信息架构

`/summary` 采用**单页纵向长滚动**结构, 顶部固定操作栏, 页内锚点导航, 不使用分页签、不使用侧边栏。

从上到下顺序:

1. 用户头像。
2. 用户名。
3. 用户资料行：性别、等级、称号并列；接口无值时显示“未知”。
4. AI 用户画像（一句话版本）。
5. 状态提示区、收藏概览、内容偏好、作品热度、内容规模与生命周期、评论互动、平台关联等图表和词云。
6. AI 用户画像（详细版本）。

顺序约束:

- 一句话 AI 画像位于用户资料之后；详细 AI 画像位于全部图表和词云之后。
- 深度分析结果按上述位置就地替换对应区块内容, 不另开页面。
- 未开启深度分析时, 生命周期与评论互动区块**保留框架并显示「开启深度分析后可见」引导与一键开启按钮**, 不整块隐藏。

### 2.页面状态规格

| 状态 | 表现 |
|---|---|
| 首次报告加载中 | 分区块骨架屏（BoldKit `Skeleton`）+ 顶部细进度条; 因分页拉取需多次请求, 进度条显示已拉取页数/总页数 |
| 深度分析进行中 | 进度条（已完成本数 / 总数）+ 百分比; 已完成部分的结果**实时就地展示**, 不等全部完成 |
| 深度分析取消 | 提供「取消」按钮; 取消后**保留已完成部分的详情数据与统计结果**, 并明确标注「深度分析未完成」 |
| 深度分析部分成功 | 成功的本数正常参与统计; 失败本数记录并以列表形式提示「N 本详情获取失败」, 提供单本重试入口 |
| AI 生成中 | AI 区块内显示生成中状态; 统计图表不受影响 |
| AI 生成失败 | 保留全部统计图表, AI 区块显示失败提示与「重试」入口 |
| 用户收藏为空 | 各图表区块保留框架并显示空态（BoldKit `EmptyState`）, 页面顶部提示当前账号无收藏数据 |
| 单项数据为空 | 仅该区块显示空态, 其他区块正常; 例如热搜接口返回空数组时只影响热搜关联区块 |
| 未开启深度分析 | 对应区块显示引导与一键开启按钮（见第 1 条） |
| 重新生成进行中 | 按钮禁用并显示进行中状态 |

状态文案与空态文案统一由枚举提供, 不得硬编码在组件内。

## 接口契约

| 路由 | 方法 | 功能 | 描述 |
|---|---|---|---|
| /api/user/login | POST  | 登录 | 代理 `auth/sign-in`接口返回登录凭证 |
| /api/user/profile | GET | token 校验/资料 | 代理`users/profile`返回用户个人资料 |
| /api/user/favourite | GET | 单页用户收藏 | 代理`users/favourite`, 接受 `page` 与 `s`, **单次仅返回一页**; 跨页循环由前端负责 |
| /api/pica/leaderboard | GET | 热榜数据 | 代理`comics/leaderboard`返回热榜信息; `tt` 可传, `ct` 固定为 `VC` |
| /api/pica/keywords | GET | 热搜关键词数据 | 代理`keywords`返回热搜词信息 |
| /api/pica/comic | GET | 批量漫画详情 | 代理`comics/{bookId}`; 前端提供 `bookId` 数组, 服务端单次最多处理 `DETAIL_BATCH_SIZE` 本, 超限返回 502 + `BATCH_LIMIT_EXCEEDED` |
| /api/ai/summary | POST | ai画像生成 | 前端提供 `StatsResult`, 服务端严格校验后内置提示词生成用户画像 |
| ~~/api/image/proxy~~ | — | ~~图片代理~~ | **已确认不实现**, 图片由前端直接加载上游地址; 枚举保留为 deprecated, 见「图片加载方案」 |

#### 图片加载方案

- 经实测, 浏览器直接访问上游图片地址可正常加载图片, 因此**不实现服务端图片代理**, 从根本上消除 SSRF 风险面。
- 前端图片地址取上游 `thumb.fileUrl`; 当 `fileUrl` 缺失时按 `{thumb.fileServer}/static/{thumb.path}` 拼接。
- 图片加载失败时使用占位图片替代, **不启用任何代理方案**。占位图片需作为项目内静态资源提供, 不允许引用外部图床。
- 第「API封装规范」中「禁止前端页面直接请求哔咔漫画接口」的限制针对**API 数据接口**(涉及签名密钥与 token), 二进制图片资源加载不在此限。
- 项目**不采用** `./picacomic-api.md` 中记录的 `replaceFileUrl` 响应改写机制, 服务端不参与图片地址改写。
- 待验证项: 上游图片服务器是否返回 `Access-Control-Allow-Origin`。该头仅在同一图片被用于 canvas 绘制、导出或 `crossOrigin` 加载时必需; 若缺失, 相关导出能力降级为「不导出封面图」。验证方法: 对任一张图片发起 `HEAD` 请求并检查响应头。

## 环境变量

需要考虑Docker环境, Node服务器环境, CloudFlare pages + Functions/Workers 环境中环境变量注入转换

环境变量在 CI/CD 与 Cloudflare Pages 中的具体配置方式见 ./deployment-spec.md。

| 变量 | 作用 | 默认值 | 备注 |
|---|---|---|---|
| `NUXT_AI_API_KEY` | 模型密钥 | **运行时必填** | **真密钥**，仅服务端，绝不进 `runtimeConfig.public`；构建期可为空 |
| `NUXT_AI_BASE_URL` | 模型厂商地址 | **运行时必填** | 兼容 OpenAI SDK 的 base |
| `NUXT_AI_MODEL` | 模型名 | **运行时必填** | 如 deepseek-chat |
| `NUXT_AI_TEMPERATURE` | 采样温度 | `0.8` | summary-prompt-config 建议 0.7~0.85 |
| `NUXT_AI_MAX_TOKENS` | 输出上限 | `1000` | 建议 800~1200 |
| `NUXT_AI_TIMEOUT_MS` | LLM 调用超时 | `30000` | 新增建议 |
| `NUXT_PICA_UPSTREAM_TIMEOUT_MS` | 上游哔咔请求超时 | `8000` | 新增建议，三环境可调 |
| `NITRO_PORT` / `NITRO_HOST` | Docker/Node 监听 | `3000` | 仅容器/裸机部署 |

### 运行时能力矩阵

已确认的差异化范围(最小组合): 差异化**仅**体现在两处, 统计计算位置与统计口径在所有产物下完全一致。

1. 限速参数按能力覆盖(保守 / 激进两档)。
2. 非 Cloudflare 产物额外支持服务端多页聚合拉取(收藏接口的 `pages` 参数), 前端在能力允许时减少网络往返。

明确的**不**差异化项:

- 统计计算位置: 所有产物下统计恒为前端纯函数, 不下沉服务端。
- 数据流向: 所有产物下用户收藏原始数据均不进入服务端进程, 不向服务端上传 Raw 数据。
- 功能范围与统计口径: 所有产物完全一致。

实现约束:

- 前端不硬编码判断部署环境, 由服务端通过 `/api/runtime/capabilities` 暴露当前产物能力, 前端据返回值选择数据获取路径。
- Cloudflare 产物为能力下界: 任何在 CF 上不可用的策略不得作为默认路径。
- 未声明支持的能力字段, 前端一律按不支持的保守路径执行。

能力接口契约与限速档位(已确认, 见下)。

一致性验收方式: 两条数据获取路径必须共享同一组统计纯函数, 并以同一份 Raw 输入断言两条路径产出深度相等, 作为单元测试用例之一。

已确认的能力字段与限速档位:

``` typescript
export const RuntimeCapabilities = {
  // 由 /api/runtime/capabilities 返回
  canAggregateFavouritePages: boolean, // CF: false; Node / Docker: true
  maxFavouritePagesPerCall: number, // CF: 1; Node / Docker: 5
  maxDetailBatchSize: number, // 与 FetchPacing.DETAIL_BATCH_SIZE 一致
  pacingProfile: 'conservative' | 'aggressive'
} as const;

export const PacingProfiles = {
  conservative: {
    FAVOURITE_PAGE_INTERVAL_MS: 400,
    DETAIL_ITEM_INTERVAL_MS: 250,
    BATCH_INTERVAL_MS: 1500
  },
  aggressive: {
    FAVOURITE_PAGE_INTERVAL_MS: 150,
    DETAIL_ITEM_INTERVAL_MS: 100,
    BATCH_INTERVAL_MS: 500
  }
} as const;
```

- Cloudflare 产物固定使用 `conservative`; Node / Docker 产物使用 `aggressive`。
- 激进档的具体取值仍需在真机验证上游容忍度后确认, 当前值为初值。

## 完成定义

一个功能只有同时满足以下五组条件才算完成, 任一不满足即视为未完成。完整判据与验证方式见 ./definition-of-done.md。

| 组 | 判据摘要 |
|---|---|
| 静态检查与构建 | `pnpm lint`、`pnpm typecheck`、三个产物构建全部通过; 无 `any`; 类型集中 `types/`(UI 豁免区除外); 无硬编码魔法值; 未使用 TS `enum` |
| 测试 | `pnpm test:unit` 通过; 仅涉及核心统计函数时要求新增单测; 统计函数为纯函数且不直接读写 IndexedDB |
| 规格一致性 | 统计口径、API Contract、数据模型、缓存策略、安全边界、视觉规范均与各规格文档一致; 无 `border-radius` |
| 用户体验与错误状态 | 加载态、空态、错误态齐备; `<600px` 无横向滚动与溢出; 500+ 收藏规模可正常渲染 |
| 文档同步 | 按 `docs/definition-of-done.md` 第一节第 5 条的对照表同步更新受影响文档, 并在未决事项台账中登记新出现的未决项 |

提交要求: 提交信息符合 ./commit-rule.md, 通过 PR 合入 master 并按 ./pr-rule.md 填写描述, 不得编造验证结论。

## 测试规格

综合考虑本项目的业务范围与预计使用人数, 项目**仅进行单元测试**, 不引入集成测试与端到端测试框架。

### 1.测试框架与范围

| 项 | 决定 |
|---|---|
| 框架 | Vitest |
| 测试范围 | 仅核心统计函数(纯函数) |
| 不做的测试 | 集成测试、端到端测试、API 契约测试、组件测试、视觉回归 |
| 测试环境 | `jsdom` + `fake-indexeddb`; Web Crypto 使用 Node 内置 `globalThis.crypto`, 不引入 polyfill |
| 测试文件位置 | 按 Nuxt4 官方项目结构定位, 与被测文件就近放置(`*.spec.ts`) |

### 2.编写时机与用例规模控制

- **在主要业务功能实现前不进行单元测试设计**。功能实现完成后再补齐对应单测。
- 用例规模需**克制**: 每个核心统计函数以少量代表性用例覆盖主要分支即可, 不追求逐行覆盖, 不做过度单测。
- 不设置覆盖率数字门槛。覆盖率报告在 CI 中**不产生**, PR 中单元测试执行全部单测, 失败时由人工判断原因。
- 禁止在单元测试中发起真实网络请求; 所有上游调用必须被 mock。

### 3.架构约束

统计函数必须与存储层解耦: 统计函数只接受 Raw 数据入参, 不直接读写 IndexedDB, 以保证可在无浏览器环境下测试。

### 4.核心统计函数测试要点

以下为**需要覆盖的要点**, 不要求为每个要点各写一条独立用例, 可在同一组用例中合并断言:

| 要点 | 断言核心 |
|---|---|
| 饼图 TOP 合并 | TOP 10 之外合并为「其他」; 剩余仅 1 项时不合并并显示原名; 次数相同按名称升序 |
| 互动指数 | 权重 1:3:5 且取 `log10`; 未开启深度分析时评论项不参与并标记为浅层; 同时返回原始分与归一化分, 排序用原始分 |
| 点赞率与 views=0 | `views<=0` 记录被剔除并计入 `excludedZeroViewsCount`; `views>0, likes=0` 结果为 0 |
| 长短篇判定 | 边界值 49/50/99/100 归入短/中/中/长; 占比分母为有效记录数 |
| 作者与标签归一化 | 全角转半角、大小写合并、多作者拆分、空作者归「未知作者」且不计入去重数 |
| 空数据与边界 | 收藏为空、`categories`/`tags` 为空、`author` 为空、热搜为空时均不产生 `NaN`/`Infinity` |
| 缓存键与 TTL | 私有数据键含 userId, 不存在「取最后一条」回退; 各缓存类型按 4.0.3 起算点独立过期 |
| 路径一致性 | 同一份 Raw 输入下, 前端逐页路径与服务端多页聚合路径产出的 `StatsResult` 深度相等 |

## 枚举

以下枚举按业务分类拆分放置在 `server/constants/` 下。其中 `ChartCarrier` / `ChartConfig` / `ChartTheme` / `QueueStatus` / `QueueMessages` 属于前端可视化与队列状态常量, **不得放入 `server/constants/`**, 放置在 `app/constants/` 下。

``` typescript
export const ChartCarrier = {
  STAT_CARD: 'statCard', // 2.1.1~2.1.4 概览四项
  DONUT: 'donut', // 2.1.5 完结状态
  WORD_CLOUD: 'wordCloud', // 2.2 / 2.3 / 2.4 词云
  PIE: 'pie', // 2.5 分布
  CARD_LIST: 'cardList', // 2.6.1 / 2.6.2 / 2.10 TOP 列表
  SCATTER: 'scatter', // 2.6.3 点赞率
  PROGRESS: 'progress', // 2.7 占比 / 2.9.2 最近更新四档
  BAR: 'bar', // 2.9.1 年份分布
  GROUPED_BAR: 'groupedBar', // 2.11 关联对比
  BADGE: 'badge' // 2.12 命中关键词
} as const;

export const ChartConfig = {
  MIN_HEIGHT_DESKTOP: '20rem',
  MIN_HEIGHT_MOBILE: '16rem',
  LEGEND_POSITION: 'bottom',
  NO_GRADIENT: true,
  AXIS_COLOR: '#000',
  AXIS_WIDTH: 2,
  SPLIT_LINE_OPACITY: 0.2,
  NARROW_BREAKPOINT: 600,
  WORDCLOUD_NARROW_TOP: 20, // 窄屏词云降级阈值
  BAR_MAX_CATEGORIES_NARROW: 12 // 窄屏柱状图最大分类数
} as const;

export const ChartTheme = {
  // 分类色板来源, 实际色值从 CSS 变量读取
  SERIES_TOKENS: ['--primary', '--accent', 'brand-purple', 'brand-green', 'info', 'danger']
} as const;

export const QueueStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  CANCELLED: 'cancelled',
  PARTIAL: 'partial',
  DONE: 'done'
} as const;

export const QueueMessages = {
  CANCELLED: '深度分析未完成',
  PARTIAL: '{failedCount} 本详情获取失败',
  NO_DEEP_ANALYSIS: '开启深度分析后可见',
  EMPTY_FAVOURITE: '当前账号暂无收藏数据',
  REGENERATING: '正在重新生成'
} as const;

export const PicaComicAPIEndpoint = {
  SIGN_IN: 'auth/sign-in',
  PROFILE: 'users/profile',
  FAVOURITE: 'users/favourite',
  LEADERBOARD: 'comics/leaderboard',
  KEYWORDS: 'keywords',
  COMIC_DETAIL: 'comics', // + /{bookId}
  STATIC_PATH_PREFIX: 'static' // 图片拼接 {fileServer}/static/{path}
} as const;

export const PicaComicAPIConfig = {
  BASE_URL: 'https://picaapi.picacomic.com/',
  API_KEY: 'C69BAF41DA5ABD1FFEDC6D2FEA56B',
  SIGNATURE_KEY: '~d}$Q7$eIni=V)9\\RK/P.RM4;9[7|@/CA}b~OW!3?EV`:<>M7pddUBL5n|0/*Cn',
  ACCEPT: 'application/vnd.picacomic.com.v1+json',
  APP_CHANNEL: '2',
  APP_VERSION: '2.2.1.2.3.3',
  APP_UUID: 'defaultUuid',
  APP_PLATFORM: 'android',
  APP_BUILD_VERSION: '44',
  USER_AGENT: 'okhttp/3.8.1',
  IMAGE_QUALITY: 'original',
  CONTENT_TYPE: 'application/json; charset=UTF-8'
} as const;

export const PicaSignaturePolicy = {
  PARAM_ORDER: 'as-defined', // 不排序, 按各接口固定模板顺序拼接 query
  PENDING_VERIFICATIONS: [
    'UPPER_QUERY_PARAM_ORDER', // 上游是否对 query 参数做规范化排序
    'QUERY_VALUE_ENCODING' // 非 ASCII query 值是否需 URL 编码后再参与签名
  ]
} as const;

export const FavouriteSort = {
  DEFAULT: 'ua',
  NEWEST: 'dd',
  OLDEST: 'da',
  MOST_LIKES: 'ld',
  MOST_VIEWS: 'vd'
} as const;

export const LeaderboardParam = {
  TIME_H24: 'H24',
  TIME_D7: 'D7',
  TIME_D30: 'D30',
  DEFAULT_TIME_RANGE: 'D7',
  COUNT_TYPE: 'VC' // 服务端常量, 固定为 VC, 不接受前端传参
} as const;

export const StatThresholds = {
  PIE_TOP_LIMIT: 10, // 3.1 三类饼图
  WORDCLOUD_TOP_LIMITS: { CATEGORY: 30, TAG: 80, AUTHOR: 50 }, // 3.1 词云
  RANKING_TOP_LIMIT: 10, // 2.6 / 2.10 TOP10
  MERGE_OTHER_LABEL: '其他',
  MIN_MERGE_REMAINING: 2 // "剩1项不合并"的判定阈值
} as const;

export const InteractionWeights = { VIEWS: 1, LIKES: 3, COMMENTS: 5 } as const; // 3.2 互动指数权重

export const SHALLOW_INTERACTION_LABEL = '浅层互动指数'; // 与 AiDefaults.SHALLOW_LABEL 同值, 单一来源见后续统一

export const ComicLengthThresholds = {
  SHORT_BELOW: 50, // < 50 短篇
  LONG_FROM: 100, // >= 100 长篇
  LABELS: { SHORT: '短篇', MID: '中篇', LONG: '长篇' }
} as const;

export const UpdateRecencyBuckets = { RECENT_DAYS: 7, RECENT_DAYS_30: 30, STALE_OVER_YEAR: 365 } as const; // TODO "例如"需固化为确定口径

export const NormalizeConfig = {
  SEPARATORS: [',', '，', '/', '、', '&', 'and'],
  UNKNOWN_AUTHOR: '未知作者'
} as const;

export const CacheTtlMs = {
  FAVOURITE_STATS: 24 * 3600 * 1000,
  HOT_DATA: 6 * 3600 * 1000, // 热榜 + 热搜词
  COMIC_DETAIL: 7 * 24 * 3600 * 1000,
  AI_SUMMARY: 24 * 3600 * 1000
} as const;

export const RegenerationLimit = {
  DAILY_LIMIT: 1,
  COUNTER_KEY_PREFIX: 'pcs:regen', // 完整 key = 前缀:userId:yyyymmdd
  OVER_LIMIT_MESSAGE: '喵～今天的重新生成次数已经用完啦（{used}/{limit}），明天再让小咔帮你重新统计吧～'
} as const;

export const ClientConfig = {
  FALLBACK_TIMEZONE: 'Asia/Shanghai', // 3.5
  TOKEN_FALLBACK_TTL_DAYS: 7, // 仅作展示提示，过期判定应解析 JWT exp
  MAX_LOCAL_USER_PROFILES: 3 // 本地缓存的用户账号数量上限, 超出按最后登录时间升序淘汰
} as const;

export const StorageKeys = {
  TOKEN: 'pcs:token',
  IDB_NAME: 'pcs-db',
  IDB_VERSION: 1,
  IDB_STORES: { FAVOURITES: 'favourites', DETAILS: 'details', STATS: 'stats', HOT: 'hot', AI_SUMMARY: 'aiSummary' }
} as const;

export const AppRoutes = { HOME: '/', LOGIN: '/login', SUMMARY: '/summary' } as const;

export const ApiRoutes = {
  LOGIN: '/api/user/login',
  PROFILE: '/api/user/profile',
  FAVOURITE: '/api/user/favourite',
  LEADERBOARD: '/api/pica/leaderboard',
  KEYWORDS: '/api/pica/keywords',
  COMIC_BATCH: '/api/pica/comic',
  AI_SUMMARY: '/api/ai/summary'
  // IMAGE_PROXY 已确认不实现, 图片由前端直连上游地址, 见「接口契约 / 图片加载方案」
} as const;

export const FetchPacing = {
  FAVOURITE_PAGE_SIZE: 20, // 1.1 固定分页大小
  FAVOURITE_PAGE_INTERVAL_MS: 400, // 前端: 页与页之间
  DETAIL_BATCH_SIZE: 40, // 服务端: 单次 /api/pica/comic 上限, 超限 502 + BATCH_LIMIT_EXCEEDED
  DETAIL_ITEM_INTERVAL_MS: 250, // 服务端: 两次请求上游 comics/{bookId} 之间
  BATCH_INTERVAL_MS: 1500, // 前端: 两次请求后端 /api/pica/comic 之间
  MAX_RETRY_PER_ITEM: 2 // 服务端: 单本详情首次失败后的额外尝试次数
} as const;

export const BatchErrorCode = {
  BATCH_LIMIT_EXCEEDED: 'BATCH_LIMIT_EXCEEDED', // 502
  UPSTREAM_FAILED: 'UPSTREAM_FAILED'
} as const;

export const AiErrorCode = {
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED' // 422, 未配置 AI 模型相关参数
} as const;

export const AiErrorMessages = {
  AI_NOT_CONFIGURED: '未配置AI模型相关参数'
} as const;

export const ImageProxyConfig = {
  // deprecated: 已确认不实现服务端图片代理, 保留定义仅为记录水印与拼接模板
  URL_TEMPLATE: '{fileServer}/static/{path}',
  ALLOWED_FILE_SERVERS: ['https://s3.picacomic.com']
} as const;

export const AiDefaults = {
  MISSING_DATA_PLACEHOLDER: '暂无数据', // 占位符缺失时的统一填充值
  NO_DEEP_ANALYSIS_NOTE: '未开启深度分析', // 详情类统计缺失时的显式标注, 避免被误解为收藏为空
  SHALLOW_LABEL: '浅层互动指数',
  PARAGRAPH_COUNT: 2 // 输出必须为两段
} as const;

export const CacheStaleNotice = {
  // 统计数据已过期时的提示
  STALE_MESSAGE: '这可能是很久前的统计信息',
  // 数据请求异常时使用本地缓存的提示, 时间格式 YYYY-MM-DD hh:mm:ss
  FALLBACK_MESSAGE: '数据请求异常，当前展示的是本地缓存（生成于 {generatedAt}）',
  TIME_FORMAT: 'YYYY-MM-DD HH:mm:ss'
} as const;

export const AiLimits = {
  DAILY_LIMIT: 3, // 独立于 RegenerationLimit, 每日 AI 生成次数上限
  TEMPERATURE_MIN: 0.7,
  TEMPERATURE_MAX: 0.85,
  MAX_TOKENS_MIN: 800,
  MAX_TOKENS_MAX: 1200
} as const;
```
