<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import apiService from '@/service/api.service';
import { pageSize, ROWS_PER_PAGE_OPTIONS } from '@/service/pagination.service';

const route = useRoute();
const toast = useToast();

const logs = ref([]);
const loadingLogs = ref(false);
const total = ref(0);
const page = ref(1);

const stats = ref([]);
const loadingStats = ref(false);

const selectedUserId = ref(route.query.userId || null);

const loadLogs = async (pageValue = 1) => {
  try {
    loadingLogs.value = true;
    const params = {
      page: pageValue,
      limit: pageSize.value,
    };
    if (selectedUserId.value) {
      params.userId = selectedUserId.value;
    }
    const data = await apiService.get('/admin/audit-logs', { params });
    logs.value = data.items || [];
    total.value = data.total || 0;
    page.value = data.page || pageValue;
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: error.message || 'Audit loglarini yuklashda xatolik',
      life: 4000,
    });
  } finally {
    loadingLogs.value = false;
  }
};

const onPage = (event) => {
  if (event.rows != null && event.rows !== pageSize.value) {
    pageSize.value = event.rows;
    return;
  }
  page.value = event.page + 1;
  loadLogs(page.value);
};

watch(pageSize, () => {
  page.value = 1;
  loadLogs(1);
});

const loadStats = async () => {
  try {
    loadingStats.value = true;
    const params = {};
    if (selectedUserId.value) {
      params.userId = selectedUserId.value;
    }
    const data = await apiService.get('/admin/audit-stats', { params });
    stats.value = data.items || [];
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: error.message || 'Audit statistikalarini yuklashda xatolik',
      life: 4000,
    });
  } finally {
    loadingStats.value = false;
  }
};

const dissertationUsers = computed(() =>
  stats.value.filter((s) => s.totalDissertationActions > 0)
);
const ticketUsers = computed(() =>
  stats.value.filter((s) => s.totalTicketActions > 0)
);
const registrationUsers = computed(() =>
  stats.value.filter((s) => s.totalUserActions > 0)
);
const paymentUsers = computed(() =>
  stats.value.filter((s) => s.totalPaymentActions > 0)
);

const selectUserForLogs = (entry) => {
  if (!entry) return;
  selectedUserId.value = entry.userId;
  loadLogs(1);
};

const actionLabel = (action) => {
  switch (action) {
    case 'login':
      return 'Tizimga kirish';
    case 'logout':
      return 'Tizimdan chiqish';
    case 'add_dissertation':
      return "Dissertatsiya qo'shdi";
    case 'edit_dissertation':
      return 'Dissertatsiyani tahrirladi';
    case 'disable_dissertation':
      return "Dissertatsiyani blokladi (is_deleted = true)";
    case 'enable_dissertation':
      return "Dissertatsiyani faollashtirdi (is_deleted = false)";
    case 'view_dissertation_list':
      return "Dissertatsiyalar ro'yxatini ko'rdi";
    case 'view_dissertation_detail':
      return "Dissertatsiya ma'lumotini ko'rdi";
    case 'register_user':
      return "Foydalanuvchini ro'yxatga oldi";
    case 'edit_expert':
      return "Xodim ma'lumotlarini tahrirladi";
    case 'add_ticket':
      return "Bir martalik chipta yaratdi";
    case 'view_tickets':
      return "Bir martalik chiptalar ro'yxatini ko'rdi";
    case 'payment_topup':
      return "Foydalanuvchi balansini to'ldirdi";
    case 'payment_spend':
      return "Foydalanuvchi balansidan mablag' yechdi";
    case 'payment_service_create':
      return "Pullik xizmat qo'shdi";
    case 'payment_service_update':
      return "Pullik xizmatni tahrirladi";
    case 'payment_service_delete':
      return "Pullik xizmatni o'chirdi";
    case 'payment_service_provide':
      return "Xizmat ko'rsatib mablag' yechdi";
    case 'payment_service_cancel':
      return "Ko'rsatilgan xizmatni bekor qildi (refund)";
    case 'payment_department_create':
      return "Bo'lim qo'shdi";
    case 'payment_department_update':
      return "Bo'limni tahrirladi";
    case 'payment_department_delete':
      return "Bo'limni o'chirdi";
    case 'payment_user_department_add':
      return "Foydalanuvchiga bo'lim biriktirdi";
    case 'payment_user_department_remove':
      return "Foydalanuvchidan bo'lim biriktirmasini olib tashladi";
    case 'payment_view_transactions':
      return "To'lov tranzaksiyalarini ko'rdi";
    case 'payment_view_balances':
      return "Foydalanuvchi balanslarini ko'rdi";
    case 'payment_view_overview_stats':
      return "Pullik umumiy statistikasini ko'rdi";
    case 'payment_read_account':
      return "Bitta foydalanuvchi balansini ko'rdi";
    case 'payment_view_service_provisions':
      return "Xizmat ko'rsatish yozuvlarini ko'rdi";
    default:
      return action || '';
  }
};

