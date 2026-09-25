# 认证规格

本文件是 `PROJECT_SPEC.md`「登录认证设计」章节的展开规格。

对应主文档: `./PROJECT_SPEC.md` 登录认证设计章节。

## 一、状态定义

认证状态由 pinia 的 auth store 作为唯一状态源维护, 全局同一时刻仅允许处于以下 6 态之一。

| 状态 | 含义 | 是否持有 token |
|---|---|---|
| `anonymous` | 本地无 token | 否 |
| `logging-in` | 正在提交登录请求 | 否 |
| `authenticated` | 已有 token 且在本会话内校验通过 | 是 |
| `validating` | 正在调用 `users/profile` 校验 token | 是 |
| `expired` | token 存在但已失效 | 否(清除后置为该状态) |
| `error` | 非 token 原因的失败(网络错误 / 上游 5xx) | 是(保留) |

## 二、状态迁移

| 触发场景 | 起始状态 | 目标状态 |
|---|---|---|
| 应用启动 / 浏览器刷新, 本地有 token | `anonymous` | `validating` |
| 应用启动 / 浏览器刷新, 本地无 token | `anonymous` | `anonymous` |
| 提交登录 | `anonymous` / `expired` / `error` | `logging-in` |
| 登录成功 | `logging-in` | `authenticated` |
| 登录失败(凭证错误 / 上游拒绝) | `logging-in` | `anonymous` |
| `users/profile` 校验通过 | `validating` | `authenticated` |
| `users/profile` 返回 token 失效(401 或 JWT exp 已过) | `validating` | `expired` |
| 受保护请求上游返回 401 | 任意 | `expired` |
| 网络错误 / 上游 5xx | 任意 | `error` |
| 用户主动登出 | `authenticated` | `anonymous` |
| 用户切换(登出后登录另一账号) | `authenticated` | `logging-in` → `authenticated` |

关键约束:

- 不从 localStorage 直接进入 `authenticated`。token 存在只代表可以进入 `validating`。
- 刷新页面后必须重新走一次 `validating`, 不允许复用刷新前的校验结论。
- `error` 状态下 token 保留, 不得自动登出。是否提供重试入口见「五、错误态与登出行为」。

## 三、路由守卫

- 由全局路由中间件守卫受保护页面, auth store 为状态核心源。
- 访问受保护页面前必须确保状态为 `authenticated`; 否则先按状态机取得确定状态, 再决定跳转目标。
- 未通过守卫时的跳转目标: `anonymous` / `expired` 引导至 `/login`; `error` 就地展示错误态。
- 首页 `/` 为公开页面, 不参与守卫拦截。

## 四、401 与导航目标

- 上游返回 401 时: 清除本地 token、重置 auth store 为 `expired`, 并导航至**首页** `/`。
- JWT exp 已过期视同 401 处理。
- 首页为公开页面并提供进入统计功能的入口; 用户再次进入受保护页面时因 `anonymous` 被引导至 `/login`。
- 网络错误与上游 5xx **不得**清除 token, 也**不得**触发导航。

## 五、错误态与登出行为

### 5.0 登录前用户协议与凭证记忆

- 登录页必须在提交登录请求前展示用户协议入口。
- 用户协议以弹窗展示全文；用户未打开并完成阅读确认前，不允许勾选同意项。
- 未勾选同意项时，登录按钮必须禁用，不得发送登录请求。
- 协议正文来源于 `./user-agreement.md`。
- “记住账号”只保存账号标识；密码不得由应用写入 `localStorage`、`sessionStorage`、IndexedDB 或自有数据库。
- 需要记住密码时，使用浏览器 Credential Management API 或浏览器密码管理器的标准表单能力，由浏览器负责保存和填充；不保证所有浏览器均支持。

### 5.1 `error` 状态

- 页面展示「重试」按钮, 由用户手动触发重新校验或重新请求。
- **不自动重试**, 避免在网络异常或上游故障期间产生无限请求。
- 重试仅重新发起本次失败的请求, 不重置已获取的数据。

### 5.2 登出

- 登出入口位于统计页(`/summary`)页头。
- 登出动作: 清除 localStorage 中的 token、重置 auth store 为 `anonymous`、清除内存态。
- 登出**不**清空 IndexedDB 数据(见 `PROJECT_SPEC.md` 缓存机制)。
- 登出后导航至首页 `/`。

### 5.3 校验并发控制

- 多个受保护请求同时需要校验 token 时, 复用同一次 `users/profile` 请求(单飞 / single-flight)。
- 不允许并发发起多次校验请求。
- 已在进行中的校验请求未完成前, 后到的调用等待同一个 Promise 结果。

### 5.4 登录成功后的回跳

- `/login` 成功后回跳至用户原目标页。
- 原目标页通过 `redirect` query 参数传递。
- **该参数必须做同源相对路径合法性校验**, 仅接受以单个 `/` 开头且不含 `//`、不含协议头的路径, 校验不通过时回跳至首页。该校验用于防止开放重定向。
- 无 `redirect` 参数时默认跳转 `/summary`。

## 六、已确认补充

1. `error` 状态下的缓存提示文案: `数据请求异常，当前展示的是本地缓存（生成于 YYYY-MM-DD hh:mm:ss）`。
2. 该提示**复用「统计数据已过期」的提示条样式**(同一视觉组件, 仅文案与文案中的时间来源不同), 不另设独立样式。

## 七、待验证

1. `error` 态下允许继续浏览本地缓存时, 若本地既无有效缓存又无该用户的信息, 页面应回退为「引导重新登录」。该分支需在实现阶段实测确认。
