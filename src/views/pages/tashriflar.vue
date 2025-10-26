<script setup>
import { ref, onMounted } from 'vue';
import apiService from '@/service/api.service';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const visits = ref([]);
const loading = ref(false);
const totalRecords = ref(0);
const selectedVisits = ref([]);

const todayStats = ref({
  total: 0,
  unique: 0,
  current: 0,
});

const monthStats = ref({
  total: 0,
  unique: 0,
  average: 0,
});

const periodStats = ref(null);
const positionStats = ref([]);

const globalFilterValue = ref('');
const dateRange = ref(null);

const lazyParams = ref({
  first: 0,
  rows: 20,
  page: 1,
});

const fetchVisits = async () => {
  loading.value = true;
  try {
    const params = {
      page: lazyParams.value.page,
      limit: lazyParams.value.rows,
    };

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = formatDate(dateRange.value[0]);
      params.endDate = formatDate(dateRange.value[1]);
    }

    if (globalFilterValue.value) {
      params.search = globalFilterValue.value;
    }

    const response = await apiService.get('/visits', { params });
    visits.value = response.visits;
    totalRecords.value = response.pagination.total;
  } catch (error) {
    console.error('Error fetching visits:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Tashriflarni yuklashda xatolik yuz berdi',
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
};

const fetchTodayStats = async () => {
  try {
    const response = await apiService.get('/visits/stats/today');
    todayStats.value = response;
  } catch (error) {
    console.error('Error fetching today stats:', error);
  }
};

const fetchMonthStats = async () => {
  try {
    const response = await apiService.get('/visits/stats/month');
    monthStats.value = response;
  } catch (error) {
    console.error('Error fetching month stats:', error);
  }
};

const fetchPeriodStats = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    periodStats.value = null;
    positionStats.value = [];
    return;
  }

  try {
    const params = {
      startDate: formatDate(dateRange.value[0]),
      endDate: formatDate(dateRange.value[1]),
    };
    const response = await apiService.get('/visits/stats/period', { params });
    periodStats.value = response;
    
    const posResponse = await apiService.get('/visits/stats/positions', { params });
    positionStats.value = posResponse;
  } catch (error) {
    console.error('Error fetching period stats:', error);
  }
};

const onPage = (event) => {
  lazyParams.value = event;
  lazyParams.value.page = event.page + 1;
  fetchVisits();
};

const onDateRangeChange = () => {
  lazyParams.value.page = 1;
  lazyParams.value.first = 0;
  fetchVisits();
  fetchPeriodStats();
};

const clearDateRange = () => {
  dateRange.value = null;
  periodStats.value = null;
  positionStats.value = [];
  onDateRangeChange();
};

const onSearch = () => {
  lazyParams.value.page = 1;
  lazyParams.value.first = 0;
  fetchVisits();
};

const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const exportToExcel = () => {
  toast.add({
    severity: 'info',
    summary: 'Ma\'lumot',
    detail: 'Excel export funksiyasi tez orada qo\'shiladi',
    life: 3000,
  });
};

const getStatusSeverity = (ketdi) => {
  return ketdi ? 'success' : 'info';
};

const getStatusLabel = (ketdi) => {
  return ketdi ? 'Ketdi' : 'Kutubxonada';
};

onMounted(() => {
  fetchVisits();
  fetchTodayStats();
  fetchMonthStats();
  
  setInterval(fetchTodayStats, 60000);
});
</script>

