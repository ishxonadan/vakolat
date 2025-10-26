<script setup>
import { ref, onMounted } from 'vue';
import apiService from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import Checkbox from 'primevue/checkbox';

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
const selectAll = ref(false);

const lazyParams = ref({
  first: 0,
  rows: 20,
  page: 1,
});

// Mock data for testing when API is not available
const mockVisits = ref([
  {
    _id: '1',
    id: 'IQ1234567890',
    date: '2025-01-27',
    keldi: '09:30',
    ketdi: '17:45',
    duration: '8s 15m',
    userName: 'Aliyev Akbar',
    userPosition: 'Professor',
    userPhoto: null,
    userTel: '+998901234567',
  },
  {
    _id: '2',
    id: 'IQ1234567891',
    date: '2025-01-27',
    keldi: '10:15',
    ketdi: null,
    duration: null,
    userName: 'Karimova Malika',
    userPosition: 'Student',
    userPhoto: null,
    userTel: '+998907654321',
  },
  {
    _id: '3',
    id: 'IQ1234567892',
    date: '2025-01-26',
    keldi: '14:20',
    ketdi: '18:30',
    duration: '4s 10m',
    userName: 'Toshmatov Jasur',
    userPosition: 'Researcher',
    userPhoto: null,
    userTel: null,
  },
  {
    _id: '4',
    id: 'IQ1234567893',
    date: '2025-01-26',
    keldi: '11:00',
    ketdi: '16:30',
    duration: '5s 30m',
    userName: 'Nigmatova Feruza',
    userPosition: 'Assistant Professor',
    userPhoto: null,
    userTel: '+998905556667',
  },
  {
    _id: '5',
    id: 'IQ1234567894',
    date: '2025-01-25',
    keldi: '13:45',
    ketdi: '17:15',
    duration: '3s 30m',
    userName: 'Rahimov Sardor',
    userPosition: 'Graduate Student',
    userPhoto: null,
    userTel: '+998904445556',
  },
  {
    _id: '6',
    id: 'IQ1234567895',
    date: '2025-01-25',
    keldi: '09:00',
    ketdi: null,
    duration: null,
    userName: 'Yusupova Dilnoza',
    userPosition: 'Lecturer',
    userPhoto: null,
    userTel: null,
  },
  {
    _id: '7',
    id: 'IQ1234567896',
    date: '2025-01-24',
    keldi: '15:30',
    ketdi: '18:45',
    duration: '3s 15m',
    userName: 'Kamilov Rustam',
    userPosition: 'Senior Researcher',
    userPhoto: null,
    userTel: '+998903334445',
  },
  {
    _id: '8',
    id: 'IQ1234567897',
    date: '2025-01-24',
    keldi: '10:30',
    ketdi: '14:20',
    duration: '3s 50m',
    userName: 'Sobirova Madina',
    userPosition: 'PhD Student',
    userPhoto: null,
    userTel: '+998902223334',
  },
]);

const mockTodayStats = {
  total: 15,
  unique: 12,
  current: 3,
};

