<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import authService from '@/service/auth.service';
import apiService from '@/service/api.service';

const toast = useToast();
const router = useRouter();

const angle = ref(33);
const speed = 0;

const animatedStyle = computed(() => ({
  background: `linear-gradient(${angle.value}deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 75%)`,
}));

let animationFrameId;

const animate = () => {
  angle.value = (angle.value + speed) % 360;
  animationFrameId = requestAnimationFrame(animate);
};

onMounted(() => {
  animate();
});

import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
});

const email = ref('');
const password = ref('');
const checked = ref(false);

const login = async () => {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nickname: email.value,
        password: password.value,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store the token using auth service
      authService.setToken(data.token);

      // Show success toast
      toast.add({ severity: 'success', summary: 'Muvaffaqiyat', detail: 'Login successful', life: 3000 });

      // Redirect to main page
      router.push('/');
    } else {
      // Show error toast
      toast.add({ severity: 'error', summary: 'Xato', detail: data.status || 'Login failed', life: 3000 });
    }
  } catch (error) {
    console.error('Login error:', error);
    toast.add({ severity: 'error', summary: 'Xato', detail: 'Xatolik yuz berdi', life: 3000 });
  }
};
</script>

<template>
  <FloatingConfigurator />
  <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div :style="animatedStyle" style="border-radius: 56px; padding: 0.3rem;">
        <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
          <div class="text-center mb-16">
            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Xush kelibsiz</div>
          </div>

          <!-- Wrap inputs in a form with submit handler -->
          <form @submit.prevent="login">
            <InputText id="email1" type="text" placeholder="Login" class="w-full md:w-[30rem] mb-4" v-model="email" />

            <Password id="password1" v-model="password" placeholder="Kalit so'z" :toggleMask="true" class="mb-4" fluid :feedback="false"></Password>

            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
              <div class="flex items-center">
                <Checkbox v-model="checked" id="rememberme1" binary class="mr-2"></Checkbox>
                <label for="rememberme1">Eslab qol</label>
              </div>
              <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Parol esdan chiqdimi?</span>
            </div>
            <Button type="submit" label="Kirish" class="w-full"></Button>
          </form>
        </div>
      </div>
    </div>
  </div>
  <Toast />
</template>

<style scoped>
.pi-eye {
  transform: scale(1.6);
  margin-right: 1rem;
}

.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>

