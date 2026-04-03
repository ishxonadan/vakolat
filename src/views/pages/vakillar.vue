<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import apiService from '@/service/api.service';
import authService from '@/service/auth.service';

const router = useRouter();
const toast = useToast();
const products = ref([]);
const isLoading = ref(false);
const error = ref(null);

/** Tashkiliy bo‘lim (StaffDepartment) — Zallar yoki huquq guruhi emas */
const selectedDepartmentFilter = ref('__all__');

const sortByName = (a, b) => {
  const ln = String(a.lastname || '').localeCompare(String(b.lastname || ''), 'uz', { sensitivity: 'base' });
  if (ln !== 0) return ln;
  return String(a.firstname || '').localeCompare(String(b.firstname || ''), 'uz', { sensitivity: 'base' });
};

const departmentFilterOptions = computed(() => {
  const list = products.value || [];
  const opts = [{ label: `Barchasi (${list.length})`, value: '__all__' }];
  const unassigned = list.filter((p) => !p.staffDepartment?._id).length;
  if (unassigned > 0) {
    opts.push({ label: `Bo'lim tanlanmagan (${unassigned})`, value: '__unassigned__' });
  }
  const byId = new Map();
  for (const p of list) {
    const d = p.staffDepartment;
    if (!d?._id) continue;
    const id = String(d._id);
    if (!byId.has(id)) {
      byId.set(id, { name: d.name || '—', count: 0 });
    }
    byId.get(id).count++;
  }
  const sorted = [...byId.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name, 'uz', { sensitivity: 'base' }),
  );
  for (const [id, { name, count }] of sorted) {
    opts.push({ label: `${name} (${count})`, value: id });
  }
  return opts;
});

const filteredProducts = computed(() => {
  const list = products.value || [];
  const v = selectedDepartmentFilter.value;
  let out = list;
  if (v === '__all__') {
    out = list;
  } else if (v === '__unassigned__') {
    out = list.filter((p) => !p.staffDepartment?._id);
  } else {
    out = list.filter((p) => p.staffDepartment && String(p.staffDepartment._id) === v);
  }
  return [...out].sort(sortByName);
});

const isSuperAdmin = computed(() => authService.getUserLevel() === 'rais');

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await apiService.get('/experts');
    products.value = data;
    selectedDepartmentFilter.value = '__all__';
  } catch (err) {
    console.error('Error fetching data:', err);
    error.value = 'Error fetching data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const goToAddPage = () => {
  router.push('/xodim_add');
};

const editButton = (itemId) => {
  router.push('/xodim_edit/' + itemId);
};

const toggleUserStatus = async (user) => {
  try {
    const newStatus = user.isActive === false;
    await apiService.put(`/experts/${user._id}`, { isActive: newStatus });
    user.isActive = newStatus;
    const statusText = newStatus ? 'Faollashtirildi' : 'Hisob qulflandi';
    toast.add({ severity: 'success', summary: 'Muvaffaqiyat', detail: statusText, life: 3000 });
    fetchData();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Xato', detail: err?.message || 'Holatni o\'zgartirishda xatolik', life: 3000 });
  }
};

