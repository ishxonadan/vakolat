<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppMenuItem from './AppMenuItem.vue';
import authService from '@/service/auth.service';

const router = useRouter();
const route = useRoute();

// Hardcoded variable to control manual correction menu visibility
const SHOW_MANUAL_CORRECTION = true; // Set to false to hide the manual correction menu

// Define menu items with required permission levels
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
            requiredLevel: 'admin'
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
            to: '/diss' 
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
            requiredLevel: 'admin'
          },
          {
            label: "Huquqlar",
            icon: 'pi pi-fw pi-key',
            to: '/huquqlar',
            requiredLevel: 'rais'
          },
        ]
      },
    ]
  },

];

// Filter menu items based on user permissions
const filteredModel = computed(() => {
  return menuItems.map(section => {
    // Filter items in each section based on permissions
    const filteredItems = section.items.filter(item => {
      // If item has sub-items, filter those too
      if (item.items) {
        const filteredSubItems = item.items.filter(subItem => {
          if (!subItem.requiredLevel) return true;
          return authService.hasAccess(subItem.requiredLevel);
        });
        // Only show parent item if it has visible sub-items
        item.items = filteredSubItems;
        return filteredSubItems.length > 0;
      }
      
      // If no required level, everyone can access
      if (!item.requiredLevel) return true;
      // Check if user has required level
      return authService.hasAccess(item.requiredLevel);
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
