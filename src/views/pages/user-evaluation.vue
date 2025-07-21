<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const toast = useToast();
const isLoading = ref(true);
const isSaving = ref(false);
const selectedOrg = ref(null);
const organizations = ref([]);

const metrics = ref({
  websiteUsability: 0,
  websiteDesign: 0,
  searchUsability: 0
});

// Evaluation criteria
const criteria = [
  {
    id: 'M1',
    name: 'Veb-saytidan foydalanish qulayligi',
    field: 'websiteUsability',
    options: [
      { value: 1, label: 'Noqulay' },
      { value: 2, label: 'Kam qulay' },
      { value: 3, label: "O'rtacha qulay" },
      { value: 4, label: 'Ancha qulay' },
      { value: 5, label: 'Juda qulay' }
    ]
  },
  {
    id: 'M2',
    name: 'Veb-sayt dizayni',
    field: 'websiteDesign',
    options: [
      { value: 1, label: 'Noqulay' },
      { value: 2, label: 'Kam qulay' },
      { value: 3, label: "O'rtacha qulay" },
      { value: 4, label: 'Ancha qulay' },
      { value: 5, label: 'Juda qulay' }
    ]
  },
  {
    id: 'M3',
    name: 'Qidruv funksiyasidan foydalanish',
    field: 'searchUsability',
    options: [
      { value: 1, label: 'Qoniqarsiz' },
      { value: 2, label: 'Qoniqarli' },
      { value: 3, label: 'Qulay' },
      { value: 4, label: 'Ancha qulay' },
      { value: 5, label: 'Juda qulay' }
    ]
  }
];

const currentYear = new Date().getFullYear();
const years = Array.from({length: 2070 - currentYear + 1}, (_, i) => currentYear + i);
const months = [
  { name: 'Yanvar', value: 1 },
  { name: 'Fevral', value: 2 },
  { name: 'Mart', value: 3 },
  { name: 'Aprel', value: 4 },
  { name: 'May', value: 5 },
  { name: 'Iyun', value: 6 },
  { name: 'Iyul', value: 7 },
  { name: 'Avgust', value: 8 },
  { name: 'Sentabr', value: 9 },
  { name: 'Oktabr', value: 10 },
  { name: 'Noyabr', value: 11 },
  { name: 'Dekabr', value: 12 }
];

const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(currentYear);

// Check if user is superadmin
const isSuperAdmin = computed(() => {
  return authService.getUserLevel() === 'rais';
});

onMounted(async () => {
  if (!isSuperAdmin.value) {
    router.push('/');
    return;
  }

  try {
    const data = await apiService.get('/contestants');
    organizations.value = data;
  } catch (error) {
    console.error('Error fetching organizations:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Tashkilotlar ro\'yxatini yuklashda xatolik yuz berdi',
      life: 3000
    });
  } finally {
    isLoading.value = false;
  }
});

const getTotalPoints = () => {
  return Object.values(metrics.value).reduce((sum, value) => sum + value, 0);
};

const saveEvaluation = async () => {
  if (!selectedOrg.value) {
    toast.add({
      severity: 'warn',
      summary: 'Ogohlantirish',
      detail: 'Tashkilotni tanlang',
      life: 3000
    });
    return;
  }

  isSaving.value = true;

  try {
    const evaluation = {
      organizationId: selectedOrg.value,
      month: selectedMonth.value,
      year: selectedYear.value,
      metrics: metrics.value
    };
    
    await apiService.post('/admin/user-evaluation', evaluation);
    
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: 'Baholash saqlandi',
      life: 3000
    });
    
    // Reset form
    metrics.value = {
      websiteUsability: 0,
      websiteDesign: 0,
      searchUsability: 0
    };
    selectedOrg.value = null;
    
  } catch (error) {
    console.error('Error saving evaluation:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Baholashni saqlashda xatolik yuz berdi',
      life: 3000
    });
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
<div>
  <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Foydalanuvchi baholash</h1>
  </div>

  <div v-if="isLoading" class="flex justify-center items-center p-8">
    <i class="pi pi-spin pi-spinner text-4xl text-blue-500"></i>
    <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
  </div>

  <div v-else class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tashkilot</label>
        <Dropdown
          v-model="selectedOrg"
          :options="organizations"
          optionLabel="name"
          optionValue="_id"
          placeholder="Tashkilotni tanlang"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oy</label>
        <Dropdown
          v-model="selectedMonth"
          :options="months"
          optionLabel="name"
          optionValue="value"
          placeholder="Oyni tanlang"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yil</label>
        <Dropdown
          v-model="selectedYear"
          :options="years"
          placeholder="Yilni tanlang"
          class="w-full"
        />
      </div>
    </div>

    <div class="space-y-6">
      <div class="grid grid-cols-1 gap-6">
        <div v-for="criterion in criteria" :key="criterion.id" class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <label class="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
            {{ criterion.name }}
          </label>
          <div class="flex flex-wrap gap-4">
            <div v-for="option in criterion.options" :key="option.value" 
                 class="flex items-center">
              <RadioButton 
                :id="`${criterion.id}-${option.value}`"
                :name="criterion.field"
                :value="option.value"
                v-model="metrics[criterion.field]"
              />
              <label :for="`${criterion.id}-${option.value}`" class="ml-2">
                {{ option.label }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-end mt-4">
        <div class="text-lg font-medium mb-4">
          Jami ball: {{ getTotalPoints() }}
        </div>
        <div class="flex justify-end space-x-4">
          <Button
            label="Bekor qilish"
            severity="secondary"
            outlined
            @click="router.push('/jadval')"
          />
          <Button
            label="Saqlash"
            @click="saveEvaluation"
            :loading="isSaving"
          />
        </div>
      </div>
    </div>
  </div>
</div>
</template>

