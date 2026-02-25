<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import apiService from '@/service/api.service';
import ProgressSpinner from 'primevue/progressspinner';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const nickname = ref('');
const firstname = ref('');
const lastname = ref('');
const position = ref('');
const password = ref('');
const confirmPassword = ref('');
const selectedPermissionGroup = ref(null);
const permissionGroups = ref([]);
const isActive = ref(true);
const loading = ref(true);
const id = route.params.id;

// Fetch expert data and permission groups on mount
onMounted(async () => {
  try {
    loading.value = true;
    
    // Load permission groups
    const groupsData = await apiService.get('/admin/permission-groups');
    permissionGroups.value = groupsData.filter(group => group.isActive);
    
    // Load expert data
    console.log('Fetching expert with ID:', id);
    const data = await apiService.get(`/experts/${id}`);
    console.log('Expert data received:', data);
    
    nickname.value = data.nickname;
    firstname.value = data.firstname;
    lastname.value = data.lastname;
    position.value = data.position || '';
    selectedPermissionGroup.value = data.permissionGroup?._id || data.permissionGroup || null;
    isActive.value = data.isActive !== false; // Default to true if not set
    
  } catch (error) {
    console.error('Error fetching expert:', error);
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: "Ma'lumotlarni yuklashda xatolik yuz berdi", 
      life: 3000 
    });
  } finally {
    loading.value = false;
  }
});

async function saveData() {
  // Validate passwords match if either is provided
  if ((password.value || confirmPassword.value) && password.value !== confirmPassword.value) {
    toast.add({ severity: 'error', summary: 'Xato', detail: "Parollar mos kelmadi", life: 3000 });
    return;
  }

  // Validate required fields
  if (!firstname.value || !lastname.value || !nickname.value) {
    toast.add({ severity: 'error', summary: 'Xato', detail: "Barcha majburiy maydonlarni to'ldiring", life: 3000 });
    return;
  }

  const data = {
    nickname: nickname.value,
    firstname: firstname.value,
    lastname: lastname.value,
    position: position.value,
    level: 'expert',
    language: 'uz',
    permissionGroup: selectedPermissionGroup.value,
    isActive: isActive.value
  };
  
  // Only include password if it's provided
  if (password.value) {
    data.password = password.value;
  }
  
  try {
    console.log('Updating expert with ID:', id, 'Data:', data);
    await apiService.put(`/experts/${id}`, data);
    
    toast.add({ 
      severity: 'success', 
      summary: 'Bajarildi', 
      detail: "Ma'lumotlar muvaffaqiyatli yangilandi", 
      life: 3000 
    });
    
    setTimeout(() => {
      router.push('/vakillar');
    }, 2000);
  } catch (error) {
    console.error('Error updating expert:', error);
    const errorMsg = error?.message || error?.error || "Serverdan xato javob keldi";
    toast.add({ 
      severity: 'warn', 
      summary: 'Xato', 
      detail: errorMsg, 
      life: 3000 
    });
  }
}

function cancelEdit() {
  router.push('/vakillar');
}
</script>

<template>
  <div class="p-6 bg-white rounded-lg shadow-md mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Vakilni tahrirlash</h2>
    
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>
    
    <div v-else class="card">
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

      <!-- Permission Group row -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="w-full">
          <label for="permissionGroup" class="block text-sm font-medium text-gray-700 mb-1">Huquq guruhi</label>
          <Dropdown 
            v-model="selectedPermissionGroup" 
            :options="permissionGroups"
            optionLabel="name"
            optionValue="_id"
            placeholder="Huquq guruhini tanlang"
            class="w-full"
          />
        </div>
      </div>

      <!-- Password row -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/2">
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Yangi parol</label>
          <InputText 
            v-model="password" 
            id="password" 
            type="password" 
            autocomplete="off"
            class="w-full p-3" 
            placeholder="Bo'sh qoldirilsa o'zgartirilmaydi"
          />
        </div>
        <div class="md:w-1/2">
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Parolni tasdiqlash</label>
          <InputText 
            v-model="confirmPassword" 
            id="confirmPassword" 
            type="password" 
            autocomplete="off"
            class="w-full p-3" 
            placeholder="Bo'sh qoldirilsa o'zgartirilmaydi"
          />
        </div>
      </div>

      <!-- Active status -->
      <div class="flex items-center mb-4">
        <Checkbox 
          v-model="isActive" 
          id="isActive" 
          binary
        />
        <label for="isActive" class="ml-2">Faol</label>
      </div>

      <!-- Submit button -->
      <div class="flex justify-center gap-4 mt-6">
        <Button 
          label="Saqlash" 
          @click="saveData"
          class="px-6 py-3 text-white font-medium"
          icon="pi pi-save"
          iconPos="left"
        />
        <Button 
          label="Bekor qilish" 
          @click="cancelEdit"
          class="px-6 py-3 font-medium"
          severity="secondary"
          outlined
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

:deep(.p-button.p-button-outlined) {
  color: #4f46e5;
  background-color: transparent;
}

:deep(.p-button.p-button-outlined:hover) {
  background-color: rgba(79, 70, 229, 0.04);
}
</style>
