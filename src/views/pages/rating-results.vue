<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const results = ref(null);
const isLoading = ref(true);
const error = ref(null);
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

const currentYear = new Date().getFullYear();
const years = Array.from({length: 2070 - currentYear + 1}, (_, i) => currentYear + i);

const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(currentYear);

// Check if user is superadmin
const isSuperAdmin = computed(() => {
  return authService.getUserLevel() === 'rais';
});

// Redirect if not superadmin
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
    const data = await apiService.get(`/admin/ratings/results?month=${selectedMonth.value}&year=${selectedYear.value}`);
    results.value = data;
    console.log('Rating results:', data);
  } catch (err) {
    console.error('Error fetching results:', err);
    error.value = 'Natijalarni yuklashda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.';
  } finally {
    isLoading.value = false;
  }
};

const updatePeriod = () => {
  fetchResults();
};

// Format score as raw number (not percentage)
const formatScore = (score) => {
  return score;
};

// Calculate average score for a website (raw points, not percentage)
const calculateAverageScore = (website) => {
  if (!website.raters || website.raters.length === 0) return 0;
  
  const totalScore = website.raters.reduce((sum, rater) => sum + rater.score, 0);
  return Math.round(totalScore / website.raters.length);
};

// Get month name
const getMonthName = (monthNumber) => {
  const month = months.find(m => m.value === monthNumber);
  return month ? month.name : '';
};

// Get status class based on rating count
const getStatusClass = (raterCount) => {
  if (raterCount === 3) return 'bg-green-100 text-green-800';
  if (raterCount > 0) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
};

// Get status text based on rating count
const getStatusText = (raterCount) => {
  if (raterCount === 3) return 'To\'liq baholangan';
  if (raterCount > 0) return 'Qisman baholangan';
  return 'Baholanmagan';
};

// Get top rated websites
const getTopRatedWebsites = (count) => {
  if (!results.value || !results.value.websites) return [];
  
  // Filter fully rated websites and sort by total score
  const fullyRated = results.value.websites
    .filter(w => w.fullyRated)
    .sort((a, b) => b.totalScore - a.totalScore);
  
  return fullyRated.slice(0, count);
};

// Calculate average score across all fully rated websites (raw points)
const getOverallAverageScore = () => {
  if (!results.value || !results.value.websites) return 0;
  
  const fullyRated = results.value.websites.filter(w => w.fullyRated);
  if (fullyRated.length === 0) return 0;
  
  const totalScores = fullyRated.reduce((acc, website) => acc + website.totalScore, 0);
  const averageScore = Math.round(totalScores / (fullyRated.length * 3)); // Divide by number of websites * 3 experts
  
  return averageScore;
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Baholash natijalari</h1>
      
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
    
    <div v-else-if="results">
      <!-- Summary Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Jami saytlar</h3>
          <p class="text-2xl font-bold">{{ results.stats.totalWebsites }}</p>
        </div>
        
        <div class="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">To'liq baholangan</h3>
          <p class="text-2xl font-bold text-green-600">{{ results.stats.fullyRatedCount }}</p>
        </div>
        
        <div class="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Qisman baholangan</h3>
          <p class="text-2xl font-bold text-yellow-600">{{ results.stats.partiallyRatedCount }}</p>
        </div>
        
        <div class="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Baholanmagan</h3>
          <p class="text-2xl font-bold text-gray-600">{{ results.stats.notRatedCount }}</p>
        </div>
      </div>

      <!-- Add detailed summary after the statistics cards -->
      <div v-if="results.websites.length > 0 && results.stats.fullyRatedCount > 0" class="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md mb-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Baholash yakunlari</h3>
        
        <div class="space-y-4">
          <!-- Top rated websites -->
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Eng yuqori baholangan saytlar:</h4>
            <div class="space-y-2">
              <div v-for="(website, index) in getTopRatedWebsites(3)" :key="website._id" class="flex justify-between items-center">
                <div class="flex items-center">
                  <span class="text-lg font-bold mr-2" :class="{'text-yellow-500': index === 0, 'text-gray-400': index === 1, 'text-amber-600': index === 2}">
                    {{ index + 1 }}.
                  </span>
                  <span class="text-gray-900 dark:text-white">{{ website.name }}</span>
                </div>
                <span class="font-medium text-green-600">{{ Math.round(website.totalScore / 3) }} ball</span>
              </div>
            </div>
          </div>
          
          <!-- Average score -->
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">O'rtacha ball:</h4>
            <p class="text-xl font-bold text-blue-600">{{ getOverallAverageScore() }} ball</p>
          </div>
        </div>
      </div>
      
      <!-- Period Info -->
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
        <h2 class="text-lg font-semibold text-blue-800 dark:text-blue-300">
          {{ getMonthName(results.month) }} {{ results.year }} uchun baholash natijalari
        </h2>
      </div>
      
      <!-- Results Table -->
      <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sayt nomi
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                URL
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Holat
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ball
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Baholovchilar
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="website in results.websites" :key="website._id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 dark:text-white">{{ website.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <a :href="website.url" target="_blank" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  {{ website.url }}
                </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getStatusClass(website.raterCount)">
                  {{ getStatusText(website.raterCount) }} ({{ website.raterCount }}/3)
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium" :class="{'text-green-600': website.fullyRated, 'text-yellow-600': !website.fullyRated && website.raterCount > 0, 'text-gray-500': website.raterCount === 0}">
                  {{ website.fullyRated ? Math.round(website.totalScore / 3) : website.totalScore }} ball
                </div>
              </td>
              <td class="px-6 py-4">
                <div v-if="website.raters.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                  Baholovchilar yo'q
                </div>
                <div v-else class="space-y-1">
                  <div v-for="rater in website.raters" :key="rater.id" class="text-sm flex justify-between">
                    <span class="text-gray-900 dark:text-white">{{ rater.name }}</span>
                    <span class="text-gray-500 dark:text-gray-400 ml-4">{{ rater.score }} ball</span>
                  </div>
                  <!-- Add average score when fully rated -->
                  <div v-if="website.fullyRated" class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div class="text-sm flex justify-between font-medium">
                      <span class="text-gray-900 dark:text-white">O'rtacha ball:</span>
                      <span class="text-green-600 dark:text-green-400">{{ Math.round(website.totalScore / 3) }} ball</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- No Results Message -->
      <div v-if="results.websites.length === 0" class="text-center py-8">
        <p class="text-gray-500 dark:text-gray-400">Bu davr uchun natijalar topilmadi.</p>
      </div>
    </div>
  </div>
</template>

