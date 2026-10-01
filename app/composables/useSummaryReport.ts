import type { AiSummary } from '@types-project/ai';
import type { PicaComicDetail } from '@types-project/domain';
import type { PicaFavouriteData, PicaKeywordsData, PicaLeaderboardData } from '@types-project/pica-api';
import type { RuntimeCapabilities, SummaryReportState } from '@types-project/runtime';
import type { StatsResult } from '@types-project/stats';
import { QueueStatus } from '@types-project/runtime';
import { ApiRoutes, QueueMessages, ReportMessages, StorageKeys } from '@/constants/routes';
import { ClientConfig, ClientFetchPacing } from '@/constants/statistics';
import { cacheStore } from '@/utils/cache';
import { isUnauthorizedError } from '@/utils/http';
import { computeStatsResult } from '@/utils/stats';

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : ReportMessages.REQUEST_FAILED;
}

/** 本地自然日（yyyymmdd）；重新生成计数 key = `${前缀}:${userId}:${yyyymmdd}`。 */
function regenerationDayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}${month}${day}`;
}

/** 淘汰账号时同步清理该 userId 的重新生成计数（PROJECT_SPEC 缓存机制 4.0.2）。 */
function clearRegenerationCounters(userIds: string[]): void {
  if (!userIds.length)
    return;
  const prefixes = userIds.map(userId => `${StorageKeys.REGENERATION_PREFIX}:${userId}:`);
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && prefixes.some(prefix => key.startsWith(prefix)))
      keys.push(key);
  }
  for (const key of keys)
    window.localStorage.removeItem(key);
}

/** 按能力档位取前端拉取节奏；未声明的档位一律按保守路径处理。 */
function pacingProfile(profile: RuntimeCapabilities['pacingProfile']) {
  return profile === 'aggressive' ? ClientFetchPacing.PROFILES.aggressive : ClientFetchPacing.PROFILES.conservative;
}

export function useSummaryReport() {
  const auth = useAuthStore();
  const state = reactive<SummaryReportState>({ status: 'idle', page: 0, pages: 0, favourites: [], errorMessage: '', fromCache: false, cacheStale: false, leaderboard: [], keywords: [], details: [], deepAnalysis: false, deepStatus: QueueStatus.IDLE, deepCompleted: 0, deepTotal: 0, deepFailed: [], aiStatus: 'idle', aiErrorMessage: '' });
  let cancelDeep = false;

  function regenerationKey(userId: string): string {
    return `${StorageKeys.REGENERATION_PREFIX}:${userId}:${regenerationDayKey()}`;
  }

  function canRegenerate(): boolean {
    return Boolean(auth.user?.id && window.localStorage.getItem(regenerationKey(auth.user.id)) !== '1');
  }

  async function fetchPage(page: number): Promise<PicaFavouriteData> {
    return await $fetch<PicaFavouriteData>(ApiRoutes.FAVOURITE, { headers: authorization(), query: { page, s: 'ua' } });
  }

  function authorization(): { Authorization: string } {
    return { Authorization: `Bearer ${auth.token}` };
  }

  function buildStats(generatedAt = new Date().toISOString(), deepAnalysis = state.deepAnalysis): StatsResult {
    return computeStatsResult({ favourites: state.favourites, details: state.details, leaderboard: state.leaderboard, keywords: state.keywords, generatedAt, deepAnalysis, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ClientConfig.FALLBACK_TIMEZONE });
  }

  /** 缓存恢复时按已缓存详情条数还原深度分析进度，避免展示「0 / 0」的假进度。 */
  async function restoreDeepStatus(userId: string): Promise<void> {
    if (!state.deepAnalysis) {
      state.deepStatus = QueueStatus.IDLE;
      state.deepTotal = 0;
      state.deepCompleted = 0;
      return;
    }
    const cachedDetailCount = await cacheStore.countDetails(userId);
    const total = state.favourites.length || cachedDetailCount;
    state.deepTotal = total;
    state.deepCompleted = Math.min(cachedDetailCount, total);
    state.deepStatus = state.deepCompleted >= total ? QueueStatus.DONE : QueueStatus.PARTIAL;
  }

  async function loadFromCache(userId: string): Promise<StatsResult | undefined> {
    const cachedStats = await cacheStore.getStats(userId);
    const cachedFavourites = await cacheStore.getFavourites(userId);
    const cachedHot = await cacheStore.getHot();
    state.favourites = cachedFavourites?.data.docs || [];
    state.pages = cachedFavourites?.data.pages || 1;
    state.page = state.pages;
    // 热榜 / 热搜为 6 小时 TTL 的公共数据：过期即视为缺失，不参与统计（PROJECT_SPEC 4.0.3 / 4.1）
    const hotFresh = cachedHot !== null && !cachedHot.stale;
    state.leaderboard = hotFresh ? cachedHot.data.leaderboard?.docs || [] : [];
    state.keywords = hotFresh ? cachedHot.data.keywords?.keywords || [] : [];
    if (cachedStats && !cachedStats.stale) {
      state.stats = cachedStats.data.result;
      state.generatedAt = cachedStats.data.result.generatedAt;
      state.fromCache = true;
      state.cacheStale = false;
      state.deepAnalysis = cachedStats.data.result.deepAnalysis;
      await restoreDeepStatus(userId);
      state.status = 'ready';
      return state.stats;
    }
    if (!cachedFavourites)
      return undefined;
    state.fromCache = true;
    state.cacheStale = Boolean(cachedFavourites.stale || cachedStats?.stale);
    state.generatedAt = cachedStats?.data.result.generatedAt || cachedFavourites.meta.fetchedAt;
    state.stats = buildStats(state.generatedAt, false);
    state.deepStatus = QueueStatus.IDLE;
    state.status = 'ready';
    return state.stats;
  }

  async function load(force = false): Promise<StatsResult | undefined> {
    const userId = auth.user?.id;
    if (force && (!userId || !canRegenerate())) {
      state.errorMessage = QueueMessages.REGENERATION_LIMIT;
      return undefined;
    }
    state.status = 'loading';
    state.errorMessage = '';
    state.fromCache = false;
    state.cacheStale = false;
    state.favourites = [];
    state.details = [];
    state.leaderboard = [];
    state.keywords = [];
    state.page = 0;
    state.deepAnalysis = false;
    state.deepStatus = QueueStatus.IDLE;
    state.aiPersona = undefined;
    state.aiAnalysis = undefined;
    state.aiStatus = 'idle';
    if (userId) {
      await cacheStore.markLogin(userId);
      const removed = await cacheStore.enforceUserLimit(ClientConfig.MAX_LOCAL_USER_PROFILES, userId);
      clearRegenerationCounters(removed);
      if (!force) {
        const cached = await loadFromCache(userId);
        if (cached)
          return cached;
      }
    }
    try {
      const capabilities = await $fetch<RuntimeCapabilities>(ApiRoutes.CAPABILITIES);
      const pacing = pacingProfile(capabilities.pacingProfile);
      const first = await fetchPage(1);
      const pagination = first.comics;
      state.pages = pagination.pages || 1;
      state.page = 1;
      state.favourites.push(...(pagination.docs || []));
      // 跨页循环在前端；页与页之间按能力档位限速，降低上游风控风险（PROJECT_SPEC 5.1）
      for (let page = 2; page <= state.pages; page += 1) {
        await wait(pacing.FAVOURITE_PAGE_INTERVAL_MS);
        const response = await fetchPage(page);
        state.favourites.push(...(response.comics.docs || []));
        state.page = page;
      }
      const [leaderboard, keywords] = await Promise.allSettled([$fetch<PicaLeaderboardData>(ApiRoutes.LEADERBOARD, { headers: authorization(), query: { tt: 'D7' } }), $fetch<PicaKeywordsData>(ApiRoutes.KEYWORDS, { headers: authorization() })]);
      state.leaderboard = leaderboard.status === 'fulfilled' ? leaderboard.value.comics || [] : [];
      state.keywords = keywords.status === 'fulfilled' ? keywords.value.keywords || [] : [];
      state.generatedAt = new Date().toISOString();
      state.stats = buildStats(state.generatedAt, false);
      state.deepAnalysis = false;
      state.status = 'ready';
      if (userId) {
        const saved = await cacheStore.saveFavourites(userId, { docs: state.favourites, total: state.favourites.length, pages: state.pages });
        await cacheStore.saveStats(userId, state.stats);
        await cacheStore.saveHot({ leaderboard: { docs: state.leaderboard, timeRange: 'D7', fetchedAt: state.generatedAt }, keywords: { keywords: state.keywords, fetchedAt: state.generatedAt } }, state.generatedAt);
        if (saved.degraded)
          state.errorMessage = ReportMessages.CACHE_DEGRADED;
        if (force)
          window.localStorage.setItem(regenerationKey(userId), '1');
      }
      return state.stats;
    }
    catch (error) {
      // 受保护请求返回 401：清 token → expired → 回首页（auth-spec 状态迁移表）
      if (isUnauthorizedError(error)) {
        await auth.expire();
        state.status = 'error';
        state.errorMessage = errorText(error);
        return undefined;
      }
      if (userId) {
        const cached = await loadFromCache(userId);
        if (cached) {
          state.errorMessage = ReportMessages.CACHE_FALLBACK;
          return cached;
        }
      }
      state.status = 'error';
      state.errorMessage = errorText(error);
      return undefined;
    }
  }

  async function generateAiSummary(force = false): Promise<AiSummary | undefined> {
    if (!state.stats)
      return undefined;
    if (state.aiStatus === 'loading')
      return undefined;
    const userId = auth.user?.id;
    if (userId && !force) {
      const cached = await cacheStore.getAiSummary(userId);
      if (cached && !cached.stale && cached.data.statsGeneratedAt >= state.stats.generatedAt) {
        state.aiPersona = cached.data.persona;
        state.aiAnalysis = cached.data.analysis;
        state.aiStatus = 'ready';
        return cached.data;
      }
    }
    state.aiStatus = 'loading';
    state.aiErrorMessage = '';
    state.aiPersona = undefined;
    state.aiAnalysis = undefined;
    try {
      const result = await $fetch<AiSummary>(ApiRoutes.AI_SUMMARY, {
        method: 'POST',
        headers: auth.token
          ? { 'Authorization': `Bearer ${auth.token}`, 'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || ClientConfig.FALLBACK_TIMEZONE }
          : undefined,
        body: state.stats,
      });
      state.aiPersona = result.persona;
      state.aiAnalysis = result.analysis;
      state.aiStatus = 'ready';
      if (userId)
        await cacheStore.saveAiSummary(userId, result);
      return result;
    }
    catch (error) {
      if (isUnauthorizedError(error)) {
        await auth.expire();
        return undefined;
      }
      state.aiStatus = 'error';
      state.aiErrorMessage = error instanceof Error ? error.message : ReportMessages.AI_FAILED;
      return undefined;
    }
  }

  async function enableDeepAnalysis(): Promise<void> {
    if (!state.favourites.length || state.deepStatus === QueueStatus.RUNNING)
      return;
    const userId = auth.user?.id;
    const capabilities = await $fetch<RuntimeCapabilities>(ApiRoutes.CAPABILITIES);
    const pacing = pacingProfile(capabilities.pacingProfile);
    const batchSize = Math.max(1, Math.min(capabilities.maxDetailBatchSize || ClientFetchPacing.DETAIL_BATCH_SIZE, ClientFetchPacing.DETAIL_BATCH_SIZE));
    const details = new Map<string, PicaComicDetail>();
    const pending: string[] = [];
    for (const comic of state.favourites) {
      const id = comic._id;
      if (!id)
        continue;
      const cached = userId ? await cacheStore.getDetail(userId, id) : null;
      if (cached && !cached.stale)
        details.set(id, cached.data.detail);
      else pending.push(id);
    }
    state.deepStatus = QueueStatus.RUNNING;
    cancelDeep = false;
    state.deepTotal = pending.length + details.size;
    state.deepCompleted = details.size;
    state.deepFailed = [];
    for (let start = 0; start < pending.length; start += batchSize) {
      if (cancelDeep)
        break;
      const batch = pending.slice(start, start + batchSize);
      try {
        const response = await $fetch<{ comics: PicaComicDetail[]; failedBookIds: string[] }>(ApiRoutes.COMIC_BATCH, { headers: authorization(), query: { bookId: batch } });
        for (const detail of response.comics || []) {
          if (detail._id) {
            details.set(detail._id, detail);
            if (userId)
              await cacheStore.saveDetail(userId, detail._id, detail);
          }
        }
        state.deepFailed.push(...(response.failedBookIds || []));
      }
      catch (error) {
        if (isUnauthorizedError(error)) {
          cancelDeep = true;
          await auth.expire();
          break;
        }
        state.deepFailed.push(...batch);
      }
      state.deepCompleted = details.size;
      state.details = [...details.values()];
      state.deepAnalysis = true;
      state.generatedAt = new Date().toISOString();
      state.stats = buildStats(state.generatedAt, true);
      state.aiPersona = undefined;
      state.aiAnalysis = undefined;
      state.aiStatus = 'idle';
      if (userId)
        await cacheStore.saveStats(userId, state.stats);
      if (start + batchSize < pending.length && !cancelDeep)
        await wait(pacing.BATCH_INTERVAL_MS);
    }
    state.details = [...details.values()];
    state.deepAnalysis = true;
    state.generatedAt = new Date().toISOString();
    state.stats = buildStats(state.generatedAt, true);
    state.deepStatus = cancelDeep || state.deepFailed.length ? QueueStatus.PARTIAL : QueueStatus.DONE;
    if (userId)
      await cacheStore.saveStats(userId, state.stats);
  }

  function cancelDeepAnalysis(): void { cancelDeep = true; }

  /** 单本重试：不受每日重新生成次数限制，成功后就地更新该本详情与受影响统计（PROJECT_SPEC 5.2）。 */
  async function retryDetail(comicId: string): Promise<void> {
    const userId = auth.user?.id;
    try {
      const response = await $fetch<{ comics: PicaComicDetail[]; failedBookIds: string[] }>(ApiRoutes.COMIC_BATCH, { headers: authorization(), query: { bookId: [comicId] } });
      const detail = (response.comics || []).find(item => item._id === comicId);
      if (!detail) {
        if (!state.deepFailed.includes(comicId))
          state.deepFailed.push(comicId);
        return;
      }
      state.deepFailed = state.deepFailed.filter(id => id !== comicId);
      const merged = new Map(state.details.filter(item => item._id).map(item => [item._id as string, item]));
      merged.set(comicId, detail);
      state.details = [...merged.values()];
      if (userId)
        await cacheStore.saveDetail(userId, comicId, detail);
      state.deepCompleted = Math.min(state.deepCompleted + 1, state.deepTotal);
      state.deepAnalysis = true;
      state.generatedAt = new Date().toISOString();
      state.stats = buildStats(state.generatedAt, true);
      state.aiPersona = undefined;
      state.aiAnalysis = undefined;
      state.aiStatus = 'idle';
      if (userId)
        await cacheStore.saveStats(userId, state.stats);
    }
    catch (error) {
      if (isUnauthorizedError(error)) {
        await auth.expire();
        return;
      }
      if (!state.deepFailed.includes(comicId))
        state.deepFailed.push(comicId);
    }
    finally {
      state.deepStatus = state.deepFailed.length ? QueueStatus.PARTIAL : QueueStatus.DONE;
    }
  }

  return { state, load, canRegenerate, enableDeepAnalysis, cancelDeepAnalysis, retryDetail, generateAiSummary };
}
