<script setup lang="ts">
import { AppRoutes, StorageKeys } from '@/constants/routes';

const route = useRoute();
const auth = useAuthStore();
const username = ref(import.meta.client ? window.localStorage.getItem(StorageKeys.REMEMBERED_ACCOUNT) ?? '' : '');
const password = ref('');
const rememberAccount = ref(Boolean(username.value));
const agreed = ref(false);
const agreementOpened = ref(false);
const agreementRead = ref(false);
const agreementScroll = ref<HTMLElement | null>(null);
const agreementSections = [
  { title: '一、数据保存位置', paragraphs: ['登录账号、收藏信息、统计结果和相关缓存默认保存在用户当前浏览器的本地存储空间中。', '本项目不将密码写入自身的 localStorage、sessionStorage、IndexedDB 或服务器数据库。', '“记住账号”只保存账号标识。若用户启用记住密码功能，由浏览器或操作系统提供的安全凭证管理能力负责保存和填充，具体能力取决于浏览器和设备。'] },
  { title: '二、AI 总结数据发送', paragraphs: ['统计结果可按用户请求发送至配置的 AI 模型提供商，用于生成收藏画像总结文本。', '发送内容可能包含统计结果中的漫画标题、作者、分类、标签、互动数据以及成人向或暴露性内容相关文本。', 'AI 模型提供商的数据处理、保存和使用规则以其自身服务条款和隐私政策为准。用户不同意该发送范围时，不应使用 AI 总结功能。'] },
  { title: '三、账号与内容风险提示', paragraphs: ['用户应自行承担使用哔咔账号登录和请求收藏数据的风险。因账号封禁、限制、风控或其他平台措施造成的后果，本项目不承担责任。', 'AI 总结可能包含成人向、暴露性或其他不适宜公开展示的内容。用户将未经处理的总结内容分享到社交媒体后，如因此导致相关账号受限或封禁，本项目不承担责任。', '统计结果和 AI 总结仅供参考，不保证完整性、实时性和准确性，不应作为事实、决策或其他用途的唯一依据。'] },
  { title: '四、用户确认', paragraphs: ['勾选“我已阅读并同意用户协议”并提交登录，即表示用户已阅读并同意以上内容，并理解登录和 AI 总结功能可能产生的数据处理与账号风险。'] },
];
const submitting = computed(() => auth.status === 'logging-in');
const canSubmit = computed(() => Boolean(username.value && password.value && agreed.value && agreementRead.value && !submitting.value));

useHead({
  title: '哔咔收藏统计 | 登录',
});

function isSafeRedirect(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !value.includes('://');
}

async function submit(): Promise<void> {
  if (!canSubmit.value)
    return;
  const success = await auth.login(username.value, password.value);
  if (!success)
    return;
  if (rememberAccount.value)
    window.localStorage.setItem(StorageKeys.REMEMBERED_ACCOUNT, username.value);
  else window.localStorage.removeItem(StorageKeys.REMEMBERED_ACCOUNT);
  const redirect = isSafeRedirect(route.query.redirect) ? route.query.redirect : AppRoutes.SUMMARY;
  await navigateTo(redirect);
}

function openAgreement(): void {
  agreementOpened.value = true;
  agreementRead.value = false;
  nextTick(() => {
    const element = agreementScroll.value;
    if (element && element.scrollHeight <= element.clientHeight)
      agreementRead.value = true;
  });
}

function markAgreementRead(event: Event): void {
  const element = event.currentTarget as HTMLElement;
  agreementRead.value = element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
}

function acceptAgreement(): void {
  if (!agreementRead.value)
    return;
  agreed.value = true;
  agreementOpened.value = false;
}
</script>

