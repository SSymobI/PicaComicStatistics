<script setup lang="ts">
import type { SummaryMetric } from '@types-project/summary';
import { CacheStaleNotice, QueueMessages } from '~/constants/routes';

const auth = useAuthStore();
const report = useSummaryReport();
const loading = computed(() => report.state.status === 'loading' || report.state.status === 'idle');
const deepRunning = computed(() => report.state.deepStatus === 'running');
const deepProgress = computed(() => report.state.deepTotal ? Math.round(report.state.deepCompleted / report.state.deepTotal * 100) : 0);
const generatedAt = computed(() => report.state.generatedAt ?? '');
const reportError = computed(() => report.state.errorMessage);
const stats = computed(() => report.state.stats);
const analysisParagraphs = computed(() => report.state.aiAnalysis
  ?.split(/\n\s*\n/)
  .flatMap(part => part.trim().split(/(?<=[。！？])\s*/).map(sentence => sentence.trim()).filter(Boolean))
  ?? []);
const metrics = (entries: Array<[string, string | number]>): SummaryMetric[] => entries.map(([label, value]) => ({ label, value }));
const sections = computed(() => {
  const result = stats.value;
  return [
    { id: 'overview', title: '收藏概览', description: '你的收藏总量与完结状态。', metrics: result ? metrics([['收藏总数', result.overview.totalComics], ['作者数', result.overview.authorCount], ['分类数', result.overview.categoryCount], ['标签数', result.overview.tagCount], ['完结率', `${(result.overview.finishedRatio * 100).toFixed(1)}%`], ['已完结', result.overview.finishedCount], ['连载中', result.overview.unfinishedCount]]) : [] },
    { id: 'preference', title: '内容偏好', description: '分类、标签与作者的分布。', metrics: result ? metrics([['分类条目', result.words.category.total], ['标签条目', result.words.tag.total], ['作者条目', result.words.author.total], ['分类词云', result.words.category.cloudItems.length], ['标签词云', result.words.tag.cloudItems.length], ['作者词云', result.words.author.cloudItems.length]]) : [] },
    { id: 'heat', title: '作品热度', description: '浏览量、点赞率与热门作品。', metrics: result ? metrics([['平均点赞率', `${(result.popularity.avgLikeRate * 100).toFixed(2)}%`], ['高热作品', result.popularity.highHeatCount], ['高点赞率作品', result.popularity.highLikeRateCount], ['浏览榜', result.popularity.viewsTop.length], ['点赞榜', result.popularity.likesTop.length]]) : [] },
    { id: 'scale', title: '内容规模', description: '章节、页数与长短篇分布。', metrics: result ? metrics([['平均章节', result.length.avgEps.toFixed(1)], ['平均页数', result.length.avgPages.toFixed(1)], ['最大章节', result.length.maxEps], ['最大页数', result.length.maxPages], ['长篇数量', result.length.longCount], ['短篇数量', result.length.shortCount]]) : [] },
    { id: 'lifecycle', title: '生命周期', description: '创建年份与最近更新时间。', metrics: result?.lifecycle ? metrics([['有效详情', result.lifecycle.validDateCount], ['缺失日期', result.lifecycle.missingDateCount], ['年份分布', result.lifecycle.createYearDist.length], ['最近7天', result.lifecycle.updateBuckets[0]?.count ?? 0], ['最近30天', result.lifecycle.updateBuckets[1]?.count ?? 0], ['超过一年', result.lifecycle.updateBuckets[3]?.count ?? 0]]) : [], locked: !report.state.deepAnalysis },
    { id: 'interaction', title: '评论互动', description: '评论与互动指数。', metrics: result?.interaction.deepAnalysis ? metrics([['评论总量', result.interaction.totalComments], ['平均评论', result.interaction.avgComments.toFixed(1)], ['有效评论作品', result.interaction.validCommentCount], ['互动条目', result.interaction.interactionItems.length]]) : [], locked: !report.state.deepAnalysis },
    { id: 'platform', title: '平台关联', description: '收藏偏好与平台热榜、热搜的关联。', metrics: result ? metrics([['热榜命中', result.hotRelation.hitCount], ['热榜命中率', `${(result.hotRelation.hitRate * 100).toFixed(1)}%`], ['热搜总数', result.keywordRelation.totalKeywords], ['热搜匹配', result.keywordRelation.hitKeywordCount], ['兴趣匹配率', `${(result.keywordRelation.interestMatchRatio * 100).toFixed(1)}%`]]) : [] },
  ];
});