const loginAsExpert = async (expert) => {
  try {
    const response = await apiService.post('/admin/login-as-expert', {
      expertId: expert._id,
    })

    if (response && response.token && response.user) {
      localStorage.setItem('isImpersonating', 'true')
      localStorage.setItem(
        'originalUser',
        JSON.stringify({
          token: authService.getToken(),
          user: authService.getUser(),
          permissions: authService.getPermissions(),
        })
      )

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

const viewLogs = (expert) => {
  router.push({
    path: '/xodimlar/logs',
    query: { userId: expert._id }
  })
}
</script>

<template>
  <div>
    <div
      class="flex flex-col gap-4 p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Xodimlar</h1>
        <button
          type="button"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all shrink-0"
          @click="goToAddPage"
        >
          Xodim qo'shish
        </button>
      </div>
      <div
        v-if="products.length > 0"
        class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 pt-1 border-t border-gray-200 dark:border-zinc-600"
      >
        <div class="flex flex-col gap-1 flex-1 min-w-[min(100%,18rem)] sm:max-w-md">
          <label for="xodim-dept-filter" class="text-xs font-medium text-gray-600 dark:text-gray-400">Tashkiliy bo‘lim bo‘yicha</label>
          <Dropdown
            id="xodim-dept-filter"
            v-model="selectedDepartmentFilter"
            :options="departmentFilterOptions"
            option-label="label"
            option-value="value"
            filter
            filter-placeholder="Qidirish..."
            class="w-full"
            :panel-style="{ maxWidth: 'min(26rem, 90vw)' }"
          />
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 sm:pb-2 sm:ml-auto">
          Ko‘rsatilmoqda: <span class="font-semibold text-gray-900 dark:text-white tabular-nums">{{ filteredProducts.length }}</span>
          / {{ products.length }}
        </div>
      </div>
    </div>
    <div v-if="isLoading" class="flex justify-center items-center p-4">
      <p>Ma'lumotlar yuklanmoqda...</p>
    </div>
    <div v-if="error" class="flex justify-center items-center p-4">
      <p>{{ error }}</p>
    </div>
    <DataTable v-if="!isLoading && !error" :value="filteredProducts" :rows="100" :paginator="false" responsiveLayout="scroll">
      <Column field="nickname" header="Login" :sortable="true" style="width: 12%">
        <template #body="slotProps">
          <span :class="{'text-red-600': !slotProps.data.isActive}">
            {{ slotProps.data.nickname }}
          </span>
        </template>
      </Column>
      <Column header="Ismi sharif" :sortable="true" style="width: 22%">
        <template #body="slotProps">
          {{ slotProps.data.firstname }} {{ slotProps.data.lastname }}
        </template>
      </Column>
      <Column field="position" header="Lavozimi" :sortable="true" style="width: 13%">
        <template #body="slotProps">
          {{ slotProps.data.staffPosition?.name || slotProps.data.position || '—' }}
        </template>
      </Column>
      <Column field="staffDepartment" header="Tashkiliy bo'lim" style="width: 16%">
        <template #body="slotProps">
          <Tag
            v-if="slotProps.data.staffDepartment?.name"
            :value="slotProps.data.staffDepartment.name"
            severity="success"
          />
          <span v-else class="text-gray-400 dark:text-gray-500 text-sm">—</span>
        </template>
      </Column>
      <Column header="Huquq guruhi" style="width: 18%">
        <template #body="slotProps">
          <div class="flex flex-wrap gap-1">
            <template v-if="slotProps.data.permissionGroups?.length">
              <Tag
                v-for="g in slotProps.data.permissionGroups"
                :key="g._id"
                :value="g.name"
                severity="info"
                class="text-xs"
              />
            </template>
            <Tag
              v-else-if="slotProps.data.permissionGroup"
              :value="slotProps.data.permissionGroup.name"
              severity="info"
            />
            <span v-else class="text-gray-400 dark:text-gray-500 text-sm">Belgilanmagan</span>
          </div>
        </template>
      </Column>
      <Column field="isActive" header="Holat" style="width: 8%">
        <template #body="slotProps">
          <Button
            :icon="slotProps.data.isActive !== false ? 'pi pi-lock-open' : 'pi pi-lock'"
            type="button"
            class="xodim-status-lock p-button-rounded p-button-text"
            :class="slotProps.data.isActive !== false ? 'p-button-success' : 'p-button-danger'"
            @click="toggleUserStatus(slotProps.data)"
            v-tooltip="slotProps.data.isActive !== false ? 'Hisobni qulflash' : 'Hisobni faollashtirish'"
          />
        </template>
      </Column>
      <Column style="width: 15%" header="Amallar">
        <template #body="slotProps">
          <div class="xodim-actions">
            <Button
              icon="pi pi-pencil"
              type="button"
              class="xodim-action-btn p-button-text p-button-rounded p-button-info"
              @click="editButton(slotProps.data._id)"
              v-tooltip="'Tahrirlash'"
            />
            <Button
              v-if="isSuperAdmin"
              icon="pi pi-history"
              type="button"
              class="xodim-action-btn p-button-text p-button-rounded p-button-warning"
              @click="viewLogs(slotProps.data)"
              v-tooltip="'Faoliyat loglarini ko\'rish'"
            />
            <Button
              v-if="isSuperAdmin"
              icon="pi pi-user"
              type="button"
              class="xodim-action-btn xodim-action-btn--right p-button-text p-button-rounded p-button-success"
              @click="loginAsExpert(slotProps.data)"
              v-tooltip="'Xodim sifatida kirish'"
              :disabled="slotProps.data.isActive === false"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.xodim-status-lock :deep(.pi) {
  font-size: 1.35rem;
}

:deep(.p-datatable-tbody > tr > td:nth-last-child(2)) {
  padding-right: 0.25rem !important;
}
:deep(.p-datatable-tbody > tr > td:last-child) {
  padding-left: 0.25rem !important;
}

.xodim-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  width: 100%;
}

.xodim-action-btn {
  min-width: 2.5rem;
  min-height: 2.5rem;
}

.xodim-action-btn :deep(.pi) {
  font-size: 1.2rem;
}

.xodim-action-btn--right {
  margin-left: 0.5rem;
}
</style>
