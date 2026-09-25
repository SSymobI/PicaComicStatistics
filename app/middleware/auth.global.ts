import { AppRoutes } from '~/constants/routes';
import { AuthStatuses } from '../../types/auth';

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== AppRoutes.SUMMARY)
    return;
  const auth = useAuthStore();
  if (auth.status === AuthStatuses.AUTHENTICATED)
    return;
  const valid = await auth.validate();
  if (!valid && auth.status === AuthStatuses.EXPIRED)
    return navigateTo(AppRoutes.HOME);
  if (!valid && (auth.status !== AuthStatuses.ERROR || !auth.user?.id)) {
    return navigateTo({ path: AppRoutes.LOGIN, query: { redirect: to.fullPath } });
  }
});
