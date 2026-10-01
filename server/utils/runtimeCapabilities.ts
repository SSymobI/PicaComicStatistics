import { PacingProfiles, RuntimeCapabilities } from '~/server/constants/pica';

/** Cloudflare Workers/Pages Functions 运行时把 `navigator.userAgent` 固定为 `Cloudflare-Workers`。 */
function isCloudflareWorkersRuntime(): boolean {
  return typeof navigator !== 'undefined' && /cloudflare-workers/i.test(navigator.userAgent ?? '');
}

export function isCloudflareBuild(presetOverride?: string): boolean {
  // 运行时信号优先：即使构建期未传入 preset，部署在 CF 上也必须走保守档（能力矩阵下界）。
  if (isCloudflareWorkersRuntime())
    return true;
  if (typeof process === 'undefined')
    return true;
  const env = typeof process !== 'undefined' ? process.env : undefined;
  const preset = presetOverride || env?.NITRO_PRESET || env?.NITRO_DEPLOY_TARGET || env?.CF_PAGES;
  return typeof preset === 'string' && (/cloudflare/i.test(preset) || preset === '1' || preset === 'true');
}

export function getRuntimeCapabilities(preset?: string) {
  return isCloudflareBuild(preset) ? RuntimeCapabilities.CF : RuntimeCapabilities.NODE;
}

export function getRuntimePacing(preset?: string) {
  return isCloudflareBuild(preset) ? PacingProfiles.conservative : PacingProfiles.aggressive;
}
