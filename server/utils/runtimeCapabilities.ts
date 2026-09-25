import { PacingProfiles, RuntimeCapabilities } from '../constants/pica';

export function isCloudflareBuild(presetOverride?: string): boolean {
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
