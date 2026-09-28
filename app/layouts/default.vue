<template>
  <div class="app-shell">
    <header class="site-header">
      <NuxtLink to="/" class="brand">
        哔咔收藏统计
      </NuxtLink>
      <nav class="header-nav" aria-label="主导航">
        <NuxtLink to="/">
          首页
        </NuxtLink>
        <NuxtLink to="/summary">
          统计报告
        </NuxtLink>
        <NuxtLink to="https://github.com/SSymobI/PicaComicStatistics" target="_blank">
          项目仓库
        </NuxtLink>
      </nav>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
