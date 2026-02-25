<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const route = useRoute();
const toast = useToast();

const logs = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const rows = ref(50);

const selectedUserId = ref(route.query.userId || null);

const loadLogs = async (pageValue = 1) => {
  try {
    loading.value = true;
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
    loading.value = false;
  }
};

const onPage = (event) => {
  const newPage = event.page + 1;
  loadLogs(newPage);
};

onMounted(() => {
  loadLogs(1);
});
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">Vakillar faoliyati loglari</h1>
      <span v-if="selectedUserId" class="text-sm text-gray-500">
        Foydalanuvchi ID: {{ selectedUserId }}
      </span>
    </div>

    <DataTable
      :value="logs"
      :loading="loading"
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
          <span class="font-mono text-xs">{{ slotProps.data.action }}</span>
        </template>
      </Column>
      <Column field="meta" header="Manzil / so'rov" style="width: 38%">
        <template #body="slotProps">
          <div class="text-xs text-gray-700">
            <div v-if="slotProps.data.meta?.method || slotProps.data.meta?.path">
              <span class="font-mono">{{ slotProps.data.meta.method }}</span>
              <span class="font-mono ml-1">{{ slotProps.data.meta.path }}</span>
            </div>
            <div v-if="slotProps.data.meta?.query && Object.keys(slotProps.data.meta.query).length" class="mt-1">
              <span class="font-semibold">Query:</span>
              <span class="font-mono">{{ JSON.stringify(slotProps.data.meta.query) }}</span>
            </div>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

