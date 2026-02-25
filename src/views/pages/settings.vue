<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const toast = useToast();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const changePassword = async () => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    toast.add({
      severity: 'warn',
      summary: 'Ogohlantirish',
      detail: "Barcha maydonlarni to'ldiring",
      life: 3000,
    });
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    toast.add({
      severity: 'warn',
      summary: 'Ogohlantirish',
      detail: 'Yangi parol va tasdiqlash mos emas',
      life: 3000,
    });
    return;
  }

  if (newPassword.value.length < 6) {
    toast.add({
      severity: 'warn',
      summary: 'Ogohlantirish',
      detail: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak',
      life: 3000,
    });
    return;
  }

  try {
    loading.value = true;
    await apiService.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: "Parol muvaffaqiyatli o'zgartirildi",
      life: 3000,
    });

    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: error.message || "Parolni o'zgartirishda xatolik",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="card max-w-xl mx-auto">
    <h1 class="text-xl font-semibold mb-6">Sozlamalar</h1>

    <h2 class="text-lg font-medium mb-4">Parolni o'zgartirish</h2>

    <div class="space-y-4">
      <div>
        <label for="currentPassword" class="block text-sm font-medium mb-1">Joriy parol</label>
        <InputText
          id="currentPassword"
          v-model="currentPassword"
          type="password"
          class="w-full"
        />
      </div>

      <div>
        <label for="newPassword" class="block text-sm font-medium mb-1">Yangi parol</label>
        <InputText
          id="newPassword"
          v-model="newPassword"
          type="password"
          class="w-full"
        />
        <p class="text-xs text-gray-500 mt-1">
          Minimal talablari: kamida 6 ta belgi..
        </p>
      </div>

      <div>
        <label for="confirmPassword" class="block text-sm font-medium mb-1">Yangi parolni tasdiqlang</label>
        <InputText
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          class="w-full"
        />
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <Button
        label="Parolni o'zgartirish"
        icon="pi pi-key"
        @click="changePassword"
        :loading="loading"
      />
    </div>
  </div>
</template>

