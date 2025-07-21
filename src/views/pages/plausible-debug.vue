<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const toast = useToast();
const isLoading = ref(false);
const isFetching = ref(false);
const cacheData = ref(null);
const fetchResults = ref(null);

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
const forceRefresh = ref(false);

// Check if user is superadmin
const isSuperAdmin = computed(() => {
  return authService.getUserLevel() === 'rais';
});

onMounted(() => {
  if (!isSuperAdmin.value) {
    router.push('/');
    return;
  }
  loadCacheData();
});

const loadCacheData = async () => {
  isLoading.value = true;
  try {
    const data = await apiService.get('/api/admin/debug/plausible-cache');
    cacheData.value = data;
  } catch (error) {
    console.error('Error loading cache data:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Cache ma\'lumotlarini yuklashda xatolik',
      life: 3000
    });
  } finally {
    isLoading.value = false;
  }
};

const fetchPlausibleData = async () => {
  isFetching.value = true;
  try {
    const response = await apiService.post('/api/admin/fetch-plausible-data', {
      month: selectedMonth.value,
      year: selectedYear.value,
      forceRefresh: forceRefresh.value
    });
    
    fetchResults.value = response;
    
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: `${response.processed} ta tashkilot uchun ma'lumotlar olindi`,
      life: 3000
    });
    
    // Reload cache data
    await loadCacheData();
  } catch (error) {
    console.error('Error fetching Plausible data:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Plausible ma\'lumotlarini olishda xatolik',
      life: 3000
    });
  } finally {
    isFetching.value = false;
  }
};

const getMonthName = (monthNumber) => {
  const month = months.find(m => m.value === monthNumber);
  return month ? month.name : '';
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('uz-UZ');
};

const getStatusColor = (status) => {
  return status === 'success' ? 'text-green-600' : 'text-red-600';
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Plausible Debug Panel</h1>
    </div>

    <!-- Fetch Controls -->
    <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Plausible ma'lumotlarini olish</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

        <div class="flex items-center">
          <Checkbox v-model="forceRefresh" inputId="forceRefresh" binary />
          <label for="forceRefresh" class="ml-2 text-sm">Cache'ni yangilash</label>
        </div>

        <div class="flex items-end">
          <Button
            label="Ma'lumotlarni olish"
            @click="fetchPlausibleData"
            :loading="isFetching"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Cache Information -->
    <div v-if="cacheData" class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Cache ma'lumotlari</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-blue-600">{{ cacheData.totalEntries }}</div>
          <div class="text-sm text-gray-600">Jami cache yozuvlari</div>
        </div>
        
        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-green-600">{{ cacheData.cacheSettings.useCache ? 'Yoqilgan' : 'O\'chirilgan' }}</div>
          <div class="text-sm text-gray-600">Cache holati</div>
        </div>
        
        <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-purple-600">{{ cacheData.cacheSettings.cacheHours }} soat</div>
          <div class="text-sm text-gray-600">Cache muddati</div>
        </div>
      </div>

      <!-- Cache Entries Table -->
      <div v-if="cacheData.entries.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Davr</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tashrif</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sahifalar</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yangilangan</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yoshi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="entry in cacheData.entries" :key="`${entry.siteId}-${entry.month}-${entry.year}`">
              <td class="px-6 py-4 text-sm font-medium">{{ entry.siteId }}</td>
              <td class="px-6 py-4 text-sm">{{ getMonthName(entry.month) }} {{ entry.year }}</td>
              <td class="px-6 py-4 text-sm">{{ entry.metrics.visitCount }}</td>
              <td class="px-6 py-4 text-sm">{{ entry.metrics.pageVisits }}</td>
              <td class="px-6 py-4 text-sm">{{ formatDate(entry.lastUpdated) }}</td>
              <td class="px-6 py-4 text-sm">{{ entry.ageHours }} soat</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Fetch Results -->
    <div v-if="fetchResults" class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
      <h2 class="text-lg font-semibold mb-4">So'nggi natijalar</h2>
      
      <div class="mb-4">
        <p class="text-sm text-gray-600">
          {{ getMonthName(fetchResults.month) }} {{ fetchResults.year }} uchun {{ fetchResults.processed }} ta tashkilot qayta ishlandi
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tashkilot</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ball</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tashrif</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sahifalar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="result in fetchResults.results" :key="result.organization">
              <td class="px-6 py-4 text-sm font-medium">
                {{ result.organization }}
                <div class="text-xs text-gray-500">{{ result.url }}</div>
              </td>
              <td class="px-6 py-4 text-sm" :class="getStatusColor(result.status)">
                {{ result.status === 'success' ? 'Muvaffaqiyatli' : 'Xato' }}
                <div v-if="result.error" class="text-xs text-red-500">{{ result.error }}</div>
              </td>
              <td class="px-6 py-4 text-sm font-bold">{{ result.score || '-' }}</td>
              <td class="px-6 py-4 text-sm">{{ result.metrics?.visitCount || '-' }}</td>
              <td class="px-6 py-4 text-sm">{{ result.metrics?.pageVisits || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center p-8">
      <i class="pi pi-spin pi-spinner text-4xl text-blue-500"></i>
      <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
    </div>
  </div>
</template>