onMounted(() => {
  loadLogs(1);
  loadStats();
});
</script>

<template>
  <div class="card vakil-logs-page">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold text-color">Xodimlar faoliyati</h1>
      <span v-if="selectedUserId" class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)]">
        Foydalanuvchi ID: {{ selectedUserId }}
      </span>
    </div>

    <TabView>
      <TabPanel header="Loglar">
        <DataTable
          :value="logs"
          :loading="loadingLogs"
          :rows="pageSize"
          :totalRecords="total"
          :paginator="true"
          lazy
          :first="(page - 1) * pageSize"
          :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS"
          @page="onPage"
          responsiveLayout="scroll"
        >
          <Column field="createdAt" header="Vaqt" style="width: 18%">
            <template #body="slotProps">
              {{ new Date(slotProps.data.createdAt).toLocaleString() }}
            </template>
          </Column>
          <Column field="user" header="Foydalanuvchi" style="width: 22%">
            <template #body="slotProps">
              <div v-if="slotProps.data.user">
                <div class="font-semibold text-color">{{ slotProps.data.user.nickname }}</div>
                <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">
                  {{ slotProps.data.user.firstname }} {{ slotProps.data.user.lastname }}
                </div>
              </div>
              <span v-else class="text-gray-400 dark:text-[var(--p-text-muted-color)] text-sm">Noma'lum</span>
            </template>
          </Column>
          <Column field="action" header="Amal" style="width: 22%">
            <template #body="slotProps">
              <div class="text-xs">
                <div class="font-semibold text-color">
                  {{ actionLabel(slotProps.data.action) }}
                </div>
                <div class="text-gray-500 dark:text-[var(--p-text-muted-color)] font-mono" v-if="slotProps.data.meta?.path">
                  {{ slotProps.data.meta.method }} {{ slotProps.data.meta.path }}
                </div>
              </div>
            </template>
          </Column>
          <Column field="meta" header="So'rov tafsilotlari" style="width: 38%">
            <template #body="slotProps">
              <div class="text-xs text-gray-700 dark:text-[var(--p-text-color)]">
                <div v-if="slotProps.data.meta?.query && Object.keys(slotProps.data.meta.query).length">
                  <span class="font-semibold text-color">Query:</span>
                  <span class="font-mono opacity-90">{{ JSON.stringify(slotProps.data.meta.query) }}</span>
                </div>
                <div v-if="slotProps.data.meta?.body && Object.keys(slotProps.data.meta.body).length" class="mt-1">
                  <span class="font-semibold text-color">Body:</span>
                  <span class="font-mono opacity-90">{{ JSON.stringify(slotProps.data.meta.body) }}</span>
                </div>
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <TabPanel header="Statistikalar">
        <!-- Registratsiya -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-2 text-color">Registratsiya</h2>
          <DataTable
            :value="registrationUsers"
            :loading="loadingStats"
            responsiveLayout="scroll"
          >
            <Column field="user" header="Foydalanuvchi" style="width: 40%">
              <template #body="slotProps">
                <div v-if="slotProps.data.user">
                  <div class="font-semibold cursor-pointer text-primary" @click="selectUserForLogs(slotProps.data)">
                    {{ slotProps.data.user.nickname }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">
                    {{ slotProps.data.user.firstname }} {{ slotProps.data.user.lastname }}
                  </div>
                </div>
                <span v-else class="text-gray-400 dark:text-[var(--p-text-muted-color)] text-sm">Noma'lum</span>
              </template>
            </Column>
            <Column field="registerUserCount" header="Ro'yxatga olgan foydalanuvchilar" style="width: 30%"></Column>
            <Column field="totalUserActions" header="Jami registratsiya amallari" style="width: 30%"></Column>
          </DataTable>
        </div>

        <!-- Bir martalik chipta -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-2 text-color">Bir martalik chipta</h2>
          <DataTable
            :value="ticketUsers"
            :loading="loadingStats"
            responsiveLayout="scroll"
          >
            <Column field="user" header="Foydalanuvchi" style="width: 40%">
              <template #body="slotProps">
                <div v-if="slotProps.data.user">
                  <div class="font-semibold cursor-pointer text-primary" @click="selectUserForLogs(slotProps.data)">
                    {{ slotProps.data.user.nickname }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">
                    {{ slotProps.data.user.firstname }} {{ slotProps.data.user.lastname }}
                  </div>
                </div>
                <span v-else class="text-gray-400 dark:text-[var(--p-text-muted-color)] text-sm">Noma'lum</span>
              </template>
            </Column>
            <Column field="addTicketCount" header="Yaratgan chiptalari" style="width: 30%"></Column>
            <Column field="totalTicketActions" header="Jami chipta amallari" style="width: 30%"></Column>
          </DataTable>
        </div>

        <!-- Dissertatsiya -->
        <div>
          <h2 class="text-lg font-semibold mb-2 text-color">Pullik xizmatlar</h2>
          <DataTable
            :value="paymentUsers"
            :loading="loadingStats"
            responsiveLayout="scroll"
            class="mb-6"
          >
            <Column field="user" header="Foydalanuvchi" style="width: 36%">
              <template #body="slotProps">
                <div v-if="slotProps.data.user">
                  <div class="font-semibold cursor-pointer text-primary" @click="selectUserForLogs(slotProps.data)">
                    {{ slotProps.data.user.nickname }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">
                    {{ slotProps.data.user.firstname }} {{ slotProps.data.user.lastname }}
                  </div>
                </div>
                <span v-else class="text-gray-400 dark:text-[var(--p-text-muted-color)] text-sm">Noma'lum</span>
              </template>
            </Column>
            <Column field="paymentTopupCount" header="To'ldirish" style="width: 8%"></Column>
            <Column field="paymentSpendCount" header="Yechish" style="width: 8%"></Column>
            <Column field="paymentServiceProvideCount" header="Xizmat ko'r." style="width: 9%"></Column>
            <Column field="paymentServiceCancelCount" header="Bekor" style="width: 8%"></Column>
            <Column field="paymentServiceCrudCount" header="Xizmat CRUD" style="width: 9%"></Column>
            <Column field="paymentDepartmentCount" header="Zal" style="width: 8%"></Column>
            <Column field="paymentUserDepartmentCount" header="Biriktirish" style="width: 9%"></Column>
            <Column field="totalPaymentActions" header="Jami" style="width: 9%"></Column>
          </DataTable>

          <h2 class="text-lg font-semibold mb-2 text-color">Dissertatsiya</h2>
          <DataTable
            :value="dissertationUsers"
            :loading="loadingStats"
            responsiveLayout="scroll"
          >
            <Column field="user" header="Foydalanuvchi" style="width: 30%">
              <template #body="slotProps">
                <div v-if="slotProps.data.user">
                  <div class="font-semibold cursor-pointer text-primary" @click="selectUserForLogs(slotProps.data)">
                    {{ slotProps.data.user.nickname }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">
                    {{ slotProps.data.user.firstname }} {{ slotProps.data.user.lastname }}
                  </div>
                </div>
                <span v-else class="text-gray-400 dark:text-[var(--p-text-muted-color)] text-sm">Noma'lum</span>
              </template>
            </Column>
            <Column field="addCount" header="Qo'shganlari" style="width: 14%"></Column>
            <Column field="editCount" header="Tahrirlaganlari" style="width: 14%"></Column>
            <Column field="disableCount" header="Bloklaganlari" style="width: 14%"></Column>
            <Column field="enableCount" header="Faollashtirganlari" style="width: 14%"></Column>
            <Column field="totalDissertationActions" header="Jami dissertatsiya amallari" style="width: 24%"></Column>
          </DataTable>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>

<style>
/* Qora tema: jadval va tab sarlavhalari matni aniqroq */
.app-dark .vakil-logs-page .p-datatable .p-datatable-thead > tr > th {
  background: var(--p-surface-800);
  color: var(--p-text-muted-color);
  border-bottom-color: var(--p-content-border-color);
}

.app-dark .vakil-logs-page .p-datatable .p-datatable-tbody > tr {
  background: var(--p-surface-950);
}

.app-dark .vakil-logs-page .p-datatable .p-datatable-tbody > tr > td {
  color: var(--p-text-color);
  border-color: var(--p-content-border-color);
}

.app-dark .vakil-logs-page .p-datatable .p-datatable-tbody > tr:hover {
  background: var(--p-content-hover-background);
}

.app-dark .vakil-logs-page .p-paginator {
  background: var(--p-surface-800);
  border-top-color: var(--p-content-border-color);
  color: var(--p-text-color);
}

.app-dark .vakil-logs-page .p-tabview .p-tabview-tab-header {
  color: var(--p-text-muted-color);
}

.app-dark .vakil-logs-page .p-tabview .p-tabview-tablist-item-active .p-tabview-tab-header {
  color: var(--p-text-color);
}
</style>