const mockMonthStats = {
  total: 450,
  unique: 380,
  average: 15,
};

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
    console.error('Error fetching visits, using mock data:', error);
    // Use mock data when API fails
    let filteredVisits = [...mockVisits.value];

    // Apply search filter
    if (globalFilterValue.value) {
      const searchTerm = globalFilterValue.value.toLowerCase();
      filteredVisits = filteredVisits.filter(visit =>
        visit.id.toLowerCase().includes(searchTerm) ||
        visit.userName.toLowerCase().includes(searchTerm) ||
        visit.userPosition.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const start = (lazyParams.value.page - 1) * lazyParams.value.rows;
    const end = start + lazyParams.value.rows;
    visits.value = filteredVisits.slice(start, end);
    totalRecords.value = filteredVisits.length;

    toast.add({
      severity: 'warn',
      summary: 'Mock ma\'lumotlar',
      detail: 'API ishlamayotgani uchun test ma\'lumotlari ko\'rsatilmoqda',
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
    console.error('Error fetching today stats, using mock data:', error);
    // Use mock data when API fails
    todayStats.value = { ...mockTodayStats };
  }
};

const fetchMonthStats = async () => {
  try {
    const response = await apiService.get('/visits/stats/month');
    monthStats.value = response;
  } catch (error) {
    console.error('Error fetching month stats, using mock data:', error);
    // Use mock data when API fails
    monthStats.value = { ...mockMonthStats };
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
  lazyParams.value.first = event.first;
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

// Watch for search input changes and trigger search
const searchVisits = () => {
  if (globalFilterValue.value.trim() === '') {
    // If search is empty, show all data
    lazyParams.value.page = 1;
    lazyParams.value.first = 0;
    fetchVisits();
    return;
  }

  // Filter mock data based on search term
  const searchTerm = globalFilterValue.value.toLowerCase();
  const filteredVisits = mockVisits.value.filter(visit =>
    visit.id.toLowerCase().includes(searchTerm) ||
    visit.userName.toLowerCase().includes(searchTerm) ||
    visit.userPosition.toLowerCase().includes(searchTerm)
  );

  // Apply pagination to filtered results
  const start = (lazyParams.value.page - 1) * lazyParams.value.rows;
  const end = start + lazyParams.value.rows;
  visits.value = filteredVisits.slice(start, end);
  totalRecords.value = filteredVisits.length;

  // Show notification that search is working with mock data
  if (filteredVisits.length === 0) {
    toast.add({
      severity: 'info',
      summary: 'Qidiruv natijasi',
      detail: `"${globalFilterValue.value}" so'ziga mos keladigan tashriflar topilmadi`,
      life: 3000,
    });
  }
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

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedVisits.value = [...visits.value];
  } else {
    selectedVisits.value = [];
  }
};

onMounted(() => {
  fetchVisits();
  fetchTodayStats();
  fetchMonthStats();

  setInterval(fetchTodayStats, 60000);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
    <!-- Hero Section with Stats -->
    <div class="stats-section mb-6">
      <div class="stats-grid">
        <div class="stats-card today-card">
          <div class="stats-header">
            <div class="stats-icon-wrapper today-icon">
              <i class="pi pi-users"></i>
            </div>
            <div class="stats-content">
              <div class="stats-title">Bugungi tashriflar</div>
              <div class="stats-value">{{ todayStats.total }}</div>
            </div>
          </div>
          <div class="stats-footer">
            <div class="stats-detail">
              <i class="pi pi-star text-yellow-500"></i>
              <span>{{ todayStats.unique }} noyob</span>
            </div>
            <div class="stats-detail">
              <i class="pi pi-clock text-green-500"></i>
              <span>{{ todayStats.current }} hozir kutubxonada</span>
            </div>
          </div>
        </div>

        <div class="stats-card month-card">
          <div class="stats-header">
            <div class="stats-icon-wrapper month-icon">
              <i class="pi pi-calendar"></i>
            </div>
            <div class="stats-content">
              <div class="stats-title">Shu oy</div>
              <div class="stats-value">{{ monthStats.total }}</div>
            </div>
          </div>
          <div class="stats-footer">
            <div class="stats-detail">
              <i class="pi pi-star text-yellow-500"></i>
              <span>{{ monthStats.unique }} noyob</span>
            </div>
            <div class="stats-detail">
              <i class="pi pi-chart-bar text-blue-500"></i>
              <span>O'rtacha: {{ monthStats.average }}/kun</span>
            </div>
          </div>
        </div>

        <div class="stats-card period-card">
          <div class="stats-header">
            <div class="stats-icon-wrapper period-icon">
              <i class="pi pi-chart-line"></i>
            </div>
            <div class="stats-content">
              <div class="stats-title">Tanlangan davr</div>
              <div class="stats-value">{{ periodStats?.total || 0 }}</div>
            </div>
          </div>
          <div class="stats-footer">
            <div class="stats-detail" v-if="periodStats">
              <i class="pi pi-star text-yellow-500"></i>
              <span>{{ periodStats.unique }} noyob</span>
            </div>
            <div class="stats-detail" v-if="periodStats">
              <i class="pi pi-calendar text-purple-500"></i>
              <span>{{ periodStats.days }} kun</span>
            </div>
            <div class="stats-detail no-data" v-else>
              <i class="pi pi-calendar-times text-gray-400"></i>
              <span>Davrni tanlang</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls Section -->
    <div class="col-12 mb-4">
      <div class="controls-card">
        <div class="controls-header">
          <div class="controls-title">
            <i class="pi pi-list"></i>
            <span>Tashriflar ro'yxati</span>
          </div>
          <div class="controls-actions">
            <div class="date-filter-wrapper">
              <Calendar
                v-model="dateRange"
                selectionMode="range"
                :manualInput="false"
                dateFormat="dd.mm.yy"
                placeholder="Davrni tanlang"
                @update:modelValue="onDateRangeChange"
                showIcon
                class="modern-calendar"
              />
              <Button
                icon="pi pi-times"
                class="p-button-outlined p-button-secondary clear-btn"
                @click="clearDateRange"
                v-tooltip.top="'Filtrni tozalash'"
                :disabled="!dateRange"
              />
            </div>
            <Button
              icon="pi pi-file-excel"
              class="p-button-success export-btn"
              @click="exportToExcel"
              v-tooltip.top="'Excel ga eksport'"
            >
              <span class="hidden md:inline ml-2">Export</span>
            </Button>
          </div>
        </div>

        <!-- Enhanced Position Statistics -->
        <div v-if="positionStats.length > 0" class="position-stats-section">
          <div class="position-stats-header">
            <i class="pi pi-chart-pie"></i>
            <span>Lavozimlar bo'yicha statistika</span>
          </div>
          <div class="position-stats-grid">
            <div
              v-for="(stat, index) in positionStats.slice(0, 6)"
              :key="index"
              class="position-stat-card"
              :class="`position-${index}`"
            >
              <div class="position-stat-content">
                <div class="position-stat-title">{{ stat.position }}</div>
                <div class="position-stat-value">{{ stat.count }}</div>
                <div class="position-stat-bar">
                  <div
                    class="position-stat-fill"
                    :style="{ width: `${Math.min((stat.count / Math.max(...positionStats.map(s => s.count))) * 100, 100)}%` }"
                  ></div>
                </div>
              </div>
              <div class="position-stat-icon">
                <i class="pi pi-users"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Data Table -->
    <div class="col-12">
      <div class="data-table-card">
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
          class="modern-datatable"
          :paginatorTemplate="'RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink'"
          currentPageReportTemplate="{first} - {last} / {totalRecords}"
        >
          <template #header>
            <div class="table-header">
              <div class="search-wrapper">
                <span class="p-input-icon-left search-input">
                  <i class="pi pi-search"></i>
                  <InputText
                    v-model="globalFilterValue"
                    placeholder="ID, ism yoki lavozim bo'yicha qidirish..."
                    class="modern-search"
                    @input="searchVisits"
                  />
                </span>
              </div>
              <div class="table-actions">
                <span class="total-count">
                  <i class="pi pi-info-circle"></i>
                  Jami: {{ totalRecords }} ta yozuv
                </span>
              </div>
            </div>
          </template>

          <template #empty>
            <div class="empty-state">
              <div class="empty-icon">
                <i class="pi pi-inbox"></i>
              </div>
              <div class="empty-title">Tashriflar topilmadi</div>
              <div class="empty-description">
                {{ globalFilterValue ? 'Qidiruv so\'ziga mos keladigan tashriflar yo\'q' : 'Hozircha tashriflar mavjud emas' }}
              </div>
            </div>
          </template>

          <template #loading>
            <div class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Yuklanmoqda...</span>
            </div>
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem" class="selection-column">
            <template #header>
              <Checkbox v-model="selectAll" @change="toggleSelectAll" />
            </template>
            <template #body="slotProps">
              <Checkbox v-model="selectedVisits" :value="slotProps.data" />
            </template>
          </Column>

          <Column field="userPhoto" header="Rasm" style="min-width: 100px" class="photo-column">
            <template #header>
              <div class="column-header">
                <i class="pi pi-user"></i>
                <span>Rasm</span>
              </div>
            </template>
            <template #body="slotProps">
              <div class="user-photo-wrapper">
                <img
                  v-if="slotProps.data.userPhoto"
                  :src="`data:image/jpeg;base64,${slotProps.data.userPhoto}`"
                  alt="User photo"
                  class="user-photo"
                />
                <Avatar
                  v-else
                  icon="pi pi-user"
                  class="user-avatar"
                  size="large"
                  shape="circle"
                />
              </div>
            </template>
          </Column>

          <Column field="id" header="ID" sortable style="min-width: 140px" class="id-column">
            <template #header>
              <div class="column-header">
                <i class="pi pi-id-card"></i>
                <span>ID</span>
              </div>
            </template>
            <template #body="slotProps">
              <span class="user-id">{{ slotProps.data.id }}</span>
            </template>
          </Column>

          <Column field="userName" header="F.I.O" sortable style="min-width: 200px" class="name-column">
            <template #header>
              <div class="column-header">
                <i class="pi pi-user"></i>
                <span>F.I.O</span>
              </div>
            </template>
            <template #body="slotProps">
              <div class="user-info">
                <div class="user-name">{{ slotProps.data.userName }}</div>
                <div class="user-position">{{ slotProps.data.userPosition }}</div>
              </div>
            </template>
          </Column>

          <Column field="date" header="Sana" sortable style="min-width: 120px" class="date-column">
            <template #header>
              <div class="column-header">
                <i class="pi pi-calendar"></i>
                <span>Sana</span>
              </div>
            </template>
            <template #body="slotProps">
              <div class="visit-date">
                <i class="pi pi-calendar text-blue-500"></i>
                <span>{{ formatDisplayDate(slotProps.data.date) }}</span>
              </div>
            </template>
          </Column>

          <Column field="keldi" header="Kelgan vaqt" sortable style="min-width: 120px" class="time-column">
            <template #header>
              <div class="column-header">
                <i class="pi pi-sign-in text-green-500"></i>
                <span>Kelgan</span>
              </div>
            </template>
            <template #body="slotProps">
              <div class="time-entry arrival">
                <i class="pi pi-sign-in text-green-500"></i>
                <span>{{ slotProps.data.keldi }}</span>
              </div>
            </template>
          </Column>

          <Column field="ketdi" header="Ketgan vaqt" sortable style="min-width: 120px" class="time-column">
            <template #header>
              <div class="column-header">
                <i class="pi pi-sign-out text-orange-500"></i>
                <span>Ketgan</span>
              </div>
            </template>
            <template #body="slotProps">
              <div v-if="slotProps.data.ketdi" class="time-entry departure">
                <i class="pi pi-sign-out text-orange-500"></i>
                <span>{{ slotProps.data.ketdi }}</span>
              </div>
              <Tag v-else severity="info" value="Kutubxonada" class="status-tag active"></Tag>
            </template>
          </Column>




        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* Modern Tashriflar Page Styles */

.font-mono {
  font-family: 'Courier New', monospace;
}

/* Background and Layout */
.min-h-screen {
  background-attachment: fixed;
}

/* Stats Section - Horizontal Layout */
.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  align-items: start;
}

/* Stats Cards */
.stats-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.stats-icon-wrapper {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  position: relative;

  i {
    z-index: 2;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
    backdrop-filter: blur(10px);
  }
}

.today-icon {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.month-icon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.period-icon {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.stats-content {
  flex: 1;
}

.stats-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
}

.stats-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stats-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;

  i {
    font-size: 1rem;
  }

  &.no-data {
    color: #9ca3af;
  }
}

/* Controls Section */
.controls-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.controls-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;

  i {
    color: #3b82f6;
    font-size: 1.5rem;
  }
}

.controls-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-filter-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clear-btn {
  border-radius: 8px;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.export-btn {
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);

  &:hover {
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    transform: translateY(-1px);
  }
}

/* Position Statistics */
.position-stats-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.position-stats-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #334155;

  i {
    color: #8b5cf6;
    font-size: 1.25rem;
  }
}

.position-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.position-stat-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #f59e0b, #ef4444, #10b981, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease-in-out infinite;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  &.position-0::before { animation-delay: 0s; }
  &.position-1::before { animation-delay: 0.5s; }
  &.position-2::before { animation-delay: 1s; }
  &.position-3::before { animation-delay: 1.5s; }
  &.position-4::before { animation-delay: 2s; }
  &.position-5::before { animation-delay: 2.5s; }
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.position-stat-content {
  margin-bottom: 0.75rem;
}

.position-stat-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.position-stat-value {
  font-size: 1.875rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.position-stat-bar {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.position-stat-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.8s ease;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}

.position-stat-icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 0.875rem;
}

/* Data Table */
.data-table-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.search-wrapper {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.total-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  background: #f8fafc;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;

  i {
    color: #3b82f6;
  }
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Modern Search Input */
:deep(.modern-search) {
  border-radius: 10px;
  border: 2px solid #e5e7eb;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: #fafafa;

  &:focus {
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

/* Modern Calendar */
:deep(.modern-calendar) {
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

/* Enhanced DataTable */
:deep(.modern-datatable) {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;

  .p-datatable-header {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem 1.5rem;
  }

  .p-datatable-thead > tr > th {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e2e8f0;
    border-top: none;
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1rem 0.75rem;

    &:first-child {
      border-top-left-radius: 8px;
    }

    &:last-child {
      border-top-right-radius: 8px;
    }
  }

  .p-datatable-tbody > tr {
    transition: all 0.2s ease;
    border-bottom: 1px solid #f3f4f6;

    &:hover {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      transform: scale(1.01);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .p-datatable-tbody > tr > td {
    padding: 1rem 0.75rem;
    border: none;
    font-size: 0.875rem;
  }

  .p-datatable-loading-overlay {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
  }
}

/* Column Headers */
.column-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  i {
    font-size: 1rem;
  }
}

/* User Photo */
.user-photo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-photo {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e5e7eb;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    transform: scale(1.1);
  }
}

.user-avatar {
  width: 70px !important;
  height: 70px !important;
  border: 3px solid #e5e7eb;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    transform: scale(1.1);
  }
}

/* User Info */
.user-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.user-position {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
}

/* Visit Date */
.visit-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
  background: #eff6ff;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #dbeafe;
}

/* Time Entries */
.time-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;

  &.arrival {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  &.departure {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }
}

/* Duration */
.duration-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #eff6ff;
  color: #1e40af;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #dbeafe;
  font-weight: 500;
}

.duration-ongoing {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f0fdf4;
  color: #166534;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  font-weight: 500;
}

.duration-text {
  font-weight: 600;
  font-size: 0.875rem;
}

/* Status Tags */
.status-tag {
  font-weight: 500;
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &.active {
    background: #dcfce7 !important;
    color: #166534 !important;
    border: 1px solid #bbf7d0 !important;
  }

  &.departed {
    background: #fef3c7 !important;
    color: #92400e !important;
    border: 1px solid #fde68a !important;
  }
}

/* Phone Display */
.phone-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f0fdf4;
  color: #166534;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  font-weight: 500;
  font-size: 0.875rem;
}

.no-data {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.875rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 2px dashed #cbd5e1;
}

.empty-icon {
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 0.875rem;
  color: #94a3b8;
  max-width: 300px;
  margin: 0 auto;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: #64748b;
  font-weight: 500;

  i {
    font-size: 2rem;
    color: #3b82f6;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .stats-card {
    padding: 1rem;
  }

  .stats-value {
    font-size: 2rem;
  }

  .controls-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .controls-actions {
    justify-content: space-between;
  }

  .table-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .search-wrapper {
    max-width: none;
  }

  .position-stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .min-h-screen {
    padding: 1rem;
  }

  .stats-card {
    padding: 0.75rem;
  }

  .stats-value {
    font-size: 1.5rem;
  }

  .controls-card,
  .data-table-card {
    padding: 1rem;
  }
}
</style>
