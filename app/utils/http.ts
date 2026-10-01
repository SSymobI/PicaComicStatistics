/**
 * 判断错误是否表示凭证失效（401）。
 * 上游 401 与 JWT 过期均按 401 语义处理（见 `docs/auth-spec.md`），
 * 用于把「受保护请求返回 401」统一收敛到 auth store 的 `expired` 迁移。
 */
export function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object')
    return false;
  const value = error as { status?: unknown; statusCode?: unknown };
  const status = typeof value.status === 'number' ? value.status : value.statusCode;
  return status === 401;
}
