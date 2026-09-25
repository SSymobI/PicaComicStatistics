import { useRuntimeConfig } from '#imports';
import { defineEventHandler } from 'h3';
import { getRuntimeCapabilities } from '../../utils/runtimeCapabilities';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event) as { runtimePreset?: string };
  return getRuntimeCapabilities(config.runtimePreset);
});
