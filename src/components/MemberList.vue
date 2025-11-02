<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-bold m-0">A'zo bo'lganlar</h2>
      <Button
        label="Yangi a'zo qo'shish"
        icon="pi pi-plus"
        @click="$emit('add-member')"
        severity="success"
      />
    </div>

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
      @row-dblclick="onRowDblClick"
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
      <Column field="USER_POSITION" header="Toifa" sortable style="min-width: 150px" />
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
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'

const props = defineProps({
  members: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  totalRecords: {
    type: Number,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  rowsPerPage: {
    type: Number,
    default: 50
  },
  searchFilters: {
    type: Array,
    required: true
  },
  searchFields: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['add-member', 'update:current-page', 'update:rows-per-page', 'apply-search', 'row-dblclick'])

const hasActiveFilters = computed(() => {
  return props.searchFilters.some(f => f.value.trim() !== '')
})

const addFilter = () => {
  props.searchFilters.push({ field: 'USER_NAME', value: '' })
}

const removeFilter = (index) => {
  if (props.searchFilters.length > 1) {
    props.searchFilters.splice(index, 1)
  }
}

const applySearch = () => {
  let page = 1;
  emit('apply-search', page)
}

const clearFilters = () => {
  props.searchFilters.splice(0, props.searchFilters.length, { field: 'USER_NAME', value: '' })
}

const onPage = (event) => {
  emit('update:current-page', event.page + 1)
  emit('update:rows-per-page', event.rows)
}

const onRowDblClick = (event) => {
  emit('row-dblclick', event.data)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    let date
    if (dateString.includes('/')) {
      const parts = dateString.split('/')
      if (parts.length === 3) {
        date = new Date(parts[2], parts[1] - 1, parts[0])
      }
    } else if (dateString.includes('-')) {
      date = new Date(dateString)
    } else if (dateString.length === 8) {
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(dateString)
    }

    if (isNaN(date.getTime())) {
      return dateString
    }

    return date.toLocaleDateString('uz-UZ')
  } catch {
    return dateString
  }
}
</script>
