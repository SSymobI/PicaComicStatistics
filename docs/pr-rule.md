# PR 说明规则

本文件定义本项目的 Pull Request 标题与描述规范。

提交信息(Commit Message)规范见 `./commit-rule.md`。

## 一、基本要求

- 所有功能变更必须通过 PR 合入 `master`, 禁止直接向 `master` 推送。
- PR 标题遵循 Conventional Commits 格式。
- PR 描述必须填写「变更概述」与「验证情况」两节, 其余节按变更内容取舍。
- 描述内容必须真实反映本次变更。**禁止编造测试数据、评测分数或验证结论**; 未执行的项目留空或明确写「未执行」。

## 二、PR 标题格式

``` text

<type>(<scope>): <简明扼要的修改说明>

```

`type` 取值与 `./commit-rule.md` 保持一致: `feat`、`fix`、`refactor`、`perf`、`docs`、`style`、`test`、`chore`。

`scope` 建议取值(按本项目模块):

| scope | 适用范围 |
|---|---|
| `stats` | 统计口径与统计函数 |
| `pica` | 哔咔接口封装、签名、请求头 |
| `api` | `server/api/*` 路由 |
| `cache` | IndexedDB / localStorage 缓存层 |
| `auth` | 登录认证与状态机 |
| `ai` | AI 总结模块与提示词 |
| `ui` | 页面与组件 |
| `crypto` | 签名与加密工具 |
| `ci` | GitHub Actions 与构建配置 |
| `docs` | 文档 |
| `deps` | 依赖升级 |

## 三、PR 描述模板

``` markdown
### PR Title

`<type>(<scope>): <简明扼要的修改说明>`

### PR Body

#### 变更概述 (Summary)

[用 1~2 句话说明本次变更的目的与预期效果]

#### 变更内容 (Changes)

- [列出主要改动点, 按模块分组]
- [涉及统计口径的改动必须原样引用 `PROJECT_SPEC.md` 中对应条款编号]

#### 契约与数据影响 (Contract & Data)

- **API Contract**: [是否修改了接口路径、参数、响应结构或状态码; 无则填「无」]
- **数据模型**: [是否修改了 `types/` 下的类型定义; 无则填「无」]
- **缓存结构**: [是否修改了 Object Store、主键或 TTL; 涉及升级需说明 IndexedDB 版本迁移方案; 无则填「无」]
- **统计口径**: [是否改变了任何统计结果的定义; 无则填「无」]

#### 验证情况 (Verification)

- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test:unit` 通过
- [ ] `pnpm build:node` 通过
- [ ] `pnpm build:cf` 通过
- [ ] `pnpm build:docker` 通过
- [ ] 受影响的统计函数已补充单元测试(若涉及统计逻辑)
- [ ] 已在移动端宽度下自检页面表现(若涉及 UI)

说明: [对未勾选项说明原因; 例如「未涉及 UI」]

#### 风险与注意事项 (Risks)

- [标明是否涉及破坏性变更、用户数据兼容问题、上游接口依赖变更等; 无则填「无」]
```

## 四、评审要点

1. 是否遵守 `PROJECT_SPEC.md` 中已确认的业务规则, 尤其是统计口径、TOP 数量、TTL、权重、API 路由与参数。
2. 是否引入了未被规格允许的自行决策(例如自行改动缓存位置、认证模型、安全边界)。
3. 统计函数是否为纯函数, 是否与存储层解耦。
4. 是否存在 `any` 类型、业务脚本内定义的类型、硬编码魔法值。
5. 是否遵循项目禁止删除文件的约束(被替换的文件应迁移至 `./older/`)。
6. 是否在描述中出现了无依据的性能或效果结论。
