<script setup>
import { ref, onMounted } from "vue"
import { useToast } from "primevue/usetoast"
import authService from "@/service/auth.service"
import apiService from "@/service/api.service"

const toast = useToast()
const loading = ref(false)
const items = ref([])
const total = ref(0)
const page = ref(1)
const rows = ref(50)
const search = ref("")
const sortField = ref("balance")
const sortOrder = ref(-1)

const showTopupDialog = ref(false)
const showSpendDialog = ref(false)
const selectedUserNo = ref("")
const amount = ref(null)
const comment = ref("")
const quickUserNo = ref("")

const canTopup = authService.hasPermission("payment_topup_user")
const canSpend = authService.hasPermission("payment_withdraw_user")

const loadBalances = async () => {
  try {
    loading.value = true
    const data = await apiService.get("/members/payment/accounts", {
      params: {
        page: page.value,
        limit: rows.value,
        search: search.value || undefined,
        sortField: sortField.value,
        sortOrder: sortOrder.value,
      },
    })
    items.value = data.items || []
    total.value = data.total || 0
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

const onPage = (event) => {
  page.value = event.page + 1
  rows.value = event.rows
  loadBalances()
}

const onSort = (event) => {
  sortField.value = event.sortField || "balance"
  sortOrder.value = event.sortOrder || -1
  page.value = 1
  loadBalances()
}

const openAction = (type, userNo) => {
  selectedUserNo.value = String(userNo || "").trim()
  if (!selectedUserNo.value) {
    toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "ID karta raqami kiriting", life: 2500 })
    return
  }
  amount.value = null
  comment.value = ""
  showTopupDialog.value = type === "topup"
  showSpendDialog.value = type === "spend"
}

const submitAction = async (endpoint) => {
  try {
    await apiService.post(endpoint, {
      userNo: selectedUserNo.value,
      amount: Number(amount.value),
      comment: comment.value,
    })
    showTopupDialog.value = false
    showSpendDialog.value = false
    await loadBalances()
    toast.add({ severity: "success", summary: "Muvaffaqiyat", detail: "Amal bajarildi", life: 2500 })
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
}

onMounted(loadBalances)
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">Foydalanuvchi balanslari</h1>
      <div class="flex gap-2">
        <InputText v-model="search" placeholder="ID karta raqami yoki ism" />
        <Button label="Qidirish" icon="pi pi-search" @click="() => { page = 1; loadBalances() }" />
      </div>
    </div>
    <div class="flex gap-2 mb-4" v-if="canTopup || canSpend">
      <InputText v-model="quickUserNo" placeholder="ID karta raqami kiriting (balans bo'lmasa ham)" />
      <Button v-if="canTopup" label="To'ldirish" icon="pi pi-plus" severity="success" @click="openAction('topup', quickUserNo)" />
      <Button v-if="canSpend" label="Yechish" icon="pi pi-minus" severity="danger" @click="openAction('spend', quickUserNo)" />
    </div>

    <DataTable
      :value="items"
      :loading="loading"
      :rows="rows"
      :totalRecords="total"
      :paginator="true"
      :lazy="true"
      :first="(page - 1) * rows"
      :sortField="sortField"
      :sortOrder="sortOrder"
      @page="onPage"
      @sort="onSort"
      responsiveLayout="scroll"
    >
      <Column field="userNo" header="ID karta raqami" sortable />
      <Column header="F.I.Sh">
        <template #body="slotProps">
          {{ slotProps.data.member?.USER_NAME || "-" }}
        </template>
      </Column>
      <Column field="balance" header="Balans" sortable />
      <Column header="Amallar">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button
              v-if="canTopup"
              icon="pi pi-plus"
              severity="success"
              label="To'ldirish"
              size="small"
              @click="openAction('topup', slotProps.data.userNo)"
            />
            <Button
              v-if="canSpend"
              icon="pi pi-minus"
              severity="danger"
              label="Yechish"
              size="small"
              @click="openAction('spend', slotProps.data.userNo)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showTopupDialog" modal header="Balansni to'ldirish" :style="{ width: '420px' }">
      <div class="flex flex-col gap-3">
        <div class="text-sm">ID karta raqami: <b>{{ selectedUserNo }}</b></div>
        <InputNumber v-model="amount" :min="0" placeholder="Miqdor" />
        <InputText v-model="comment" placeholder="Izoh" />
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" @click="showTopupDialog = false" />
        <Button label="Saqlash" @click="submitAction('/members/payment/topup')" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showSpendDialog" modal header="Balansdan yechish" :style="{ width: '420px' }">
      <div class="flex flex-col gap-3">
        <div class="text-sm">ID karta raqami: <b>{{ selectedUserNo }}</b></div>
        <InputNumber v-model="amount" :min="0" placeholder="Miqdor" />
        <InputText v-model="comment" placeholder="Izoh" />
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" @click="showSpendDialog = false" />
        <Button label="Saqlash" severity="danger" @click="submitAction('/members/payment/spend')" />
      </template>
    </Dialog>
  </div>
</template>
