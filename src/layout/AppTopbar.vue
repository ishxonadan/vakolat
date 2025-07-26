<script setup>
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import authService from '@/service/auth.service';

const { onMenuToggle, toggleDarkMode, isDarkTheme } = useLayout();
const currentUser = ref(null);
const router = useRouter();
const isImpersonating = ref(false);
const originalUser = ref(null);

// Check if user is impersonating
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

onMounted(async () => {
  try {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        currentUser.value = await response.json();
      }
    }
    
    // Check if user is impersonating
    checkImpersonation();
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
});

// Logout function using authService
const logout = () => {
  authService.logout();
  router.push('/auth/login');
};

// Return to original admin account
const returnToAdmin = () => {
  if (originalUser.value) {
    console.log('Returning to admin account:', originalUser.value);
    
    try {
      // First, restore the original admin token
      localStorage.setItem('token', originalUser.value.token);
      
      // If user object exists in originalUser, restore it
      if (originalUser.value.user) {
        localStorage.setItem('user', 
          typeof originalUser.value.user === 'string' 
            ? originalUser.value.user 
            : JSON.stringify(originalUser.value.user)
        );
      }
      
      // Clear impersonation flags
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('originalUser');
      
      // Force a complete page reload and redirect to experts page
      // This ensures the authentication state is fully refreshed before navigation
      window.location.href = '/vakillar';
    } catch (error) {
      console.error('Error returning to admin account:', error);
    }
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
                <img  :src="isDarkTheme ? '/logo_dark.svg' : '/logo.svg'" height="172" width="172">

                <!-- <span>Vakolat</span> -->
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
                <div class="layout-topbar-menu-content">
                    <!-- Return to admin button when impersonating -->
                    <button 
                        v-if="isImpersonating" 
                        @click="returnToAdmin" 
                        class="mr-4 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-md flex items-center gap-2"
                        title="Admin hisobiga qaytish"
                    >
                        <i class="pi pi-arrow-left"></i>
                        <span>Adminga qaytish</span>
                    </button>
                    
                    <!-- User info and logout button -->
                    <div v-if="currentUser" class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-user"></i>
                            <span class="font-medium">{{ currentUser.nickname }}</span>
                            <span v-if="isImpersonating" class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                Vaqtinchalik
                            </span>
                        </div>
                        <!-- Restored logout button -->
                        <button 
                            @click="logout" 
                            class="layout-topbar-action"
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

