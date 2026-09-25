# 数据模型规格

本文件是 `PROJECT_SPEC.md`「数据模型设计」章节的展开规格, 定义项目中全部自定义 type、interface 与 declare 的归属与结构。

对应主文档: `./PROJECT_SPEC.md` 数据模型设计章节。

## 一、类型定义目录约定

- 所有自定义 type、interface、declare 统一置于项目根目录 `types/` 下, 禁止在业务脚本与 Vue 组件内定义。
- `types/` 需同时被前端(app)与服务端(server)引用, 构建配置需为其配置双端可用别名。
- 文件与领域对应关系如下, 仅在新增领域时增加文件, 不按业务模块横向拆分。

| 文件 | 承载内容 |
|---|---|
| `types/pica-api.d.ts` | 上游哔咔漫画接口的请求与响应结构、Thumb、Pagination |
| `types/domain.d.ts` | 业务领域模型: 用户、收藏、热榜、搜索词、漫画详情 |
| `types/stats.d.ts` | 统计结果结构 |
| `types/cache.d.ts` | 缓存记录与账本结构 |
| `types/config.d.ts` | 枚举与常量类型 |
| `types/common.d.ts` | 通用工具类型、API 统一响应包装 |

## 二、三层数据模型

数据模型按 `PROJECT_SPEC.md` 的分层原则划分, 各层职责与持久化策略如下。

| 层级 | 名称 | 是否持久化 | 存储位置 |
|---|---|---|---|
| 第一层 | Raw 原始缓存 | 是 | IndexedDB |
| 第二层 | StatsResult 统计结果 | 是 | IndexedDB |
| 第三层 | Runtime 运行时状态 | 否(凭证类除外) | pinia 内存 + localStorage 凭证 |

### 2.1 原始缓存层 (Raw)

与上游哔咔漫画接口响应结构保持一致, 不做业务加工。该层的字段定义来自上游真实响应, 因此**不得**为「方便使用」而改写字段名或结构; 需要加工时一律放到第二层。

| 模型 | 数据来源接口 | 是否承载元信息 |
|---|---|---|
| `PicaUser` | `users/profile` | 否(纯上游响应; 原 `PicaProfile` 已合并至此模型) |
| `PicaComic` | `users/favourite`、`comics/leaderboard` 返回的列表项 | 否 |
| `PicaComicDetail` | `comics/{bookId}` | 否 |
| `Favourite` | `users/favourite` 的分页响应 | 是, 承载获取时间等元信息 |
| `Leaderboard` | `comics/leaderboard` | 是, 承载获取时间与所用时间范围 |
| `Keyword` | `keywords` | 是, 承载获取时间 |

元信息字段约定: `Favourite`、`Leaderboard`、`Keyword` 三个容器模型在承载上游响应内容之外, 各自附加以下元信息字段, 用于缓存 TTL 判定与「数据可能已过期」提示。

``` typescript
interface CacheMeta {
  userId: string; // 全局共享数据(hot)不使用该字段
  fetchedAt: string; // ISO 8601, 该批数据最近一次成功获取时间
}
```

- 元信息不写入上游原始字段所在的层级, 而是作为容器模型的独立字段, 避免与上游同名字段冲突。
- `PicaUser` 与 `PicaComic` 等**列表项/实体模型**不带元信息, 元信息只存在于容器模型上。

### 2.1.1 模型合并说明

- 原 Phase 2 清单中的 `PicaProfile` 与 `PicaUser` 合并为 `PicaUser`: 一个用户对应一份个人资料, 二者语义重复, 不再保留两个模型。
- 合并后 `PicaUser._id` 即为缓存分区键 `userId`。

### 2.2 统计结果层 (StatsResult)

`StatsResult` 为**单一聚合对象**, 内部按统计项分块。所有分块必须为可 JSON 序列化的纯数据, 不得出现组件实例、store 引用、函数字段或 `undefined` 以外的不可序列化值, 以保证可被单元测试直接断言并可安全地作为 `/api/ai/summary` 的请求体。

