<template>
  <div v-if="isAuthenticated && timeLeft > 0" class="session-timer">
    <div class="timer-content">
      <i class="pi pi-clock mr-2"></i>
      <span class="timer-text">Sessiya tugashiga: </span>
      <span class="timer-value" :class="{ 'timer-warning': timeLeft < 300 }">
        {{ formatTimeLeft }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import authService from '@/service/auth.service';

const router = useRouter();
const toast = useToast();

const timeLeft = ref(0);
const checkInterval = ref(null);
const isAuthenticated = ref(false);

// Format time left in MM:SS
const formatTimeLeft = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60);
  const seconds = timeLeft.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Calculate time left until token expires
const calculateTimeLeft = () => {
  const token = authService.getToken();
  
  if (!token) {
    isAuthenticated.value = false;
    timeLeft.value = 0;
    return 0;
  }
  
  isAuthenticated.value = true;
  
  try {
    const decoded = authService.parseToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const left = decoded.exp - currentTime;
    
    return Math.max(0, left);
  } catch (error) {
    console.error('Error calculating time left:', error);
    return 0;
  }
};

// Check session and update timer
const checkSession = () => {
  const left = calculateTimeLeft();
  timeLeft.value = left;
  
  // If token expired, redirect to login
  if (left <= 0 && isAuthenticated.value) {
    console.log('🔒 Session expired - redirecting to login');
    
    // Show notification
    toast.add({
      severity: 'warn',
      summary: 'Sessiya tugadi',
      detail: 'Iltimos, qaytadan tizimga kiring',
      life: 5000
    });
    
    // Clear auth and redirect
    authService.logout();
    router.push('/auth/login');
  } else if (left > 0 && left <= 60 && left % 10 === 0) {
    // Warning when less than 60 seconds left (every 10 seconds)
    toast.add({
      severity: 'warn',
      summary: 'Ogohlantirish',
      detail: `Sessiya ${left} soniyadan keyin tugaydi`,
      life: 3000
    });
  } else if (left === 300) {
    // Warning at 5 minutes
    toast.add({
      severity: 'warn',
      summary: 'Ogohlantirish',
      detail: 'Sessiya 5 daqiqadan keyin tugaydi',
      life: 4000
    });
  }
};

onMounted(() => {
  // Initial check
  checkSession();
  
  // Check every second
  checkInterval.value = setInterval(checkSession, 1000);
});

onUnmounted(() => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value);
  }
});
</script>

<style scoped>
.session-timer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  color: white;
  padding: 0.4rem 1rem;
  z-index: 9999;
  box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.1);
}

.timer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 500;
}

.timer-value {
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.15rem 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  margin-left: 0.4rem;
}

.timer-warning {
  background: #f59e0b;
  color: white;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
