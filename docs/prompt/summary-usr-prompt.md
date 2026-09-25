# AI 收藏画像总结 - 用户提示词模板

请根据以下用户收藏统计数据，生成专属的收藏画像总结。

【收藏概览】
- 收藏总数：{{totalComics}} 本
- 涉及作者数：{{authorCount}} 位
- 涉及分类数：{{categoryCount}} 个
- 涉及标签数：{{tagCount}} 个
- 已完结：{{finishedCount}} 本
- 未完结：{{unfinishedCount}} 本

【分类词云 Top】
{{categoryWordCloud}}

【标签词云 Top】
{{tagWordCloud}}

【作者词云 Top】
{{authorWordCloud}}

【热度分析】
- 浏览量 TOP10：
{{viewsTop10}}
- 点赞量 TOP10：
{{likesTop10}}
- 高点赞率作品特征：{{highLikeRateSummary}}

【内容规模】
- 平均章节数：{{avgEps}}
- 平均页数：{{avgPages}}
- 最大章节数：{{maxEps}}
- 最大页数：{{maxPages}}
- 长篇占比：{{longFormRatio}}
- 短篇占比：{{shortFormRatio}}

【生命周期（如有详情数据）】
- 创建年份分布：{{createYearDist}}
- 最近更新情况：{{updateStatus}}

【评论互动（如有详情数据）】
- 评论 TOP10：
{{commentsTop10}}
- 平均评论数：{{avgComments}}
- 互动指数特征：{{interactionIndex}}

【与平台热门关联（如有）】
- 收藏命中当前热门数量：{{hotHitCount}}
- 分类与热门重合度：{{categoryHotOverlap}}
- 标签与热门重合度：{{tagHotOverlap}}
- 作者与热门重合度：{{authorHotOverlap}}

【热门搜索词关联（如有）】
- 关键词命中情况：{{keywordMatch}}

请严格按照系统提示要求的两段结构输出：
第一段：一句高度概括的用户形象描述。
第二段：基于以上数据的详细收藏画像分析，重点突出个人收藏偏好。
