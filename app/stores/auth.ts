import type { AuthStatus, AuthUser, LoginResponse, ProfileResponse } from '@types-project/auth';
import { AuthStatuses } from '@types-project/auth';
import { defineStore } from 'pinia';
import { ApiRoutes, AppRoutes, AuthMessages, StorageKeys } from '@/constants/routes';
import { isUnauthorizedError } from '@/utils/http';

function extractToken(payload: LoginResponse): string | undefined {
  return payload.token ?? payload.data?.token;
}

function extractUser(payload: ProfileResponse): AuthUser | undefined {
  const source = (payload.data ?? payload.user ?? payload) as {
    id?: string;
    _id?: string;
    username?: string;
    name?: string;
    avatar?: unknown;
    gender?: string;
    level?: number | string;
    title?: string;
  };
  if (!source)
    return undefined;
  const avatar = source.avatar;
  const avatarRecord = typeof avatar === 'object' && avatar !== null ? avatar as Record<string, unknown> : undefined;
  const fileUrl = typeof avatarRecord?.fileUrl === 'string' ? avatarRecord.fileUrl : undefined;
  const fileServer = typeof avatarRecord?.fileServer === 'string' ? avatarRecord.fileServer : undefined;
  const path = typeof avatarRecord?.path === 'string' ? avatarRecord.path : undefined;
  const avatarUrl = typeof avatar === 'string' ? avatar : fileUrl || (fileServer && path ? `${fileServer.replace(/\/+$/, '')}/static/${path.replace(/^\/+/, '')}` : undefined);
  return {
    id: source.id ?? source._id ?? '',
    username: source.username ?? source.name ?? '用户',
    avatar: avatarUrl,
    gender: source.gender,
    level: source.level,
    title: source.title,
  };
}

function isUnauthorized(error: unknown): boolean {
  return isUnauthorizedError(error);
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    status: AuthStatuses.ANONYMOUS as AuthStatus,
    token: '' as string,
    user: undefined as AuthUser | undefined,
    errorMessage: '',
    validationPromise: undefined as Promise<boolean> | undefined,
  }),
  getters: {
    isAuthenticated: state => state.status === AuthStatuses.AUTHENTICATED,
  },
  actions: {
    hydrateToken(): string {
      if (!import.meta.client)
        return '';
      const token = window.localStorage.getItem(StorageKeys.TOKEN) ?? '';
      this.token = token;
      return token;
    },
    clearToken(): void {
      this.token = '';
      this.user = undefined;
      if (import.meta.client)
        window.localStorage.removeItem(StorageKeys.TOKEN);
    },
    async validate(): Promise<boolean> {
      if (this.validationPromise)
        return this.validationPromise;
      const token = this.hydrateToken();
      if (!token) {
        this.status = AuthStatuses.ANONYMOUS;
        return false;
      }
      this.status = AuthStatuses.VALIDATING;
      this.validationPromise = (async () => {
        try {
          const payload = await $fetch<ProfileResponse>(ApiRoutes.PROFILE, { headers: { Authorization: `Bearer ${token}` } });
          this.user = extractUser(payload);
          if (!this.user?.id)
            throw new Error('Profile is missing userId');
          this.status = AuthStatuses.AUTHENTICATED;
          this.errorMessage = '';
          return true;
        }
        catch (error) {
          if (isUnauthorized(error)) {
            await this.expire();
            return false;
          }
          this.status = AuthStatuses.ERROR;
          this.errorMessage = AuthMessages.VALIDATION_FAILED;
          return false;
        }
        finally {
          this.validationPromise = undefined;
        }
      })();
      return this.validationPromise;
    },
    async login(username: string, password: string): Promise<boolean> {
      this.status = AuthStatuses.LOGGING_IN;
      this.errorMessage = '';
      try {
        const payload = await $fetch<LoginResponse>(ApiRoutes.LOGIN, { method: 'POST', body: { email: username, password } });
        const token = extractToken(payload);
        if (!token)
          throw new Error('missing token');
        this.token = token;
        if (import.meta.client)
          window.localStorage.setItem(StorageKeys.TOKEN, token);
        const valid = await this.validateProfile(token);
        return valid;
      }
      catch (error) {
        const currentStatus = this.status as AuthStatus;
        if (currentStatus === AuthStatuses.EXPIRED || currentStatus === AuthStatuses.ERROR)
          return false;
        this.status = AuthStatuses.ANONYMOUS;
        this.errorMessage = isUnauthorized(error) ? AuthMessages.INVALID_CREDENTIALS : AuthMessages.NETWORK_FAILED;
        return false;
      }
    },
    async validateProfile(token?: string): Promise<boolean> {
      const resolvedToken = token ?? this.token;
      try {
        const payload = await $fetch<ProfileResponse>(ApiRoutes.PROFILE, { headers: { Authorization: `Bearer ${resolvedToken}` } });
        this.user = extractUser(payload);
        if (!this.user?.id)
          throw new Error('Profile is missing userId');
        this.status = AuthStatuses.AUTHENTICATED;
        return true;
      }
      catch (error) {
        if (isUnauthorized(error)) {
          await this.expire();
          return false;
        }
        this.status = AuthStatuses.ERROR;
        this.errorMessage = AuthMessages.VALIDATION_FAILED;
        return false;
      }
    },
    /** 凭证失效（401 / JWT 过期）的统一迁移：清 token → `expired` → 回首页，见 auth-spec 第四节。 */
    async expire(): Promise<void> {
      this.clearToken();
      this.status = AuthStatuses.EXPIRED;
      this.errorMessage = '';
      await navigateTo(AppRoutes.HOME);
    },
    async logout(): Promise<void> {
      this.clearToken();
      this.status = AuthStatuses.ANONYMOUS;
      this.errorMessage = '';
      await navigateTo(AppRoutes.HOME);
    },
  },
});