``` typescript
interface StatsResult {
  generatedAt: string; // ISO 8601, 该批统计的生成时间
  deepAnalysis: boolean; // 是否包含详情类统计
  overview: FavouriteStats; // 2.1
  words: {
    category: WordStats; // 2.2 / 2.5
    tag: WordStats; // 2.3 / 2.5
    author: WordStats; // 2.4 / 2.5
  };
  length: ComicLengthStats; // 2.7
  popularity: PopularityStats; // 2.6
  lifecycle?: LifecycleStats; // 2.9, 仅 deepAnalysis 为 true 时存在
  interaction: InteractionStats; // 2.10; 未开启深度分析时为浅层口径
  hotRelation: HotRelationStats; // 2.11
  keywordRelation: KeywordRelationStats; // 2.12
}
```

分块与主文档统计项对应关系:

| 分块 / 模型 | 对应主文档统计项 |
|---|---|
| `FavouriteStats` | 2.1 收藏概览统计 |
| `WordStats` | 2.2 / 2.3 / 2.4 词云, 2.5 分布 |
| `ComicLengthStats` | 2.7 收藏内容规模分析 |
| `PopularityStats` | 2.6 收藏作品热度分析 |
| `LifecycleStats` | 2.9 漫画生命周期分析 |
| `InteractionStats` | 2.10 评论互动分析 |
| `HotRelationStats` | 2.11 热门排行榜关联分析 |
| `KeywordRelationStats` | 2.12 热门搜索词关联分析 |
| `AiSummary` | AI 总结输出, 独立于 `StatsResult` 存储 |

### 2.2.1 词云与分布共用泛型

分类、标签、作者三者的词云与分布统计**复用同一泛型结构** `WordStats`, 不各带专属字段。

``` typescript
interface WordStatItem {
  name: string; // 归一化后的展示名(取出现次数最多的原始写法, 见 3.6)
  count: number; // 出现次数
  percent: number; // count / total, 0~1
}

interface WordStats {
  total: number; // 参与统计的条目总数
  uniqueCount: number; // 去重后的条目数
  items: WordStatItem[]; // 全量分布, 按 3.1 排序
  topItems: WordStatItem[]; // 饼图口径(TOP N + 其他合并)
  cloudItems: WordStatItem[]; // 词云口径(词云 TOP N)
  excludedZeroCount?: number; // 归一化后为空的条目数, 如未知作者
}
```

### 2.2.2 模型更名说明

原先构思的 `CategoryStats`、`TagStats`、`AuthorStats` 三个独立模型已合并为 `WordStats` 泛型 + 三个字段; `FavouriteStats`、`PopularityStats`、`LifecycleStats`、`InteractionStats` 保留各自独立模型。

### 2.2.3 各统计分块字段定义

本节为 `StatsResult` 各分块的逐字段定义。字段口径与主文档「统计指标定义」逐条对应, 实现时不得增删字段或改名。

数值约定:

- 比例、占比、重合度一律为 `0~1` 的小数, 不使用百分数字面量。
- 计数一律为非负整数。
- 归一化分数为 `0~100`。
- 时间一律为 ISO 8601 字符串。
- 数组若为空, 返回 `[]` 而非 `null`。

#### FavouriteStats（2.1 收藏概览）

``` typescript
interface FavouriteStats {
  totalComics: number; // 2.1.1 收藏漫画总数
  authorCount: number; // 2.1.2 去重作者数, 不含「未知作者」
  categoryCount: number; // 2.1.3 去重分类数
  tagCount: number; // 2.1.4 去重标签数
  finishedCount: number; // 2.1.5 已完结
  unfinishedCount: number; // 2.1.5 未完结
  finishedRatio: number; // finishedCount / totalComics, 分母为 0 时取 0
}
```

#### ComicLengthStats（2.7 内容规模）

``` typescript
interface ComicLengthStats {
  validRecordCount: number; // 有效记录数: pagesCount 与 epsCount 为非 null、非 undefined 的有限数字
  avgEps: number; // 平均章节数, 分母为 validRecordCount
  avgPages: number; // 平均页数, 分母为 validRecordCount
  maxEps: number; // 最大章节数
  maxPages: number; // 最大页数
  shortCount: number; // 短篇数量 pagesCount < 50
  midCount: number; // 中篇数量 50 <= pagesCount < 100
  longCount: number; // 长篇数量 pagesCount >= 100
  shortFormRatio: number; // shortCount / validRecordCount
  longFormRatio: number; // longCount / validRecordCount
  missingLengthCount: number; // pagesCount 缺失或非有限数字的收藏数, 不计入分母
}
```

