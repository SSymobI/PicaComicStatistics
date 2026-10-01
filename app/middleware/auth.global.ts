import { AuthStatuses } from '@types-project/auth';
import { AppRoutes } from '@/constants/routes';

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== AppRoutes.SUMMARY)
    return;
  const auth = useAuthStore();
  if (auth.status === AuthStatuses.AUTHENTICATED)
    return;
  const valid = await auth.validate();
  if (valid)
    return;
  // 网络错误 / 上游 5xx 不得触发导航，由页面就地展示错误态（auth-spec 四 / 5.1）
  if (auth.status === AuthStatuses.ERROR)
    return;
  if (auth.status === AuthStatuses.EXPIRED)
    return navigateTo(AppRoutes.HOME);
  return navigateTo({ path: AppRoutes.LOGIN, query: { redirect: to.fullPath } });
});
