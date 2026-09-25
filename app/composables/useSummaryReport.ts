import type { AiSummary } from '../../types/ai';
import type { PicaComicDetail } from '../../types/domain';
import type { PicaFavouriteData, PicaKeywordsData, PicaLeaderboardData } from '../../types/pica-api';
import type { RuntimeCapabilities, SummaryReportState } from '../../types/runtime';
import type { StatsResult } from '../../types/stats';
import { QueueMessages, StorageKeys } from '~/constants/routes';
import { ClientConfig, ClientFetchPacing } from '~/constants/statistics';
import { cacheStore } from '~/utils/cache';
import { computeStatsResult } from '~/utils/stats';

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '数据请求失败，请稍后重试。';
}

export function useSummaryReport() {
  const auth = useAuthStore();
  const state = reactive<SummaryReportState>({ status: 'idle', page: 0, pages: 0, favourites: [], errorMessage: '', fromCache: false, cacheStale: false, leaderboard: [], keywords: [], details: [], deepAnalysis: false, deepStatus: 'idle', deepCompleted: 0, deepTotal: 0, deepFailed: [], aiStatus: 'idle', aiErrorMessage: '' });
  let cancelDeep = false;

  function regenerationKey(userId: string): string {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return `${StorageKeys.REGENERATION_PREFIX}${userId}:${day}`;
  }

  function canRegenerate(): boolean {
    return Boolean(auth.user?.id && window.localStorage.getItem(regenerationKey(auth.user.id)) !== '1');
  }

  async function fetchPage(page: number): Promise<PicaFavouriteData> {
    return await $fetch<PicaFavouriteData>('/api/user/favourite', { headers: authorization(), query: { page, s: 'ua' } });
  }

  function authorization(): { Authorization: string } {
    return { Authorization: `Bearer ${auth.token}` };
  }

  function buildStats(generatedAt = new Date().toISOString(), deepAnalysis = state.deepAnalysis): StatsResult {
    return computeStatsResult({ favourites: state.favourites, details: state.details, leaderboard: state.leaderboard, keywords: state.keywords, generatedAt, deepAnalysis, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ClientConfig.FALLBACK_TIMEZONE });
  }

  async function loadFromCache(userId: string): Promise<StatsResult | undefined> {
    const cachedStats = await cacheStore.getStats(userId);
    const cachedFavourites = await cacheStore.getFavourites(userId);
    const cachedHot = await cacheStore.getHot();
    state.favourites = cachedFavourites?.data.docs || [];
    state.pages = cachedFavourites?.data.pages || 1;
    state.page = state.pages;
    state.leaderboard = cachedHot?.data.leaderboard?.docs || [];
    state.keywords = cachedHot?.data.keywords?.keywords || [];
    if (cachedStats && !cachedStats.stale) {
      state.stats = cachedStats.data.result;
      state.generatedAt = cachedStats.data.result.generatedAt;
      state.fromCache = true;
      state.cacheStale = false;
      state.deepAnalysis = cachedStats.data.result.deepAnalysis;
      state.deepStatus = state.deepAnalysis ? 'partial' : 'idle';
      state.status = 'ready';
      return state.stats;
    }
    if (!cachedFavourites)
      return undefined;
    state.fromCache = true;
    state.cacheStale = cachedFavourites.stale;
    state.generatedAt = cachedStats?.data.result.generatedAt || cachedFavourites.meta.fetchedAt;
    state.stats = buildStats(state.generatedAt, false);
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
    state.deepStatus = 'idle';
    state.aiPersona = undefined;
    state.aiAnalysis = undefined;
    state.aiStatus = 'idle';
    if (userId) {
      await cacheStore.markLogin(userId);
      await cacheStore.enforceUserLimit(3, userId);
      if (!force) {
        const cached = await loadFromCache(userId);
        if (cached)
          return cached;
      }
    }
    try {
      const capabilities = await $fetch<RuntimeCapabilities>('/api/runtime/capabilities');
      const first = await fetchPage(1);
      const pagination = first.comics;
      state.pages = pagination.pages || 1;
      state.page = 1;
      state.favourites.push(...(pagination.docs || []));
      const chunkSize = Math.max(1, capabilities.maxFavouritePagesPerCall || 1);
      for (let start = 2; start <= state.pages; start += chunkSize) {
        const end = Math.min(state.pages, start + chunkSize - 1);
        const pages = await Promise.all(Array.from({ length: end - start + 1 }, (_, index) => fetchPage(start + index)));
        for (const response of pages) state.favourites.push(...(response.comics.docs || []));
        state.page = end;
      }
      const [leaderboard, keywords] = await Promise.allSettled([$fetch<PicaLeaderboardData>('/api/pica/leaderboard', { headers: authorization(), query: { tt: 'D7' } }), $fetch<PicaKeywordsData>('/api/pica/keywords', { headers: authorization() })]);
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
          state.errorMessage = '本地缓存空间不足，已继续展示本次统计结果。';
        if (force)
          window.localStorage.setItem(regenerationKey(userId), '1');
      }
      return state.stats;
    }
    catch (error) {
      if (userId) {
        const cached = await loadFromCache(userId);
        if (cached) {
          state.errorMessage = '数据请求异常，当前展示的是本地缓存';
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
      const result = await $fetch<AiSummary>('/api/ai/summary', {
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
      state.aiStatus = 'error';
      state.aiErrorMessage = error instanceof Error ? error.message : 'AI 总结生成失败，请稍后重试。';
      return undefined;
    }
  }

  async function enableDeepAnalysis(): Promise<void> {
    if (!state.favourites.length || state.deepStatus === 'running')
      return;
    const userId = auth.user?.id;
    const capabilities = await $fetch<RuntimeCapabilities>('/api/runtime/capabilities');
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
    state.deepStatus = 'running';
    cancelDeep = false;
    state.deepTotal = pending.length + details.size;
    state.deepCompleted = details.size;
    state.deepFailed = [];
    for (let start = 0; start < pending.length; start += batchSize) {
      if (cancelDeep)
        break;
      const batch = pending.slice(start, start + batchSize);
      try {
        const response = await $fetch<{ comics: PicaComicDetail[]; failedBookIds: string[] }>('/api/pica/comic', { headers: authorization(), query: { bookId: batch } });
        for (const detail of response.comics || []) {
          if (detail._id) {
            details.set(detail._id, detail);
            if (userId)
              await cacheStore.saveDetail(userId, detail._id, detail);
          }
        }
        state.deepFailed.push(...(response.failedBookIds || []));
      }
      catch {
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
        await wait(ClientFetchPacing.BATCH_INTERVAL_MS);
    }
    state.details = [...details.values()];
    state.deepAnalysis = true;
    state.generatedAt = new Date().toISOString();
    state.stats = buildStats(state.generatedAt, true);
    state.deepStatus = cancelDeep || state.deepFailed.length ? 'partial' : 'done';
    if (userId)
      await cacheStore.saveStats(userId, state.stats);
  }

  function cancelDeepAnalysis(): void { cancelDeep = true; }

  return { state, load, canRegenerate, enableDeepAnalysis, cancelDeepAnalysis, generateAiSummary };
}
