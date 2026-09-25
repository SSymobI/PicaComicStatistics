<script setup lang="ts">
import { AppRoutes } from '~/constants/routes';
import splash from '../../assets/image/pica_splash.png';

const auth = useAuthStore();
const ctaRoute = computed(() => auth.isAuthenticated ? AppRoutes.SUMMARY : AppRoutes.LOGIN);
const ctaLabel = computed(() => auth.isAuthenticated ? '进入我的统计' : '开始登录并统计');
</script>

<template>
  <div class="home-page">
    <div class="responsive home-inner">
      <div class="hero-copy">
        <p class="eyebrow">PicaComicStatistics</p>
        <h1>把收藏夹，<br><span>变成一份报告。</span></h1>
        <p class="lead">从收藏分类、作者与标签，到作品热度和阅读偏好，用一页看懂你的哔咔收藏。</p>
        <NuxtLink :to="ctaRoute" class="home-cta">
          {{ ctaLabel }} <span aria-hidden="true">→</span>
        </NuxtLink>
        <p class="privacy-note">数据只保存在你的浏览器中，不上传到服务器。</p>
        <div class="feature-row" aria-label="功能亮点">
          <span>收藏统计</span><span>词云与图表</span><span>AI 画像</span>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <img :src="splash" alt="">
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page { height: calc(100dvh - 3.9375rem); min-height: 0; display: flex; align-items: center; overflow: hidden; }
.home-inner { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); align-items: center; gap: 2rem; max-height: 100%; padding-top: 1rem; padding-bottom: 1rem; }
.hero-copy { min-width: 0; }
.hero-art { display: grid; place-items: center; min-width: 0; max-height: calc(100dvh - 6rem); }
.hero-art img { display: block; max-width: 100%; max-height: calc(100dvh - 6rem); object-fit: contain; }
.eyebrow { margin: 0 0 1rem; font-family: 'JetBrains Mono', monospace; font-weight: 700; }
h1 { max-width: 42rem; margin: 0; font-family: 'Archivo Black', 'Noto Sans SC', sans-serif; font-size: clamp(2.5rem, 5rem, 5.2rem); line-height: 1.22; }
h1 span { background: var(--brand-pink); box-decoration-break: clone; -webkit-box-decoration-break: clone; padding: 0 .07em .05em; }
.lead { max-width: 35rem; margin: 1.5rem 0; font-size: 1.1rem; line-height: 1.7; font-weight: 700; }
.home-cta { display: inline-flex; gap: 1rem; align-items: center; border: 3px solid #000; box-shadow: 5px 5px 0 #000; padding: .9rem 1.3rem; background: var(--brand-pink); font-size: 1.05rem; font-weight: 900; transition: transform .15s, box-shadow .15s; }
.home-cta:hover { transform: translate(1.5px, 1.5px); box-shadow: 0 0 0 #000; }
.home-cta:focus-visible { outline: 3px solid #000; outline-offset: 2px; }
.privacy-note { margin: 1.2rem 0 0; font-size: .9rem; font-weight: 700; }
.feature-row { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1.3rem; }
.feature-row span { border: 2px solid #000; box-shadow: 3px 3px 0 #000; padding: .4rem .65rem; background: #fff; font-weight: 800; }
@media (max-width: 50rem) { .home-inner { gap: .5rem; } h1 { font-size: 2.8rem; } .hero-art img { max-height: 48dvh; } }
@media (max-width: 37.5rem) { .home-inner { grid-template-columns: 1fr; align-content: center; gap: .25rem; } .hero-art { grid-row: 1; max-height: 24dvh; } .hero-art img { max-height: 24dvh; } .eyebrow { margin-bottom: .3rem; font-size: .8rem; } h1 { font-size: 2.1rem; line-height: 1.2; } .lead { margin: .6rem 0; font-size: .88rem; line-height: 1.4; } .home-cta { padding: .6rem .8rem; font-size: .9rem; } .privacy-note { margin-top: .6rem; font-size: .75rem; } .feature-row { margin-top: .6rem; gap: .3rem; } .feature-row span { padding: .2rem .35rem; font-size: .7rem; } }
@media (max-width: 37.5rem) and (max-height: 39rem) { .hero-art { display: none; } .home-inner { padding-top: .4rem; padding-bottom: .4rem; } }
</style>
