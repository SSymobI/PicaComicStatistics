# BoldKit 使用指南

本文件说明本项目 UI 组件方案的安装、目录约定、使用边界与已知限制。

相关文件: `./PROJECT_SPEC.md`（技术栈与图表版本裁决）、`./design-guid.md`（视觉规范）。

## 一、方案概述

| 项 | 值 |
|---|---|
| 库 | BoldKit（Neubrutalism 组件库，基于 shadcn/ui） |
| 许可 | MIT |
| 上游仓库 | `ANIBIT14/boldkit` |
| Vue 包 | `@boldkit/vue`（仅作参考，本项目**不安装**该包） |
| 访问性基座 | Reka UI（Vue 侧的 Radix 移植） |
| 样式基座 | Tailwind CSS **v4** |
| 分发方式 | **shadcn-vue registry 源码分发**，组件源码拷贝进本项目 |

### 为什么不安装 `@boldkit/vue`

BoldKit 的官方安装方式是通过 shadcn-vue CLI 把组件源码写入项目的 `components/ui/` 目录，而不是 `pnpm add`。因此：

- 依赖中**不存在** `boldkit` 或 `@boldkit/vue`。
- 组件代码属于本项目仓库的一部分，可自由修改样式。
- 代价是上游修复不会自动同步，需要重新执行 `add` 或手动比对。

### 组件规模（已核实）

- README 与站点宣称 55+（README）/ 65+（站点）组件、10 种图表、64 SVG 形状、17 ASCII 形状、15 个整页 Block。
- 上游 `packages/vue/src/components/ui/` 目录实际包含 303 个文件条目（含子组件、分组子组件与 ascii-shapes）。

## 二、安装步骤

### 1. 注册 registry 别名（必须先做）

BoldKit 组件之间通过 `@boldkit/utils` 这类带作用域的名称互相引用。**未注册别名时 CLI 会去 shadcn 默认 registry 解析并安装失败**，这是官方文档明确强调的前置步骤。

在项目根目录的 `components.json` 中加入：

```json
{
  "registries": {
    "@boldkit": "https://boldkit.dev/r/vue/{name}.json"
  }
}
```

### 2. 初始化 shadcn-vue（Nuxt 场景）

```bash
npx nuxi@latest module add shadcn-nuxt
npx shadcn-vue@latest init
```

`nuxt.config.ts` 配置：

```ts
export default defineNuxtConfig({
  modules: ['shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: './components/ui'
  }
});
```

> **Nuxt 4 路径注意**：Nuxt 4 使用 `app/` 目录结构。BoldKit 的 Nuxt 文档专门提示了 app 目录带来的路径差异。本项目的组件目录**已确定为 `app/components/ui/`**，`componentDir` 需与实际生成结构对齐后核对。

### 3. 安装主题（CSS 变量）

```bash
npx shadcn-vue@latest add @boldkit/styles
```

主题注入 CSS 变量，其中 `--radius` 官方默认值即为 `0rem`。安装后**必须核对 `--radius` 为 `0rem`**，并额外覆盖 `--primary` / `--accent` / `--destructive` 为本项目配色（见 `./design-guid.md` 的主题变量映射）。

### 4. 按需安装组件

```bash
npx shadcn-vue@latest add @boldkit/button @boldkit/card @boldkit/input
```

本项目预计需要的组件（非图表部分）：

| 用途 | 组件 |
|---|---|
| 基础交互 | `Button`、`Input`、`Label`、`Card`、`Separator` |
| 概览与指标 | `StatCard`、`Badge`、`Progress` |
| 状态与反馈 | `Skeleton`、`Spinner`、`EmptyState`、`Alert`、`Sonner` |
| 组织与导航 | `Tabs`、`Accordion`、`Collapsible`、`Breadcrumb` |
| 数据展示 | `Table`、`Tooltip`、`Popover`、`Avatar` |
| 对话框 | `Dialog`、`AlertDialog` |

## 三、使用边界

### 1. 目录与命名约定

| 项 | 约定 |
|---|---|
| 组件目录 | `app/components/ui/` |
| 文件命名 | **沿用上游命名**（如 `Button.vue`、`StatCard.vue`），不重命名 |
| 导入别名 | `@/components/ui/...` |
| 自动导入 | 由 `shadcn-nuxt` 提供 |

> 注意：上游 README 的示例使用小写路径（`'@/components/ui/button'`），而仓库文件名是大写驼峰（`Button.vue`）。本项目**以仓库文件名与项目组件命名规范为准（大写驼峰）**，导入路径按实际生成结果为准。若 CLI 生成的文件名与预期不符，以实际产物为准并在 `components.json` 中核对。

