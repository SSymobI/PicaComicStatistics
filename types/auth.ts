export const AuthStatuses = {
  ANONYMOUS: 'anonymous',
  LOGGING_IN: 'logging-in',
  AUTHENTICATED: 'authenticated',
  VALIDATING: 'validating',
  EXPIRED: 'expired',
  ERROR: 'error',
} as const;

export type AuthStatus = typeof AuthStatuses[keyof typeof AuthStatuses];

export interface AuthUser {
  id: string;
  username: string;
  avatar?: string;
  gender?: string;
  level?: number | string;
  title?: string;
}

export interface LoginResponse {
  token?: string;
  data?: { token?: string; _id?: string; id?: string };
  userId?: string;
  message?: string;
}

export interface ProfileResponse {
  data?: Omit<AuthUser, 'avatar'> & { _id?: string; username?: string; name?: string; avatar?: string | import('./domain').Thumb };
  user?: Omit<AuthUser, 'avatar'> & { avatar?: string | import('./domain').Thumb };
  message?: string;
}