<template>
  <div class="grid">
    <div class="col-12">
      <div class="grid">
        <div class="col-12 lg:col-4">
          <div class="card mb-0">
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Bugungi tashriflar</span>
                <div class="text-900 font-medium text-xl">{{ todayStats.total }}</div>
              </div>
              <div class="flex align-items-center justify-content-center bg-blue-100 border-round" style="width:2.5rem;height:2.5rem">
                <i class="pi pi-users text-blue-500 text-xl"></i>
              </div>
            </div>
            <span class="text-green-500 font-medium">{{ todayStats.unique }} noyob </span>
            <span class="text-500">| {{ todayStats.current }} hozir kutubxonada</span>
          </div>
        </div>

        <div class="col-12 lg:col-4">
          <div class="card mb-0">
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Shu oy</span>
                <div class="text-900 font-medium text-xl">{{ monthStats.total }}</div>
              </div>
              <div class="flex align-items-center justify-content-center bg-orange-100 border-round" style="width:2.5rem;height:2.5rem">
                <i class="pi pi-calendar text-orange-500 text-xl"></i>
              </div>
            </div>
            <span class="text-green-500 font-medium">{{ monthStats.unique }} noyob </span>
            <span class="text-500">| O'rtacha: {{ monthStats.average }}/kun</span>
          </div>
        </div>

        <div class="col-12 lg:col-4">
          <div class="card mb-0">
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Tanlangan davr</span>
                <div class="text-900 font-medium text-xl">{{ periodStats?.total || 0 }}</div>
              </div>
              <div class="flex align-items-center justify-content-center bg-cyan-100 border-round" style="width:2.5rem;height:2.5rem">
                <i class="pi pi-chart-line text-cyan-500 text-xl"></i>
              </div>
            </div>
            <span class="text-green-500 font-medium" v-if="periodStats">{{ periodStats.unique }} noyob </span>
            <span class="text-500" v-if="periodStats">| {{ periodStats.days }} kun, o'rtacha: {{ periodStats.average }}/kun</span>
            <span class="text-500" v-else>Davrni tanlang</span>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <div class="flex flex-column md:flex-row md:justify-content-between md:align-items-center">
          <h5 class="m-0">Tashriflar ro'yxati</h5>
          <div class="flex gap-2 mt-3 md:mt-0">
            <Calendar 
              v-model="dateRange" 
              selectionMode="range" 
              :manualInput="false"
              dateFormat="dd.mm.yy"
              placeholder="Davrni tanlang"
              @update:modelValue="onDateRangeChange"
              showIcon
              class="w-full md:w-20rem"
            />
            <Button 
              icon="pi pi-times" 
              class="p-button-outlined p-button-secondary"
              @click="clearDateRange"
              v-tooltip.top="'Filtrni tozalash'"
              :disabled="!dateRange"
            />
            <Button 
              icon="pi pi-file-excel" 
              class="p-button-success"
              @click="exportToExcel"
              v-tooltip.top="'Excel ga eksport'"
            />
          </div>
        </div>

        <div v-if="positionStats.length > 0" class="mt-4">
          <h6>Lavozimlar bo'yicha statistika:</h6>
          <div class="grid">
            <div 
              v-for="(stat, index) in positionStats.slice(0, 5)" 
              :key="index"
              class="col-12 md:col-6 lg:col"
            >
              <div class="surface-card p-3 border-round">
                <div class="text-500 font-medium text-sm mb-2">{{ stat.position }}</div>
                <div class="text-900 font-bold text-xl">{{ stat.count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <DataTable
          v-model:selection="selectedVisits"
          :value="visits"
          :lazy="true"
          :paginator="true"
          :rows="lazyParams.rows"
          :totalRecords="totalRecords"
          :loading="loading"
          @page="onPage($event)"
          :rowsPerPageOptions="[10, 20, 50]"
          dataKey="_id"
          responsiveLayout="scroll"
          class="p-datatable-sm"
        >
          <template #header>
            <div class="flex justify-content-between">
              <span class="p-input-icon-left">
                <i class="pi pi-search" />
                <InputText 
                  v-model="globalFilterValue" 
                  placeholder="ID, ism yoki lavozim bo'yicha qidirish..." 
                  class="w-full"
                  @input="onSearch"
                />
              </span>
            </div>
          </template>

          <template #empty>
            <div class="text-center p-4">
              <i class="pi pi-inbox text-4xl text-400 mb-3"></i>
              <p class="text-500">Tashriflar topilmadi</p>
            </div>
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

          <Column field="userPhoto" header="Rasm" style="min-width: 100px">
            <template #body="slotProps">
              <img 
                v-if="slotProps.data.userPhoto" 
                :src="`data:image/jpeg;base64,${slotProps.data.userPhoto}`" 
                alt="User photo"
                class="border-circle"
                style="width: 50px; height: 50px; object-fit: cover"
              />
              <Avatar 
                v-else 
                icon="pi pi-user" 
                class="bg-primary"
                size="large"
                shape="circle"
              />
            </template>
          </Column>

          <Column field="id" header="ID" sortable style="min-width: 140px">
            <template #body="slotProps">
              <span class="font-mono">{{ slotProps.data.id }}</span>
            </template>
          </Column>

          <Column field="userName" header="F.I.O" sortable style="min-width: 200px">
            <template #body="slotProps">
              <div class="font-semibold">{{ slotProps.data.userName }}</div>
              <div class="text-sm text-500">{{ slotProps.data.userPosition }}</div>
            </template>
          </Column>

          <Column field="date" header="Sana" sortable style="min-width: 120px">
            <template #body="slotProps">
              {{ formatDisplayDate(slotProps.data.date) }}
            </template>
          </Column>

          <Column field="keldi" header="Kelgan vaqt" sortable style="min-width: 120px">
            <template #body="slotProps">
              <i class="pi pi-sign-in text-green-500 mr-2"></i>
              {{ slotProps.data.keldi }}
            </template>
          </Column>

          <Column field="ketdi" header="Ketgan vaqt" sortable style="min-width: 120px">
            <template #body="slotProps">
              <span v-if="slotProps.data.ketdi">
                <i class="pi pi-sign-out text-orange-500 mr-2"></i>
                {{ slotProps.data.ketdi }}
              </span>
              <Tag v-else severity="info" value="Kutubxonada"></Tag>
            </template>
          </Column>

          <Column field="duration" header="Davomiyligi" style="min-width: 150px">
            <template #body="slotProps">
              <span v-if="slotProps.data.ketdi" class="font-medium">
                {{ slotProps.data.duration }}
              </span>
              <span v-else class="text-500 italic">
                Davom etmoqda
              </span>
            </template>
          </Column>

          <Column field="ketdi" header="Holat" style="min-width: 130px">
            <template #body="slotProps">
              <Tag 
                :severity="getStatusSeverity(slotProps.data.ketdi)" 
                :value="getStatusLabel(slotProps.data.ketdi)"
              ></Tag>
            </template>
          </Column>

          <Column field="userTel" header="Telefon" style="min-width: 130px">
            <template #body="slotProps">
              <span v-if="slotProps.data.userTel">
                <i class="pi pi-phone mr-2"></i>
                {{ slotProps.data.userTel }}
              </span>
              <span v-else class="text-400">-</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.font-mono {
  font-family: 'Courier New', monospace;
}

:deep(.p-datatable) {
  .p-datatable-thead > tr > th {
    background: var(--surface-50);
  }
}
</style>
