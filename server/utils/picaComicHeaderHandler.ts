import { PicaComicAPIConfig } from '~/server/constants/pica';

export type PicaRequestHeaders = Record<string, string>;

export interface PicaHeaderInput {
  path: string;
  method: string;
  token?: string | null;
  now?: number;
  nonce?: string;
}

function createNonce(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('Web Crypto API is unavailable');
  }
  const cryptoKey = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await cryptoApi.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** 为一次上游请求生成完整签名请求头。path 必须与实际请求 URL 中的 pathname/query 完全一致。 */
export async function createPicaComicHeaders(input: PicaHeaderInput): Promise<PicaRequestHeaders> {
  const method = input.method.toUpperCase();
  const time = Math.floor((input.now ?? Date.now()) / 1000).toString();
  const nonce = input.nonce ?? createNonce();
  const path = input.path.replace(/^\/+/, '');
  const raw = `${path}${time}${nonce}${method}${PicaComicAPIConfig.API_KEY}`;
  const signature = await hmacSha256Hex(PicaComicAPIConfig.SIGNATURE_KEY, raw.toLowerCase());

  const headers: PicaRequestHeaders = {
    'Accept': PicaComicAPIConfig.ACCEPT,
    'api-key': PicaComicAPIConfig.API_KEY,
    'app-channel': PicaComicAPIConfig.APP_CHANNEL,
    'app-version': PicaComicAPIConfig.APP_VERSION,
    'app-uuid': PicaComicAPIConfig.APP_UUID,
    'app-platform': PicaComicAPIConfig.APP_PLATFORM,
    'app-build-version': PicaComicAPIConfig.APP_BUILD_VERSION,
    'User-Agent': PicaComicAPIConfig.USER_AGENT,
    'image-quality': PicaComicAPIConfig.IMAGE_QUALITY,
    'Content-Type': PicaComicAPIConfig.CONTENT_TYPE,
    time,
    nonce,
    signature,
  };
  if (input.token)
    headers.authorization = input.token;
  return headers;
}

// 兼容规格中使用的命名，避免业务层重复实现签名逻辑。
export const buildPicaHeaders = createPicaComicHeaders;
export const picaComicHeaderHandler = createPicaComicHeaders;