口径约束:

- 分母为 `validRecordCount` 而非收藏总数; 缺失值**不按 0 计算**。
- `validRecordCount` 为 0 时, 平均值与最大值均取 0, 比例取 0, 不产生 `NaN` / `Infinity`。
- `midCount` 用于前端校验三段计数之和等于 `validRecordCount`。

#### PopularityStats（2.6 热度分析）

``` typescript
interface LikeRateItem {
  comicId: string;
  title: string;
  author: string;
  totalViews: number;
  totalLikes: number;
  likeRate: number; // totalLikes / totalViews, 仅 views > 0 的记录存在此值
  categories: string[];
  tags: string[];
  thumb: Thumb | null;
}

interface TopComicItem {
  comicId: string;
  title: string;
  author: string;
  totalViews: number;
  totalLikes: number;
  categories: string[];
  tags: string[];
  thumb: Thumb | null;
}

interface PopularityStats {
  viewsTop: TopComicItem[]; // 2.6.1 totalViews 降序 TOP10
  likesTop: TopComicItem[]; // 2.6.2 totalLikes 降序 TOP10
  likeRateItems: LikeRateItem[]; // 2.6.3 供散点图, 已剔除 views <= 0
  avgLikeRate: number; // 平均点赞率, 仅统计 views > 0 的记录
  excludedZeroViewsCount: number; // 3.4 被剔除的异常数据条数, 供前端提示
  highLikeRateCount: number; // 点赞率高于均值且 totalViews 低于中位数的记录数, 用于 2.6.3 的「小众高质量」判定
  highHeatCount: number; // totalViews 高于中位数且点赞率高于均值的记录数, 用于「高热度」判定
}
```

口径约束:

- `likeRateItems` 与 `avgLikeRate` 的样本范围**必须一致**（均为 `views > 0` 的记录), 否则前端提示与图表数据会互相矛盾。
- `excludedZeroViewsCount` 与 `WordStats.excludedZeroCount` **语义不同, 不得混用**: 前者为点赞率口径剔除的异常记录, 后者为词云口径中被归一化为空的条目。
- TOP 榜单条目数上限为 `StatThresholds.RANKING_TOP_LIMIT`, 不足时按实际数量返回。
- 同值排序规则见 `PROJECT_SPEC.md` 3.1（次数降序, 相同按名称升序）。

#### LifecycleStats（2.9 生命周期, 仅深度分析）

``` typescript
interface YearBucket {
  year: number; // 创建年份, 按传入时区计算
  count: number;
  percent: number; // 0~1, 分母为 validDateCount
}

interface UpdateBucket {
  key: 'recent7' | 'recent30' | 'recent365' | 'stale';
  label: string; // 展示文案, 取自枚举
  count: number;
  percent: number;
}

interface LifecycleStats {
  timezone: string; // 本次统计使用的 IANA 时区
  validDateCount: number; // created_at 有效且可解析的记录数
  missingDateCount: number; // created_at 缺失或无法解析的记录数
  createYearDist: YearBucket[]; // 2.9.1 按年份升序
  updateBuckets: UpdateBucket[]; // 2.9.2 四档: 最近7天 / 最近30天 / 最近365天 / 超过一年
  firstCreatedAt: string | null; // 收藏中最早的创建时间
  lastUpdatedAt: string | null; // 收藏中最新的更新时间
}
```

口径约束:

- 年份与更新档位按传入的 IANA 时区计算; 服务端 fallback 为 `Asia/Shanghai`, 但本分块由前端纯函数产出。
- 四档为互斥区间, 详情见 `PROJECT_SPEC.md` 3.5 与 `UpdateRecencyBuckets`。
- 分母为 `validDateCount`; 为 0 时各 `percent` 取 0, 数组返回 `[]`。

#### InteractionStats（2.10 评论互动）

