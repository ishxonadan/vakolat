<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const router = useRouter();
const toast = useToast();
const assignments = ref(null);
const isLoading = ref(true);
const error = ref(null);
const assigningWebsites = ref(false);
const maxExpertsReached = ref(false);

// Fetch current user's rating assignments
const fetchAssignments = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await apiService.get('/ratings/assignments');
    
    // Check if max experts limit is reached
    if (!data.assigned && data.maxExpertsReached) {
      maxExpertsReached.value = true;
    } else {
      maxExpertsReached.value = false;
    }
    
    // If websites are assigned, fetch scores for rated websites
    if (data.assigned && data.websites) {
      const ratedWebsites = data.websites.filter(w => w.rated);
      
      // Fetch scores for each rated website
      for (const website of ratedWebsites) {
        try {
          const ratingData = await apiService.get(`/ratings/website/${website._id}`);
          website.score = ratingData.totalScore;
        } catch (err) {
          console.error(`Error fetching score for website ${website._id}:`, err);
        }
      }
    }
    
    assignments.value = data;
  } catch (err) {
    console.error('Error fetching assignments:', err);
    error.value = 'Baholash ma\'lumotlarini yuklashda xatolik yuz berdi.';
  } finally {
    isLoading.value = false;
  }
};

// Assign websites for rating
const assignWebsites = async () => {
  assigningWebsites.value = true;
  try {
    const data = await apiService.post('/ratings/assign');
    
    if (data.maxExpertsReached) {
      maxExpertsReached.value = true;
    }
    
    assignments.value = data;
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyatli',
      detail: 'Veb-saytlar baholash uchun tayinlandi',
      life: 3000
    });
  } catch (err) {
    console.error('Error assigning websites:', err);
    let errorMessage = 'Veb-saytlarni tayinlashda xatolik yuz berdi';
    if (err.error) {
      errorMessage = err.error;
    }
    
    // Check if the error is due to max experts reached
    if (err.maxExpertsReached) {
      maxExpertsReached.value = true;
    }
    
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: errorMessage,
      life: 3000
    });
  } finally {
    assigningWebsites.value = false;
  }
};

// Navigate to rate a specific website
const rateWebsite = (websiteId) => {
  router.push(`/rate-website/${websiteId}`);
};

onMounted(() => {
  fetchAssignments();
});

// Format date to display month and year
const formatDate = () => {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Veb-saytlarni baholash</h1>
      <div class="text-gray-600 dark:text-gray-300">{{ formatDate() }}</div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center p-8">
      <ProgressSpinner />
      <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
    </div>

    <div v-else-if="error" class="p-4 bg-red-50 text-red-700 rounded-lg">
      <p>{{ error }}</p>
      <Button label="Qayta urinish" icon="pi pi-refresh" class="mt-2" @click="fetchAssignments" />
    </div>

    <div v-else>
      <!-- No assignments yet -->
      <div v-if="!assignments.assigned" class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 text-center">
        <div class="mb-4">
          <i class="pi pi-star text-yellow-500 text-5xl"></i>
        </div>
        <h2 class="text-xl font-semibold mb-2">Bu oy uchun veb-saytlar tayinlanmagan</h2>
        
        <!-- Show different message when max experts reached -->
        <div v-if="maxExpertsReached">
          <p class="text-red-600 dark:text-red-400 mb-6">
            <i class="pi pi-exclamation-triangle mr-2"></i>
            Bu oy uchun 3 nafar ekspert allaqachon ovoz berishda qatnashgan. Tizim har oyda faqat 3 nafar ekspertdan baholash qabul qiladi. Iltimos, keyingi oyda qatnashing.
          </p>
        </div>
        <div v-else>
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Har oyda barcha veb-saytlarni baholash imkoniyatiga egasiz. Baholash uchun veb-saytlarni tayinlang.
          </p>
          <Button 
            label="Ovoz berish" 
            icon="pi pi-check-circle" 
            @click="assignWebsites" 
            :loading="assigningWebsites"
            class="p-button-lg"
          />
        </div>
      </div>

      <!-- Assignments available -->
      <div v-else class="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Bu oy uchun baholash</h2>
        
        <p v-if="assignments.completed" class="text-green-600 font-medium mb-4">
          <i class="pi pi-check-circle mr-2"></i>
          Siz bu oydagi barcha veb-saytlarni baholab bo'ldingiz!
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div 
            v-for="website in assignments.websites" 
            :key="website._id"
            class="border rounded-lg p-4 hover:shadow-md transition-shadow"
            :class="{'bg-green-50': website.rated}"
          >
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-medium text-lg">{{ website.name }}</h3>
              <div v-if="website.rated" class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Baholangan
              </div>
            </div>
            
            <div class="text-gray-600 dark:text-gray-300 mb-3 truncate">
              <a :href="website.url" target="_blank" class="hover:underline">{{ website.url }}</a>
            </div>

            <!-- Add score information for rated websites -->
            <div v-if="website.rated" class="text-gray-700 dark:text-gray-300 mb-3">
              <span class="font-medium">Ball: </span>
              <span>{{ website.score || 0 }}</span> / 52
            </div>
            
            <div class="flex justify-end">
              <Button 
                :label="website.rated ? 'Ko\'rish' : 'Baholash'" 
                :icon="website.rated ? 'pi pi-eye' : 'pi pi-star'" 
                @click="rateWebsite(website._id)" 
                :class="{'p-button-outlined': website.rated}"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

