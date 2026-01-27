<template>
  <div class="ip-access-container">
    <Toast />
    
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-5">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white m-0">To'liq matnga ruxsat (IP manzillar)</h1>
      <button 
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all flex items-center gap-2" 
        @click="openAddDialog"
      >
        <i class="pi pi-plus"></i>
        Yangi IP qo'shish
      </button>
    </div>
    
    <div class="card">

      <!-- Search -->
      <div class="mb-4 bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md">
        <IconField iconPosition="left">
          <InputIcon class="pi pi-search" />
          <InputText 
            v-model="searchQuery" 
            placeholder="IP yoki ta'rif bo'yicha qidirish..." 
            @input="onSearch"
            class="w-full"
          />
        </IconField>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-content-center align-items-center" style="min-height: 400px;">
        <ProgressSpinner />
      </div>

      <!-- Error State -->
      <Message v-if="error && !isLoading" severity="error" :closable="false">
        {{ error }}
      </Message>

      <!-- Data Table -->
      <DataTable 
        v-if="!isLoading && !error"
        :value="ips" 
        :paginator="true" 
        :rows="rowsPerPage"
        :rowsPerPageOptions="[30, 50, 100, 300]"
        :totalRecords="totalRecords"
        :first="first"
        :lazy="true"
        @page="onPageChange"
        @sort="onSort"
        :sortField="sortField"
        :sortOrder="sortOrder"
        dataKey="_id"
        responsiveLayout="scroll"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="{first} - {last} / {totalRecords}"
      >
        <Column field="startIP" header="Boshlanish IP" sortable>
          <template #body="{ data }">
            <span class="font-mono">{{ data.startIP }}</span>
          </template>
        </Column>

        <Column field="endIP" header="Tugash IP" sortable>
          <template #body="{ data }">
            <span class="font-mono">{{ data.endIP }}</span>
          </template>
        </Column>

        <Column field="description" header="Ta'rif" sortable>
          <template #body="{ data }">
            {{ data.description }}
          </template>
        </Column>

        <Column field="createdAt" header="Qo'shilgan vaqti" sortable style="width: 15%">
          <template #body="{ data }">
            <span v-if="data.createdAt" class="text-sm">
              {{ formatDate(data.createdAt) }}
            </span>
            <span v-else class="text-gray-400 text-sm">—</span>
          </template>
        </Column>

        <Column field="active" header="Holat" sortable style="width: 10%">
          <template #body="{ data }">
            <InputSwitch
              :modelValue="data.active === 'true'"
              @update:modelValue="toggleStatus(data, $event)"
              class="custom-switch"
            />
          </template>
        </Column>

        <Column header="Amallar" :exportable="false" style="width: 10%">
          <template #body="{ data }">
            <Button 
              icon="pi pi-pencil" 
              text
              class="p-button-sm"
              @click="openEditDialog(data)"
              v-tooltip.top="'Tahrirlash'"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add/Edit Dialog -->
    <Dialog 
      v-model:visible="dialogVisible" 
      :modal="true"
      :style="{ width: '550px' }"
      :closable="true"
      class="ip-dialog"
    >
      <template #header>
        <div class="flex align-items-center gap-3">
          <div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
            <i class="pi pi-globe text-blue-600 dark:text-blue-300 text-2xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold m-0">{{ isEdit ? 'IP tahrirlash' : 'Yangi IP qo\'shish' }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 m-0 mt-1">
              {{ isEdit ? 'IP manzil ma\'lumotlarini yangilash' : 'Yangi IP manzil qo\'shish' }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4 mt-4">
        <!-- IP Range Section -->
        <div class="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="startIP" class="block text-sm font-semibold mb-2">
                <i class="pi pi-arrow-right text-xs mr-1"></i>
                Boshlanish IP
                <span class="text-red-500">*</span>
              </label>
              <InputText 
                id="startIP" 
                v-model="formData.startIP" 
                placeholder="213.230.110.76"
                :class="{ 'p-invalid': errors.startIP }"
                class="w-full font-mono"
              />
              <small v-if="errors.startIP" class="p-error block mt-1">{{ errors.startIP }}</small>
            </div>

            <div>
              <label for="endIP" class="block text-sm font-semibold mb-2">
                <i class="pi pi-arrow-left text-xs mr-1"></i>
                Tugash IP
                <span class="text-red-500">*</span>
              </label>
              <InputText 
                id="endIP" 
                v-model="formData.endIP" 
                placeholder="213.230.110.76"
                :class="{ 'p-invalid': errors.endIP }"
                class="w-full font-mono"
              />
              <small v-if="errors.endIP" class="p-error block mt-1">{{ errors.endIP }}</small>
            </div>
          </div>
          
          <div class="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-950 p-2 rounded">
            <i class="pi pi-info-circle mt-0.5"></i>
            <span>Bitta IP uchun start va end bir xil bo'ladi</span>
          </div>
        </div>

        <!-- Description Section -->
        <div>
          <label for="description" class="block text-sm font-semibold mb-2">
            <i class="pi pi-file-edit text-xs mr-1"></i>
            Ta'rif
            <span class="text-red-500">*</span>
          </label>
          <InputText 
            id="description" 
            v-model="formData.description" 
            placeholder="Toshkent shahar BILIM AKM"
            :class="{ 'p-invalid': errors.description }"
            class="w-full"
          />
          <small v-if="errors.description" class="p-error block mt-1">{{ errors.description }}</small>
        </div>

        <!-- Status Section -->
        <div class="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <label for="active" class="block text-sm font-semibold mb-1">Holat</label>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formData.active ? 'IP manzil faol' : 'IP manzil nofaol' }}
              </p>
            </div>
            <InputSwitch 
              v-model="formData.active" 
              inputId="active"
              class="ml-4" 
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-2 justify-end">
          <Button 
            label="Bekor qilish" 
            icon="pi pi-times" 
            @click="closeDialog"
            text
            severity="secondary"
            class="px-4"
          />
          <Button 
            :label="isEdit ? 'Saqlash' : 'Qo\'shish'" 
            :icon="isEdit ? 'pi pi-check' : 'pi pi-plus'"
            @click="saveIP"
            :loading="isSaving"
            severity="success"
            class="px-4"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import InputSwitch from 'primevue/inputswitch'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import apiService from '@/service/api.service'

const toast = useToast()

// State
const ips = ref([])
const isLoading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const rowsPerPage = ref(30)
const first = ref(0)
const totalRecords = ref(0)
const dialogVisible = ref(false)
const isEdit = ref(false)
const isSaving = ref(false)
const currentIP = ref(null)
const sortField = ref(null)
const sortOrder = ref(null)

// Form data
const formData = ref({
  startIP: '',
  endIP: '',
  description: '',
  active: true
})

const errors = ref({
  startIP: null,
  endIP: null,
  description: null
})

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Fetch IPs
const fetchIPs = async (page = 1, sortParams = null, limit = null) => {
  isLoading.value = true
  error.value = null
  
  try {
    const params = {
      page,
      limit: limit || rowsPerPage.value,
      search: searchQuery.value || undefined
    }
    
    // Add sort parameters if provided
    if (sortParams) {
      params.sortField = sortParams.sortField
      params.sortOrder = sortParams.sortOrder === 1 ? 'asc' : 'desc'
    } else if (sortField.value) {
      params.sortField = sortField.value
      params.sortOrder = sortOrder.value === 1 ? 'asc' : 'desc'
    }
    
    const response = await apiService.get('/ip-access', { params })
    
    if (response.success) {
      ips.value = response.data
      totalRecords.value = response.pagination.total
      currentPage.value = response.pagination.page
      rowsPerPage.value = response.pagination.limit || rowsPerPage.value
      first.value = (currentPage.value - 1) * rowsPerPage.value
    } else {
      throw new Error(response.message || 'Failed to fetch IPs')
    }
  } catch (err) {
    console.error('Error fetching IPs:', err)
    error.value = 'Ma\'lumotlarni yuklashda xatolik'
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: error.value,
      life: 3000
    })
  } finally {
    isLoading.value = false
  }
}

