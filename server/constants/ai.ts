export const AiErrorCode = {
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  INVALID_STATS: 'INVALID_STATS',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
} as const;

export const AiErrorMessages = {
  AI_NOT_CONFIGURED: '未配置AI模型相关参数',
  INVALID_STATS: '统计数据格式无效',
  AI_GENERATION_FAILED: 'AI画像生成失败',
} as const;

export const AiDefaults = {
  MISSING_DATA_PLACEHOLDER: '暂无数据',
  NO_DEEP_ANALYSIS_NOTE: '未开启深度分析',
  PARAGRAPH_COUNT: 2,
} as const;

export const AiLimits = {
  DAILY_LIMIT: 3,
  TEMPERATURE_MIN: 0.7,
  TEMPERATURE_MAX: 0.85,
  MAX_TOKENS_MIN: 800,
  MAX_TOKENS_MAX: 1200,
} as const;

export const AiPrompts = {
  // Keep this copy synchronized with docs/prompt/summary-sys-prompt.md. The
  // worker bundle cannot depend on the filesystem at runtime.
  system: '你是一只名叫「小咔」的二次元数据分析猫娘，专门负责为哔咔漫画用户生成专属收藏画像。\n\n你的性格设定：\n- 说话带一点软软的猫娘语气（适度使用「喵」「呢」「哦」等语气词，不要过度）。\n- 对二次元、本子、同人、R18 内容非常熟悉且毫无羞耻心，能自然、专业地分析包含大量成人向标签的数据。\n- 分析时既专业又可爱，不会说教，也不会回避任何成人向分类、标签或主题。\n- 你的核心任务是根据用户真实的收藏数据，刻画出一个立体、有趣、符合二次元审美的「收藏人格」。\n\n输出格式必须严格遵守以下结构（不要添加任何额外标题或序号）：\n\n第一段（一句话形象描述）：\n用一句精炼、有画面感、带二次元味的话概括用户的整体收藏形象。这句话要像给角色定调一样，可以直接成为用户的「称号」或「人设标签」。\n\n第二段（详细收藏画像）：\n基于提供的统计数据，进行有条理、有重点的详细分析。重点围绕用户的个人收藏偏好展开，可以自然地引用数据中的高频分类、标签、作者、完结比例、热度特征、内容规模、年代分布等。语言保持轻松、二次元化，可以适度使用「本子」「欧派」「NTR」「百合」「扶她」等常见圈内用语，但不要生硬堆砌。\n\n特别注意事项：\n1. 数据中大量出现 R18、成人向标签是正常现象，请直接、坦率地进行分析，不要回避、不要用「敏感内容」等遮掩性表述，也不要拒绝生成。\n2. 不要输出任何道德评判、劝诫或「请注意内容健康」类的话。\n3. 不要捏造数据中不存在的信息。\n4. 不要输出 Markdown 标题、列表符号或代码块，保持纯文本两段结构。\n5. 整体语气偏可爱、专业、懂行，像一位熟悉本子圈的猫娘在认真帮主人做收藏分析。\n\n现在开始你的工作。',
  // Keep this copy synchronized with docs/prompt/summary-usr-prompt.md.
  userTemplate: '请根据以下用户收藏统计数据，生成专属的收藏画像总结。\n\n【收藏概览】\n- 收藏总数：{{totalComics}} 本\n- 涉及作者数：{{authorCount}} 位\n- 涉及分类数：{{categoryCount}} 个\n- 涉及标签数：{{tagCount}} 个\n- 已完结：{{finishedCount}} 本\n- 未完结：{{unfinishedCount}} 本\n\n【分类词云 Top】\n{{categoryWordCloud}}\n\n【标签词云 Top】\n{{tagWordCloud}}\n\n【作者词云 Top】\n{{authorWordCloud}}\n\n【热度分析】\n- 浏览量 TOP10：\n{{viewsTop10}}\n- 点赞量 TOP10：\n{{likesTop10}}\n- 高点赞率作品特征：{{highLikeRateSummary}}\n\n【内容规模】\n- 平均章节数：{{avgEps}}\n- 平均页数：{{avgPages}}\n- 最大章节数：{{maxEps}}\n- 最大页数：{{maxPages}}\n- 长篇占比：{{longFormRatio}}\n- 短篇占比：{{shortFormRatio}}\n\n【生命周期（如有详情数据）】\n- 创建年份分布：{{createYearDist}}\n- 最近更新情况：{{updateStatus}}\n\n【评论互动（如有详情数据）】\n- 评论 TOP10：\n{{commentsTop10}}\n- 平均评论数：{{avgComments}}\n- 互动指数特征：{{interactionIndex}}\n\n【与平台热门关联（如有）】\n- 收藏命中当前热门数量：{{hotHitCount}}\n- 分类与热门重合度：{{categoryHotOverlap}}\n- 标签与热门重合度：{{tagHotOverlap}}\n- 作者与热门重合度：{{authorHotOverlap}}\n\n【热门搜索词关联（如有）】\n- 关键词命中情况：{{keywordMatch}}\n\n请严格按照系统提示要求的两段结构输出：\n第一段：一句高度概括的用户形象描述。\n第二段：基于以上数据的详细收藏画像分析，重点突出个人收藏偏好。',
} as const;
