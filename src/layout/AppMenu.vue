<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppMenuItem from './AppMenuItem.vue';
import authService from '@/service/auth.service';

const router = useRouter();
const route = useRoute();

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
            requiredLevel: 'admin',
            requiredPermissions: ['manage_tickets'] // Specific permission
          },
          {
            label: "Tashriflar",
            icon: 'pi pi-fw pi-chart-bar',
            to: '/tashriflar',
            requiredLevel: 'admin',
            requiredPermissions: ['view_statistics']
          },
          {
            label: "A'zo bo'lganlar",
            icon: 'pi pi-fw pi-users',
            to: '/azo-bolganlar',
            requiredLevel: 'admin',
            requiredPermissions: ['view_statistics']
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
            requiredPermissions: ['view_dissertations']
          },
          { 
            label: 'Soha', 
            icon: 'pi pi-fw pi-list', 
            to: '/diss/soha',
            requiredPermissions: ['view_dissertations']
          },
          { 
            label: 'Akademik daraja', 
            icon: 'pi pi-fw pi-book', 
            to: '/diss/akademik-daraja',
            requiredPermissions: ['view_dissertations']
          },
          { 
            label: "To'liq matnga ruxsat", 
            icon: 'pi pi-fw pi-globe', 
            to: '/diss/ip-access',
            requiredPermissions: ['view_statistics']
          },
        ]
      },
      {
        label: "Vakillar boshqaruvi",
        icon: 'pi pi-fw pi-briefcase',
        items: [
          {
            label: "Vakillar",
            icon: 'pi pi-fw pi-users',
            to: '/vakillar',
            requiredLevel: 'admin',
            requiredPermissions: ['manage_users'] // Specific permission
          },
          {
            label: "Huquqlar",
            icon: 'pi pi-fw pi-key',
            to: '/huquqlar',
            requiredLevel: 'rais',
            requiredPermissions: ['manage_permissions'] // Specific permission
          },
        ]
      },
    ]
  },

];

// Enhanced filtering function that checks both levels and permissions
const hasAccess = (item) => {
  // If no requirements, everyone can access
  if (!item.requiredLevel && !item.requiredPermissions) {
    return true;
  }

  // Check level requirement
  if (item.requiredLevel && !authService.hasAccess(item.requiredLevel)) {
    return false;
  }

  // Check permission requirements
  if (item.requiredPermissions && item.requiredPermissions.length > 0) {
    if (!authService.hasPermissions(item.requiredPermissions)) {
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

// Logout function
const logout = () => {
  authService.logout();
  router.push('/auth/login');
};
</script>

<template>
  <ul class="layout-menu">
    <template v-for="(item, i) in model" :key="item">
      <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
      <li v-if="item.separator" class="menu-separator"></li>
    </template>
  </ul>
</template>

<style lang="scss" scoped></style>
