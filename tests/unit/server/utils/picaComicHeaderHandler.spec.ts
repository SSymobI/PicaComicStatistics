/** @vitest-environment node */
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PicaComicAPIConfig } from '~/server/constants/pica';
import { createPicaComicHeaders } from '~/server/utils/picaComicHeaderHandler';

// 固定时间与 nonce，保证签名可复现
const NOW = 1_760_000_000_000;
const NONCE = 'a1b2c3d4e5f60718';

/** 用 Node 内置 HMAC 作为独立参照实现，避免用被测模块自证签名。 */
function expectedSignature(raw: string): string {
  return createHmac('sha256', PicaComicAPIConfig.SIGNATURE_KEY).update(raw.toLowerCase()).digest('hex');
}

describe('createPicaComicHeaders', () => {
  it('按 path+time+nonce+method+api-key 的顺序签名并带齐固定请求头', async () => {
    const headers = await createPicaComicHeaders({ path: '/comics/leaderboard?tt=D7', method: 'get', now: NOW, nonce: NONCE });
    const raw = `comics/leaderboard?tt=D7${Math.floor(NOW / 1000)}${NONCE}GET${PicaComicAPIConfig.API_KEY}`;

    // 拼串顺序一旦改动，全部上游请求都会签名失败，故按期望原文比对
    expect(headers.signature).toBe(expectedSignature(raw));
    expect(headers.signature).toMatch(/^[\da-f]{64}$/);
    expect(headers.time).toBe(String(Math.floor(NOW / 1000)));
    expect(headers.nonce).toBe(NONCE);
    expect(headers).toMatchObject({
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
    });
  });

  it('每次调用重新生成 nonce 与签名，不复用同一次签名', async () => {
    const first = await createPicaComicHeaders({ path: 'comics/leaderboard?tt=D7', method: 'GET' });
    const second = await createPicaComicHeaders({ path: 'comics/leaderboard?tt=D7', method: 'GET' });

    expect(first.nonce).toMatch(/^[\da-f]{32}$/);
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.signature).not.toBe(second.signature);
  });

  it('仅在传入 token 时附带 authorization，且前导斜杠不参与签名差异', async () => {
    const plain = await createPicaComicHeaders({ path: 'user/favourite', method: 'GET', now: NOW, nonce: NONCE });
    const withSlashes = await createPicaComicHeaders({ path: '//user/favourite', method: 'GET', now: NOW, nonce: NONCE });

    expect(plain.authorization).toBeUndefined();
    expect(withSlashes.signature).toBe(plain.signature);
    expect((await createPicaComicHeaders({ path: 'user/favourite', method: 'GET', token: 'tok', now: NOW, nonce: NONCE })).authorization).toBe('tok');
    expect((await createPicaComicHeaders({ path: 'user/profile', method: 'GET', now: NOW, nonce: NONCE })).signature).not.toBe(plain.signature);
  });
});
