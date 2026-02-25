<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import authService from '@/service/auth.service';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Tooltip from 'primevue/tooltip';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputSwitch from 'primevue/inputswitch';

const router = useRouter();
const toast = useToast();

const canView      = computed(() => authService.hasPermission('view_dissertations'))
const canAdd       = computed(() => authService.hasPermission('add_dissertation'))
const canEdit      = computed(() => authService.hasPermission('edit_dissertation'))
const canDelete    = computed(() => authService.hasPermission('delete_dissertation'))
const canDownload  = computed(() => authService.hasPermission('download_dissertation'))
const documents = ref([]);
const currentPage = ref(1);
const first = ref(0);
const rowsPerPage = 30;
const totalRecords = ref(0);
const isLoading = ref(false);
const error = ref(null);
const searchQuery = ref('');
let searchDebounce = null;

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authService.getToken()}`
})

const fetchData = async (page = 1) => {
  isLoading.value = true;
  error.value = null;
  try {
    const search = searchQuery.value.trim() || '';
    const url = `/api/diss_list/${page}${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    const data = await response.json();
    documents.value = data.results || [];
    totalRecords.value = data.total ?? 0;
    currentPage.value = page;
    first.value = (page - 1) * rowsPerPage;
  } catch (err) {
    console.error('Error fetching data:', err);
    error.value = 'Ma\'lumotlarni yuklashda xatolik. Iltimos, qayta urinib ko\'ring.';
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: error.value, 
      life: 3000 
    });
  } finally {
    isLoading.value = false;
  }
};

const onSearchInput = () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentPage.value = 1;
    first.value = 0;
    fetchData(1);
  }, 300);
};

onMounted(() => {
  fetchData(1);
});

const onPageChange = (event) => {
  const page = event.page + 1;
  first.value = event.first;
  fetchData(page);
};

const goToAddPage = () => {
  router.push('/diss/add');
};

const editButton = (uuid) => {
  router.push('/diss/edit/' + uuid);
};

const viewFile = (uuid) => {
  window.open(`/api/diss_file/${uuid}`, '_blank');
};

const toggleStatus = async (uuid, currentStatus, newValue) => {
  try {
    // newValue is true for enabled (is_deleted = 0), false for disabled (is_deleted = 1)
    const newStatus = newValue ? 0 : 1;
    const response = await fetch(`/api/diss_save/${uuid}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ is_deleted: newStatus })
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    // Update the local data
    const document = documents.value.find(doc => doc.uuid === uuid);
    if (document) {
      document.is_deleted = newStatus;
    }

    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: `Holat ${newStatus === 0 ? 'faollashtirildi' : 'o\'chirildi'}`,
      life: 3000
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Holatni o\'zgartirishda xatolik',
      life: 3000
    });
  }
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg" style="margin-bottom: 20px;">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Dissertatsiyalar</h1>
      <button v-if="canAdd" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all" @click="goToAddPage">
        Dissertatsiya qo'shish
      </button>
    </div>
    
    <div class="mb-4 bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md">
      <IconField iconPosition="left">
        <InputIcon class="pi pi-search" />
        <InputText 
          v-model="searchQuery" 
          @input="onSearchInput"
          placeholder="Shifr bo'yicha qidirish..." 
          class="w-full"
        />
      </IconField>
    </div>
    
    <div v-if="isLoading" class="flex justify-center items-center p-4">
      <ProgressSpinner />
    </div>
    
    <div v-if="error" class="flex justify-center items-center p-4">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>
    
    <DataTable 
      v-if="!isLoading && !error" 
      :value="documents" 
      :rows="rowsPerPage"
      :totalRecords="totalRecords"
      :lazy="true"
      :first="first"
      :paginator="true"
      @page="onPageChange"
      responsiveLayout="scroll"
      currentPageReportTemplate="{first} - {last} / {totalRecords}"
    >
      <Column field="title" header="Sarlavha" :sortable="true" style="width: 35%"></Column>
      <Column field="author" header="Muallif" :sortable="true" style="width: 20%"></Column>
      <Column field="code" header="Shifr" :sortable="true" style="width: 12%"></Column>
      <Column field="filename" header="Fayl" style="width: 10%">
        <template #body="slotProps">
          <Tag 
            :value="slotProps.data.filename ? 'Mavjud' : 'Mavjud emas'" 
            :severity="slotProps.data.filename ? 'success' : 'danger'" 
          />
        </template>
      </Column>
      <Column v-if="canDelete" field="is_deleted" header="Holat" style="width: 10%">
        <template #body="slotProps">
          <InputSwitch
            :modelValue="slotProps.data.is_deleted === 0"
            @update:modelValue="toggleStatus(slotProps.data.uuid, slotProps.data.is_deleted, $event)"
            class="custom-switch"
          />
        </template>
      </Column>
      <Column style="width: 13%" header="Amallar">
        <template #body="slotProps">
          <div class="flex gap-1">
            <Button
              v-if="canEdit"
              icon="pi pi-pencil"
              type="button"
              class="p-button-text p-button-sm"
              @click="editButton(slotProps.data.uuid)"
              v-tooltip="'Tahrirlash'"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
:deep(.p-inputswitch) {
  @apply scale-110;
}

:deep(.p-inputswitch .p-inputswitch-slider) {
  @apply shadow-md;
}

:deep(.p-inputswitch.p-inputswitch-checked .p-inputswitch-slider) {
  @apply bg-green-500;
}

:deep(.p-inputswitch:not(.p-inputswitch-checked) .p-inputswitch-slider) {
  @apply bg-gray-400;
}
</style>
