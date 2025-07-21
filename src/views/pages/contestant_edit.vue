<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import apiService from '@/service/api.service';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const contestant = ref({
  name: '',
  url: '',
  libraryConfig: {
    isActive: false,
    locationCode: '',
    locationName: '',
    region: '',
    apiEndpoint: ''
  }
});

const regions = ref([
  'Toshkent shahar',
  'Toshkent viloyati',
  'Andijon viloyati',
  'Buxoro viloyati',
  'Farg\'ona viloyati',
  'Jizzax viloyati',
  'Xorazm viloyati',
  'Namangan viloyati',
  'Navoiy viloyati',
  'Qashqadaryo viloyati',
  'Qoraqalpog\'iston Respublikasi',
  'Samarqand viloyati',
  'Sirdaryo viloyati',
  'Surxondaryo viloyati'
]);

const isLoading = ref(false);
const isFetching = ref(true);

const fetchContestant = async () => {
  try {
    const data = await apiService.get(`/contestants/${route.params.id}`);
    contestant.value = {
      ...data,
      libraryConfig: data.libraryConfig || {
        isActive: false,
        locationCode: '',
        locationName: '',
        region: '',
        apiEndpoint: ''
      }
    };
  } catch (error) {
    console.error('Error fetching contestant:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Sayt ma\'lumotlarini yuklashda xatolik',
      life: 3000
    });
    router.push('/contestants');
  } finally {
    isFetching.value = false;
  }
};

const updateContestant = async () => {
  if (!contestant.value.name || !contestant.value.url) {
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Nomi va URL majburiy maydonlar',
      life: 3000
    });
    return;
  }

  // Validate library config if active
  if (contestant.value.libraryConfig.isActive) {
    if (!contestant.value.libraryConfig.locationCode || 
        !contestant.value.libraryConfig.locationName || 
        !contestant.value.libraryConfig.region || 
        !contestant.value.libraryConfig.apiEndpoint) {
      toast.add({
        severity: 'error',
        summary: 'Xato',
        detail: 'Kutubxona integratsiyasi yoqilgan bo\'lsa, barcha maydonlar to\'ldirilishi kerak',
        life: 3000
      });
      return;
    }
  }

  isLoading.value = true;

  try {
    await apiService.put(`/contestants/${route.params.id}`, contestant.value);
    
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: 'Sayt ma\'lumotlari muvaffaqiyatli yangilandi',
      life: 3000
    });
    
    router.push('/contestants');
  } catch (error) {
    console.error('Error updating contestant:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Sayt ma\'lumotlarini yangilashda xatolik yuz berdi',
      life: 3000
    });
  } finally {
    isLoading.value = false;
  }
};

const cancel = () => {
  router.push('/contestants');
};

onMounted(() => {
  fetchContestant();
});
</script>

<template>
  <div>
    <div class="flex items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <Button icon="pi pi-arrow-left" class="p-button-text mr-2" @click="cancel" />
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Saytni tahrirlash</h1>
    </div>

    <div v-if="isFetching" class="flex justify-center items-center p-8">
      <ProgressSpinner />
      <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
    </div>

    <div v-else class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
      <form @submit.prevent="updateContestant" class="space-y-6">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sayt nomi *
            </label>
            <InputText
              id="name"
              v-model="contestant.name"
              placeholder="Masalan: Toshkent shahar kutubxonasi"
              class="w-full"
              required
            />
          </div>

          <div>
            <label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sayt URL manzili *
            </label>
            <InputText
              id="url"
              v-model="contestant.url"
              placeholder="https://example.uz"
              class="w-full"
              required
            />
          </div>
        </div>

        <!-- Library Integration Section -->
        <div class="border-t pt-6">
          <div class="flex items-center mb-4">
            <Checkbox 
              v-model="contestant.libraryConfig.isActive" 
              inputId="libraryActive" 
              binary 
            />
            <label for="libraryActive" class="ml-2 text-lg font-medium text-gray-900 dark:text-white">
              Kutubxona tizimi integratsiyasi
            </label>
          </div>
          
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Kutubxona boshqaruv tizimidan avtomatik ma'lumot olish uchun integratsiyani yoqing
          </p>

          <div v-if="contestant.libraryConfig.isActive" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="locationCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Joylashuv kodi *
              </label>
              <InputText
                id="locationCode"
                v-model="contestant.libraryConfig.locationCode"
                placeholder="R0050000"
                class="w-full"
              />
              <small class="text-gray-500">Kutubxona tizimidagi joylashuv kodi</small>
            </div>

            <div>
              <label for="locationName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Joylashuv nomi *
              </label>
              <InputText
                id="locationName"
                v-model="contestant.libraryConfig.locationName"
                placeholder="Toshkent shahar kutubxonasi"
                class="w-full"
              />
            </div>

            <div>
              <label for="region" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hudud *
              </label>
              <Dropdown
                id="region"
                v-model="contestant.libraryConfig.region"
                :options="regions"
                placeholder="Hududni tanlang"
                class="w-full"
              />
            </div>

            <div>
              <label for="apiEndpoint" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Endpoint *
              </label>
              <InputText
                id="apiEndpoint"
                v-model="contestant.libraryConfig.apiEndpoint"
                placeholder="https://example.uz/FN/action.do"
                class="w-full"
              />
              <small class="text-gray-500">Kutubxona tizimi API manzili</small>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-4 pt-6 border-t">
          <Button
            label="Bekor qilish"
            icon="pi pi-times"
            class="p-button-secondary"
            @click="cancel"
            type="button"
          />
          <Button
            label="Yangilash"
            icon="pi pi-check"
            :loading="isLoading"
            type="submit"
          />
        </div>
      </form>
    </div>
  </div>
</template>
