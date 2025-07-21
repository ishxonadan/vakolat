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
const organizations = ref([]);

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

// Data collection options
const collectOptions = ref({
  plausible: true,
  uznel: true,
  manual: false // Don't overwrite manual entries by default
});

// Check if user is superadmin
const isSuperAdmin = computed(() => {
  return authService.getUserLevel() === 'rais';
});

onMounted(async () => {
  if (!isSuperAdmin.value) {
    router.push('/');
    return;
  }
  await loadInitialData();
});

const loadInitialData = async () => {
  isLoading.value = true;
  try {
    // Load organizations
    const orgsData = await apiService.get('/contestants');
    organizations.value = orgsData;

    // Load cache data
    const cache = await apiService.get('/api/admin/debug/plausible-cache');
    cacheData.value = cache;
  } catch (error) {
    console.error('Error loading initial data:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Boshlang\'ich ma\'lumotlarni yuklashda xatolik',
      life: 3000
    });
  } finally {
    isLoading.value = false;
  }
};

const collectAllData = async () => {
  isFetching.value = true;
  try {
    const response = await apiService.post('/api/admin/collect-all-data', {
      month: selectedMonth.value,
      year: selectedYear.value,
      forceRefresh: forceRefresh.value,
      options: collectOptions.value
    });
    
    fetchResults.value = response;
    
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: `${response.processed} ta tashkilot uchun ma'lumotlar yig'ildi`,
      life: 3000
    });
    
    // Reload cache data
    await loadInitialData();
  } catch (error) {
    console.error('Error collecting data:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Ma\'lumotlarni yig\'ishda xatolik yuz berdi',
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

const getDataSourceBadge = (sources) => {
  const badges = [];
  if (sources.plausible) badges.push('Plausible');
  if (sources.uznel) badges.push('Uznel');
  if (sources.library) badges.push('Kutubxona');
  if (sources.manual) badges.push('Qo\'lda');
  return badges.join(', ');
};

const getErrorSummary = (result) => {
  if (!result.metrics || !result.metrics.errors || result.metrics.errors.length === 0) {
    return null;
  }
  
  const errors = result.metrics.errors;
  const errorTypes = {
    plausible: errors.filter(e => e.includes('Plausible')).length,
    uznel: errors.filter(e => e.includes('Uznel')).length,
    library: errors.filter(e => e.includes('Kutubxona') || e.includes('integratsiya')).length
  };
  
  return errorTypes;
};

const hasLibraryIntegration = (org) => {
  return org.libraryConfig && org.libraryConfig.isActive;
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Ma'lumot yig'ish paneli</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Barcha manbalardan avtomatik ma'lumot yig'ish va saqlash
        </p>
      </div>
    </div>

    <!-- Collection Controls -->
    <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Ma'lumot yig'ish sozlamalari</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        <div class="flex items-center space-y-2 flex-col justify-center">
          <div class="flex items-center">
            <Checkbox v-model="forceRefresh" inputId="forceRefresh" binary />
            <label for="forceRefresh" class="ml-2 text-sm">Cache'ni yangilash</label>
          </div>
        </div>
      </div>

      <!-- Data Source Options -->
      <div class="mb-6">
        <h3 class="text-md font-medium mb-3">Ma'lumot manbalari</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex items-center">
            <Checkbox v-model="collectOptions.plausible" inputId="plausible" binary />
            <label for="plausible" class="ml-2 text-sm">
              <i class="pi pi-chart-line mr-1"></i>
              Plausible Analytics
            </label>
          </div>
          
          <div class="flex items-center">
            <Checkbox v-model="collectOptions.uznel" inputId="uznel" binary />
            <label for="uznel" class="ml-2 text-sm">
              <i class="pi pi-comments mr-1"></i>
              Uznel (Interaktiv xizmatlar)
            </label>
          </div>
          
          <div class="flex items-center">
            <Checkbox v-model="collectOptions.manual" inputId="manual" binary />
            <label for="manual" class="ml-2 text-sm">
              <i class="pi pi-pencil mr-1"></i>
              Qo'lda kiritilgan ma'lumotlarni qayta yozish
            </label>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <Button
          label="Barcha ma'lumotlarni yig'ish"
          icon="pi pi-download"
          @click="collectAllData"
          :loading="isFetching"
          class="bg-blue-600 hover:bg-blue-700"
        />
      </div>
    </div>

    <!-- Organizations Overview -->
    <div v-if="organizations.length > 0" class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Tashkilotlar ro'yxati</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="org in organizations" :key="org._id" class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 class="font-medium text-sm mb-2">{{ org.name }}</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">{{ org.url }}</p>
          <div class="text-xs space-y-1">
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {{ org.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] }}
            </span>
            <div v-if="hasLibraryIntegration(org)" class="flex items-center">
              <i class="pi pi-check-circle text-green-500 mr-1"></i>
              <span class="text-green-600">Kutubxona integratsiyasi</span>
            </div>
            <div v-else class="flex items-center">
              <i class="pi pi-times-circle text-gray-400 mr-1"></i>
              <span class="text-gray-500">Uznel faqat</span>
            </div>
          </div>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uznel</th>
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
              <td class="px-6 py-4 text-sm">{{ entry.metrics.interactiveServiceUsage }}</td>
              <td class="px-6 py-4 text-sm">{{ formatDate(entry.lastUpdated) }}</td>
              <td class="px-6 py-4 text-sm">{{ entry.ageHours }} soat</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Collection Results -->
    <div v-if="fetchResults" class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
      <h2 class="text-lg font-semibold mb-4">Yig'ish natijalari</h2>
      
      <div class="mb-4">
        <p class="text-sm text-gray-600">
          {{ getMonthName(fetchResults.month) }} {{ fetchResults.year }} uchun {{ fetchResults.processed }} ta tashkilot qayta ishlandi
        </p>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-green-600">{{ fetchResults.stats?.successful || 0 }}</div>
          <div class="text-sm text-gray-600">Muvaffaqiyatli</div>
        </div>
        
        <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-red-600">{{ fetchResults.stats?.failed || 0 }}</div>
          <div class="text-sm text-gray-600">Xatolik</div>
        </div>
        
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-blue-600">{{ fetchResults.stats?.plausibleCount || 0 }}</div>
          <div class="text-sm text-gray-600">Plausible</div>
        </div>
        
        <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-purple-600">{{ fetchResults.stats?.bbsCount || 0 }}</div>
          <div class="text-sm text-gray-600">Uznel</div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tashkilot</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manba</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ball</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tashrif</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sahifalar</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uznel</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Xatoliklar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="result in fetchResults.results" :key="result.organization">
              <td class="px-6 py-4 text-sm font-medium">
                {{ result.organization }}
                <div class="text-xs text-gray-500">{{ result.url }}</div>
                <div v-if="!hasLibraryIntegration(organizations.find(o => o.name === result.organization))" 
                     class="text-xs text-orange-600 mt-1">
                  <i class="pi pi-exclamation-triangle mr-1"></i>
                  Kutubxona integratsiyasi sozlanmagan
                </div>
              </td>
              <td class="px-6 py-4 text-sm" :class="getStatusColor(result.status)">
                {{ result.status === 'success' ? 'Muvaffaqiyatli' : 'Xato' }}
                <div v-if="result.error" class="text-xs text-red-500">{{ result.error }}</div>
              </td>
              <td class="px-6 py-4 text-sm">
                <span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                  {{ getDataSourceBadge(result.sources || {}) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm font-bold">{{ result.score || '-' }}</td>
              <td class="px-6 py-4 text-sm">{{ result.metrics?.visitCount || '-' }}</td>
              <td class="px-6 py-4 text-sm">{{ result.metrics?.pageVisits || '-' }}</td>
              <td class="px-6 py-4 text-sm">{{ result.metrics?.interactiveServiceUsage || '-' }}</td>
              <td class="px-6 py-4 text-sm">
                <div v-if="result.metrics && result.metrics.errors && result.metrics.errors.length > 0">
                  <div v-for="error in result.metrics.errors" :key="error" class="text-xs text-red-600 mb-1">
                    <i class="pi pi-exclamation-circle mr-1"></i>
                    {{ error }}
                  </div>
                </div>
                <div v-else class="text-xs text-green-600">
                  <i class="pi pi-check mr-1"></i>
                  Xatolik yo'q
                </div>
              </td>
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