onMounted(() => { void loadReport(); });

async function loadReport(force = false): Promise<void> {
  const loaded = await report.load(force);
  if (loaded)
    void report.generateAiSummary();
}

async function retry(): Promise<void> {
  await loadReport();
}

async function enableDeepAnalysis(): Promise<void> {
  await report.enableDeepAnalysis();
  if (report.state.deepAnalysis)
    void report.generateAiSummary();
}

async function generateAiSummary(): Promise<void> {
  await report.generateAiSummary(true);
}

async function logout(): Promise<void> { await auth.logout(); }
</script>

<template>
  <div class="summary-page">
    <div class="summary-toolbar">
      <div class="responsive toolbar-inner">
        <nav aria-label="报告导航">
          <a v-for="section in sections" :key="section.id" :href="`#${section.id}`">{{ section.title }}</a>
        </nav>
        <div class="toolbar-actions">
          <AppButton variant="secondary" :disabled="loading || deepRunning || !report.canRegenerate()" :title="!report.canRegenerate() ? QueueMessages.REGENERATION_LIMIT : '重新拉取收藏并替换本地报告'" @click="loadReport(true)">{{ loading ? QueueMessages.REGENERATING : '重新生成报告' }}</AppButton>
          <AppButton variant="secondary" :disabled="loading || deepRunning || !stats?.overview.totalComics" @click="enableDeepAnalysis">{{ report.state.deepAnalysis ? '继续深度分析' : '深度分析' }}</AppButton>
          <AppButton variant="secondary" @click="logout">退出登录</AppButton>
        </div>
      </div>
    </div>
    <main class="responsive summary-content">
      <UserProfileCard :user="auth.user" />
      <StatusBanner v-if="reportError" tone="danger" title="数据请求异常">
        {{ report.state.fromCache && reportError !== QueueMessages.REGENERATION_LIMIT ? CacheStaleNotice.FALLBACK_MESSAGE.replace('{generatedAt}', generatedAt || '未知时间') : reportError }} <button class="inline-action" @click="retry">
          重试
        </button>
      </StatusBanner>
      <StatusBanner v-else-if="!loading && generatedAt" tone="success">
        报告生成于 {{ generatedAt }}
      </StatusBanner>
      <section class="ai-short">
        <span>AI 用户画像</span><p v-if="loading">
          统计数据加载中。
        </p><p v-else-if="report.state.aiPersona">
          {{ report.state.aiPersona }}
        </p><p v-else>
          {{ report.state.aiStatus === 'loading' ? '正在生成收藏画像…' : report.state.aiStatus === 'error' ? '画像生成暂时失败，统计数据仍可查看。' : '正在准备收藏画像。' }}
        </p>
        <div v-if="report.state.aiStatus === 'error' && !loading" class="ai-retry"><small>{{ report.state.aiErrorMessage }}</small><AppButton variant="secondary" @click="generateAiSummary">重试</AppButton></div>
      </section>
      <div v-if="deepRunning || report.state.deepStatus === 'partial' || report.state.deepStatus === 'done'" class="deep-progress" role="status">
        <span>{{ deepRunning ? '正在深度分析' : report.state.deepStatus === 'partial' ? QueueMessages.CANCELLED : '深度分析已完成' }}：{{ report.state.deepCompleted }} / {{ report.state.deepTotal }}（{{ deepProgress }}%）</span>
        <AppButton v-if="deepRunning" variant="secondary" @click="report.cancelDeepAnalysis()">取消</AppButton>
        <AppButton v-else-if="report.state.deepStatus === 'partial'" variant="secondary" @click="enableDeepAnalysis">继续分析</AppButton>
      </div>
      <p v-if="report.state.deepFailed.length" class="deep-failures">{{ report.state.deepFailed.length }} 本详情获取失败：{{ report.state.deepFailed.join('、') }}</p>
      <div class="progress-line" :class="{ 'is-loading': loading }" aria-hidden="true" />
      <div class="section-list">
        <SummarySection v-for="section in sections" :id="section.id" :key="section.id" :title="section.title" :description="section.description" :loading="loading" :locked="section.locked" :metrics="section.metrics" :deep-running="deepRunning" @enable="enableDeepAnalysis" />
      </div>
      <div v-if="stats && !loading" class="chart-grid">
        <section id="charts-category" class="summary-section chart-card"><h2>分类词云</h2><StatsChart kind="wordcloud" :items="stats.words.category.cloudItems" /></section>
        <section id="charts-tags-cloud" class="summary-section chart-card"><h2>标签词云</h2><StatsChart kind="wordcloud" :items="stats.words.tag.cloudItems" /></section>
        <section id="charts-authors-cloud" class="summary-section chart-card"><h2>作者词云</h2><StatsChart kind="wordcloud" :items="stats.words.author.cloudItems" /></section>
        <section id="charts-tags" class="summary-section chart-card"><h2>标签分布</h2><StatsChart kind="pie" :items="stats.words.tag.topItems" /></section>
        <section id="charts-authors" class="summary-section chart-card"><h2>作者分布</h2><StatsChart kind="pie" :items="stats.words.author.topItems" /></section>
        <section id="charts-category-distribution" class="summary-section chart-card"><h2>分类分布</h2><StatsChart kind="pie" :items="stats.words.category.topItems" /></section>
        <section id="charts-years" class="summary-section chart-card"><h2>创建年份</h2><StatsChart v-if="stats.lifecycle?.createYearDist.length" kind="bar" :items="stats.lifecycle.createYearDist" /><p v-else>{{ report.state.deepAnalysis ? '暂无可展示数据' : QueueMessages.NO_DEEP_ANALYSIS }}</p></section>
        <section id="charts-updates" class="summary-section chart-card"><h2>更新状态</h2><StatsChart v-if="stats.lifecycle?.updateBuckets.length" kind="bar" :items="stats.lifecycle.updateBuckets" /><p v-else>{{ report.state.deepAnalysis ? '暂无可展示数据' : QueueMessages.NO_DEEP_ANALYSIS }}</p></section>
        <section id="rankings" class="summary-section chart-card ranking-card"><h2>热度排行榜</h2><div class="ranking-table-wrap"><table class="ranking-table"><caption>浏览量 TOP10</caption><colgroup><col class="title-column"><col class="author-column"><col class="number-column"><col class="number-column"><col class="category-column"><col class="tags-column"></colgroup><thead><tr><th scope="col">作品</th><th scope="col">作者</th><th scope="col">浏览量</th><th scope="col">点赞量</th><th scope="col">分类</th><th scope="col">标签</th></tr></thead><tbody><tr v-for="item in stats.popularity.viewsTop" :key="`views-${item.comicId}`"><td>{{ item.title }}</td><td>{{ item.author || '未知作者' }}</td><td>{{ item.totalViews }}</td><td>{{ item.totalLikes }}</td><td>{{ item.categories?.join('、') || '—' }}</td><td>{{ item.tags?.join('、') || '—' }}</td></tr></tbody></table></div><div class="ranking-table-wrap"><table class="ranking-table"><caption>点赞量 TOP10</caption><colgroup><col class="title-column"><col class="author-column"><col class="number-column"><col class="number-column"><col class="category-column"><col class="tags-column"></colgroup><thead><tr><th scope="col">作品</th><th scope="col">作者</th><th scope="col">浏览量</th><th scope="col">点赞量</th><th scope="col">分类</th><th scope="col">标签</th></tr></thead><tbody><tr v-for="item in stats.popularity.likesTop" :key="`likes-${item.comicId}`"><td>{{ item.title }}</td><td>{{ item.author || '未知作者' }}</td><td>{{ item.totalViews }}</td><td>{{ item.totalLikes }}</td><td>{{ item.categories?.join('、') || '—' }}</td><td>{{ item.tags?.join('、') || '—' }}</td></tr></tbody></table></div></section>
        <section v-if="stats.interaction.deepAnalysis" id="comments-ranking" class="summary-section chart-card ranking-card"><h2>评论 TOP10</h2><div class="ranking-table-wrap"><table class="ranking-table comments-table"><caption>评论数量 TOP10</caption><colgroup><col class="title-column"><col class="author-column"><col class="number-column"><col class="number-column"><col class="number-column"></colgroup><thead><tr><th scope="col">作品</th><th scope="col">作者</th><th scope="col">评论数</th><th scope="col">浏览量</th><th scope="col">点赞量</th></tr></thead><tbody><tr v-for="item in stats.interaction.commentsTop" :key="`comments-${item.comicId}`"><td>{{ item.title }}</td><td>{{ item.author || '未知作者' }}</td><td>{{ item.totalComments }}</td><td>{{ item.totalViews }}</td><td>{{ item.totalLikes }}</td></tr></tbody></table></div></section>
      </div>
      <section class="ai-detail summary-section">
        <h2>AI 用户画像（详细）</h2>
        <div v-if="analysisParagraphs.length" class="analysis-copy"><p v-for="(paragraph, index) in analysisParagraphs" :key="index">{{ paragraph }}</p></div>
        <p v-else-if="report.state.aiStatus === 'loading'">正在生成详细画像…</p>
        <p v-else-if="report.state.aiStatus === 'error'">画像暂不可用，请在上方重试。</p>
        <p v-else>统计完成后将在这里展示详细画像。</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.summary-page { padding-bottom: 3rem; }
