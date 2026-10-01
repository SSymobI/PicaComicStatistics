<script setup lang="ts">
import type { SummaryMetric } from '@types-project/summary';
import type { SummarySectionProps } from '@types-project/ui';
import { QueueStatus } from '@types-project/runtime';
import { CacheStaleNotice, QueueMessages, ReportMessages } from '@/constants/routes';
import { DeepAnalysisMessages } from '@/constants/statistics';
import { UiMessages, UiScroll } from '@/constants/ui';
import { formatLocalDateTime } from '@/utils/datetime';
import { prefersReducedMotion } from '@/utils/motion';

const auth = useAuthStore();
const report = useSummaryReport();
const toolbarSentinel = ref<HTMLElement>();
const toolbarRaised = ref(false);
const backToTopVisible = ref(false);
let sentinelObserver: IntersectionObserver | undefined;
const loading = computed(() => report.state.status === 'loading' || report.state.status === 'idle');
const deepRunning = computed(() => report.state.deepStatus === QueueStatus.RUNNING);
const deepProgress = computed(() => report.state.deepTotal ? Math.round(report.state.deepCompleted / report.state.deepTotal * 100) : 0);
const generatedAt = computed(() => report.state.generatedAt ?? '');
const generatedAtText = computed(() => formatLocalDateTime(generatedAt.value) || CacheStaleNotice.UNKNOWN_TIME);
const reportError = computed(() => report.state.errorMessage);
const stats = computed(() => report.state.stats);
const isEmptyFavourite = computed(() => !loading.value && stats.value?.overview.totalComics === 0);
/** 失败详情用收藏标题展示，取不到时回退 comicId。 */
function favouriteTitle(comicId: string): string {
  return report.state.favourites.find(item => item._id === comicId)?.title || comicId;
}
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

useHead({
  title: '哔咔收藏统计 | 统计结果',
});

/** 每个统计主题所含的图表，用于导航提示与无障碍说明。 */
const chartIndex: Record<string, string[]> = {
  preference: ['分类词云', '标签词云', '作者词云', '分类分布', '标签分布', '作者分布'],
  heat: ['热度排行榜'],
  lifecycle: ['创建年份', '更新状态'],
  interaction: ['评论 TOP10'],
};

function chartSummary(id: string): string | undefined {
  const charts = chartIndex[id];
  return charts?.length ? `含图表：${charts.join(' · ')}` : undefined;
}

function isLocked(section: { locked?: boolean }): boolean {
  return section.locked === true;
}

/** 指标卡是主题区块的组成部分，锚点由主题节点承担，故用 `-metrics` 后缀避免 id 重复。 */
function metricProps(id: string): SummarySectionProps {
  const section = sections.value.find(item => item.id === id);
  return {
    id: `${id}-metrics`,
    title: section?.title ?? '',
    description: section?.description ?? '',
    metrics: section?.metrics ?? [],
    locked: section ? isLocked(section) : false,
    loading: loading.value,
  };
}

function scrollToSection(id: string, event: MouseEvent): void {
  const target = document.getElementById(id);
  if (!target)
    return;
  event.preventDefault();
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
}

function handleScroll(): void {
  backToTopVisible.value = window.scrollY > UiScroll.BACK_TO_TOP_OFFSET_PX;
}

