<template>
  <DataTable
    :value="userVisits"
    :loading="loadingVisits"
    :paginator="true"
    :rows="pageSize"
    :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS"
    responsiveLayout="scroll"
    stripedRows
    @page="onPageSizeChange"
  >
    <Column field="date" header="Sana" sortable style="min-width: 120px" />
    <Column field="keldi" header="Keldi" sortable style="min-width: 100px" />
    <Column field="ketdi" header="Ketdi" sortable style="min-width: 100px">
      <template #body="{ data }">
        {{ data.ketdi || '-' }}
      </template>
    </Column>
    <Column field="duration" header="Davomiyligi" style="min-width: 120px">
      <template #body="{ data }">
        {{ data.duration || '-' }}
      </template>
    </Column>
  </DataTable>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { pageSize, ROWS_PER_PAGE_OPTIONS } from '@/service/pagination.service'

const onPageSizeChange = (e) => {
  if (e.rows != null) pageSize.value = e.rows
}

const props = defineProps({
  userVisits: {
    type: Array,
    required: true
  },
  loadingVisits: {
    type: Boolean,
    default: false
  }
})
</script>
