<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const toast = useToast();
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

// Toggle account lock (activate / lock)
const toggleUserStatus = async (user) => {
  try {
    const newStatus = user.isActive === false;
    await apiService.put(`/experts/${user._id}`, { isActive: newStatus });
    user.isActive = newStatus;
    const statusText = newStatus ? 'Faollashtirildi' : 'Hisob qulflandi';
    toast.add({ severity: 'success', summary: 'Muvaffaqiyat', detail: statusText, life: 3000 });
    fetchData(currentPage.value);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Xato', detail: err?.message || 'Holatni o\'zgartirishda xatolik', life: 3000 });
  }
};

// Function to login as expert (impersonate)
const loginAsExpert = async (expert) => {
  try {
    const response = await apiService.post('/admin/login-as-expert', {
      expertId: expert._id,
    })

    if (response && response.token && response.user) {
      // Save current (superuser) session so we can restore on exit
      localStorage.setItem('isImpersonating', 'true')
      localStorage.setItem(
        'originalUser',
        JSON.stringify({
          token: authService.getToken(),
          user: authService.getUser(),
          permissions: authService.getPermissions(),
        })
      )

      // Switch to expert: token, user, and expert's permissions (for menu)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      const perms = Array.isArray(response.permissions) ? response.permissions : []
      localStorage.setItem('permissions', JSON.stringify(perms))

      window.location.href = '/'
    }
  } catch (error) {
    console.error('Error logging in as expert:', error)
  }
}

// View audit logs for a specific vakil (superuser only)
const viewLogs = (expert) => {
  router.push({
    path: '/vakillar/logs',
    query: { userId: expert._id }
  })
}
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
      <p>Ma'lumotlar yuklanmoqda...</p>
    </div>
    <div v-if="error" class="flex justify-center items-center p-4">
      <p>{{ error }}</p>
    </div>
    <DataTable v-if="!isLoading && !error" :value="products" :rows="100" :paginator="false" :page="currentPage - 1" responsiveLayout="scroll">
      <Column field="nickname" header="Login" :sortable="true" style="width: 15%">
        <template #body="slotProps">
          <span :class="{'text-red-600': !slotProps.data.isActive}">
            {{ slotProps.data.nickname }}
          </span>
        </template>
      </Column>
      <Column field="firstname" header="Ismi" :sortable="true" style="width: 15%"></Column>
      <Column field="lastname" header="Sharifi" :sortable="true" style="width: 15%"></Column>
      <Column field="position" header="Lavozimi" :sortable="true" style="width: 15%"></Column>
      <Column field="permissionGroup" header="Huquq guruhi" style="width: 15%">
        <template #body="slotProps">
          <Tag v-if="slotProps.data.permissionGroup" 
               :value="slotProps.data.permissionGroup.name" 
               severity="info" />
          <span v-else class="text-gray-400">Belgilanmagan</span>
        </template>
      </Column>
      <Column field="isActive" header="Holat" style="width: 12%">
        <template #body="slotProps">
          <Button 
            :icon="slotProps.data.isActive !== false ? 'pi pi-lock-open' : 'pi pi-lock'" 
            type="button" 
            class="vakil-status-lock p-button-rounded p-button-text"
            :class="slotProps.data.isActive !== false ? 'p-button-success' : 'p-button-danger'"
            @click="toggleUserStatus(slotProps.data)"
            v-tooltip="slotProps.data.isActive !== false ? 'Hisobni qulflash' : 'Hisobni faollashtirish'"
          />
        </template>
      </Column>
      <Column style="width: 10%" header="Amallar">
        <template #body="slotProps">
          <Button 
            icon="pi pi-pencil" 
            type="button" 
            class="p-button-text p-button-sm" 
            @click="editButton(slotProps.data._id)"
            v-tooltip="'Tahrirlash'"
          />
        </template>
      </Column>
      <!-- Add Login As / Logs column for superadmins -->
      <Column v-if="isSuperAdmin" style="width: 8%" header="Kirish / Loglar">
        <template #body="slotProps">
          <Button 
            icon="pi pi-user" 
            type="button" 
            class="p-button-text p-button-success p-button-sm" 
            @click="loginAsExpert(slotProps.data)"
            title="Ekspert sifatida kirish"
            :disabled="slotProps.data.isActive === false"
          />
          <Button
            icon="pi pi-history"
            type="button"
            class="p-button-text p-button-sm p-button-secondary ml-1"
            @click="viewLogs(slotProps.data)"
            title="Faoliyat loglarini ko'rish"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.vakil-status-lock :deep(.pi) {
  font-size: 1.35rem;
}
</style>
