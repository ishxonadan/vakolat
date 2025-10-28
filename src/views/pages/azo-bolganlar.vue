<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const router = useRouter();
const toast = useToast();

const members = ref([]);
const totalRecords = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const rowsPerPage = ref(50);

// Filters
const searchQuery = ref('');
const selectedStatus = ref(null);
const selectedPosition = ref(null);

// Sorting
const sortField = ref('INSERT_DATE');
const sortOrder = ref(-1); // -1 for descending, 1 for ascending

// Statistics
const stats = ref({
  total: 0,
  active: 0,
  byPosition: []
});

const statusOptions = [
  { label: 'Hammasi', value: null },
  { label: 'Faol', value: '0001' },
  { label: 'Nofaol', value: '0002' }
];

const fetchMembers = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: rowsPerPage.value,
      search: searchQuery.value,
      sortField: sortField.value,
      sortOrder: sortOrder.value === 1 ? 'asc' : 'desc'
    };

    const response = await apiService.get('/members', { params });
    members.value = response.members;
    totalRecords.value = response.total;
  } catch (error) {
    console.error('Error fetching members:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Ma\'lumotlarni yuklashda xatolik yuz berdi',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const response = await apiService.get('/members/stats/summary');
    stats.value = response;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

onMounted(() => {
  fetchMembers();
  fetchStats();
});

const onPageChange = (event) => {
  currentPage.value = event.page + 1;
  rowsPerPage.value = event.rows;
  fetchMembers();
};

const onSort = (event) => {
  sortField.value = event.sortField;
  sortOrder.value = event.sortOrder;
  fetchMembers();
};

const onSearch = () => {
  currentPage.value = 1;
  fetchMembers();
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedStatus.value = null;
  selectedPosition.value = null;
  currentPage.value = 1;
  fetchMembers();
};

const formatDate = (dateString) => {
  if (!dateString || dateString.length !== 8) return dateString;
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  return `${day}.${month}.${year}`;
};

const getStatusSeverity = (statusCode) => {
  return statusCode === '0001' ? 'success' : 'danger';
};

const getStatusLabel = (statusCode) => {
  return statusCode === '0001' ? 'Faol' : 'Nofaol';
};
</script>

<template>
  <div class="members-page">
    <!-- Header with Statistics -->
    <div class="header-section" v-if="false">
      <div class="header-content">
        <h1 class="page-title">A'zo bo'lganlar</h1>
        <div class="stats-cards">
          <div class="stat-card">
            <i class="pi pi-users stat-icon"></i>
            <div class="stat-content">
              <span class="stat-label">Jami a'zolar</span>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
          </div>
          <div class="stat-card active">
            <i class="pi pi-check-circle stat-icon"></i>
            <div class="stat-content">
              <span class="stat-label">Faol a'zolar</span>
              <span class="stat-value">{{ stats.active }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Added simple header without stats -->
    <div class="simple-header">
      <h1 class="page-title">A'zo bo'lganlar</h1>
    </div>

    <!-- Filters Section -->
    <div class="filters-section">
      <div class="filter-group">
        <!-- Updated placeholder to include birthday and address -->
        <span class="p-input-icon-left search-input">
          <i class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="Ism, karta, telefon, tug'ilgan sana, manzil bo'yicha qidirish..."
            @keyup.enter="onSearch"
            @input="onSearch"
            class="w-full"
          />
        </span>
        <Button
          label="Qidirish"
          icon="pi pi-search"
          @click="onSearch"
          class="search-button"
        />
        <Button
          label="Tozalash"
          icon="pi pi-filter-slash"
          @click="clearFilters"
          severity="secondary"
          outlined
        />
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-section">
      <DataTable
        :value="members"
        :loading="loading"
        :paginator="true"
        :rows="rowsPerPage"
        :totalRecords="totalRecords"
        :lazy="true"
        @page="onPageChange"
        @sort="onSort"
        :rowsPerPageOptions="[25, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="{first} dan {last} gacha, jami {totalRecords} ta"
        responsiveLayout="scroll"
        class="members-table"
      >
        <Column field="USER_NO" header="Foydalanuvchi №" :sortable="true" style="min-width: 150px">
          <template #body="slotProps">
            <span class="font-semibold">{{ slotProps.data.USER_NO }}</span>
          </template>
        </Column>
        
        <Column field="USER_NAME" header="F.I.O" :sortable="true" style="min-width: 200px">
          <template #body="slotProps">
            <div class="user-info">
              <span class="user-name">{{ slotProps.data.USER_NAME }}</span>
              <span class="user-position">{{ slotProps.data.USER_POSITION }}</span>
            </div>
          </template>
        </Column>

        <Column field="CARD_NO" header="Karta raqami" :sortable="true" style="min-width: 150px">
          <template #body="slotProps">
            <Tag :value="slotProps.data.CARD_NO" severity="info" />
          </template>
        </Column>

        <Column field="TEL_NO" header="Telefon" style="min-width: 130px">
          <template #body="slotProps">
            <span v-if="slotProps.data.TEL_NO">
              <i class="pi pi-phone mr-2"></i>{{ slotProps.data.TEL_NO }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </Column>

        <Column field="BIRTHDAY" header="Tug'ilgan sana" :sortable="true" style="min-width: 130px">
          <template #body="slotProps">
            {{ formatDate(slotProps.data.BIRTHDAY) }}
          </template>
        </Column>

        <Column field="ADDRS" header="Manzil" style="min-width: 200px">
          <template #body="slotProps">
            <span class="address-text">{{ slotProps.data.ADDRS || '-' }}</span>
          </template>
        </Column>

        <Column field="INSERT_DATE" header="Ro'yxatdan o'tgan" :sortable="true" style="min-width: 130px">
          <template #body="slotProps">
            {{ formatDate(slotProps.data.INSERT_DATE) }}
          </template>
        </Column>

        <Column field="STATUS_CODE" header="Holat" :sortable="true" style="min-width: 100px">
          <template #body="slotProps">
            <Tag 
              :value="getStatusLabel(slotProps.data.STATUS_CODE)" 
              :severity="getStatusSeverity(slotProps.data.STATUS_CODE)"
            />
          </template>
        </Column>

        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users empty-icon"></i>
            <p>Ma'lumot topilmadi</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.members-page {
  padding: 1.5rem;
}

.header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.page-title {
  color: white;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.stats-cards {
  display: flex;
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 180px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.stat-card.active {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.3);
}

.stat-icon {
  font-size: 2rem;
  color: white;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-value {
  color: white;
  font-size: 1.75rem;
  font-weight: 700;
}

.filters-section {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-group {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 300px;
}

.search-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.table-section {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: #2c3e50;
}

.user-position {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.address-text {
  font-size: 0.875rem;
  color: #555;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.simple-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.simple-header .page-title {
  color: white;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-cards {
    width: 100%;
    flex-direction: column;
  }

  .stat-card {
    width: 100%;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }
}
</style>
