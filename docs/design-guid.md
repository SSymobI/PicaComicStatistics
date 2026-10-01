# 设计指南

### 设计风格：Neubrutalism（新野兽派）

核心视觉特征：粗黑边框、实色偏移阴影、高对比配色、零圆角、粗体排版、按压交互反馈。

正式样式中的像素单位统一使用 rem vh vw。

> 本项目 UI 组件采用 BoldKit（Neubrutalism 组件库）。上述五项视觉特征与 BoldKit 的默认外观一致，无需对抗式样式覆盖。组件安装与使用见 `./boldkit-guide.md`。

## 配色

整体色彩参考哔咔漫画公开站点的粉白观感，但仅参考色彩，不复制其页面布局、组件样式或交互设计。粗黑边框、实色偏移阴影、零圆角、粗体排版和按压反馈仍然保持 Neubrutalism 约束。

| 令牌 | 色值 | 用途 |
|---|---|---|
| `cream` | `#FFF7F9` | 页面背景（粉白） |
| `brand-pink` | `#FF5C8A` | 主色，按钮 primary、强调色 |
| `brand-pinkHot` | `#FF6B9D` | 主色 hover 态 |
| `brand-purple` | `#A78BFA` | 辅助强调色（浏览量图标等） |
| `brand-green` | `#7FD957` | 成功、已完结标记 |
| `brand-yellow` | `#FFE066` | 高亮、荧光笔效果、hover 背景 |
| `danger` | `#FF5555` | 错误、危险操作 |
| `info` | `#5AA9FF` | 进行中、加载中、中性提示 |
| `#000` | — | 边框、阴影、主文字 |
| `#fff` | — | 卡片、输入框背景 |

### 主题变量映射

所有颜色必须以 CSS 变量形式定义，禁止在组件内硬编码色值。**令牌唯一真源是 `app/assets/css/tailwind.css` 的 `@theme`**，按 Tailwind v4 命名空间声明：

| 用途 | `@theme` 令牌 | 生成的工具类 |
|---|---|---|
| 页面底色 / 方格线 | `--color-cream`、`--color-canvas`、`--color-grid-line` | `bg-cream`、`bg-canvas` |
| 卡片与文字 | `--color-surface`、`--color-ink`、`--color-ink-soft` | `bg-surface`、`border-ink`、`text-ink` |
| 主色与强调色 | `--color-brand-pink`、`--color-brand-pink-hot`、`--color-brand-purple`、`--color-brand-green`、`--color-brand-yellow` | `bg-brand-pink`、`text-brand-yellow` |
| 状态色 | `--color-danger`、`--color-danger-strong`、`--color-info` | `bg-danger`、`text-danger-strong` |
| 骨架屏 / 遮罩 | `--color-skeleton`、`--color-overlay` | `bg-skeleton`、`bg-overlay` |
| 字体 | `--font-sans`、`--font-display`、`--font-mono` | `font-sans`、`font-display`、`font-mono` |

BoldKit / shadcn 约定名（`--primary`、`--secondary`、`--accent`、`--destructive`、`--shadow-color`、`--radius`）以**别名**形式保留在 `app/assets/css/main.css` 的 `:root`，供后续 vendored 组件直接读取；别名只允许指向 `@theme` 令牌，不得再写字面色值。

映射要求：

- `--primary` 取 `brand-pink`；`--accent` 取 `brand-yellow`；`--destructive` 取 `danger`；`--shadow-color` 取 `ink`。
- `--radius` **必须为 `0rem`**（BoldKit 官方主题的默认值即为此，安装后需核对）。
- 图表配色从这组变量读取（`StatsChart` 读 `--color-*` 的计算值），保证图表与组件观感一致。
- 组件样式里出现字面色值即视为违规；新增颜色必须先加 `@theme` 令牌。

### 暗色模式

- 首版**仅实现亮色**，不提供主题切换入口，不跟随系统偏好。
- 但颜色必须全部走 CSS 变量（不得硬编码），为后续拓展保留扩展位。
- BoldKit 官方支持亮/暗双主题，后续启用暗色时只需补充暗色变量组，无需改动组件。

## 排版

| 用途 | 字体族 | 配置键 |
|---|---|---|
| 正文 | Noto Sans SC, PingFang SC, system-ui | `sans` |
| 标题/展示 | Archivo Black, Noto Sans SC, system-ui | `display` |
| 代码/等宽 | **JetBrains Mono, ui-monospace, monospace** | `mono` |

> 说明：早期版本此处写作 `Space Grotesk`，它并非等宽字体，已更正为 JetBrains Mono。

#### 标题样式