<template>
  <div class="responsive login-page grid min-h-[calc(100vh-3.9375rem)] place-items-center py-8">
    <section class="login-card w-full max-w-[30rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_#000]">
      <p class="eyebrow mb-2 font-mono font-bold">
        WELCOME BACK
      </p>
      <h1 class="font-display text-3xl leading-tight">登录你的收藏报告</h1>
      <p class="intro my-4 leading-relaxed">
        凭哔咔账号读取收藏数据，统计过程只在你的浏览器完成。
      </p>
      <StatusBanner v-if="auth.errorMessage" tone="danger">
        {{ auth.errorMessage }}
      </StatusBanner>
      <form class="login-form grid gap-2" @submit.prevent="submit">
        <label for="username">账号</label>
        <input id="username" v-model.trim="username" class="min-h-11 border-2 border-black bg-[var(--cream)] px-3 py-2" autocomplete="username" required>
        <label for="password">密码</label>
        <input id="password" v-model="password" class="min-h-11 border-2 border-black bg-[var(--cream)] px-3 py-2" type="password" autocomplete="current-password" required>
        <label class="check-row mt-1 flex items-center gap-2 text-sm"><input v-model="rememberAccount" type="checkbox"> 记住账号（不保存密码）</label>
        <div class="check-row mt-1 flex items-center gap-2 text-sm"><label class="agreement-check"><input v-model="agreed" type="checkbox" :disabled="!agreementRead"> 我已阅读并同意</label> <button type="button" class="link-button cursor-pointer font-black underline" @click="openAgreement">用户协议</button></div>
        <AppButton type="submit" :disabled="!canSubmit">
          {{ submitting ? '登录中…' : '登录并开始统计' }}
        </AppButton>
      </form>
      <NuxtLink to="/" class="back-link mt-5 inline-block font-extrabold underline">
        ← 返回首页
      </NuxtLink>
    </section>
    <div v-if="agreementOpened" class="agreement-backdrop" role="presentation" @click.self="agreementOpened = false">
      <section class="agreement-modal" role="dialog" aria-modal="true" aria-labelledby="agreement-title">
        <h2 id="agreement-title">
          用户协议与数据使用说明
        </h2>
        <div ref="agreementScroll" class="agreement-content" tabindex="0" @scroll="markAgreementRead">
          <template v-for="section in agreementSections" :key="section.title">
            <h3>{{ section.title }}</h3>
            <p v-for="paragraph in section.paragraphs" :key="paragraph">
              {{ paragraph }}
            </p>
          </template>
        </div>
        <div class="agreement-actions">
          <AppButton variant="secondary" :disabled="!agreementRead" @click="acceptAgreement">
            {{ agreementRead ? '我已阅读并同意' : '请滚动阅读全文' }}
          </AppButton>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-page { min-height: calc(100vh - 3.9375rem); display: grid; place-items: center; padding-top: 2rem; padding-bottom: 2rem; }
.login-card { width: min(100%, 30rem); max-width: 30rem; border: 3px solid #000; box-shadow: 8px 8px 0 #000; padding: 1.5rem; background: #fff; }
.eyebrow { margin: 0 0 .5rem; font-family: 'JetBrains Mono', monospace; font-weight: 700; }
h1 { margin: 0; font-family: 'Archivo Black', 'Noto Sans SC', sans-serif; font-size: 2rem; line-height: 1.15; }
.intro { margin: .8rem 0 1.2rem; line-height: 1.6; }
.login-form { display: grid; gap: .55rem; }
.login-form label { font-weight: 800; }
.login-form input:not([type='checkbox']) { min-height: 2.8rem; border: 2px solid #000; padding: .5rem .65rem; background: var(--cream); font: inherit; }
.check-row { display: flex; gap: .4rem; align-items: center; margin-top: .35rem; font-size: .9rem; }
.check-row input { accent-color: var(--brand-pink); }
.agreement-check { display: inline-flex; align-items: center; gap: .4rem; }
.link-button { border: 0; padding: 0; background: transparent; text-decoration: underline; font: inherit; font-weight: 900; cursor: pointer; }
.back-link { display: inline-block; margin-top: 1.2rem; font-weight: 800; text-decoration: underline; }
.agreement-backdrop { position: fixed; inset: 0; display: grid; place-items: center; z-index: 10; padding: 1rem; background: #0008; }
.agreement-modal { display: flex; flex-direction: column; width: min(100%, 38rem); max-height: calc(100dvh - 2rem); border: 3px solid #000; box-shadow: 8px 8px 0 #000; padding: 1.5rem; background: #fff; }
.agreement-modal h2 { margin: 0 0 1.2rem; line-height: 1.4; }
.agreement-content { min-height: 0; max-height: 55vh; overflow-y: auto; border: 2px solid #000; padding: 1rem; background: var(--cream); }
.agreement-modal h3 { margin: .6rem 0 .3rem; }
.agreement-modal p { line-height: 1.7; }
.agreement-actions { display: flex; justify-content: flex-end; margin-top: 1.4rem; }
@media (max-width: 37.5rem) { .agreement-modal { padding: 1rem; } .agreement-modal h2 { font-size: 1.2rem; } .agreement-content { max-height: 60dvh; } }
</style>
