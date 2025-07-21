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
  visitCount: 0,
  pageVisits: 0,
  interactiveServiceUsage: 0,
  personalAccountCount: 0,
  electronicResourceCount: 0,
  newsViewCount: 0,
  electronicResourceUsage: 0
});

// Updated evaluation criteria with new ranges
const criteria = [
  {
    id: 'M1',
    name: 'Tashrif buyurishlar soni',
    field: 'visitCount',
    ranges: [
      { min: 0, max: 0, points: 0 },
      { min: 1, max: 90, points: 1 },
      { min: 91, max: 210, points: 2 },
      { min: 211, max: 300, points: 3 },
      { min: 301, max: 390, points: 4 },
      { min: 391, max: Infinity, points: 5 }
    ]
  },
  {
    id: 'M2',
    name: 'Sahifalarga tashriflar soni',
    field: 'pageVisits',
    ranges: [
      { min: 0, max: 0, points: 0 },
      { min: 1, max: 290, points: 1 },
      { min: 291, max: 410, points: 2 },
      { min: 411, max: 500, points: 3 },
      { min: 501, max: Infinity, points: 4 }
    ]
  },
  {
    id: 'M3',
    name: 'Interaktiv xizmatlardan foydalanish soni',
    field: 'interactiveServiceUsage',
    ranges: [
      { min: 0, max: 0, points: 0 },
      { min: 1, max: 15, points: 1 },
      { min: 16, max: 30, points: 2 },
      { min: 31, max: 45, points: 3 },
      { min: 46, max: 60, points: 4 },
      { min: 61, max: Infinity, points: 5 }
    ]
  },
  {
    id: 'M4',
    name: 'Foydalanuvchilarning shaxsiy kabinetlar soni',
    field: 'personalAccountCount',
    ranges: [
      { min: 0, max: 0, points: 0 },
      { min: 1, max: 20, points: 1 },
      { min: 21, max: 40, points: 2 },
      { min: 41, max: 60, points: 3 },
      { min: 61, max: Infinity, points: 4 }
    ]
  },
  {
    id: 'M5',
    name: 'Elektron adabiyotlar soni',
    field: 'electronicResourceCount',
    ranges: [
      { min: 0, max: 0, points: 0 },
      { min: 1, max: 2, points: 1 },
      { min: 3, max: 5, points: 2 },
      { min: 6, max: 8, points: 3 },
      { min: 9, max: 11, points: 4 },
      { min: 12, max: Infinity, points: 5 }
    ]
  },
  {
    id: 'M6',
    name: 'Yangiklarni ko\'rishlar soni',
    field: 'newsViewCount',
    ranges: [
      { min: 0, max: 0, points: 0 },
      { min: 1, max: 3, points: 1 },
      { min: 4, max: 6, points: 2 },
      { min: 7, max: 9, points: 3 },
      { min: 10, max: 12, points: 4 },
      { min: 13, max: Infinity, points: 5 }
    ]
  },
  {
    id: 'M7',
    name: 'Elektron adabiyotlardan foydalanishlar soni',
    field: 'electronicResourceUsage',
    ranges: [
      { min: 0, max: 0, points: 0 },
      { min: 1, max: 4, points: 1 },
      { min: 5, max: 7, points: 2 },
      { min: 8, max: 10, points: 3 },
      { min: 11, max: 13, points: 4 },
      { min: 14, max: Infinity, points: 5 }
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
const isSuperAdmin = ref(false);

onMounted(async () => {
  isSuperAdmin.value = authService.getUserLevel() === 'rais';

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

const calculatePoints = (value, criteriaId) => {
  const criterion = criteria.find(c => c.id === criteriaId);
  if (!criterion) return 0;

  const range = criterion.ranges.find(r => value >= r.min && value <= r.max);
  return range ? range.points : 0;
};

const getTotalPoints = () => {
  let total = 0;

  criteria.forEach(criterion => {
    const value = metrics.value[criterion.field];
    const points = calculatePoints(value, criterion.id);
    total += points;
  });

  return total;
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
    
    console.log('Saving evaluation correction:', evaluation);
    await apiService.post('/admin/auto-evaluation', evaluation);
    
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: 'Baholash to\'g\'rilandi va saqlandi',
      life: 3000
    });
    
    // Reset form
    metrics.value = {
      visitCount: 0,
      pageVisits: 0,
      interactiveServiceUsage: 0,
      personalAccountCount: 0,
      electronicResourceCount: 0,
      newsViewCount: 0,
      electronicResourceUsage: 0
    };
    selectedOrg.value = null;
    
  } catch (error) {
    console.error('Error saving evaluation:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Baholashni to\'g\'rilashda xatolik yuz berdi',
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
    <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Avtomatik bahoni to'g'rilash</h1>
    <div class="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
      To'g'rilash rejimi
    </div>
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="criterion in criteria" :key="criterion.id">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ criterion.name }}
          </label>
          <InputNumber
            v-model="metrics[criterion.field]"
            class="w-full"
            :min="0"
          />
          <div class="mt-1 text-sm text-gray-500">
            Ball: {{ calculatePoints(metrics[criterion.field], criterion.id) }}
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
            label="To'g'rilashni saqlash"
            @click="saveEvaluation"
            :loading="isSaving"
          />
        </div>
      </div>
    </div>
  </div>
</div>
</template>
