<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import apiService from '@/service/api.service';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const contestants = ref([]);
const isLoading = ref(true);
const globalFilter = ref('');

const fetchContestants = async () => {
  try {
    const data = await apiService.get('/contestants');
    contestants.value = data;
  } catch (error) {
    console.error('Error fetching contestants:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Saytlar ro\'yxatini yuklashda xatolik',
      life: 3000
    });
  } finally {
    isLoading.value = false;
  }
};

const addContestant = () => {
  router.push('/contestant-add');
};

const editContestant = (contestant) => {
  router.push(`/contestant-edit/${contestant._id}`);
};

const deleteContestant = (contestant) => {
  confirm.require({
    message: `"${contestant.name}" saytini o'chirishni tasdiqlaysizmi?`,
    header: 'O\'chirishni tasdiqlash',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Bekor qilish',
    acceptLabel: 'O\'chirish',
    accept: async () => {
      try {
        await apiService.delete(`/contestants/${contestant._id}`);
        toast.add({
          severity: 'success',
          summary: 'Muvaffaqiyat',
          detail: 'Sayt muvaffaqiyatli o\'chirildi',
          life: 3000
        });
        await fetchContestants();
      } catch (error) {
        console.error('Error deleting contestant:', error);
        toast.add({
          severity: 'error',
          summary: 'Xato',
          detail: 'Saytni o\'chirishda xatolik yuz berdi',
          life: 3000
        });
      }
    }
  });
};

const getLibraryStatusBadge = (contestant) => {
  if (contestant.libraryConfig && contestant.libraryConfig.isActive) {
    return {
      severity: 'success',
      value: 'Yoqilgan',
      icon: 'pi pi-check'
    };
  }
  return {
    severity: 'secondary',
    value: 'O\'chirilgan',
    icon: 'pi pi-times'
  };
};

const formatUrl = (url) => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
};

onMounted(() => {
  fetchContestants();
});
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Saytlar</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Tanlov ishtirokchisi saytlarini boshqarish
        </p>
      </div>
      <Button
        label="Yangi sayt qo'shish"
        icon="pi pi-plus"
        @click="addContestant"
      />
    </div>

    <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-md">
      <div class="p-4 border-b">
        <div class="flex justify-between items-center">
          <span class="p-input-icon-left w-full max-w-md">
            <i class="pi pi-search" />
            <InputText
              v-model="globalFilter"
              placeholder="Saytlarni qidirish..."
              class="w-full"
            />
          </span>
        </div>
      </div>

      <div v-if="isLoading" class="flex justify-center items-center p-8">
        <ProgressSpinner />
        <span class="ml-2">Ma'lumotlar yuklanmoqda...</span>
      </div>

      <DataTable
        v-else
        :value="contestants"
        :globalFilter="globalFilter"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[5, 10, 20, 50]"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        currentPageReportTemplate="{first} dan {last} gacha, jami {totalRecords} ta"
        class="p-datatable-sm"
      >
        <Column field="name" header="Sayt nomi" sortable>
          <template #body="{ data }">
            <div class="font-medium">{{ data.name }}</div>
          </template>
        </Column>

        <Column field="url" header="URL manzili" sortable>
          <template #body="{ data }">
            <a 
              :href="data.url" 
              target="_blank" 
              class="text-blue-600 hover:underline flex items-center"
            >
              <i class="pi pi-external-link mr-1 text-xs"></i>
              {{ formatUrl(data.url) }}
            </a>
          </template>
        </Column>

        <Column header="Kutubxona integratsiyasi" style="width: 200px">
          <template #body="{ data }">
            <div class="flex items-center">
              <Tag 
                :value="getLibraryStatusBadge(data).value"
                :severity="getLibraryStatusBadge(data).severity"
                :icon="getLibraryStatusBadge(data).icon"
                class="text-xs"
              />
            </div>
            <div v-if="data.libraryConfig && data.libraryConfig.isActive" class="text-xs text-gray-500 mt-1">
              {{ data.libraryConfig.region }}
            </div>
          </template>
        </Column>

        <Column header="Amallar" style="width: 150px">
          <template #body="{ data }">
            <div class="flex space-x-2">
              <Button
                icon="pi pi-pencil"
                class="p-button-sm p-button-text"
                @click="editContestant(data)"
                v-tooltip.top="'Tahrirlash'"
              />
              <Button
                icon="pi pi-trash"
                class="p-button-sm p-button-text p-button-danger"
                @click="deleteContestant(data)"
                v-tooltip.top="'O\'chirish'"
              />
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="text-center p-4">
            <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
            <p class="text-gray-500">Hech qanday sayt topilmadi</p>
            <Button
              label="Birinchi saytni qo'shish"
              icon="pi pi-plus"
              class="mt-4"
              @click="addContestant"
            />
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>