// Search
const onSearch = () => {
  currentPage.value = 1
  first.value = 0
  fetchIPs(1)
}

// Pagination
const onPageChange = (event) => {
  currentPage.value = event.page + 1
  rowsPerPage.value = event.rows
  first.value = event.first
  const sortParams = sortField.value ? { sortField: sortField.value, sortOrder: sortOrder.value } : null
  fetchIPs(currentPage.value, sortParams, event.rows)
}

// Sorting
const onSort = (event) => {
  sortField.value = event.sortField
  sortOrder.value = event.sortOrder
  currentPage.value = 1
  first.value = 0
  fetchIPs(1, { sortField: event.sortField, sortOrder: event.sortOrder })
}

// Validate form
const validateForm = () => {
  errors.value = {
    startIP: null,
    endIP: null,
    description: null
  }
  
  let isValid = true
  
  // IP address regex pattern
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
  
  if (!formData.value.startIP) {
    errors.value.startIP = 'Boshlanish IP kiritilishi shart'
    isValid = false
  } else if (!ipPattern.test(formData.value.startIP)) {
    errors.value.startIP = 'Noto\'g\'ri IP format (masalan: 213.230.110.76)'
    isValid = false
  }
  
  if (!formData.value.endIP) {
    errors.value.endIP = 'Tugash IP kiritilishi shart'
    isValid = false
  } else if (!ipPattern.test(formData.value.endIP)) {
    errors.value.endIP = 'Noto\'g\'ri IP format (masalan: 213.230.110.76)'
    isValid = false
  }
  
  if (!formData.value.description || !formData.value.description.trim()) {
    errors.value.description = 'Ta\'rif kiritilishi shart'
    isValid = false
  }
  
  return isValid
}

