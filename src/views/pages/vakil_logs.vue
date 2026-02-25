<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import apiService from '@/service/api.service';

const route = useRoute();
const toast = useToast();

const logs = ref([]);
const loadingLogs = ref(false);
const total = ref(0);
const page = ref(1);
const rows = ref(50);

const stats = ref([]);
const loadingStats = ref(false);

const selectedUserId = ref(route.query.userId || null);

const loadLogs = async (pageValue = 1) => {
  try {
    loadingLogs.value = true;
    const params = {
      page: pageValue,
      limit: rows.value,
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
  const newPage = event.page + 1;
  loadLogs(newPage);
};

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
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">Vakillar faoliyati</h1>
      <span v-if="selectedUserId" class="text-sm text-gray-500">
        Foydalanuvchi ID: {{ selectedUserId }}
      </span>
    </div>

    <TabView>
      <TabPanel header="Loglar">
        <DataTable
          :value="logs"
          :loading="loadingLogs"
          :rows="rows"
          :totalRecords="total"
          :paginator="true"
          lazy
          :first="(page - 1) * rows"
          :rowsPerPageOptions="[20, 50, 100]"
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
                <div class="font-semibold">{{ slotProps.data.user.nickname }}</div>
                <div class="text-xs text-gray-500">
                  {{ slotProps.data.user.firstname }} {{ slotProps.data.user.lastname }}
                  ({{ slotProps.data.user.level }})
                </div>
              </div>
              <span v-else class="text-gray-400 text-sm">Noma'lum</span>
            </template>
          </Column>
          <Column field="action" header="Amal" style="width: 22%">
            <template #body="slotProps">
              <div class="text-xs">
                <div class="font-semibold">
                  {{ actionLabel(slotProps.data.action) }}
                </div>
                <div class="text-gray-500 font-mono" v-if="slotProps.data.meta?.path">
                  {{ slotProps.data.meta.method }} {{ slotProps.data.meta.path }}
                </div>
              </div>
            </template>
          </Column>
          <Column field="meta" header="So'rov tafsilotlari" style="width: 38%">
            <template #body="slotProps">
              <div class="text-xs text-gray-700">
                <div v-if="slotProps.data.meta?.query && Object.keys(slotProps.data.meta.query).length">
                  <span class="font-semibold">Query:</span>
                  <span class="font-mono">{{ JSON.stringify(slotProps.data.meta.query) }}</span>
                </div>
                <div v-if="slotProps.data.meta?.body && Object.keys(slotProps.data.meta.body).length" class="mt-1">
                  <span class="font-semibold">Body:</span>
                  <span class="font-mono">{{ JSON.stringify(slotProps.data.meta.body) }}</span>
                </div>
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <TabPanel header="Statistikalar">
        <DataTable
          :value="stats"
          :loading="loadingStats"
          responsiveLayout="scroll"
        >
          <Column field="user" header="Foydalanuvchi" style="width: 30%">
            <template #body="slotProps">
              <div v-if="slotProps.data.user">
                <div class="font-semibold">{{ slotProps.data.user.nickname }}</div>
                <div class="text-xs text-gray-500">
                  {{ slotProps.data.user.firstname }} {{ slotProps.data.user.lastname }}
                  ({{ slotProps.data.user.level }})
                </div>
              </div>
              <span v-else class="text-gray-400 text-sm">Noma'lum</span>
            </template>
          </Column>
          <Column field="addCount" header="Qo'shganlari" style="width: 14%"></Column>
          <Column field="editCount" header="Tahrirlaganlari" style="width: 14%"></Column>
          <Column field="disableCount" header="Bloklaganlari" style="width: 14%"></Column>
          <Column field="enableCount" header="Faollashtirganlari" style="width: 14%"></Column>
          <Column field="totalDissertationActions" header="Jami amal" style="width: 14%"></Column>
        </DataTable>
      </TabPanel>
    </TabView>
  </div>
</template>

