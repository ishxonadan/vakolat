<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const results = ref(null);
const isLoading = ref(true);
const error = ref(null);
const debugInfo = ref(null);

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

// // Set default to June 2025 since that's when the so'rovnoma vote exists
// const selectedMonth = ref(6); // June
// const selectedYear = ref(2025); // 2025

const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(currentYear);

// Check if user is superadmin
const isSuperAdmin = computed(() => {
  return authService.getUserLevel() === 'rais';
});

onMounted(() => {
  if (!isSuperAdmin.value) {
    router.push('/');
    return;
  }
  fetchResults();
});

const fetchResults = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    console.log(`Fetching results for ${selectedMonth.value}/${selectedYear.value}`);
    const data = await apiService.get(`/api/admin/ratings/overall?month=${selectedMonth.value}&year=${selectedYear.value}`);
    console.log('Received data:', data);
    results.value = data;
    
    // Also fetch debug info about so'rovnoma votes for this specific month/year
    try {
      const debugData = await apiService.get(`/api/admin/debug/survey-votes?month=${selectedMonth.value}&year=${selectedYear.value}`);
      debugInfo.value = debugData;
      console.log('So\'rovnoma debug info:', debugData);
    } catch (debugError) {
      console.log('Could not fetch debug info:', debugError);
    }

    // Also fetch debug info for all so'rovnoma votes to see what's available
    try {
      const allDebugData = await apiService.get(`/api/admin/debug/survey-votes`);
      console.log('All so\'rovnoma votes:', allDebugData);
    } catch (debugError) {
      console.log('Could not fetch all debug info:', debugError);
    }
  } catch (err) {
    console.error('Error fetching results:', err);
    error.value = 'Natijalarni yuklashda xatolik yuz berdi';
  } finally {
    isLoading.value = false;
  }
};

const updatePeriod = () => {
  fetchResults();
};

// Get month name
const getMonthName = (monthNumber) => {
  const month = months.find(m => m.value === monthNumber);
  return month ? month.name : '';
};

// Format trend indicator
const getTrendIndicator = (trend) => {
  if (trend > 0) return '↑';
  if (trend < 0) return '↓';
  return '-';
};

const getTrendClass = (trend) => {
  if (trend > 0) return 'text-green-500';
  if (trend < 0) return 'text-red-500';
  return 'text-gray-500';
};

// Format score with dash for zero values
const formatScore = (score) => {
  return score > 0 ? score : '-';
};

// Get user score source label with participant count
const getUserScoreLabel = (org) => {
  if (org.userScoreSource === 'admin') {
    return 'Admin baholash';
  } else if (org.userScoreSource === 'sorovnoma') {
    return `${org.sorovnomaCount} ishtirokchi ovoz berdi`;
  } else {
    return 'Ma\'lumot yo\'q';
  }
};

// Get user score class for styling
const getUserScoreClass = (org) => {
  if (org.userScoreSource === 'admin') {
    return 'text-blue-600 dark:text-blue-400';
  } else if (org.userScoreSource === 'sorovnoma') {
    return 'text-green-600 dark:text-green-400';
  } else {
    return 'text-gray-400';
  }
};

// Extract domain from URL for display
const extractDomain = (url) => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Baholash jadvali</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Umumiy ball: Ekspert (52) + Avtomatik (33) + Foydalanuvchi (15) = 100 ball
        </p>
        <div v-if="debugInfo" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
          So'rovnoma ma'lumotlari: {{ debugInfo.totalVotes }} ta ovoz topildi ({{ getMonthName(selectedMonth) }} {{ selectedYear }})
        </div>
      </div>
      
      <div class="flex gap-4">
        <div class="flex items-center gap-2">
          <label for="month" class="text-sm font-medium text-gray-700 dark:text-gray-300">Oy:</label>
          <select 
            id="month" 
            v-model="selectedMonth" 
            class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1"
          >
            <option v-for="month in months" :key="month.value" :value="month.value">
              {{ month.name }}
            </option>
          </select>
        </div>
        
        <div class="flex items-center gap-2">
          <label for="year" class="text-sm font-medium text-gray-700 dark:text-gray-300">Yil:</label>
          <select 
            id="year" 
            v-model="selectedYear" 
            class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1"
          >
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        
        <button 
          @click="updatePeriod" 
          class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
        >
          Ko'rish
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center p-8">
      <i class="pi pi-spin pi-spinner text-4xl text-blue-500"></i>
      <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
    </div>

    <div v-else-if="error" class="flex justify-center items-center p-8 text-red-500">
      <i class="pi pi-exclamation-triangle mr-2"></i>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="results && results.organizations" class="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
      <div class="p-4 bg-blue-50 dark:bg-blue-900/20">
        <h2 class="text-lg font-semibold text-blue-800 dark:text-blue-300">
          {{ getMonthName(results.month) }} {{ results.year }} uchun baholash jadvali
        </h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tashkilot nomi
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ekspert baholash
                <div class="text-xs text-gray-400">(52)</div>
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Avtomatik baholash
                <div class="text-xs text-gray-400">(33)</div>
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Foydalanuvchi baholash
                <div class="text-xs text-gray-400">(15)</div>
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Umumiy ko'rsatkichlar
                <div class="text-xs text-gray-400">(100)</div>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="org in results.organizations" :key="org.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white">{{ org.name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ extractDomain(org.url) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="text-sm text-gray-900 dark:text-white">{{ formatScore(org.expertScore) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="text-sm text-gray-900 dark:text-white">{{ formatScore(org.autoScore) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ formatScore(org.userScore) }}
                </div>
                <div :class="getUserScoreClass(org)" class="text-xs">
                  {{ getUserScoreLabel(org) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center">
                  <span class="text-sm text-gray-900 dark:text-white mr-2">{{ formatScore(org.totalScore) }}</span>
                  <span :class="getTrendClass(org.trend)" class="font-bold">{{ getTrendIndicator(org.trend) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="results.organizations.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
        Bu davr uchun ma'lumotlar topilmadi.
      </div>
    </div>
    
    <div v-else class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
      Ma'lumotlar topilmadi.
    </div>

    <!-- Enhanced Debug information panel -->
    <div v-if="debugInfo" class="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">So'rovnoma Debug Ma'lumotlari</h3>
      <div class="text-xs text-gray-600 dark:text-gray-400">
        <p>{{ getMonthName(selectedMonth) }} {{ selectedYear }} uchun so'rovnoma ovozlari: {{ debugInfo.totalVotes }}</p>
        <div v-if="debugInfo.votes && debugInfo.votes.length > 0" class="mt-2">
          <p class="font-medium">Topilgan ovozlar:</p>
          <div class="max-h-40 overflow-y-auto bg-white dark:bg-gray-800 p-2 rounded border">
            <div v-for="vote in debugInfo.votes" :key="vote.fingerprint" class="text-xs py-1 border-b border-gray-200 dark:border-gray-700">
              <strong>{{ vote.domain }}</strong>: 
              Usability={{ vote.responses.usability }}, 
              Design={{ vote.responses.design }}, 
              Search={{ vote.responses.search }} 
              (Jami: {{ vote.responses.usability + vote.responses.design + vote.responses.search }})
              <br>
              <span class="text-gray-500">{{ new Date(vote.createdAt).toLocaleString() }}</span>
            </div>
          </div>
        </div>
        <div v-else class="mt-2 text-orange-600">
          Bu oy uchun so'rovnoma ovozlari topilmadi. Iyun 2025 ni sinab ko'ring.
        </div>
      </div>
    </div>
  </div>
</template>