``` typescript
interface InteractionItem {
  comicId: string;
  title: string;
  author: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  interactionIndex: number; // 原始加权分, 排序依据
  interactionIndexNormalized: number; // 0~100, 仅用于展示
  thumb: Thumb | null;
}

interface InteractionStats {
  deepAnalysis: boolean; // 是否含评论维度
  validCommentCount: number; // 有有效评论数据的记录数; 浅层口径下为 0
  commentsTop: InteractionItem[]; // 2.10 评论数降序 TOP10; 浅层口径下返回 []
  totalComments: number; // 收藏漫画评论总量; 浅层口径下为 0
  avgComments: number; // 平均评论数, 分母为 validCommentCount; 浅层口径下为 0
  interactionItems: InteractionItem[]; // 全量互动指数, 供图表
  shallowLabel: string | null; // 浅层口径时的标记文案, 取自 AiDefaults.SHALLOW_LABEL; 深度口径为 null
}
```

口径约束:

- 权重为 `浏览量 : 点赞量 : 评论量 = 1 : 3 : 5`, 且三项均先取 `Math.log10(x + 1)`; 浅层口径下评论项**不参与计算**。
- 排序**一律使用 `interactionIndex` 原始分**, `interactionIndexNormalized` 只用于展示（`maxIndex` 取当前集合内最大值, 为 0 时统一取 0）。
- 浅层口径下 `deepAnalysis` 为 `false`, `shallowLabel` 不为空; 详情类字段返回 `0` 或 `[]` 而非 `null`, 以便前端统一渲染。

#### HotRelationStats（2.11 热门排行榜关联）

``` typescript
interface DistributionPair {
  userDistribution: WordStatItem[];
  hotDistribution: WordStatItem[];
  overlapNames: string[];
  overlapCount: number;
  userOverlapPercent: number; // 0~1, 分母为用户侧条目总数
  hotOverlapPercent: number; // 0~1, 分母为热门侧条目总数
}

interface HotRelationStats {
  timeRange: 'H24' | 'D7' | 'D30'; // 本次比较所用的热榜时间范围
  hotTotal: number; // 热榜返回条目总数
  hitCount: number; // 2.11.1 按 _id 精确匹配的命中数
  hitRate: number; // hitCount / 收藏总数
  hitComicIds: string[]; // 命中的漫画 id 列表
  category: DistributionPair; // 2.11.2
  tag: DistributionPair; // 2.11.3
  author: DistributionPair; // 2.11.4, 未知作者不参与
}
```

口径约束:

- 命中判定**仅按 `_id` 精确相等**, 不得按标题或作者匹配; 两侧比较前剔除 `_id` 为空的记录。
- `hitRate` 的分母为**收藏总数**, 不以热榜 40 条为分母。
- 名称比较使用 3.6 归一化规则; `overlapNames` 内为归一化后的展示名。
- 各 `percent` 分母为 0 时取 0。

#### KeywordRelationStats（2.12 热门搜索词关联）

``` typescript
interface KeywordRelationStats {
  totalKeywords: number; // 热搜关键词总数
  hitKeywordCount: number; // 命中至少一次的关键词数
  hitKeywordList: string[]; // 命中关键词的原始写法列表
  userRelatedTagCount: number; // 被命中的用户分类与标签条目去重后的数量
  interestMatchRatio: number; // hitKeywordCount / totalKeywords, 分母为 0 时取 0
  matchedItems: WordStatItem[]; // 被命中的用户分类与标签条目明细
}
```

口径约束:

- 命中判定为**归一化后精确相等**, 不做子串包含匹配。
- `interestMatchRatio` 的分母为 `totalKeywords`。
- 热搜关键词为空时, 全部计数为 0、`interestMatchRatio` 为 0、数组返回 `[]`。

### 2.2.4 字段与 AI 提示词占位符的对应

`docs/prompt/summary-usr-prompt.md` 的每个占位符都必须能由本节字段直接产出, 不得引入本节未定义的字段:

