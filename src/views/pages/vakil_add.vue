<script setup>
import { ref, onMounted } from 'vue';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import apiService from '@/service/api.service';

const toast = useToast();
const router = useRouter();
const nickname = ref('');
const firstname = ref('');
const lastname = ref('');
const staffPositions = ref([]);
const selectedStaffPosition = ref(null);
const password = ref('');
const confirmPassword = ref('');
const selectedPermissionGroupIds = ref([]);
const permissionGroupCatalog = ref([]);
const staffDepartments = ref([]);
const selectedStaffDepartment = ref(null);
const isActive = ref(true);

// Load permission groups on mount
onMounted(async () => {
  try {
    const [groupsData, deptData, posData] = await Promise.all([
      apiService.get('/admin/permission-groups'),
      apiService.get('/staff-departments'),
      apiService.get('/staff-positions'),
    ]);
    permissionGroupCatalog.value = groupsData.filter((group) => group.isActive);
    staffDepartments.value = Array.isArray(deptData) ? deptData : [];
    staffPositions.value = Array.isArray(posData) ? posData : [];
  } catch (error) {
    console.error('Error loading permission groups:', error);
  }
});

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
    password: password.value,
    level: 'expert',
    language: 'uz',
    permissionGroups: selectedPermissionGroupIds.value || [],
    staffDepartment: selectedStaffDepartment.value || null,
    staffPosition: selectedStaffPosition.value || null,
    isActive: isActive.value
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
      router.push('/xodimlar');
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
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Xodim qo'shish</h2>
    
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
      
      <!-- Lavozim -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="w-full">
          <label for="staffPosition" class="block text-sm font-medium text-gray-700 mb-1">Lavozimi</label>
          <Dropdown
            id="staffPosition"
            v-model="selectedStaffPosition"
            :options="staffPositions"
            option-label="name"
            option-value="_id"
            placeholder="Tanlash (ixtiyoriy)"
            show-clear
            filter
            class="w-full"
          />
        </div>
      </div>

      <!-- Tashkiliy bo‘lim (Zallar / huquq guruhi emas) -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="w-full">
          <label for="staffDepartment" class="block text-sm font-medium text-gray-700 mb-1">Tashkiliy bo‘lim</label>
          <Dropdown
            id="staffDepartment"
            v-model="selectedStaffDepartment"
            :options="staffDepartments"
            option-label="name"
            option-value="_id"
            placeholder="Tanlash (ixtiyoriy)"
            show-clear
            filter
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">Pullik zali yoki huquq guruhi bilan aloqador emas.</p>
        </div>
      </div>

      <!-- Huquq guruhi(lari) -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="w-full">
          <label for="permissionGroups" class="block text-sm font-medium text-gray-700 mb-1">Huquq guruhi</label>
          <MultiSelect
            id="permissionGroups"
            v-model="selectedPermissionGroupIds"
            :options="permissionGroupCatalog"
            option-label="name"
            option-value="_id"
            placeholder="Bir yoki bir nechta guruh tanlang"
            filter
            display="chip"
            class="w-full"
            :max-selected-labels="3"
          />
          <p class="text-xs text-gray-500 mt-1">Bir nechta tanlansa, barcha guruhlardagi huquqlar birlashadi (takroriy huquqlar bitta hisoblanadi).</p>
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
