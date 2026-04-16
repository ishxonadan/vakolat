<script setup>
import { computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppMenuItem from './AppMenuItem.vue';
import authService from '@/service/auth.service';
import packageJson from '../../package.json';
import { useLayout } from '@/layout/composables/layout';

const router = useRouter();
const route = useRoute();
const { setActiveMenuItem } = useLayout();
const appVersion = packageJson.version;

// Hardcoded variable to control manual correction menu visibility
const SHOW_MANUAL_CORRECTION = false; // Set to false to hide the manual correction menu

// Define menu items with required permission levels AND specific permissions
const menuItems = [
  {
    label: "Bo'limlar",
    items: [
      {
        label: 'Bosh sahifa',
        icon: 'pi pi-fw pi-home',
        to: '/',
        requiredLevel: null // Everyone can access
      },
      {
        label: "Foydalanuvchilarni boshqarish",
        icon: 'pi pi-fw pi-user',
        items: [
          {
            label: "Bir martalik chipta",
            icon: 'pi pi-fw pi-tags',
            to: '/tickets',
            requiredPermissions: ['view_tickets']
          },
          {
            label: "Tashriflar",
            icon: 'pi pi-fw pi-chart-bar',
            to: '/tashriflar',
            requiredPermissions: ['view_statistics']
          },
          {
            label: "A'zo bo'lganlar",
            icon: 'pi pi-fw pi-users',
            to: '/azo-bolganlar',
            requiredPermissions: ['view_members']
          },
        ]
      },
      {
        label: "Pullik xizmatlar",
        icon: 'pi pi-fw pi-wallet',
        items: [
          {
            label: "Xizmat ko'rsatish",
            icon: 'pi pi-fw pi-send',
            to: '/payment/service-provision',
            requiredPermissions: ['payment_provide_service']
          },
          {
            label: "Foydalanuvchi balansi",
            icon: 'pi pi-fw pi-credit-card',
            to: '/payment/balances',
            requiredPermissionsAny: [
              'payment_list_accounts',
              'payment_topup_user',
              'payment_withdraw_user',
              'payment_view_transactions',
              'payment_view_overview_stats',
            ],
          },
          {
            label: "Xizmatlar",
            icon: 'pi pi-fw pi-briefcase',
            to: '/payment/services',
            requiredPermissions: ['payment_manage_services']
          },
          {
            label: "Tarix",
            icon: 'pi pi-fw pi-history',
            to: '/payment/history',
            requiredPermissions: ['payment_view_transactions'],
          },
          {
            label: "Statistika",
            icon: 'pi pi-fw pi-chart-line',
            to: '/payment/statistics',
            requiredPermissions: ['payment_view_transactions'],
          },
        ]
      },
      {
        label: 'Dissertatsiya',
        icon: 'pi pi-fw pi-book',
        items: [
          { 
            label: 'Hujjatlar', 
            icon: 'pi pi-fw pi-chart-line', 
            to: '/diss',
            requiredPermissions: ['view_dissertations']
          },
          { 
            label: 'Tillar', 
            icon: 'pi pi-fw pi-language', 
            to: '/diss/languages',
            requiredPermissions: ['manage_diss_languages']
          },
          { 
            label: 'Soha', 
            icon: 'pi pi-fw pi-list', 
            to: '/diss/soha',
            requiredPermissions: ['manage_diss_fields']
          },
          { 
            label: 'Akademik daraja', 
            icon: 'pi pi-fw pi-book', 
            to: '/diss/akademik-daraja',
            requiredPermissions: ['manage_diss_levels']
          },
          { 
            label: "To'liq matnga ruxsat", 
            icon: 'pi pi-fw pi-globe', 
            to: '/diss/ip-access',
            requiredPermissions: ['manage_ip_access']
          },
        ]
      },
      {
        label: "Xodimlar boshqaruvi",
        icon: 'pi pi-fw pi-briefcase',
        items: [
          {
            label: "Xodimlar",
            icon: 'pi pi-fw pi-users',
            to: '/xodimlar',
            requiredPermissions: ['manage_users']
          },
          {
            label: "Tashkiliy bo'limlar",
            icon: 'pi pi-fw pi-building',
            to: '/xodimlar/tashkiliy-bolimlar',
            requiredLevel: 'admin',
          },
          {
            label: "Lavozimlar",
            icon: 'pi pi-fw pi-id-card',
            to: '/xodimlar/lavozimlar',
            requiredLevel: 'admin',
          },
          {
            label: "Huquqlar",
            icon: 'pi pi-fw pi-key',
            to: '/huquqlar',
            requiredPermissions: ['manage_permissions']
          },
          {
            label: "Xodim loglari",
            icon: 'pi pi-fw pi-history',
            to: '/xodimlar/logs',
            requiredLevel: 'rais'
          },
          {
            label: "Zallar",
            icon: 'pi pi-fw pi-sitemap',
            to: '/payment/departments',
            requiredPermissions: ['payment_manage_departments']
          },
        ]
      },
      {
        label: "Tizim boshqaruvi",
        icon: 'pi pi-fw pi-sliders-h',
        to: "/system",
        requiredPermissions: ["system_manage"],
      },
      {
        label: "Sozlamalar",
        icon: 'pi pi-fw pi-cog',
        to: "/settings",
      },
    ]
  },

];

// Enhanced filtering function that checks both levels and permissions
const hasAccess = (item) => {
  // If no requirements, everyone can access
  if (
    !item.requiredLevel &&
    !item.requiredPermissions &&
    !item.requiredPermissionsAny
  ) {
    return true;
  }

  // Check level requirement
  if (item.requiredLevel && !authService.hasAccess(item.requiredLevel)) {
    return false;
  }

  // Check permission requirements (all required)
  if (item.requiredPermissions && item.requiredPermissions.length > 0) {
    if (!authService.hasPermissions(item.requiredPermissions)) {
      return false;
    }
  }

  // Check permission requirements (at least one)
  if (item.requiredPermissionsAny && item.requiredPermissionsAny.length > 0) {
    if (!authService.hasAnyPermission(item.requiredPermissionsAny)) {
      return false;
    }
  }

  return true;
};

// Filter menu items based on user permissions and levels
const filteredModel = computed(() => {
  return menuItems.filter(section => section).map(section => {
    // Filter items in each section based on permissions
    const filteredItems = section.items.filter(item => {
      // If item has sub-items, filter those too
      if (item.items) {
        const filteredSubItems = item.items.filter(subItem => hasAccess(subItem));
        // Only show parent item if it has visible sub-items
        item.items = filteredSubItems;
        return filteredSubItems.length > 0;
      }
      
      // Check access for regular items
      return hasAccess(item);
    });
    
    // Return section with filtered items
    return {
      ...section,
      items: filteredItems
    };
  }).filter(section => section.items.length > 0); // Remove empty sections
});

// Add logout section
const logoutSection = {
  label: "Tizim",
  items: [
    {
      label: 'Chiqish',
      icon: 'pi pi-fw pi-sign-out',
      command: () => logout()
    }
  ]
};

// Combine filtered menu with logout section
const model = computed(() => {
  return [...filteredModel.value, logoutSection];
});

/** Route bilan menyu `to` mosligi (bosh sahifa `/` boshqalar uchun oldini olish) */
function routeMatchesMenuPath(path, to) {
  if (!to) {
    return false;
  }
  if (path === to) {
    return true;
  }
  if (to === '/') {
    return false;
  }
  const base = to.endsWith('/') ? to.replace(/\/+$/, '') : to;
  return path.startsWith(base + '/');
}

/**
 * AppMenuItem bilan bir xil kalitlar: bo'lim indeksi `si`, ichki elementlar `si-0-1-...`
 * Avvalo ichkariroq (leaf) moslik qidiriladi.
 */
function findActiveMenuItemKeyForPath(path, items, parentKey) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = `${parentKey}-${i}`;
    if (item.items && item.items.length > 0) {
      const nested = findActiveMenuItemKeyForPath(path, item.items, key);
      if (nested) {
        return nested;
      }
    }
    if (item.to && routeMatchesMenuPath(path, item.to)) {
      return key;
    }
  }
  return null;
}

function syncMenuExpansionToRoute() {
  const sections = model.value;
  if (!sections?.length) {
    return;
  }
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    if (!section.items?.length) {
      continue;
    }
    const key = findActiveMenuItemKeyForPath(route.path, section.items, String(si));
    if (key) {
      setActiveMenuItem(key);
      return;
    }
  }
}

watch(
  () => [route.path, model.value],
  () => {
    syncMenuExpansionToRoute();
  },
  { immediate: true },
);

// Logout function
const logout = () => {
  authService.logout();
  router.push('/auth/login');
};
</script>

<template>
  <div class="layout-menu-wrap">
    <ul class="layout-menu">
      <template v-for="(item, i) in model" :key="item">
        <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
        <li v-if="item.separator" class="menu-separator"></li>
      </template>
    </ul>
    <div class="layout-menu-version">Talqin {{ appVersion }}</div>
  </div>
</template>

<style lang="scss" scoped>
.layout-menu-wrap {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.layout-menu {
  flex: 1 1 auto;
}

.layout-menu-version {
  margin-top: auto;
  padding: 0.75rem 1rem 0.5rem 1rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  border-top: 1px solid var(--surface-border);
}
</style>
