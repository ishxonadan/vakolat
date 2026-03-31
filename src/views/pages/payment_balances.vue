<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useToast } from "primevue/usetoast"
import authService from "@/service/auth.service"
import apiService from "@/service/api.service"

const toast = useToast()
const router = useRouter()
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
const showHistoryDialog = ref(false)
const selectedUserNo = ref("")
const amount = ref(null)
const comment = ref("")
const quickUserNo = ref("")
const historyLoading = ref(false)
const historyItems = ref([])
const overviewLoading = ref(false)
const overview = ref({
  overallMoneyInBalances: 0,
  overallSpending: 0,
  spendingThisMonth: 0,
  spendingThisYear: 0,
})

const canTopup = authService.hasPermission("payment_topup_user")
const canSpend = authService.hasPermission("payment_withdraw_user")
const canProvideService = authService.hasPermission("payment_provide_service")

const formatMoney = (value) => `${Math.trunc(Number(value || 0)).toLocaleString("uz-UZ")} so'm`
const normalizeUserNoInput = (value) => {
  const raw = String(value || "").trim().toUpperCase()
  if (/^\d{9}$/.test(raw)) return `AAA${raw}`
  return raw
}
const statCards = [
  { key: "overallMoneyInBalances", title: "Balanslarda pul", subtitle: "Hozirgi qoldiq", icon: "pi pi-wallet", color: "text-green-500" },
  { key: "overallSpending", title: "Umumiy xarajat", subtitle: "Barcha davr", icon: "pi pi-arrow-down", color: "text-primary" },
  { key: "spendingThisMonth", title: "Shu oy xarajat", subtitle: "Oy boshidan", icon: "pi pi-calendar", color: "text-orange-500" },
  { key: "spendingThisYear", title: "Yillik xarajat", subtitle: "1-yanvardan", icon: "pi pi-chart-bar", color: "text-red-500" },
]

const formatHistoryComment = (tx) => {
  const comment = String(tx?.comment || "").trim()
  if (!comment) {
    if (tx?.direction === "out") return "Yechish amaliyoti"
    if (tx?.direction === "in") return "To'ldirish amaliyoti"
    return "-"
  }

  const lower = comment.toLowerCase()
  if (lower.includes("migrated topup")) return "(mig) Hisob to'ldirildi"
  if (lower.includes("migrated movement")) {
    if (tx?.direction === "out") return "(mig) Xarajat/yechish operatsiyasi"
    return "(mig) Kirim operatsiyasi"
  }
  return comment.replace(/^Migratsiya:/i, "(mig)")
}

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

const loadOverview = async () => {
  try {
    overviewLoading.value = true
    const data = await apiService.get("/members/payment/accounts/overview")
    overview.value = {
      overallMoneyInBalances: Number(data?.overallMoneyInBalances || 0),
      overallSpending: Number(data?.overallSpending || 0),
      spendingThisMonth: Number(data?.spendingThisMonth || 0),
      spendingThisYear: Number(data?.spendingThisYear || 0),
    }
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    overviewLoading.value = false
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

const openHistory = async (userNo) => {
  try {
    selectedUserNo.value = userNo
    showHistoryDialog.value = true
    historyLoading.value = true
    historyItems.value = []
    const data = await apiService.get("/members/payment/transactions", {
      params: {
        userNo,
        limit: 100,
      },
    })
    historyItems.value = data.items || []
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    historyLoading.value = false
  }
}

const openServiceProvision = async (userNo) => {
  const normalized = String(userNo || "").trim().toUpperCase()
  if (!normalized) {
    toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "ID karta raqami topilmadi", life: 2500 })
    return
  }
  await router.push({ path: "/payment/service-provision", query: { userNo: normalized } })
}

const searchFromQuickInput = async () => {
  search.value = normalizeUserNoInput(quickUserNo.value)
  quickUserNo.value = search.value
  page.value = 1
  await loadBalances()
}

onMounted(async () => {
  await Promise.all([loadOverview(), loadBalances()])
})
</script>

<template>
  <div class="card">
    <div class="flex gap-3 mb-4 overflow-x-auto pb-1">
      <div v-for="card in statCards" :key="card.key" class="min-w-15rem flex-1">
        <div class="surface-card border-1 surface-border border-round p-3 h-full">
          <div class="flex align-items-start justify-content-between mb-2">
            <div>
              <div class="text-900 font-semibold">{{ card.title }}</div>
              <div class="text-500 text-sm">{{ card.subtitle }}</div>
            </div>
            <i :class="[card.icon, card.color]" class="text-xl"></i>
          </div>
          <div class="text-2xl font-bold">
            <span v-if="overviewLoading">...</span>
            <span v-else>{{ formatMoney(overview[card.key]) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">Foydalanuvchi balanslari</h1>
    </div>
    <div class="flex gap-2 mb-4" v-if="canTopup || canSpend">
      <InputText v-model="quickUserNo" placeholder="ID karta raqami kiriting (balans bo'lmasa ham)" />
      <Button label="Qidirish" icon="pi pi-search" severity="secondary" @click="searchFromQuickInput" />
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
              v-if="canProvideService"
              icon="pi pi-send"
              severity="contrast"
              label="Xizmat ko'rsatish"
              size="small"
              @click="openServiceProvision(slotProps.data.userNo)"
            />
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
            <Button
              icon="pi pi-clock"
              severity="info"
              label="Tarix"
              size="small"
              @click="openHistory(slotProps.data.userNo)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showHistoryDialog" modal :header="`Balans tarixi: ${selectedUserNo}`" :style="{ width: '760px' }">
      <DataTable :value="historyItems" :loading="historyLoading" responsiveLayout="scroll">
        <Column field="createdAt" header="Sana">
          <template #body="slotProps">
            {{ new Date(slotProps.data.createdAt).toLocaleString() }}
          </template>
        </Column>
        <Column field="type" header="Tur">
          <template #body="slotProps">
            <Tag
              :severity="slotProps.data.direction === 'out' ? 'danger' : 'success'"
              :value="slotProps.data.direction === 'out' ? 'Yechish' : `To'ldirish`"
            />
          </template>
        </Column>
        <Column field="amount" header="Miqdor" />
        <Column field="comment" header="Izoh">
          <template #body="slotProps">
            {{ formatHistoryComment(slotProps.data) }}
          </template>
        </Column>
        <Column header="Vakil">
          <template #body="slotProps">
            <span v-if="slotProps.data.createdBy">
              {{ slotProps.data.createdBy.nickname }}
            </span>
            <span v-else>-</span>
          </template>
        </Column>
      </DataTable>
    </Dialog>

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
