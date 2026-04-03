<script setup>
import { ref, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import { useToast } from "primevue/usetoast"
import authService from "@/service/auth.service"
import apiService from "@/service/api.service"
import { paymentTransactionTypeLabel } from "@/utils/paymentLabels"
import { pageSize, ROWS_PER_PAGE_OPTIONS } from "@/service/pagination.service"

const toast = useToast()
const router = useRouter()
const loading = ref(false)
const items = ref([])
const total = ref(0)
const page = ref(1)
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
const canViewOverview = authService.hasPermission("payment_view_overview_stats")
const canViewUserTransactions = authService.hasPermission("payment_view_transactions")
const canQuickSearch = authService.hasAnyPermission([
  "payment_list_accounts",
  "payment_topup_user",
  "payment_withdraw_user",
])

const formatMoney = (value) => `${Math.trunc(Number(value || 0)).toLocaleString("uz-UZ")} so'm`
const normalizeUserNoInput = (value) => {
  const raw = String(value || "").trim().toUpperCase()
  if (/^\d{9}$/.test(raw)) return `AAA${raw}`
  return raw
}
const statCards = [
  {
    key: "overallMoneyInBalances",
    title: "Balanslarda pul",
    subtitle: "Hozirgi qoldiq",
    icon: "pi pi-wallet",
    stripe: "border-l-[4px] border-l-emerald-500",
    iconWrap:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    key: "overallSpending",
    title: "Umumiy xarajat",
    subtitle: "Barcha davr",
    icon: "pi pi-arrow-down",
    stripe: "border-l-[4px] border-l-blue-500",
    iconWrap: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    key: "spendingThisMonth",
    title: "Shu oy xarajat",
    subtitle: "Oy boshidan",
    icon: "pi pi-calendar",
    stripe: "border-l-[4px] border-l-amber-500",
    iconWrap: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    key: "spendingThisYear",
    title: "Yillik xarajat",
    subtitle: "1-yanvardan",
    icon: "pi pi-chart-bar",
    stripe: "border-l-[4px] border-l-rose-500",
    iconWrap: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
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
        limit: pageSize.value,
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
  if (event.rows != null && event.rows !== pageSize.value) {
    pageSize.value = event.rows
    return
  }
  page.value = event.page + 1
  loadBalances()
}

watch(pageSize, () => {
  page.value = 1
  loadBalances()
})

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
  const tasks = [loadBalances()]
  if (canViewOverview) tasks.push(loadOverview())
  await Promise.all(tasks)
})
</script>

<template>
  <div class="card">
    <section v-if="canViewOverview" class="payment-balances-overview mb-5">
      <h2 class="text-base font-semibold text-color mb-1">Umumiy ko'rsatkichlar</h2>
      <p class="text-color-secondary text-sm mb-4 m-0">
        Pullik modul bo'yicha jamlanma — balanslar va xarajat dinamikasi.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          v-for="card in statCards"
          :key="card.key"
          class="payment-balances-stat-card surface-card border-1 surface-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 h-full"
          :class="card.stripe"
        >
          <div class="p-4 pl-5">
            <div class="flex align-items-start justify-content-between gap-3 mb-3">
              <div class="min-w-0 flex-1 pr-2">
                <div class="font-semibold text-color leading-snug mb-1">{{ card.title }}</div>
                <div class="text-color-secondary text-sm leading-normal">{{ card.subtitle }}</div>
              </div>
              <div
                class="w-11 h-11 rounded-xl flex align-items-center justify-content-center shrink-0 text-lg"
                :class="card.iconWrap"
                aria-hidden="true"
              >
                <i :class="card.icon"></i>
              </div>
            </div>
            <div class="text-2xl sm:text-3xl font-bold text-color tabular-nums tracking-tight leading-tight">
              <span v-if="overviewLoading" class="inline-block min-h-[2rem] animate-pulse text-color-secondary">…</span>
              <span v-else>{{ formatMoney(overview[card.key]) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">Foydalanuvchi balanslari</h1>
    </div>
    <div class="flex flex-wrap items-center gap-2 mb-4" v-if="canQuickSearch || canTopup || canSpend">
      <InputText
        v-model="quickUserNo"
        name="vakolat-payment-balances-user-no"
        class="payment-balances-quick-user flex-1 min-w-[min(100%,20rem)] max-w-4xl w-full sm:min-w-[28rem]"
        placeholder="ID karta raqami kiriting (balans bo'lmasa ham)"
        autocomplete="off"
        autocapitalize="characters"
        autocorrect="off"
        spellcheck="false"
        data-lpignore="true"
        data-1p-ignore
      />
      <Button label="Qidirish" icon="pi pi-search" severity="secondary" @click="searchFromQuickInput" />
      <Button v-if="canTopup" label="To'ldirish" icon="pi pi-plus" severity="success" @click="openAction('topup', quickUserNo)" />
      <Button v-if="canSpend" label="Yechish" icon="pi pi-minus" severity="danger" @click="openAction('spend', quickUserNo)" />
    </div>

    <DataTable
      :value="items"
      :loading="loading"
      :rows="pageSize"
      :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS"
      :totalRecords="total"
      :paginator="true"
      :lazy="true"
      :first="(page - 1) * pageSize"
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
              v-if="canViewUserTransactions"
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
        <Column field="type" header="Amal turi">
          <template #body="slotProps">
            <Tag
              :severity="slotProps.data.direction === 'out' ? 'danger' : 'success'"
              :value="paymentTransactionTypeLabel(slotProps.data.type)"
            />
          </template>
        </Column>
        <Column field="amount" header="Miqdor" />
        <Column field="comment" header="Izoh">
          <template #body="slotProps">
            {{ formatHistoryComment(slotProps.data) }}
          </template>
        </Column>
        <Column header="Xodim">
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