function backToTop(): void {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

onMounted(() => {
  void loadReport();
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
  const sentinel = toolbarSentinel.value;
  if (!sentinel || typeof IntersectionObserver === 'undefined')
    return;
  sentinelObserver = new IntersectionObserver((entries) => {
    toolbarRaised.value = !entries.some(entry => entry.isIntersecting);
  }, { threshold: 0 });
  sentinelObserver.observe(sentinel);
});

onBeforeUnmount(() => {
  sentinelObserver?.disconnect();
  window.removeEventListener('scroll', handleScroll);
});

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
    <div ref="toolbarSentinel" class="toolbar-sentinel" aria-hidden="true" />
    <div class="summary-toolbar" :class="{ 'is-raised': toolbarRaised }">
      <div class="responsive toolbar-inner">
        <nav aria-label="报告导航">
          <a v-for="section in sections" :key="section.id" :href="`#${section.id}`" :title="chartSummary(section.id)" @click="scrollToSection(section.id, $event)">{{ section.title }}</a>
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
      <Transition name="banner" mode="out-in">
        <StatusBanner v-if="reportError" tone="danger" title="数据请求异常">
          {{ report.state.fromCache && reportError !== QueueMessages.REGENERATION_LIMIT ? CacheStaleNotice.FALLBACK_MESSAGE.replace('{generatedAt}', generatedAtText) : reportError }} <button class="inline-action" @click="retry">
            重试
          </button>
        </StatusBanner>
        <StatusBanner v-else-if="isEmptyFavourite" tone="info">
          {{ QueueMessages.EMPTY_FAVOURITE }}
        </StatusBanner>
        <StatusBanner v-else-if="!loading && generatedAt" tone="success">
          报告生成于 {{ generatedAtText }}<template v-if="report.state.cacheStale">（{{ CacheStaleNotice.STALE_MESSAGE }}）</template>
        </StatusBanner>
      </Transition>
      <section v-reveal class="ai-short">
        <span>AI 用户画像</span>
        <Transition name="fade-rise" mode="out-in">
          <p v-if="loading">
            统计数据加载中。
          </p>
          <p v-else-if="report.state.aiPersona">
            {{ report.state.aiPersona }}
          </p>
          <p v-else>
            {{ report.state.aiStatus === 'loading' ? '正在生成收藏画像…' : report.state.aiStatus === 'error' ? '画像生成暂时失败，统计数据仍可查看。' : '正在准备收藏画像。' }}
          </p>
        </Transition>
        <div v-if="report.state.aiStatus === 'error' && !loading" class="ai-retry"><small>{{ report.state.aiErrorMessage }}</small><AppButton variant="secondary" @click="generateAiSummary">重试</AppButton></div>
      </section>
      <Transition name="banner">
        <div v-if="deepRunning || report.state.deepStatus === QueueStatus.PARTIAL || report.state.deepStatus === QueueStatus.DONE" class="deep-progress" role="status">
          <span>{{ deepRunning ? DeepAnalysisMessages.IN_PROGRESS : report.state.deepStatus === QueueStatus.PARTIAL ? QueueMessages.CANCELLED : DeepAnalysisMessages.COMPLETE }}：{{ report.state.deepCompleted }} / {{ report.state.deepTotal }}（{{ deepProgress }}%）</span>
          <AppButton v-if="deepRunning" variant="secondary" @click="report.cancelDeepAnalysis()">取消</AppButton>
          <AppButton v-else-if="report.state.deepStatus === QueueStatus.PARTIAL" variant="secondary" @click="enableDeepAnalysis">继续分析</AppButton>
        </div>
      </Transition>
      <div v-if="report.state.deepFailed.length" class="deep-failures">
        <p>{{ QueueMessages.PARTIAL.replace('{failedCount}', String(report.state.deepFailed.length)) }}</p>
        <ul class="deep-failure-list">
          <li v-for="comicId in report.state.deepFailed" :key="comicId">
            <span>{{ favouriteTitle(comicId) }}</span>
            <button type="button" class="inline-action" @click="report.retryDetail(comicId)">
              {{ ReportMessages.RETRY_DETAIL }}
            </button>
          </li>
        </ul>
      </div>
      <p v-if="loading && report.state.pages > 0" class="loading-progress" role="status">
        {{ ReportMessages.FAVOURITE_PROGRESS }}：{{ report.state.page }} / {{ report.state.pages }}
      </p>
      <div class="progress-line" :class="{ 'is-loading': loading }" aria-hidden="true" />
      <div class="topic-list">
        <section id="overview" class="topic">
          <SummarySection v-bind="metricProps('overview')" />
        </section>
        <section id="preference" class="topic">
          <SummarySection v-bind="metricProps('preference')" />
          <div v-if="stats && !loading" class="chart-grid">
            <section id="charts-category" v-reveal class="summary-section brutal-card chart-card"><h2>分类词云</h2><StatsChart kind="wordcloud" :items="stats.words.category.cloudItems" /></section>
            <section id="charts-tags-cloud" v-reveal class="summary-section brutal-card chart-card"><h2>标签词云</h2><StatsChart kind="wordcloud" :items="stats.words.tag.cloudItems" /></section>
            <section id="charts-authors-cloud" v-reveal class="summary-section brutal-card chart-card"><h2>作者词云</h2><StatsChart kind="wordcloud" :items="stats.words.author.cloudItems" /></section>
            <section id="charts-tags" v-reveal class="summary-section brutal-card chart-card"><h2>标签分布</h2><StatsChart kind="pie" :items="stats.words.tag.topItems" /></section>
            <section id="charts-authors" v-reveal class="summary-section brutal-card chart-card"><h2>作者分布</h2><StatsChart kind="pie" :items="stats.words.author.topItems" /></section>
            <section id="charts-category-distribution" v-reveal class="summary-section brutal-card chart-card"><h2>分类分布</h2><StatsChart kind="pie" :items="stats.words.category.topItems" /></section>
          </div>
        </section>
        <section id="heat" class="topic">
          <SummarySection v-bind="metricProps('heat')" />
          <div v-if="stats && !loading" class="chart-grid">
            <section id="rankings" v-reveal class="summary-section brutal-card chart-card ranking-card"><h2>热度排行榜</h2><div class="ranking-table-wrap"><table class="ranking-table"><caption>浏览量 TOP10</caption><colgroup><col class="rank-column"><col class="title-column"><col class="author-column"><col class="number-column"><col class="number-column"><col class="category-column"><col class="tags-column"></colgroup><thead><tr><th scope="col">序号</th><th scope="col">作品</th><th scope="col">作者</th><th scope="col">浏览量</th><th scope="col">点赞量</th><th scope="col">分类</th><th scope="col">标签</th></tr></thead><tbody><tr v-for="(item, index) in stats.popularity.viewsTop" :key="`views-${item.comicId}`"><td class="rank-number">{{ index + 1 }}</td><td>{{ item.title }}</td><td>{{ item.author || '未知作者' }}</td><td>{{ item.totalViews }}</td><td>{{ item.totalLikes }}</td><td>{{ item.categories?.join('、') || '—' }}</td><td>{{ item.tags?.join('、') || '—' }}</td></tr></tbody></table></div><div class="ranking-table-wrap"><table class="ranking-table"><caption>点赞量 TOP10</caption><colgroup><col class="rank-column"><col class="title-column"><col class="author-column"><col class="number-column"><col class="number-column"><col class="category-column"><col class="tags-column"></colgroup><thead><tr><th scope="col">序号</th><th scope="col">作品</th><th scope="col">作者</th><th scope="col">浏览量</th><th scope="col">点赞量</th><th scope="col">分类</th><th scope="col">标签</th></tr></thead><tbody><tr v-for="(item, index) in stats.popularity.likesTop" :key="`likes-${item.comicId}`"><td class="rank-number">{{ index + 1 }}</td><td>{{ item.title }}</td><td>{{ item.author || '未知作者' }}</td><td>{{ item.totalViews }}</td><td>{{ item.totalLikes }}</td><td>{{ item.categories?.join('、') || '—' }}</td><td>{{ item.tags?.join('、') || '—' }}</td></tr></tbody></table></div></section>
          </div>
        </section>
        <section id="scale" class="topic">
          <SummarySection v-bind="metricProps('scale')" />
        </section>
        <section id="lifecycle" class="topic">
          <SummarySection v-bind="metricProps('lifecycle')" />
          <div v-if="stats && !loading" class="chart-grid">
            <section id="charts-years" v-reveal class="summary-section brutal-card chart-card"><h2>创建年份</h2><StatsChart v-if="stats.lifecycle?.createYearDist.length" kind="bar" :items="stats.lifecycle.createYearDist" /><p v-else>{{ report.state.deepAnalysis ? UiMessages.EMPTY_SECTION : QueueMessages.NO_DEEP_ANALYSIS }}</p></section>
            <section id="charts-updates" v-reveal class="summary-section brutal-card chart-card"><h2>更新状态</h2><StatsChart v-if="stats.lifecycle?.updateBuckets.length" kind="bar" :items="stats.lifecycle.updateBuckets" /><p v-else>{{ report.state.deepAnalysis ? UiMessages.EMPTY_SECTION : QueueMessages.NO_DEEP_ANALYSIS }}</p></section>
          </div>
        </section>
        <section id="interaction" class="topic">
          <SummarySection v-bind="metricProps('interaction')" />
          <div v-if="stats && !loading" class="chart-grid">
            <section v-if="stats.interaction.deepAnalysis" id="comments-ranking" v-reveal class="summary-section brutal-card chart-card ranking-card"><h2>评论 TOP10</h2><div class="ranking-table-wrap"><table class="ranking-table comments-table"><caption>评论数量 TOP10</caption><colgroup><col class="rank-column"><col class="title-column"><col class="author-column"><col class="number-column"><col class="number-column"><col class="number-column"></colgroup><thead><tr><th scope="col">序号</th><th scope="col">作品</th><th scope="col">作者</th><th scope="col">评论数</th><th scope="col">浏览量</th><th scope="col">点赞量</th></tr></thead><tbody><tr v-for="(item, index) in stats.interaction.commentsTop" :key="`comments-${item.comicId}`"><td class="rank-number">{{ index + 1 }}</td><td>{{ item.title }}</td><td>{{ item.author || '未知作者' }}</td><td>{{ item.totalComments }}</td><td>{{ item.totalViews }}</td><td>{{ item.totalLikes }}</td></tr></tbody></table></div></section>
            <section v-else class="summary-section brutal-card chart-card"><h2>评论 TOP10</h2><p>{{ QueueMessages.NO_DEEP_ANALYSIS }}</p></section>
          </div>
        </section>
        <section id="platform" class="topic">
          <SummarySection v-bind="metricProps('platform')" />
        </section>
      </div>
      <section v-reveal class="ai-detail summary-section brutal-card">
        <h2>AI 用户画像（详细）</h2>
        <div v-if="analysisParagraphs.length" class="analysis-copy"><p v-for="(paragraph, index) in analysisParagraphs" :key="index">{{ paragraph }}</p></div>
        <p v-else-if="report.state.aiStatus === 'loading'">正在生成详细画像…</p>
        <p v-else-if="report.state.aiStatus === 'error'">画像暂不可用，请在上方重试。</p>
        <p v-else>统计完成后将在这里展示详细画像。</p>
      </section>
    </main>
    <Transition name="fade-rise">
      <button v-if="backToTopVisible" type="button" class="back-to-top brutal-press border-[3px] border-ink bg-brand-yellow shadow-brutal-sm" aria-label="回到顶部" title="回到顶部" @click="backToTop">
        ↑
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.summary-page { padding-bottom: 5rem; }
.summary-toolbar { position: sticky; top: 0; z-index: 5; border-bottom: 3px solid var(--color-ink); background: var(--color-surface); transition: box-shadow var(--motion-duration-fast) var(--motion-ease-out); }
.summary-toolbar.is-raised { box-shadow: 0 4px 0 var(--color-ink); }
.toolbar-sentinel { height: 1px; }
.toolbar-inner { display: flex; align-items: center; gap: 1rem; min-height: 3.6rem; }
.toolbar-inner nav { display: flex; flex: 1; gap: .7rem; overflow-x: auto; white-space: nowrap; }
.toolbar-actions { display: flex; flex: 0 0 auto; gap: .5rem; }
.toolbar-actions :deep(button) { padding: .45rem .65rem; font-size: .8rem; }
.toolbar-inner nav a { font-size: .85rem; font-weight: 800; text-decoration: underline; }
.summary-content { display: grid; gap: 1.4rem; padding-top: 1.5rem; }
.ai-short { border: 3px solid var(--color-ink); box-shadow: var(--shadow-brutal-btn); padding: 1rem; background: var(--color-brand-yellow); }
.ai-short span { font-size: .85rem; font-weight: 900; }
.ai-short p { margin: .45rem 0 0; font-size: 1.15rem; font-weight: 900; }
.ai-retry { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; margin-top: .75rem; }
.deep-progress { display: flex; align-items: center; justify-content: space-between; gap: 1rem; border: 2px solid var(--color-ink); padding: .7rem 1rem; background: var(--color-surface); font-weight: 800; }
.deep-failures { display: grid; gap: .5rem; margin: 0; color: var(--color-danger-strong); }
.deep-failures p { margin: 0; }
.deep-failure-list { display: flex; flex-wrap: wrap; gap: .4rem; margin: 0; padding: 0; list-style: none; }
.deep-failure-list li { display: inline-flex; align-items: center; gap: .4rem; border: 2px solid var(--color-ink); padding: .15rem .3rem .15rem .5rem; background: var(--color-surface); font-weight: 700; }
.loading-progress { margin: 0; font-weight: 800; }
.progress-line { height: .35rem; background: var(--color-brand-green); }
.progress-line.is-loading { background: var(--color-info); animation: loading 1.1s ease-in-out infinite alternate; }
@keyframes loading { from { opacity: .35; } to { opacity: 1; } }
.topic-list { display: grid; gap: 2.4rem; }
.topic { display: grid; gap: 1.4rem; scroll-margin-top: 5rem; }
.summary-section h2 { display: inline-block; margin: 0 0 1rem; padding: .2rem .45rem; border-bottom: 3px solid var(--color-ink); background: var(--color-brand-yellow); font-size: 1.3rem; font-weight: 900; line-height: 1.35; }
.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.4rem; }
.chart-card { min-width: 0; scroll-margin-top: 5rem; }
.chart-grid > *:nth-child(even) { --reveal-delay: var(--motion-stagger); }
.ranking-card { display: grid; grid-column: 1 / -1; gap: 1rem; }
.ranking-table-wrap { overflow-x: auto; }
.ranking-table { width: 100%; min-width: 48rem; table-layout: fixed; border-collapse: collapse; text-align: center; }
.ranking-table .rank-column { width: 6%; }
.ranking-table .title-column { width: 24%; }
.ranking-table .author-column { width: 15%; }
.ranking-table .number-column { width: 11%; }
.ranking-table .category-column { width: 16%; }
.ranking-table .tags-column { width: 23%; }
.ranking-table caption { padding: .5rem 0; font-size: 1rem; font-weight: 900; text-align: left; }
.ranking-table th, .ranking-table td { border: 2px solid var(--color-ink); padding: .65rem .7rem; vertical-align: middle; text-align: center; overflow-wrap: anywhere; word-break: normal; line-height: 1.55; }
.ranking-table th { background: var(--color-brand-yellow); font-weight: 900; white-space: nowrap; }
.ranking-table .rank-number { font-weight: 900; }
.inline-action { border: 2px solid var(--color-ink); background: var(--color-surface); padding: .2rem .5rem; font-weight: 800; cursor: pointer; }
.ai-detail h2 { font-size: 1.5rem; }
.analysis-copy { max-width: 100vw; color: var(--color-ink-soft); font-size: 1.05rem; line-height: 1.95; white-space: pre-line; }
.analysis-copy p { margin: 0 0 .85rem; }
.back-to-top { position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 6; display: grid; place-items: center; width: 3rem; height: 3rem; color: var(--color-ink); font-size: 1.4rem; font-weight: 900; line-height: 1; cursor: pointer; }
.back-to-top:focus-visible { outline: 3px solid var(--color-ink); outline-offset: 2px; }
@media (max-width: 62rem) { .toolbar-inner { flex-wrap: wrap; padding-top: .5rem; padding-bottom: .5rem; } .toolbar-inner nav { order: 2; flex-basis: 100%; } .toolbar-actions { margin-left: auto; } }
@media (max-width: 50rem) { .chart-grid { grid-template-columns: 1fr; } }
@media (max-width: 37.5rem) { .toolbar-actions { width: 100%; justify-content: space-between; } .toolbar-actions :deep(button) { padding: .35rem .4rem; font-size: .72rem; } .back-to-top { right: 1rem; bottom: 1rem; width: 2.6rem; height: 2.6rem; font-size: 1.2rem; } }
</style>