.summary-toolbar { position: sticky; top: 0; z-index: 5; border-bottom: 3px solid #000; background: #fff; }
.toolbar-inner { display: flex; align-items: center; gap: 1rem; min-height: 3.6rem; }
.toolbar-inner nav { display: flex; flex: 1; gap: .7rem; overflow-x: auto; white-space: nowrap; }
.toolbar-actions { display: flex; flex: 0 0 auto; gap: .5rem; }
.toolbar-actions :deep(button) { padding: .45rem .65rem; font-size: .8rem; }
.toolbar-inner nav a { font-size: .85rem; font-weight: 800; text-decoration: underline; }
.summary-content { display: grid; gap: 1.4rem; padding-top: 1.5rem; }
.ai-short { border: 3px solid #000; box-shadow: 5px 5px 0 #000; padding: 1rem; background: var(--brand-yellow); }
.ai-short span { font-size: .85rem; font-weight: 900; }
.ai-short p { margin: .45rem 0 0; font-size: 1.15rem; font-weight: 900; }
.ai-retry { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; margin-top: .75rem; }
.deep-progress { display: flex; align-items: center; justify-content: space-between; gap: 1rem; border: 2px solid #000; padding: .7rem 1rem; background: #fff; font-weight: 800; }
.deep-failures { overflow-wrap: anywhere; margin: 0; color: #ac2424; }
.progress-line { height: .35rem; background: var(--brand-green); }
.progress-line.is-loading { background: var(--info); animation: loading 1.1s ease-in-out infinite alternate; }
@keyframes loading { from { opacity: .35; } to { opacity: 1; } }
.section-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.4rem; }
.section-list > :first-child { grid-column: 1 / -1; }
.summary-section { border: 3px solid #000; box-shadow: 6px 6px 0 #000; padding: 1.2rem; background: #fff; }
.summary-section h2 { display: inline-block; margin: 0 0 1rem; padding: .2rem .45rem; border-bottom: 3px solid #000; background: var(--brand-yellow); font-size: 1.3rem; font-weight: 900; line-height: 1.35; }
.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.4rem; }
.chart-card { min-width: 0; }
.ranking-card { display: grid; grid-column: 1 / -1; gap: 1rem; }
.ranking-table-wrap { overflow-x: auto; }
.ranking-table { width: 100%; min-width: 48rem; table-layout: fixed; border-collapse: collapse; text-align: center; }
.ranking-table .title-column { width: 24%; }
.ranking-table .author-column { width: 15%; }
.ranking-table .number-column { width: 11%; }
.ranking-table .category-column { width: 16%; }
.ranking-table .tags-column { width: 23%; }
.ranking-table caption { padding: .5rem 0; font-size: 1rem; font-weight: 900; text-align: left; }
.ranking-table th, .ranking-table td { border: 2px solid #000; padding: .65rem .7rem; vertical-align: middle; text-align: center; overflow-wrap: anywhere; word-break: normal; line-height: 1.55; }
.ranking-table th { background: var(--brand-yellow); font-weight: 900; white-space: nowrap; }
.inline-action { border: 2px solid #000; background: #fff; padding: .2rem .5rem; font-weight: 800; cursor: pointer; }
.ai-detail h2 { font-size: 1.5rem; }
.analysis-copy { max-width: 78ch; color: #171717; font-size: 1.05rem; line-height: 1.95; white-space: pre-line; }
.analysis-copy p { margin: 0 0 .85rem; }
@media (max-width: 62rem) { .toolbar-inner { flex-wrap: wrap; padding-top: .5rem; padding-bottom: .5rem; } .toolbar-inner nav { order: 2; flex-basis: 100%; } .toolbar-actions { margin-left: auto; } }
@media (max-width: 50rem) { .section-list, .chart-grid { grid-template-columns: 1fr; } }
@media (max-width: 37.5rem) { .toolbar-actions { width: 100%; justify-content: space-between; } .toolbar-actions :deep(button) { padding: .35rem .4rem; font-size: .72rem; } }
</style>
