<script setup lang="ts">
import type { UserProfileCardProps } from '@types-project/ui';
import placeholder from '@/assets/image/pica_placeholder.jpg';

defineProps<UserProfileCardProps>();

function handleImageError(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLImageElement && target.dataset.fallback !== 'true') {
    target.dataset.fallback = 'true';
    target.src = placeholder;
  }
}
</script>

<template>
  <section class="profile-card enter-rise">
    <div class="avatar-wrap">
      <img v-if="user?.avatar" :src="user.avatar" alt="用户头像" class="avatar" @error="handleImageError">
      <span v-else class="avatar avatar-fallback" aria-hidden="true">咔</span>
    </div>
    <div>
      <h1>{{ user?.username ?? '我的收藏报告' }}</h1>
      <p class="profile-meta">
        性别：{{ user?.gender || '未知' }}　等级：{{ user?.level || '未知' }}　称号：{{ user?.title || '未知' }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.profile-card { display: flex; gap: 1rem; align-items: center; padding: 1rem 0; }
.profile-card h1 { margin: 0 0 .45rem; font-family: var(--font-display); font-size: 2.2rem; line-height: 1.15; }
.profile-meta { margin: 0; font-weight: 700; }
.avatar-wrap { flex: 0 0 auto; }
.avatar { display: block; width: 5rem; height: 5rem; object-fit: cover; border: 3px solid var(--color-ink); box-shadow: var(--shadow-brutal-sm); background: var(--color-brand-yellow); }
.avatar-fallback { display: grid; place-items: center; font-size: 2rem; font-weight: 900; }
@media (max-width: 37.5rem) { .profile-card { align-items: flex-start; } .profile-card h1 { font-size: 1.55rem; } .avatar { width: 4rem; height: 4rem; } }
</style>