// Open add dialog
const openAddDialog = () => {
  isEdit.value = false
  currentIP.value = null
  formData.value = {
    startIP: '',
    endIP: '',
    description: '',
    active: true
  }
  errors.value = {
    startIP: null,
    endIP: null,
    description: null
  }
  dialogVisible.value = true
}

// Open edit dialog
const openEditDialog = (ip) => {
  isEdit.value = true
  currentIP.value = ip
  formData.value = {
    startIP: ip.startIP,
    endIP: ip.endIP,
    description: ip.description,
    active: ip.active === 'true'
  }
  errors.value = {
    startIP: null,
    endIP: null,
    description: null
  }
  dialogVisible.value = true
}

// Close dialog
const closeDialog = () => {
  dialogVisible.value = false
  formData.value = {
    startIP: '',
    endIP: '',
    description: '',
    active: true
  }
  errors.value = {
    startIP: null,
    endIP: null,
    description: null
  }
}

// Save IP
const saveIP = async () => {
  if (!validateForm()) {
    return
  }
  
  isSaving.value = true
  
  try {
    const payload = {
      startIP: formData.value.startIP,
      endIP: formData.value.endIP,
      description: formData.value.description,
      active: formData.value.active ? 'true' : 'false'
    }
    
    if (isEdit.value && currentIP.value) {
      // Update
      const response = await apiService.put(`/ip-access/${currentIP.value._id}`, payload)
      
      if (response.success) {
        toast.add({
          severity: 'success',
          summary: 'Muvaffaqiyatli',
          detail: 'IP manzil yangilandi',
          life: 3000
        })
        closeDialog()
        fetchIPs(currentPage.value)
      } else {
        throw new Error(response.message || 'Failed to update IP')
      }
    } else {
      // Create
      const response = await apiService.post('/ip-access', payload)
      
      if (response.success) {
        toast.add({
          severity: 'success',
          summary: 'Muvaffaqiyatli',
          detail: 'Yangi IP manzil qo\'shildi',
          life: 3000
        })
        closeDialog()
        fetchIPs(1)
      } else {
        throw new Error(response.message || 'Failed to create IP')
      }
    }
  } catch (err) {
    console.error('Error saving IP:', err)
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Saqlashda xatolik yuz berdi',
      life: 3000
    })
  } finally {
    isSaving.value = false
  }
}

// Toggle status
const toggleStatus = async (ip, newValue) => {
  try {
    // newValue is true for enabled (active = "true"), false for disabled (active = "false")
    const newStatus = newValue ? 'true' : 'false'
    
    const response = await apiService.put(`/ip-access/${ip._id}`, {
      active: newStatus
    })
    
    if (response.success) {
      // Update the local data
      const ipItem = ips.value.find(item => item._id === ip._id)
      if (ipItem) {
        ipItem.active = newStatus
      }
      
      toast.add({
        severity: 'success',
        summary: 'Muvaffaqiyat',
        detail: `Holat ${newStatus === 'true' ? 'faollashtirildi' : 'o\'chirildi'}`,
        life: 3000
      })
    } else {
      throw new Error(response.message || 'Failed to toggle status')
    }
  } catch (err) {
    console.error('Error toggling IP status:', err)
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Holat o\'zgartirishda xatolik',
      life: 3000
    })
    // Revert on error
    fetchIPs(currentPage.value)
  }
}

onMounted(() => {
  fetchIPs()
})
</script>

<style scoped>
.ip-access-container {
  padding: 1rem;
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 1rem;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  padding: 1rem;
  font-weight: 600;
}

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

/* Dialog Styling */
:deep(.ip-dialog .p-dialog-header) {
  @apply pb-4 border-b border-gray-200 dark:border-zinc-700;
}

:deep(.ip-dialog .p-dialog-content) {
  @apply pt-2;
}

:deep(.ip-dialog .p-dialog-footer) {
  @apply pt-4 border-t border-gray-200 dark:border-zinc-700;
}

:deep(.ip-dialog .p-inputtext) {
  @apply transition-all;
}

:deep(.ip-dialog .p-inputtext:focus) {
  @apply ring-2 ring-blue-500 dark:ring-blue-400;
}
</style>
