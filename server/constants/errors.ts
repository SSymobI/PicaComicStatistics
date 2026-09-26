/** Shared HTTP statuses and API error contracts used by server handlers. */
export const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ApiErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UPSTREAM_FAILED: 'UPSTREAM_FAILED',
} as const;

export const ApiErrorMessages = {
  AUTHORIZATION_REQUIRED: 'Authorization required',
  PICA_AUTHORIZATION_FAILED: 'Pica authorization failed',
  PICA_UPSTREAM_REQUEST_FAILED: 'Pica upstream request failed',
  UPSTREAM_REQUEST_FAILED: 'Upstream request failed',
  BOOK_ID_REQUIRED: 'bookId is required',
  DETAIL_BATCH_SIZE_EXCEEDED: 'Detail batch size exceeded',
  PAGE_POSITIVE_INTEGER: 'page must be a positive integer',
  EMAIL_PASSWORD_REQUIRED: 'email and password are required',
  INVALID_LOGIN_RESPONSE: 'Invalid login response',
  INVALID_CREDENTIALS: '账号或密码错误',
  PICA_PROFILE_MISSING_USER_ID: 'Pica profile missing userId',
} as const;

/** Values returned by the upstream sign-in endpoint for invalid credentials. */
export const PicaLoginError = {
  INVALID_CREDENTIALS_CODE: '1004',
  INVALID_CREDENTIALS_MESSAGE: 'invalid email or password',
} as const;
