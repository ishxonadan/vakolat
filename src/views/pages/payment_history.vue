<script setup>
import { ref, onMounted, watch } from "vue"
import { useToast } from "primevue/usetoast"
import apiService from "@/service/api.service"
import {
  paymentTransactionTypeLabel,
  paymentTransactionDirectionLabel,
} from "@/utils/paymentLabels"
import { pageSize, ROWS_PER_PAGE_OPTIONS } from "@/service/pagination.service"

const toast = useToast()
const loading = ref(false)
const transactions = ref([])
const total = ref(0)
const page = ref(1)
const filters = ref({
  userNo: "",
  type: "",
})

const loadTransactions = async () => {
  try {
    loading.value = true
    const data = await apiService.get("/members/payment/transactions", {
      params: {
        page: page.value,
        limit: pageSize.value,
        userNo: filters.value.userNo || undefined,
        type: filters.value.type || undefined,
      },
    })
    transactions.value = data.items || []
    total.value = data.total || 0
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

const onPage = (event) => {
  if (event.rows != null && event.rows !== pageSize.value) {
    pageSize.value = event.rows
    return
  }
  page.value = event.page + 1
  loadTransactions()
}

watch(pageSize, () => {
  page.value = 1
  loadTransactions()
})

onMounted(loadTransactions)
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">Pullik xizmatlar tarixi</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <InputText
        v-model="filters.userNo"
        name="vakolat-payment-history-user-no"
        placeholder="ID karta raqami"
        autocomplete="off"
        autocapitalize="characters"
        autocorrect="off"
        spellcheck="false"
        data-lpignore="true"
        data-1p-ignore
      />
      <Dropdown
        v-model="filters.type"
        :options="[
          { label: 'Barchasi', value: '' },
          { label: `To'ldirish`, value: 'top_up' },
          { label: 'Harajat', value: 'spend' },
          { label: 'Sozlash', value: 'adjustment' },
          { label: 'Migratsiya', value: 'migration' },
        ]"
        optionLabel="label"
        optionValue="value"
        placeholder="Tur"
      />
      <Button label="Qidirish" icon="pi pi-search" @click="() => { page = 1; loadTransactions() }" />
    </div>

    <DataTable
      :value="transactions"
      :loading="loading"
      :rows="pageSize"
      :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS"
      :totalRecords="total"
      :paginator="true"
      :lazy="true"
      :first="(page - 1) * pageSize"
      @page="onPage"
      responsiveLayout="scroll"
    >
      <Column field="createdAt" header="Sana">
        <template #body="slotProps">
          {{ new Date(slotProps.data.createdAt).toLocaleString() }}
        </template>
      </Column>
      <Column field="userNo" header="ID karta raqami" />
      <Column field="type" header="Amal turi">
        <template #body="slotProps">
          {{ paymentTransactionTypeLabel(slotProps.data.type) }}
        </template>
      </Column>
      <Column field="direction" header="Yo'nalish">
        <template #body="slotProps">
          {{ paymentTransactionDirectionLabel(slotProps.data.direction) }}
        </template>
      </Column>
      <Column field="amount" header="Miqdor" />
      <Column header="Xizmat">
        <template #body="slotProps">
          {{ slotProps.data.serviceId?.name || slotProps.data.serviceName || "-" }}
        </template>
      </Column>
      <Column header="Bo'lim">
        <template #body="slotProps">
          {{ slotProps.data.departmentId?.name || "-" }}
        </template>
      </Column>
      <Column field="comment" header="Izoh" />
    </DataTable>
  </div>
</template>
