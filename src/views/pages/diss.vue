<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Tooltip from 'primevue/tooltip';

const router = useRouter();
const toast = useToast();
const documents = ref([]);
const currentPage = ref(1);
const isLoading = ref(false);
const error = ref(null);

const fetchData = async (page = 1) => {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await fetch(`/diss_list/${page}`);
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    const data = await response.json();
    documents.value = data.results || [];
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

onMounted(() => {
  fetchData(currentPage.value);
});

const onPageChange = (event) => {
  currentPage.value = event.page + 1;
  fetchData(currentPage.value);
};

const goToAddPage = () => {
  router.push('/diss/add');
};

const editButton = (uuid) => {
  router.push('/diss/edit/' + uuid);
};

const viewFile = (uuid) => {
  window.open(`/diss_file/${uuid}`, '_blank');
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg" style="margin-bottom: 20px;">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Dissertatsiyalar</h1>
      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all" @click="goToAddPage">
        Dissertatsiya qo'shish
      </button>
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
      :rows="30" 
      :paginator="true" 
      :page="currentPage - 1" 
      @page="onPageChange"
      responsiveLayout="scroll"
    >
      <Column field="title" header="Sarlavha" :sortable="true" style="width: 40%"></Column>
      <Column field="author" header="Muallif" :sortable="true" style="width: 25%"></Column>
      <Column field="code" header="Kod" :sortable="true" style="width: 15%"></Column>
      <Column field="is_deleted" header="Holat" style="width: 10%">
        <template #body="slotProps">
          <Tag 
            :value="slotProps.data.is_deleted === 0 ? 'Faol' : 'O\'chirilgan'" 
            :severity="slotProps.data.is_deleted === 0 ? 'success' : 'danger'" 
          />
        </template>
      </Column>
      <Column style="width: 10%" header="Amallar">
        <template #body="slotProps">
          <div class="flex gap-1">
            <Button 
              icon="pi pi-pencil" 
              type="button" 
              class="p-button-text p-button-sm" 
              @click="editButton(slotProps.data.uuid)"
              v-tooltip="'Tahrirlash'"
            />
            <Button 
              icon="pi pi-file-pdf" 
              type="button" 
              class="p-button-text p-button-info p-button-sm" 
              @click="viewFile(slotProps.data.uuid)"
              v-tooltip="'Faylni ko\'rish'"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