### 2. 代码质量豁免区（重要）

`PROJECT_SPEC.md` 的代码质量要求规定「类型必须集中在 `types/`，不允许在业务脚本内定义」与「禁止魔法值」。而 shadcn 系组件的惯例是在同一个 `.vue` 文件内用 `interface` 声明 props、用 `class-variance-authority` 定义 variant 字符串，二者直接冲突。

已确认的处理方式：

- **`app/components/ui/` 为唯一豁免目录**，ESLint 配置中对该目录豁免「类型内联」与「魔法值」两条规则。
- 豁免**仅限该目录**，业务代码仍须完全遵守 `PROJECT_SPEC.md` 的代码质量要求。
- **业务页面不得直接引用 `ui/` 下的原语组件**；业务页面只允许使用 `app/components/business/` 中自行封装的业务组件，由业务组件去引用 `ui/` 原语。该约束用于防止项目规范被大面积架空。
- 该目录不得手工改动上游组件的既有样式逻辑；如需定制，优先在业务组件层覆盖，或在明确记录后修改并承担同步成本。

### 3. 图表组件不使用

BoldKit 的图表组件依赖 `echarts ^6.0.0` 与 `vue-echarts ^8.0.1`，而本项目因 `echarts-wordcloud` 只能使用 `echarts 5.x`。二者无法共存。

因此：

- **不安装 BoldKit 的任何图表组件**（`*Chart.vue`、`ChartContainer` 等）。
- 全部图表由项目内基于 ECharts 5 自行封装，样式规范见 `./design-guid.md` 的「图表规范」。
- 该限制的成因与复核条件见 `PROJECT_SPEC.md` 的「图表方案与版本裁决」。

### 4. SSR 与 ClientOnly

BoldKit 文档指出部分组件（Drawer、Sonner、Command、Calendar、Chart）需要 `<ClientOnly>` 包裹。

本项目渲染模式为 **SPA（`ssr: false`）**，不存在服务端渲染阶段，因此：

- **不需要**为了 BoldKit 组件额外包裹 `<ClientOnly>`。
- 不要照搬上游 README 中的 `<ClientOnly>` 示例，避免产生无意义的包装层。

### 5. 现成 Block 的使用范围

BoldKit 提供 15 个整页 Block，其中 `AuthForms`、`ErrorPages`、`DashboardLayout`、`StatsSection` 与本项目概念相近。

已确认的取舍：

- **不采用任何整页 Block**。
- `/login` 页面自行搭建，仅复用 `Input`、`Button`、`Card`、`Alert` 等基础组件。
- 不新增 404 / 500 等独立错误页。
- `/summary` 不采用侧边栏布局，采用单页纵向滚动结构（见 `PROJECT_SPEC.md` 页面清单的信息架构）。

## 四、已确认与待验证

### 已确认

1. 组件目录为 **`app/components/ui/`**（D-03 已确认前端常量目录为 `app/constants/`, 组件目录按同一结构约定）。
2. 文件命名**沿用上游**（如 `Button.vue`）。
3. 不使用 BoldKit 任何图表组件; 数据图表自行基于 ECharts 5 封装。
4. 不使用任何整页 Block; `/login` 自建; 不新增错误页。
5. SPA 模式下不需要为 BoldKit 组件包裹 `<ClientOnly>`。

### 待验证

1. **`echarts-wordcloud` 与 echarts 5 的实际配合可用性**：需在实现阶段实测词云渲染，确认 `echarts-wordcloud@2` 与所选 `echarts 5.x` 小版本兼容。
2. **组件目录的实际生成路径**：执行 `shadcn-vue init` 后核对 Nuxt 4 下的真实目录与 `components.json` 的 `componentDir` 配置。
3. **CLI 生成的文件命名**：核对实际生成的是 `Button.vue` 还是 `button.vue`；若与上游仓库命名不一致, 以实际产物为准并同步更新本条结论。
4. **BoldKit 主题变量的完整清单**：安装 `@boldkit/styles` 后列出全部变量，确认 `--radius` 为 `0rem` 并完成本项目配色覆盖。
5. **按需注册 ECharts 组件的方式**：`vue-echarts` 通常需要手动注册所需图表类型与组件以控制包体积，需确认在 Nuxt 4 + SPA 下的推荐写法。
6. **ESLint 豁免配置的具体形式**：确认 `@antfu/eslint-config` 中对单目录关闭「类型内联」与「魔法值」规则的正确写法。
