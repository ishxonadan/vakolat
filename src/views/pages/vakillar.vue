<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const products = ref([]);
const currentPage = ref(1);
const isLoading = ref(false);
const error = ref(null);

// Check if current user is superadmin (rais)
const isSuperAdmin = computed(() => {
  return authService.getUserLevel() === 'rais';
});

const fetchData = async (page = 1) => {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await apiService.get('/experts');
    console.log('Fetched Data:', data);
    products.value = data;
  } catch (err) {
    console.error('Error fetching data:', err);
    error.value = 'Error fetching data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData(currentPage.value);
});

const onPageChange = (event) => {
  currentPage.value = event.page + 1;  // Convert from 0-based to 1-based index
  fetchData(currentPage.value);
};

const goToAddPage = () => {
  router.push('/vakil_add');
};

const editButton = (itemId) => {
  router.push('/vakil_edit/' + itemId);
};

// Function to login as expert
const loginAsExpert = async (expert) => {
  try {
    console.log('Logging in as expert:', expert);
    
    // Call API to get token for expert
    const response = await apiService.post('/api/admin/login-as-expert', { 
      expertId: expert._id 
    });
    
    console.log('Login as expert response:', response);
    
    if (response && response.token) {
      // Store current user info and set impersonation
      localStorage.setItem('isImpersonating', 'true');
      localStorage.setItem('originalUser', JSON.stringify({
        id: authService.user?.id,
        nickname: authService.user?.nickname,
        firstname: authService.user?.firstname,
        lastname: authService.user?.lastname,
        level: authService.user?.level,
        token: authService.getToken()
      }));
      
      // Set the new token and user info
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Redirect to home page instead of reloading
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error logging in as expert:', error);
  }
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg" style="margin-bottom: 20px;">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Vakillar (Admin va Moderatorlar)</h1>
      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all" @click="goToAddPage">
        Vakil qo'shish
      </button>
    </div>
    <div v-if="isLoading" class="flex justify-center items-center p-4">
      <p>Ma'lumotlar yuklanvotti...</p>
    </div>
    <div v-if="error" class="flex justify-center items-center p-4">
      <p>{{ error }}</p>
    </div>
    <DataTable v-if="!isLoading && !error" :value="products" :rows="100" :paginator="false" :page="currentPage - 1" responsiveLayout="scroll">
      <Column field="nickname" header="Login" :sortable="true" style="width: 20%">
        <template #body="slotProps">
          <span :class="{'text-red-600': slotProps.data.is_deleted === 1}">
            {{ slotProps.data.nickname }}
          </span>
        </template>
      </Column>
      <Column field="firstname" header="Ismi" :sortable="true" style="width: 20%"></Column>
      <Column field="lastname" header="Sharifi" :sortable="true" style="width: 20%"></Column>
      <Column field="position" header="Lavozimi" :sortable="true" style="width: 20%"></Column>
      <Column style="width: 10%" header="O'zgartirish">
        <template #body="slotProps">
          <Button icon="pi pi-pencil" type="button" class="p-button-text" @click="editButton(slotProps.data._id)"></Button>
        </template>
      </Column>
      <!-- Add Login As column for superadmins -->
      <Column v-if="isSuperAdmin" style="width: 10%" header="Kirish">
        <template #body="slotProps">
          <Button 
            icon="pi pi-user" 
            type="button" 
            class="p-button-text p-button-success" 
            @click="loginAsExpert(slotProps.data)"
            title="Ekspert sifatida kirish"
          ></Button>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

