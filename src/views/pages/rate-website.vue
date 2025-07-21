<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const websiteId = route.params.id;

const website = ref(null);
const criteria = ref(null);
const existingRating = ref(null);
const isLoading = ref(true);
const isSaving = ref(false);
const error = ref(null);
const comments = ref('');

// Initialize ratings object with all criteria set to false
const ratings = reactive({
  content: [],
  reliability: [],
  usability: [],
  search: [],
  documents: [],
  news: [],
  language: [],
  onlineBooks: [],
  regionalInfo: [],
  events: [],
  design: [],
  interactive: []
});

// Fetch website details and rating criteria
const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    // Fetch assignments to get website details
    const assignmentsData = await apiService.get('/ratings/assignments');
    
    if (!assignmentsData.assigned) {
      router.push('/rate');
      return;
    }
    
    website.value = assignmentsData.websites.find(w => w._id === websiteId);
    
    if (!website.value) {
      router.push('/rate');
      return;
    }
    
    // Fetch rating criteria
    const criteriaData = await apiService.get('/ratings/criteria');
    criteria.value = criteriaData;
    
    // Initialize ratings arrays based on criteria length
    Object.keys(criteria.value).forEach(category => {
      ratings[category] = Array(criteria.value[category].items.length).fill(false);
    });
    
    // If website is already rated, fetch existing rating
    if (website.value.rated) {
      try {
        const ratingData = await apiService.get(`/ratings/website/${websiteId}`);
        existingRating.value = ratingData;
        
        // Apply existing ratings
        Object.keys(ratingData.ratings).forEach(category => {
          if (Array.isArray(ratingData.ratings[category])) {
            ratings[category] = [...ratingData.ratings[category]];
          }
        });
        
        comments.value = ratingData.comments || '';
      } catch (err) {
        console.error('Error fetching existing rating:', err);
      }
    }
  } catch (err) {
    console.error('Error fetching data:', err);
    error.value = 'Ma\'lumotlarni yuklashda xatolik yuz berdi';
  } finally {
    isLoading.value = false;
  }
};

// Submit rating
const submitRating = async () => {
  isSaving.value = true;
  
  try {
    const response = await apiService.post(`/ratings/website/${websiteId}`, {
      ratings,
      comments: comments.value
    });
    
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyatli',
      detail: 'Baholash muvaffaqiyatli saqlandi',
      life: 3000
    });
    
    // Navigate back to ratings page after short delay
    setTimeout(() => {
      router.push('/rate');
    }, 1500);
  } catch (err) {
    console.error('Error submitting rating:', err);
    let errorMessage = 'Baholashni saqlashda xatolik yuz berdi';
    if (err.error) {
      errorMessage = err.error;
    }
    
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: errorMessage,
      life: 3000
    });
  } finally {
    isSaving.value = false;
  }
};

// Calculate total score
const calculateTotalScore = () => {
  let total = 0;
  Object.values(ratings).forEach(categoryRatings => {
    categoryRatings.forEach(rating => {
      if (rating) total++;
    });
  });
  return total;
};

// Calculate category score
const calculateCategoryScore = (category) => {
  return ratings[category].filter(Boolean).length;
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div>
    <div class="flex items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <Button icon="pi pi-arrow-left" class="p-button-text mr-2" @click="router.push('/rate')" />
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Veb-saytni baholash</h1>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center p-8">
      <ProgressSpinner />
      <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
    </div>

    <div v-else-if="error" class="p-4 bg-red-50 text-red-700 rounded-lg">
      <p>{{ error }}</p>
      <Button label="Qayta urinish" icon="pi pi-refresh" class="mt-2" @click="fetchData" />
    </div>

    <div v-else-if="website && criteria" class="bg-white dark:bg-zinc-800 rounded-lg shadow-md">
      <!-- Website header -->
      <div class="p-6 border-b">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h2 class="text-2xl font-bold">{{ website.name }}</h2>
            <a :href="website.url" target="_blank" class="text-blue-600 hover:underline flex items-center mt-1">
              <i class="pi pi-external-link mr-1"></i>
              {{ website.url }}
            </a>
          </div>
          <div class="mt-4 md:mt-0">
            <div class="text-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <span class="text-gray-700 dark:text-gray-300">Umumiy ball:</span> 
              <span class="font-bold text-xl ml-2">{{ calculateTotalScore() }}</span> 
              <span class="text-gray-600 dark:text-gray-400">/ 52</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rating form -->
      <div class="p-6">
        <div v-for="(categoryData, categoryKey) in criteria" :key="categoryKey" class="mb-8">
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <h3 class="text-lg font-semibold">{{ categoryData.title }}</h3>
            <div class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Ball: {{ calculateCategoryScore(categoryKey) }} / {{ categoryData.items.length }}
            </div>
          </div>
          
          <div class="pl-4 border-l-2 border-gray-200">
            <div v-for="(item, index) in categoryData.items" :key="index" class="mb-3">
              <div class="flex items-start">
                <Checkbox 
                  v-model="ratings[categoryKey][index]" 
                  :binary="true" 
                  :inputId="`${categoryKey}-${index}`"
                  class="mt-1"
                />
                <label :for="`${categoryKey}-${index}`" class="ml-2 cursor-pointer">
                  {{ item }}
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Comments section -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">Izohlar</h3>
          <Textarea 
            v-model="comments" 
            rows="4" 
            class="w-full" 
            placeholder="Veb-sayt haqida qo'shimcha izohlaringizni kiriting..."
          />
        </div>
        
        <!-- Submit button -->
        <div class="flex justify-end">
          <Button 
            label="Saqlash" 
            icon="pi pi-check" 
            @click="submitRating" 
            :loading="isSaving"
            class="p-button-lg"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-checkbox) {
  width: 1.5rem;
  height: 1.5rem;
}

:deep(.p-checkbox .p-checkbox-box.p-highlight) {
  background-color: #4f46e5;
  border-color: #4f46e5;
}
</style>