- **h1**：Archivo Black、`2.2rem`、`font-weight: 900`
- **h2**：黄色荧光背景（`#FFE066`）+ 3px 黑色下边框，居中偏移（可在 `.align-center` 内取消偏移）

#### 边框与阴影

**零圆角** — 全站不使用 `border-radius`。项目内任何文件（含样式与组件）不得出现 `border-radius` 属性；该约束可被代码审查检查。BoldKit 主题已通过 `--radius: 0rem` 保证其组件符合该要求。

| 级别 | 边框 | 阴影 | 用途 |
|---|---|---|---|
| 标准 | `3px solid #000` | `6px 6px 0 0 #000` | 卡片、主容器、图表容器 |
| 小号 | `2px solid #000` | `4px 4px 0 0 #000` | 输入框、标签、面包屑 |
| 大号 | `3px solid #000` | `8px 8px 0 0 #000` | 对话框 |
| 微型 | `2px solid #000` | `3px 3px 0 0 #000` | 小标签、下拉选项 |
| 无阴影 | `2px solid #000` | 无 | 用户卡片等融入背景的元素 |

阴影偏移以 `@theme` 令牌声明，边框宽度与阴影偏移成对使用：

| 令牌 | 值 | 工具类 |
|---|---|---|
| `--shadow-brutal-xs` | `3px 3px 0 var(--color-ink)` | `shadow-brutal-xs` |
| `--shadow-brutal-sm` | `4px 4px 0 var(--color-ink)` | `shadow-brutal-sm` |
| `--shadow-brutal-btn` | `5px 5px 0 var(--color-ink)` | `shadow-brutal-btn` |
| `--shadow-brutal` | `6px 6px 0 var(--color-ink)` | `shadow-brutal` |
| `--shadow-brutal-lg` | `8px 8px 0 var(--color-ink)` | `shadow-brutal-lg` |
| `--shadow-brutal-off` | `0 0 0 var(--color-ink)` | 按压时的归零阴影 |

两个 `@utility` 原子封装重复模式（定义在 `tailwind.css`）：

- `brutal-card`：`3px` 边框 + `--shadow-brutal` + 卡片底色 + `1.2rem` 内边距（`SummarySection` 根节点与 `/summary` 图表卡共用，避免同名类在两处各定义一份）。
- `brutal-press`：按压位移 + 阴影归零 + 禁用态（`cursor`、`opacity`、收窄阴影）。交互元素一律用它，不再逐个手写 `hover:` / `focus-visible:` / `disabled:` 链。

#### 按压效果

hover 时元素向右下偏移、阴影缩为 0，模拟"按下去"的触觉反馈：

```
hover/active: translate(1.5px, 1.5px); box-shadow: 0 0 0 0 #000;
```

键盘用户无法触发 hover，因此必须同时提供等价的焦点反馈：

```
:focus-visible: translate(1.5px, 1.5px); box-shadow: 0 0 0 0 #000; outline: 3px solid #000; outline-offset: 2px;
```

#### 动画范围

动效只服务于「状态可感知」与「空间连续性」，不做炫技。时长按交互频率与内容体量分级——**进入慢、退出快，高频反馈不放慢**：

| 类别 | 允许的表现 | 时长档位 |
|---|---|---|
| 按压 / 悬停反馈 | 位移、阴影瞬变、颜色过渡 | `--motion-duration-instant`（120ms），不随内容体量放慢 |
| 提示条 / 状态切换 | 透明度 + 小位移 | `--motion-duration-fast`（200ms）进入 / `--motion-duration-leave`（220ms）退出 |
| 页面切换过渡 | 透明度（进入）+ 透明度与向上位移（退出），`out-in` 单页驻留 | `fast`（200ms）进入 / `leave`（220ms）退出 |
| 页面切换进度条 | 顶部固定细条的 `scaleX` 增长 + 整条淡入淡出 | 增长 `instant`（120ms）；进入 `fast`（200ms） / 退出 `leave`（220ms） |
| 组件入场 | 透明度 + 位移 | `--motion-duration-base`（280ms） |
| 弹窗 | 遮罩透明度 + 弹窗缩放与位移，进出对称 | `--motion-duration-slow`（360ms）进入 / `leave`（220ms）退出 |
| 首屏重点元素 | 透明度 + 位移 / 轻微缩放 | `slow`（360ms） |
| 滚动进入视口 | 透明度 + 位移，同屏元素按 `--motion-stagger`（60ms）错位，默认只播一次 | `--motion-duration-reveal`（480ms） |
| 加载态 | 骨架屏脉冲、进度条、进行中脉冲（仅透明度） | 循环，不限 |
| 图表入场 | ECharts 内建动画；词云扩展无入场能力时以容器淡入代替 | 600ms |

