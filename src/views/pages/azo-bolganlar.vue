<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import apiService from '@/service/api.service'

const router = useRouter()
const toast = useToast()

const members = ref([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const rowsPerPage = ref(50)

const searchFilters = ref([
  { field: 'USER_NAME', value: '' }
])

// Available search fields
const searchFields = [
  { label: 'Ism', value: 'USER_NAME' },
  { label: 'Foydalanuvchi raqami', value: 'USER_NO' },
  { label: 'Karta raqami', value: 'CARD_NO' },
  { label: "Tug'ilgan sana", value: 'BIRTHDAY' },
  { label: 'Telefon', value: 'TEL_NO' },
  { label: 'Manzil', value: 'ADDRS' },
  { label: 'Lavozim', value: 'USER_POSITION' },
  { label: "Ro'yxatdan o'tgan sana", value: 'INSERT_DATE' }
]

// Add new search filter
const addFilter = () => {
  searchFilters.value.push({ field: 'USER_NAME', value: '' })
}

// Remove search filter
const removeFilter = (index) => {
  if (searchFilters.value.length > 1) {
    searchFilters.value.splice(index, 1)
  }
}

// Apply search
const applySearch = () => {
  currentPage.value = 1
  fetchMembers()
}

// Clear all filters
const clearFilters = () => {
  searchFilters.value = [{ field: 'USER_NAME', value: '' }]
  fetchMembers()
}

// Check if any filter has a value
const hasActiveFilters = computed(() => {
  return searchFilters.value.some(f => f.value.trim() !== '')
})

const fetchMembers = async () => {
  try {
    loading.value = true
    
    const activeFilters = searchFilters.value.filter(f => f.value.trim() !== '')
    const requestBody = {
      page: currentPage.value,
      limit: rowsPerPage.value,
      filters: activeFilters
    }

    const response = await apiService.post('/members/search', requestBody)
    members.value = response.members
    totalRecords.value = response.total
  } catch (error) {
    console.error('Error fetching members:', error)
    toast.add({
      severity: 'error',
      summary: 'Xatolik',
      detail: "A'zolarni yuklashda xatolik yuz berdi",
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const onPage = (event) => {
  currentPage.value = event.page + 1
  rowsPerPage.value = event.rows
  fetchMembers()
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    // Handle various date formats
    let date
    if (dateString.includes('/')) {
      // Format: DD/MM/YYYY or MM/DD/YYYY
      const parts = dateString.split('/')
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format
        date = new Date(parts[2], parts[1] - 1, parts[0])
      }
    } else if (dateString.includes('-')) {
      // Format: YYYY-MM-DD
      date = new Date(dateString)
    } else if (dateString.length === 8) {
      // Format: YYYYMMDD
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(dateString)
    }
    
    if (isNaN(date.getTime())) {
      return dateString // Return original if parsing fails
    }
    
    return date.toLocaleDateString('uz-UZ')
  } catch {
    return dateString
  }
}

onMounted(() => {
  fetchMembers()
})
</script>

<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-bold m-0">A'zo bo'lganlar</h2>
    </div>

    <!-- Multi-field search section -->
    <div class="mb-4 p-4 surface-ground border-round">
      <div class="flex justify-content-between align-items-center mb-3">
        <h3 class="text-lg font-semibold m-0">Qidiruv filtrlari</h3>
        <div class="flex gap-2">
          <Button 
            label="Filtr qo'shish" 
            icon="pi pi-plus" 
            size="small"
            @click="addFilter"
            outlined
          />
          <Button 
            label="Tozalash" 
            icon="pi pi-times" 
            size="small"
            severity="secondary"
            @click="clearFilters"
            :disabled="!hasActiveFilters"
            outlined
          />
        </div>
      </div>

      <div class="flex flex-column gap-3">
        <div 
          v-for="(filter, index) in searchFilters" 
          :key="index"
          class="flex gap-2 align-items-center"
        >
          <Dropdown
            v-model="filter.field"
            :options="searchFields"
            optionLabel="label"
            optionValue="value"
            placeholder="Maydonni tanlang"
            class="flex-shrink-0"
            style="width: 250px"
          />
          <InputText
            v-model="filter.value"
            placeholder="Qidiruv qiymati"
            class="flex-grow-1"
            @keyup.enter="applySearch"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            @click="removeFilter(index)"
            :disabled="searchFilters.length === 1"
            outlined
          />
        </div>
      </div>

      <div class="flex justify-content-end mt-3">
        <Button 
          label="Qidirish" 
          icon="pi pi-search" 
          @click="applySearch"
          :disabled="!hasActiveFilters"
        />
      </div>
    </div>

    <DataTable
      :value="members"
      :loading="loading"
      :paginator="true"
      :rows="rowsPerPage"
      :totalRecords="totalRecords"
      :lazy="true"
      @page="onPage"
      :rowsPerPageOptions="[25, 50, 100]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      currentPageReportTemplate="{first} dan {last} gacha, jami {totalRecords} ta"
      responsiveLayout="scroll"
      stripedRows
    >
      <Column field="USER_NO" header="ID" sortable style="min-width: 100px">
        <template #body="{ data }">
          <span class="font-bold">{{ data.USER_NO }}</span>
        </template>
      </Column>
      <Column field="USER_NAME" header="Ism" sortable style="min-width: 200px" />
      <Column field="USER_POSITION" header="Lavozim" sortable style="min-width: 150px" />
      <Column field="CARD_NO" header="Karta raqami" sortable style="min-width: 150px" />
      <Column field="TEL_NO" header="Telefon" sortable style="min-width: 150px" />
      <Column field="BIRTHDAY" header="Tug'ilgan sana" sortable style="min-width: 150px">
        <template #body="{ data }">
          {{ formatDate(data.BIRTHDAY) }}
        </template>
      </Column>
      <Column field="ADDRS" header="Manzil" style="min-width: 200px" />
      <Column field="INSERT_DATE" header="Ro'yxatdan o'tgan" sortable style="min-width: 150px">
        <template #body="{ data }">
          {{ formatDate(data.INSERT_DATE) }}
        </template>
      </Column>
      <!-- Removed Holat (Status) column as requested -->
    </DataTable>
  </div>
</template>