| 占位符 | 数据来源 |
|---|---|
| `{{totalComics}}` / `{{authorCount}}` / `{{categoryCount}}` / `{{tagCount}}` | `overview.*` |
| `{{finishedCount}}` / `{{unfinishedCount}}` | `overview.finishedCount` / `overview.unfinishedCount` |
| `{{categoryWordCloud}}` / `{{tagWordCloud}}` / `{{authorWordCloud}}` | `words.{category,tag,author}.cloudItems` |
| `{{viewsTop10}}` / `{{likesTop10}}` | `popularity.viewsTop` / `popularity.likesTop` |
| `{{highLikeRateSummary}}` | `popularity.highLikeRateCount` 与 `popularity.highHeatCount` 组合成简短文字 |
| `{{avgEps}}` / `{{avgPages}}` / `{{maxEps}}` / `{{maxPages}}` | `length.*` |
| `{{longFormRatio}}` / `{{shortFormRatio}}` | `length.longFormRatio` / `length.shortFormRatio` |
| `{{createYearDist}}` / `{{updateStatus}}` | `lifecycle.createYearDist` / `lifecycle.updateBuckets` |
| `{{commentsTop10}}` / `{{avgComments}}` | `interaction.commentsTop` / `interaction.avgComments` |
| `{{interactionIndex}}` | `interaction.interactionItems` 的分布特征摘要 |
| `{{hotHitCount}}` / `{{categoryHotOverlap}}` / `{{tagHotOverlap}}` / `{{authorHotOverlap}}` | `hotRelation.hitCount` 与 `hotRelation.{category,tag,author}.*OverlapPercent` |
| `{{keywordMatch}}` | `keywordRelation.hitKeywordList` 与 `keywordRelation.interestMatchRatio` |

- 未开启深度分析时, `lifecycle` 字段缺省、`interaction` 为浅层口径; 对应占位符按 `PROJECT_SPEC.md` AI 总结模块设计第 3 条填充占位符并显式标注「未开启深度分析」。

### 2.3 运行时状态层 (Runtime)

由 pinia store 持有, 刷新页面后重建。仅凭证、计数与偏好类数据落地 localStorage。

| 模型 | 用途 | 持久化 |
|---|---|---|
| `PicaLoginResponse` | 登录接口返回值 | 其中的 token 存入 localStorage, 其余不持久化 |
| `AiSummary` | AI 生成的两段内容 | 独立表持久化, 按 userId |
| `CacheRecord` | 缓存元信息(创建时间、所属 userId、TTL 判定依据) | **与业务数据不同表储存** |

### 2.3.1 AiSummary 结构

``` typescript
interface AiSummary {
  userId: string;
  generatedAt: string; // ISO 8601
  statsGeneratedAt: string; // 生成该总结时所依据的统计结果生成时间, 用于失效判定
  persona: string; // 第一段: 一句用户画像
  analysis: string; // 第二段: 详细收藏画像分析
}
```

- 两段内容均需在接口响应中返回, 前端按段落分别渲染。
- **不**携带模型名、耗时、token 用量等元信息。
- 输出必须为两段; 若模型输出无法解析为两段, 视为生成失败。

### 2.3.2 CacheRecord 与业务数据分表

- `CacheRecord` 使用**独立于业务数据的表**储存, 不与 `favourites` / `stats` 等业务表混存。
- 业务表自身只承载业务数据, 缓存元信息(创建时间、TTL 判定依据、所属 userId)统一由 `CacheRecord` 表记录。
- 判定某类缓存是否过期时, 先查 `CacheRecord` 再决定是否使用业务表数据; 不允许仅凭业务表数据推断新鲜度。
- `CacheRecord` 的主键需能唯一定位「某个 userId 的某类缓存」。
- `CacheRecord` **兼记该账号的最后登录时间**, 作为「本地保留账号数量上限」淘汰排序的依据, 不另存 localStorage。

``` typescript
interface CacheRecord {
  userId: string;
  cacheType: 'favourites' | 'details' | 'stats' | 'aiSummary' | 'hot' | 'account';
  fetchedAt: string; // ISO 8601, 该类缓存最近一次成功获取/生成时间
  lastLoginAt?: string; // ISO 8601, 仅 cacheType 为 account 的记录携带
  itemCount?: number; // 该批缓存的记录条数, 便于前端提示
}
```

### 2.3.3 未开启深度分析时的分块形态

- 未开启深度分析时, `StatsResult` 中**不出现** `lifecycle` 字段(字段缺省), 不使用空对象占位。
- `interaction` 分块始终存在, 未开启深度分析时为浅层口径; 该分块内含 `deepAnalysis: boolean` 标记, 用于区分口径。
- `StatsResult.deepAnalysis` 为整批统计的深度标记, 与 `interaction.deepAnalysis` 语义一致; 前者用于 AI 模块判断是否需要填充「未开启深度分析」标注, 后者用于前端图表的图例与提示。
- 依赖详情数据的统计项(2.9、2.10 的评论维度)在未开启深度分析时不得输出猜测值或 0, 一律通过字段缺省 + 标记表达。