约束：

- 只允许动画 `transform` 与 `opacity`；不得动画 `width` / `height` / `margin` / `padding` 等布局属性（进度类宽度一律用 `transform: scaleX()` 表达）。
- 时长、缓动、位移必须取 `app/assets/css/main.css` 的 `--motion-*` 令牌，不得在组件内写死毫秒数；JS 侧数值取 `app/constants/motion.ts`。
- 缓动分三类：进入用 `--motion-ease-out`（减速收尾）、退出用 `--motion-ease-in`（加速离场）、按压用 `--motion-ease`。
- 同一过渡内的嵌套元素（如弹窗与它的遮罩）**必须使用相同时长**：Vue 以过渡根节点的结束时间为准，子元素动画更长会被截断（或显式传 `:duration`）。退场值也不得小到不可感知——`scale(.98)` + 120ms 这类组合等于没有动画。
- 遵循 `prefers-reduced-motion`：`--motion-*` 令牌在 `reduce` 下折叠为 0，JS 侧（图表动画、平滑滚动、滚动入场）必须同步判断。
- 动效不得改变内容可见性：动效未触发、被禁用或脚本失效时，内容必须直接呈现。
- 页面切换的位移只允许向上（负 Y）。页面根节点向下位移会把变换后的底边算进可滚动溢出区, 在 `/` 与 `/login` 这类恰好一屏高的页面上会瞬时出现纵向滚动条, 破坏「`/` 在 `<600px` 无滚动条」的硬约束。
- 页面切换使用 `out-in`，避免长页双份挂载（`/summary` 有 8 个 ECharts 实例）。
- 页面切换进度条固定在视口顶部，不参与文档流、不改变布局、不产生滚动条，也不拦截指针事件；增长只允许 `transform: scaleX()`。`prefers-reduced-motion: reduce` 下进度取恒定值（`UiRouteProgress.REDUCED_MOTION_PERCENT`），只保留淡入淡出，不做连续增长。
- 首页 `/` 的入场动效不得产生横向或纵向溢出（`<600px` 无滚动条为硬约束）。
- 键盘用户无法触发 hover，按压反馈必须同时提供 `:focus-visible` 等价表现（见上一节）。

### 样式实现约定

样式分三处，职责不得混淆：

| 位置 | 负责内容 |
|---|---|
| `tailwind.css` 的 `@theme` | 设计令牌唯一真源（配色、字体、野兽派阴影） |
| `tailwind.css` 的 `@utility` / `@layer components` | 野兽派原子（`brutal-card`、`brutal-press`）与跨组件动效契约类（`page-*`、`reveal-*`、`enter-*`、`banner-*`、`fade-rise-*`、`is-submitting`） |
| `main.css` | 全局 reset、页面底色、页头与容器布局、BoldKit 别名、`--motion-*` 令牌及其 reduced-motion 折叠 |
| 各组件 `<style scoped>` | 组件级结构样式（网格、表格、媒体查询、后代选择器） |

两条硬性注意事项：

- **Tailwind v4 的工具类位于原生 cascade layer 内，而未分层的 scoped 样式优先级更高**。改写成工具类时必须同时删除被替代的 scoped 声明；反之，把 scoped 规则搬进 `@layer components` 会使其掉到工具类之下，可能改变既有覆盖关系（例如 `/summary` 工具栏按钮依赖未分层 CSS 压过 `AppButton` 的 `px-5 py-3`）。
- **`@utility` 是按需生成的**：只有扫描到候选类名才会输出。由 JS 动态添加的类名（指令写入的 `reveal-init` / `reveal-in`）与 `<Transition name>` 的约定类名必须写成字面 CSS 规则，不得定义为 `@utility`。

组件级结构样式不做全量原子化：`/summary` 的表格、网格与组合媒体查询改写后模板体积成倍增长、收益为负。

## 布局

### 页面容器

- `.responsive`：`max-width: 1200px`、`margin: auto`、`padding: 0 2rem`（移动端 1rem）
- 页面背景：`#FFF0F3` + 72×72px 浅色方格线
- Header 高度：63px（60px 内容 + 3px 底边框）
- 顶部路由进度条：`position: fixed` 贴顶通栏，高 `.5rem`（含 3px 墨色下边框），底色 `--color-surface`、进度填充 `--color-brand-pink`；参数取 `app/constants/ui.ts` 的 `UiRouteProgress`，实现见 `app/components/business/RouteProgressBar.vue`（挂载点 `app/app.vue`），路由加载状态取 Nuxt 内建的 `useLoadingIndicator`

