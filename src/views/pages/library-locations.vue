<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const toast = useToast();
const isLoading = ref(true);
const locations = ref([]);
const showDialog = ref(false);
const isEditing = ref(false);
const availableOrganizations = ref([]);

const currentLocation = ref({
  organizationId: '',
  locationCode: '',
  locationName: '',
  region: '',
  apiEndpoint: '',
  isActive: true
});

const regions = [
  { name: 'Toshkent', value: 'toshkent' },
  { name: 'Samarqand', value: 'samarqand' },
  { name: 'Buxoro', value: 'buxoro' },
  { name: 'Andijon', value: 'andijon' },
  { name: 'Farg\'ona', value: 'fargona' },
  { name: 'Namangan', value: 'namangan' },
  { name: 'Qashqadaryo', value: 'qashqadaryo' },
  { name: 'Surxondaryo', value: 'surxondaryo' },
  { name: 'Navoiy', value: 'navoiy' },
  { name: 'Jizzax', value: 'jizzax' },
  { name: 'Sirdaryo', value: 'sirdaryo' },
  { name: 'Xorazm', value: 'xorazm' },
  { name: 'Qoraqalpog\'iston', value: 'qoraqalpogiston' }
];

// Check if user is superadmin
const isSuperAdmin = computed(() => {
  return authService.getUserLevel() === 'rais';
});

onMounted(async () => {
  if (!isSuperAdmin.value) {
    router.push('/');
    return;
  }
  await loadLocations();
});

const loadLocations = async () => {
  isLoading.value = true;
  try {
    const data = await apiService.get('/api/library-locations');
    locations.value = data;
  } catch (error) {
    console.error('Error loading locations:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Joylashuvlarni yuklashda xatolik yuz berdi',
      life: 3000
    });
  } finally {
    isLoading.value = false;
  }
};

const loadAvailableOrganizations = async () => {
  try {
    const data = await apiService.get('/api/library-locations/available/organizations');
    availableOrganizations.value = data;
  } catch (error) {
    console.error('Error loading available organizations:', error);
  }
};

const openAddDialog = async () => {
  await loadAvailableOrganizations();
  currentLocation.value = {
    organizationId: '',
    locationCode: '',
    locationName: '',
    region: '',
    apiEndpoint: '',
    isActive: true
  };
  isEditing.value = false;
  showDialog.value = true;
};

const openEditDialog = async (location) => {
  await loadAvailableOrganizations();
  // Add current organization to available list if editing
  if (location.organizationId && !availableOrganizations.value.find(org => org._id === location.organizationId._id)) {
    availableOrganizations.value.push(location.organizationId);
  }
  
  currentLocation.value = {
    _id: location._id,
    organizationId: location.organizationId._id,
    locationCode: location.locationCode,
    locationName: location.locationName,
    region: location.region,
    apiEndpoint: location.apiEndpoint,
    isActive: location.isActive
  };
  isEditing.value = true;
  showDialog.value = true;
};

const saveLocation = async () => {
  try {
    if (isEditing.value) {
      await apiService.put(`/api/library-locations/${currentLocation.value._id}`, currentLocation.value);
      toast.add({
        severity: 'success',
        summary: 'Muvaffaqiyat',
        detail: 'Joylashuv muvaffaqiyatli yangilandi',
        life: 3000
      });
    } else {
      await apiService.post('/api/library-locations', currentLocation.value);
      toast.add({
        severity: 'success',
        summary: 'Muvaffaqiyat',
        detail: 'Joylashuv muvaffaqiyatli qo\'shildi',
        life: 3000
      });
    }
    
    showDialog.value = false;
    await loadLocations();
  } catch (error) {
    console.error('Error saving location:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: error.response?.data?.error || 'Joylashuvni saqlashda xatolik yuz berdi',
      life: 3000
    });
  }
};

const deleteLocation = async (location) => {
  if (confirm(`${location.locationName} joylashuvini o'chirishni xohlaysizmi?`)) {
    try {
      await apiService.delete(`/api/library-locations/${location._id}`);
      toast.add({
        severity: 'success',
        summary: 'Muvaffaqiyat',
        detail: 'Joylashuv muvaffaqiyatli o\'chirildi',
        life: 3000
      });
      await loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.add({
        severity: 'error',
        summary: 'Xato',
        detail: 'Joylashuvni o\'chirishda xatolik yuz berdi',
        life: 3000
      });
    }
  }
};

const getRegionName = (regionValue) => {
  const region = regions.find(r => r.value === regionValue);
  return region ? region.name : regionValue;
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Kutubxona joylashuvlari</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          M4 (Shaxsiy kabinetlar) uchun kutubxona tizimi sozlamalari
        </p>
      </div>
      <Button
        label="Joylashuv qo'shish"
        icon="pi pi-plus"
        @click="openAddDialog"
        class="bg-blue-600 hover:bg-blue-700"
      />
    </div>

    <div v-if="isLoading" class="flex justify-center items-center p-8">
      <i class="pi pi-spin pi-spinner text-4xl text-blue-500"></i>
      <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
    </div>

    <div v-else class="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
      <div v-if="locations.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
        Hozircha joylashuvlar sozlanmagan.
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tashkilot</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joylashuv kodi</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joylashuv nomi</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viloyat</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="location in locations" :key="location._id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ location.organizationId.name }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ location.organizationId.url }}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                {{ location.locationCode }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                {{ location.locationName }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                {{ getRegionName(location.region) }}
              </td>
              <td class="px-6 py-4">
                <span :class="location.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" 
                      class="px-2 py-1 text-xs rounded-full">
                  {{ location.isActive ? 'Faol' : 'Nofaol' }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm space-x-2">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="info"
                  @click="openEditDialog(location)"
                  v-tooltip="'Tahrirlash'"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  @click="deleteLocation(location)"
                  v-tooltip="'O\'chirish'"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <Dialog 
      v-model:visible="showDialog" 
      :header="isEditing ? 'Joylashuvni tahrirlash' : 'Joylashuv qo\'shish'"
      modal 
      class="w-full max-w-2xl"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tashkilot *
          </label>
          <Dropdown
            v-model="currentLocation.organizationId"
            :options="availableOrganizations"
            optionLabel="name"
            optionValue="_id"
            placeholder="Tashkilotni tanlang"
            class="w-full"
            :disabled="isEditing"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Joylashuv kodi *
          </label>
          <InputText
            v-model="currentLocation.locationCode"
            placeholder="Masalan: R0050000"
            class="w-full"
          />
          <small class="text-gray-500">Kutubxona tizimidagi vLocation parametri</small>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Joylashuv nomi *
          </label>
          <InputText
            v-model="currentLocation.locationName"
            placeholder="Masalan: Toshkent shahar kutubxonasi"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Viloyat *
          </label>
          <Dropdown
            v-model="currentLocation.region"
            :options="regions"
            optionLabel="name"
            optionValue="value"
            placeholder="Viloyatni tanlang"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Endpoint *
          </label>
          <InputText
            v-model="currentLocation.apiEndpoint"
            placeholder="https://example.com/FN/Manager/action.do"
            class="w-full"
          />
          <small class="text-gray-500">Kutubxona tizimi API manzili</small>
        </div>

        <div class="flex items-center">
          <Checkbox v-model="currentLocation.isActive" inputId="isActive" binary />
          <label for="isActive" class="ml-2 text-sm">Faol</label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <Button
            label="Bekor qilish"
            severity="secondary"
            @click="showDialog = false"
          />
          <Button
            :label="isEditing ? 'Yangilash' : 'Saqlash'"
            @click="saveLocation"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
