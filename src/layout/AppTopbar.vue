<script setup>
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import authService from '@/service/auth.service';
import apiService from '@/service/api.service';

const { onMenuToggle, toggleDarkMode, isDarkTheme } = useLayout();
const currentUser = ref(null);
const router = useRouter();
const isImpersonating = ref(false);
const originalUser = ref(null);

const checkImpersonation = () => {
  const impersonating = localStorage.getItem('isImpersonating') === 'true';
  isImpersonating.value = impersonating;

  if (impersonating) {
    const original = localStorage.getItem('originalUser');
    if (original) {
      originalUser.value = JSON.parse(original);
    }
  }
};

/** Familiya Ism — `/api/me` yoki token maydonlari */
const displayFullName = computed(() => {
  const u = currentUser.value;
  if (!u) return '';
  const fn = (u.firstname && String(u.firstname).trim()) || '';
  const ln = (u.lastname && String(u.lastname).trim()) || '';
  const both = `${fn} ${ln}`.trim();
  if (both) return both;
  return (u.nickname && String(u.nickname).trim()) || 'Foydalanuvchi';
});

/** Lavozim: katalog yoki eski matn; admin/rais uchun qisqa lavl */
const displayPosition = computed(() => {
  const u = currentUser.value;
  if (!u) return '';
  const sp = u.staffPosition && typeof u.staffPosition === 'object' ? u.staffPosition.name : null;
  if (sp) return sp;
  if (u.position && String(u.position).trim()) return String(u.position).trim();
  if (u.level === 'rais') return 'Tizim rahbari';
  if (u.level === 'admin') return 'Administrator';
  return '';
});

const userInitials = computed(() => {
  const u = currentUser.value;
  if (!u) return '?';
  const fn = (u.firstname && u.firstname[0]) || '';
  const ln = (u.lastname && u.lastname[0]) || '';
  const both = `${fn}${ln}`.toUpperCase();
  if (both.length >= 1) return both.slice(0, 2);
  const nick = (u.nickname && u.nickname[0]) || '?';
  return String(nick).toUpperCase();
});

onMounted(async () => {
  try {
    if (!authService.getToken()) {
      currentUser.value = null;
      return;
    }
    currentUser.value = await apiService.get('/me');
  } catch {
    const u = authService.getUser();
    currentUser.value = u
      ? {
          firstname: u.firstname,
          lastname: u.lastname,
          nickname: u.nickname,
          level: u.level,
        }
      : null;
  }
  checkImpersonation();
});

const logout = () => {
  authService.logout();
  router.push('/auth/login');
};

const returnToAdmin = () => {
  const original = originalUser.value;
  if (!original) return;
  try {
    localStorage.setItem('token', original.token);
    if (original.user) {
      localStorage.setItem('user', typeof original.user === 'string' ? original.user : JSON.stringify(original.user));
    }
    if (Array.isArray(original.permissions)) {
      localStorage.setItem('permissions', JSON.stringify(original.permissions));
    }
    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('originalUser');
    window.location.href = '/xodimlar';
  } catch (error) {
    console.error('Error returning to admin account:', error);
  }
};
</script>

<template>
  <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button class="layout-menu-button layout-topbar-action" @click="onMenuToggle">
        <i class="pi pi-bars"></i>
      </button>
      <router-link to="/" class="layout-topbar-logo">
        <img :src="isDarkTheme ? '/logo_dark.svg' : '/logo.svg'" height="172" width="172" alt="" />
      </router-link>
    </div>

    <div class="layout-topbar-actions">
      <div class="layout-config-menu">
        <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
          <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
        </button>
        <div class="relative">
          <AppConfigurator />
        </div>
      </div>

      <button
        class="layout-topbar-menu-button layout-topbar-action"
        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
      >
        <i class="pi pi-ellipsis-v"></i>
      </button>

      <div class="layout-topbar-menu hidden lg:block">
        <div class="layout-topbar-menu-content flex flex-row flex-wrap items-center">
          <button
            v-if="isImpersonating"
            @click="returnToAdmin"
            type="button"
            class="mr-3 shrink-0 rounded-md bg-orange-500 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-orange-600 flex items-center gap-2"
            title="Admin hisobiga qaytish"
          >
            <i class="pi pi-arrow-left text-sm"></i>
            <span class="hidden xl:inline">Adminga qaytish</span>
          </button>

          <div v-if="currentUser" class="topbar-user-cluster flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              class="topbar-user-avatar hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {{ userInitials }}
            </div>
            <div class="topbar-user-meta flex min-w-0 flex-col text-right leading-tight">
              <span class="truncate text-sm font-semibold text-surface-900 dark:text-surface-0">
                {{ displayFullName }}
              </span>
              <span
                v-if="displayPosition"
                class="truncate text-xs text-surface-500 dark:text-surface-400"
              >
                {{ displayPosition }}
              </span>
              <span
                v-else-if="currentUser.nickname"
                class="truncate text-xs text-surface-500 dark:text-surface-400"
              >
                @{{ currentUser.nickname }}
              </span>
              <span
                v-if="isImpersonating"
                class="mt-0.5 text-[0.65rem] font-medium text-orange-700 dark:text-orange-400"
              >
                Vaqtinchalik kirish
              </span>
            </div>
            <button
              @click="logout"
              type="button"
              class="layout-topbar-action shrink-0"
              title="Chiqish"
            >
              <i class="pi pi-sign-out"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topbar-user-cluster {
  border-left: 1px solid var(--surface-border, rgba(0, 0, 0, 0.08));
  padding-left: 0.75rem;
  margin-left: 0.25rem;
}

@media (max-width: 991px) {
  .topbar-user-cluster {
    border-left: none;
    padding-left: 0;
    margin-left: 0;
  }
}
</style>