## 三、上游响应结构基准

以下为第一层的字段基准, 与 `./picacomic-api.md` 保持一致。

### 3.1 Thumb

| 字段 | 类型 | 说明 |
|---|---|---|
| `originalName` | string | 原始文件名 |
| `path` | string | 图片相对路径 |
| `fileServer` | string | 图片服务器地址 |
| `fileUrl` | string | 完整图片地址(由服务端代理替换生成) |

图片地址拼接规则: `{fileServer}/static/{path}`。

### 3.2 PicaComic (列表项)

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 漫画 ID |
| `title` | string | 标题 |
| `author` | string | 作者 |
| `totalViews` | number | 总浏览量 |
| `totalLikes` | number | 总点赞量 |
| `pagesCount` | number | 漫画页数 |
| `epsCount` | number | 章节数 |
| `finished` | boolean | 是否完结 |
| `categories` | string[] | 分类 |
| `tags` | string[] | 标签 |
| `thumb` | Thumb | 缩略图 |
| `likesCount` | number | 点赞计数 |
| `leaderboardCount` | number \| undefined | 仅排行榜接口返回 |
| `viewsCount` | number \| undefined | 仅排行榜接口返回 |

### 3.3 PicaComicDetail

在 `PicaComic` 基础上, `comics/{bookId}` 额外返回:

| 字段 | 类型 | 说明 |
|---|---|---|
| `description` | string | 简介 |
| `chineseTeam` | string | 汉化组 |
| `_creator` | object | 上传者信息 |
| `updated_at` | string | 更新时间 |
| `created_at` | string | 创建时间 |
| `allowDownload` | boolean | 是否允许下载 |
| `allowComment` | boolean | 是否允许评论 |
| `totalComments` | number | 总评论数 |
| `commentsCount` | number | 评论计数 |
| `isFavourite` | boolean | 当前用户是否收藏 |
| `isLiked` | boolean | 当前用户是否喜欢 |

### 3.4 Pagination

| 字段 | 类型 | 说明 |
|---|---|---|
| `docs` | T[] | 数据项 |
| `total` | number | 总数 |
| `limit` | number | 分页大小 |
| `page` | number | 当前页 |
| `pages` | number | 总页数 |

### 3.5 PicaUser

`users/profile` 响应字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 用户 ID, 即缓存分区键 userId |
| `email` | string | 用户名/邮箱 |
| `name` | string | 昵称 |
| `birthday` | string | 生日(ISO 8601) |
| `gender` | string | 性别 |
| `slogan` | string | 个性签名 |
| `title` | string | 头衔 |
| `verified` | boolean | 是否验证 |
| `exp` | number | 经验值 |
| `level` | number | 等级 |
| `characters` | string[] | 头衔装饰 |
| `created_at` | string | 注册时间 |
| `avatar` | Thumb | 头像 |
| `isPunched` | boolean | 今日是否打卡 |

### 3.6 PicaLoginResponse

`auth/sign-in` 响应仅含 `token` 字段。其余为凭证生命周期所需字段, 由前端从 JWT 解析或本地生成。

## 四、存储主键基准

私有数据的分区键必须包含 userId, 严禁在未携带 userId 的条件下读写私有数据。Object Store 划分如下。

| Object Store | 数据归属 | keyPath | 说明 |
|---|---|---|---|
| `favourites` | 私有 | `userId` | 该用户完整收藏列表与获取时间 |
| `details` | 私有 | `[userId, comicId]` | 复合主键, 单本详情独立过期 |
| `stats` | 私有 | `userId` | 该用户 `StatsResult` |
| `aiSummary` | 私有 | `userId` | 该用户 AI 总结 |
| `cacheRecord` | 私有 + 全局 | `[userId, cacheType]` | 独立表, 缓存元信息; 全局数据使用哨兵 userId `__global__` |
| `hot` | 全局共享 | 固定主键 | 热榜与热搜词为平台公共数据 |

约束:

- 不允许出现「未命中 userId 时取最后一条」的回退逻辑。
- 用户登出不清空 IndexedDB 数据; 本地保留账号数量上限与淘汰规则见 `PROJECT_SPEC.md` 缓存机制。
- `cacheRecord` 与业务数据分表; 业务表不承载新鲜度字段。

## 五、决策清单

本文件全部模型决策已确认, 无待确认项。

1. `StatsResult` 为单一聚合对象, 内含各统计分块(见 2.2)。
2. 2.7 对应 `ComicLengthStats`; 2.8 不产生独立模型, 其产出并入 `LifecycleStats` 与 `InteractionStats`; 2.11 对应 `HotRelationStats`; 2.12 对应 `KeywordRelationStats`。
3. `Favourite`、`Leaderboard`、`Keyword` 承载获取时间等元信息(见 2.1)。
4. 分类、标签、作者的词云与分布复用同一泛型 `WordStats`(见 2.2.1)。
5. `AiSummary` 不携带模型名与耗时; 响应中携带两段内容(一句画像 + 详细分析)(见 2.3.1)。
6. `CacheRecord` 与业务数据不同表储存, 且兼记该账号最后登录时间, 不另存 localStorage(见 2.3.2)。
7. `PicaUser` 与 `PicaProfile` 合并为 `PicaUser`(见 2.1.1)。
8. 未开启深度分析时 `lifecycle` 字段缺省; `interaction` 分块始终存在并携带 `deepAnalysis` 标记(见 2.3.3)。
9. `cacheRecord` 主键采用形式一复合主键 `['userId', 'cacheType']`, 全局共享数据使用哨兵值 `__global__`(见第六节)。
10. 主文档 3.4 的「已排除 N 条异常数据」提示数据来源于 `popularity` 分块, 不使用词云分块的口径。
11. `WordStats.excludedZeroCount` **需要暴露给前端与 AI 模块**: 前端用于 3.4 的「已排除 N 条异常数据」提示, AI 模块作为可选输入; 该字段与 `popularity` 分块的排除计数语义不同（前者为词云口径中被归一化为空的条目, 后者为点赞率口径中被剔除的异常记录), 两者不得混用。
12. `StatsResult` 全部统计分块采用 2.2.3 节的逐字段定义, 实现时不得增删字段或改名（见 2.2.3 / 2.2.4）。

## 六、关于 `cacheRecord` 主键的说明

IndexedDB 需要一个字段来唯一标识每条记录, 该字段称为 `keyPath`(主键路径)。`cacheRecord` 表中同一用户会有多条不同类型缓存的记录, 因此主键需要能同时区分「谁」和「哪类缓存」。

两种可选形式, 以「用户 A 的统计缓存」与「用户 B 的收藏缓存」两条记录为例:

- 形式一(复合主键): 主键由两个字段组成 `['userId', 'cacheType']`。

``` typescript

{ userId: 'A', cacheType: 'stats', fetchedAt: '2026-02-14T10:00:00+08:00' }
{ userId: 'B', cacheType: 'favourites', fetchedAt: '2026-02-14T11:00:00+08:00' }

```

- 形式二(拼接字符串主键): 主键为单个字段, 值由两个信息拼接而成。

``` typescript

{ key: 'A:stats', userId: 'A', cacheType: 'stats', fetchedAt: '2026-02-14T10:00:00+08:00' }
{ key: 'B:favourites', userId: 'B', cacheType: 'favourites', fetchedAt: '2026-02-14T11:00:00+08:00' }

```

- 全局共享数据(hot)不含真实 userId, 使用固定哨兵值 `__global__` 占位, 以避免与任何真实用户 ID 冲突。
- **已确认采用形式一(复合主键)**, 哨兵值取 `__global__`。记录示例:

``` typescript

{ userId: 'A', cacheType: 'stats', fetchedAt: '2026-02-14T10:00:00+08:00' }
{ userId: 'A', cacheType: 'account', fetchedAt: '...', lastLoginAt: '2026-02-14T09:30:00+08:00' }
{ userId: '__global__', cacheType: 'hot', fetchedAt: '2026-02-14T12:00:00+08:00' }

```

- 采用复合主键的原因: 按 userId 清理某账号全部缓存时更直观, 且不需要维护字符串拼接与解析逻辑。
