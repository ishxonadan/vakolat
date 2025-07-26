<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import apiService from '@/service/api.service';

const toast = useToast();
const router = useRouter();
const nickname = ref('');
const firstname = ref('');
const lastname = ref('');
const position = ref('');
const password = ref('');
const confirmPassword = ref('');

async function saveData() {
  // Validate passwords match
  if (password.value !== confirmPassword.value) {
    toast.add({ severity: 'error', summary: 'Xato', detail: "Parollar mos kelmadi", life: 3000 });
    return;
  }

  // Validate required fields
  if (!firstname.value || !lastname.value || !password.value || !nickname.value) {
    toast.add({ severity: 'error', summary: 'Xato', detail: "Barcha majburiy maydonlarni to'ldiring", life: 3000 });
    return;
  }

  const data = {
    nickname: nickname.value,
    firstname: firstname.value,
    lastname: lastname.value,
    position: position.value,
    password: password.value,
    level: 'vakil',
    language: 'uz'
  };
  
  try {
    await apiService.post('/admin/register', data);
    
    toast.add({ 
      severity: 'success', 
      summary: 'Bajarildi', 
      detail: "Ma'lumotlar muvaffaqiyatli saqlandi", 
      life: 3000 
    });
    
    setTimeout(() => {
      router.push('/vakillar');
    }, 2000);
  } catch (error) {
    let errorMsg = "Serverdan xato javob keldi";
    if (error && error.error) {
      errorMsg = error.error;
    }
    
    toast.add({ 
      severity: 'warn', 
      summary: 'Xato', 
      detail: errorMsg, 
      life: 3000 
    });
  }
}
</script>

<template>
  <div class="p-6 bg-white rounded-lg shadow-md mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Ekspert qo'shish</h2>
    
    <div class="card">
      <!-- Nickname row -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="w-full">
          <label for="nickname" class="block text-sm font-medium text-gray-700 mb-1">Login*</label>
          <InputText 
            v-model="nickname" 
            id="nickname" 
            type="text" 
            autocomplete="off"
            class="w-full p-3" 
          />
        </div>
      </div>

      <!-- Name row -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/2">
          <label for="firstname" class="block text-sm font-medium text-gray-700 mb-1">Ismi*</label>
          <InputText 
            v-model="firstname" 
            id="firstname" 
            type="text" 
            autocomplete="off"
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/2">
          <label for="lastname" class="block text-sm font-medium text-gray-700 mb-1">Sharifi*</label>
          <InputText 
            v-model="lastname" 
            id="lastname" 
            type="text" 
            autocomplete="off"
            class="w-full p-3" 
          />
        </div>
      </div>
      
      <!-- Position row -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="w-full">
          <label for="position" class="block text-sm font-medium text-gray-700 mb-1">Lavozimi</label>
          <InputText 
            v-model="position" 
            id="position" 
            type="text" 
            autocomplete="off"
            class="w-full p-3" 
          />
        </div>
      </div>

      <!-- Password row -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/2">
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Parol*</label>
          <InputText 
            v-model="password" 
            id="password" 
            type="password" 
            autocomplete="off"
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/2">
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Parolni tasdiqlash*</label>
          <InputText 
            v-model="confirmPassword" 
            id="confirmPassword" 
            type="password" 
            autocomplete="off"
            class="w-full p-3" 
          />
        </div>
      </div>

      <!-- Submit button -->
      <div class="flex justify-center mt-6">
        <Button 
          label="Saqlash" 
          @click="saveData"
          class="px-6 py-3 text-white font-medium"
          icon="pi pi-save"
          iconPos="left"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-button) {
  background-color: #4f46e5;
  border-color: #4f46e5;
}

:deep(.p-button:hover) {
  background-color: #4338ca;
  border-color: #4338ca;
}
</style>