### 单位口径

- 字号与间距统一使用 `rem`。
- 装饰性尺寸允许使用 `px`：边框宽度、阴影偏移、方格线尺寸、图表内的像素级微调。Tailwind 的默认间距刻度本身以 `px` 表达，属该例外范围。

### 响应式断点

| 宽度 | 行为 |
|---|---|
| `≥1080px` | 图表容器 2 列；TOP10 列表 2 列 |
| `≥800px` | 图表容器 2 列；概览数字卡 4 列 |
| `≥600px` | 图表容器 2 列；概览数字卡 2 列 |
| `<600px` | 全部单栏堆叠；概览数字卡 2 列 |

## 图表规范

### 1.图表归属表

每个统计项由谁渲染在此锁定，实现时不得自行更换载体。

| 统计项 | 载体 | 说明 |
|---|---|---|
| 2.1.1~2.1.4 概览四项 | StatCard 数字卡 | 不画图 |
| 2.1.5 完结状态 | 环形图（Donut） | 两项占比，中心显示收藏总数 |
| 2.2 / 2.3 / 2.4 词云 | **ECharts 词云**（`echarts-wordcloud`） | 唯一强依赖 ECharts 扩展的能力 |
| 2.5 分类/标签/作者分布 | **饼图** | TOP10 + 「其他」，遵循 3.1 阈值与排序 |
| 2.6.1 / 2.6.2 TOP10 排行 | 卡片列表（含缩略图） | 返回字段含缩略图，卡片是唯一自然载体 |
| 2.6.3 点赞率 | **散点图** | 待验证降级路径见第 4 条 |
| 2.7 内容规模 | StatCard + 进度条 + 环形图 | 标量指标用卡片，长短篇占比用环形图 |
| 2.9.1 创建年份分布 | **柱状图** | 多分桶时间序列 |
| 2.9.2 最近更新 | 进度分段条 | 四档计数（最近7天 / 最近30天 / 最近365天 / 超过一年） |
| 2.10 评论互动 | StatCard + 卡片列表 | 平均/总量 + TOP10 列表 |
| 2.11 热门关联 | **分组柱状图** | 对比用户侧与平台侧 |
| 2.12 热搜关联 | 徽章 + StatCard | 命中关键词列表 + 匹配比例 |

约束：

- 图表一律基于 **ECharts 5** 自行封装，不使用任何要求 echarts 6 的第三方图表组件。原因见 `PROJECT_SPEC.md` 的「图表方案与版本裁决」。
- 所有图表样式必须从主题 CSS 变量取值，不得硬编码色值。

### 2.ECharts 主题

| 项 | 约定 |
|---|---|
| 分类色板 | 以 `--primary`(brand-pink) 为首色，依次取 `--accent`(brand-yellow)、`brand-purple`、`brand-green`、`info`、`danger` 循环 |
| 渐变 | **不使用渐变**，全部实色填充，符合野兽派风格 |
| 坐标轴线 | `2px` 实线，颜色 `#000` |
| 网格线 | `1px` 虚线，颜色 `#000` 的 20% 透明度 |
| 文本 | 统一 `sans` 字体族，轴标签 `0.75rem` |
| Tooltip | 白底、`2px solid #000` 边框、`4px 4px 0 0 #000` 阴影、零圆角 |
| 图例 | 默认置于底部，窄屏时同样置底并允许换行 |
| 图表最小高度 | 桌面 `20rem`，移动端 `16rem` |

### 3.移动端策略

- 图表容器使用固定最小高度 + 宽度自适应，避免高度塌陷。
- 图例在窄屏一律置于底部。
- 饼图在窄屏隐藏引导线标签，仅保留图例。
- 散点图在窄屏不显示点标签。
- 柱状图在窄屏的 X 轴标签旋转 45°；若分类数超过 12 个，改为只显示 TOP 12。
- **词云降级规则**：窄屏（`<600px`）时词云只渲染 TOP 20（分类/标签/作者统一），完整 TOP 30/80/50 仅在 `≥600px` 渲染。

### 4.待验证降级路径

若确认 ECharts 5 环境下散点图（`series.type: 'scatter'`）存在性能或可读性问题，2.6.3 点赞率降级为**双轴柱状图**（X 轴为漫画，左轴浏览量、右轴点赞率）。该降级需在实现阶段实测后确认，不得预先采用。

### 5.长文本处理

- 漫画标题在卡片与表格中单行显示，超出以省略号截断，`title` 属性提供完整文本。
- 作者名过长时同样截断，不换行撑高卡片。
- AI 总结正文最大行宽 `40rem`，段落之间保留 `1rem` 间距。
