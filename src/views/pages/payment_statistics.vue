<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useToast } from "primevue/usetoast"
import TabView from "primevue/tabview"
import TabPanel from "primevue/tabpanel"
import SelectButton from "primevue/selectbutton"
import apiService from "@/service/api.service"
import {
  paymentTransactionDirectionLabel,
  paymentTransactionTypeLabel,
} from "@/utils/paymentLabels"

const toast = useToast()
const route = useRoute()
const loading = ref(false)
const activeSectionIndex = ref(0)
const topupMonthPage = ref(0)
const spendingMonthPage = ref(0)
const periodPreset = ref("this_month")
const customRange = ref(null)
const dayDetailsLoading = ref(false)
const selectedDetailDate = ref("")
const selectedDayTransactions = ref([])
const expandedTopupRows = ref({})
const stats = ref({
  year: new Date().getFullYear(),
  from: null,
  to: null,
  dailyTopups: [],
  dailyTopupsByMonth: [],
  userSpending: [],
  userSpendingByMonth: [],
  summary: {
    dailyTopupsTotal: 0,
    dailyTopupsDays: 0,
    userSpendingTotal: 0,
    userSpendingUsers: 0,
  },
})

const periodOptions = [
  { label: "Shu oy", value: "this_month" },
  { label: "1-yanvardan hozirgacha", value: "year_to_date" },
  { label: "1-chorak (1-yanvar - 31-mart)", value: "q1" },
  { label: "2-chorak (1-yanvar - 30-iyun)", value: "q2" },
  { label: "Yil davomida (1-yanvar - 20-dekabr)", value: "dec20" },
  { label: "Tanlash", value: "custom" },
]

const formatMoneyNumber = (value) => Math.trunc(Number(value || 0)).toLocaleString("uz-UZ")
const formatMoney = (value) => `${formatMoneyNumber(value)} so'm`
const pad2 = (value) => String(value).padStart(2, "0")
const formatDateToYmd = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}
const formatDateDisplay = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("uz-UZ")
}
const formatDateTimeDisplay = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("uz-UZ")
}
const formatYmdDisplay = (value) => {
  if (!value) return "-"
  const [year, month, day] = String(value).split("-")
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}
const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
]
const formatMonthLabel = (monthKey) => {
  if (!monthKey) return "-"
  const [yearStr, monthStr] = String(monthKey).split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return String(monthKey)
  return `${UZ_MONTHS[month - 1]} ${year}`
}
const resolveMonthKeysInRange = (fromValue, toValue, fallbackBuckets = []) => {
  const fromDate = new Date(fromValue)
  const toDate = new Date(toValue)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return (Array.isArray(fallbackBuckets) ? fallbackBuckets : [])
      .map((item) => String(item?.month || "").trim())
      .filter(Boolean)
  }
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1)
  const monthKeys = []
  const cursor = new Date(start)
  while (cursor <= end) {
    monthKeys.push(`${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return monthKeys
}
const normalizeMonthBuckets = (buckets, fromValue, toValue) => {
  const items = Array.isArray(buckets) ? buckets : []
  const byMonth = new Map(
    items
      .filter((item) => item && item.month)
      .map((item) => [String(item.month), item]),
  )
  const monthKeys = resolveMonthKeysInRange(fromValue, toValue, items)
  return monthKeys.map((month) => {
    const existing = byMonth.get(month)
    const normalizedItems = Array.isArray(existing?.items) ? [...existing.items] : []
    normalizedItems.sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")))
    return {
      month,
      items: normalizedItems,
    }
  })
}

const getPresetRange = (preset) => {
  const now = new Date()
  const year = now.getFullYear()
  if (preset === "this_month") {
    return { from: new Date(year, now.getMonth(), 1), to: now }
  }
  const from = new Date(year, 0, 1)
  if (preset === "q1") return { from, to: new Date(year, 2, 31) }
  if (preset === "q2") return { from, to: new Date(year, 5, 30) }
  if (preset === "dec20") return { from, to: new Date(year, 11, 20) }
  return { from, to: now }
}

const activePeriodLabel = computed(() => {
  const presetLabel = periodOptions.find((option) => option.value === periodPreset.value)?.label
  if (periodPreset.value !== "custom" && presetLabel) {
    return presetLabel
  }
  const from = formatDateDisplay(stats.value.from)
  const to = formatDateDisplay(stats.value.to)
  return `${from} - ${to}`
})
const activePresetLabel = computed(() => periodOptions.find((option) => option.value === periodPreset.value)?.label || "Davr")
const totalTopupOperations = computed(() =>
  (Array.isArray(stats.value.dailyTopups) ? stats.value.dailyTopups : []).reduce(
    (sum, item) => sum + Number(item?.operationsCount || 0),
    0,
  ),
)
const isPeriodOptionDisabled = (value) => {
  const now = new Date()
  const year = now.getFullYear()
  if (value === "q1") {
    return now < new Date(year, 3, 1) // enabled from April 1
  }
  if (value === "q2") {
    return now < new Date(year, 6, 1) // enabled from July 1
  }
  if (value === "dec20") {
    return now < new Date(year, 11, 1) // enabled from December 1
  }
  return false
}
const presetButtons = computed(() =>
  periodOptions.map((option) => ({
    ...option,
    disabled: isPeriodOptionDisabled(option.value),
  })),
)

const loadStatistics = async ({ from, to } = {}) => {
  try {
    loading.value = true
    const now = new Date()
    const ytdFrom = new Date(now.getFullYear(), 0, 1)
    const [selectedRangeData, ytdData] = await Promise.all([
      apiService.get("/members/payment/statistics", {
        params: {
          from: from ? formatDateToYmd(from) : undefined,
          to: to ? formatDateToYmd(to) : undefined,
        },
      }),
      apiService.get("/members/payment/statistics", {
        params: {
          from: formatDateToYmd(ytdFrom),
          to: formatDateToYmd(now),
        },
      }),
    ])
    const normalizedTopups = normalizeMonthBuckets(
      ytdData?.dailyTopupsByMonth,
      ytdData?.from || ytdFrom,
      ytdData?.to || now,
    )
    const normalizedSpending = normalizeMonthBuckets(
      ytdData?.userSpendingByMonth,
      ytdData?.from || ytdFrom,
      ytdData?.to || now,
    )
    stats.value = {
      year: new Date(selectedRangeData?.from || Date.now()).getFullYear(),
      from: selectedRangeData?.from || null,
      to: selectedRangeData?.to || null,
      dailyTopups: Array.isArray(selectedRangeData?.dailyTopups) ? selectedRangeData.dailyTopups : [],
      dailyTopupsByMonth: normalizedTopups,
      userSpending: Array.isArray(selectedRangeData?.userSpending) ? selectedRangeData.userSpending : [],
      userSpendingByMonth: normalizedSpending,
      summary: {
        dailyTopupsTotal: Number(selectedRangeData?.summary?.dailyTopupsTotal || 0),
        dailyTopupsDays: Number(selectedRangeData?.summary?.dailyTopupsDays || 0),
        userSpendingTotal: Number(selectedRangeData?.summary?.userSpendingTotal || 0),
        userSpendingUsers: Number(selectedRangeData?.summary?.userSpendingUsers || 0),
      },
    }
    topupMonthPage.value = Math.max((stats.value.dailyTopupsByMonth?.length || 1) - 1, 0)
    spendingMonthPage.value = Math.max((stats.value.userSpendingByMonth?.length || 1) - 1, 0)
    selectedDetailDate.value = ""
    selectedDayTransactions.value = []
    expandedTopupRows.value = {}
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

const loadPresetStatistics = async () => {
  const range = getPresetRange(periodPreset.value)
  await loadStatistics(range)
}

const applyCustomRange = async () => {
  const values = Array.isArray(customRange.value) ? customRange.value : []
  if (values.length < 2 || !values[0] || !values[1]) {
    toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "Tanlash davri uchun boshlanish va tugash sanasini tanlang", life: 3000 })
    return
  }
  const first = new Date(values[0])
  const second = new Date(values[1])
  const from = first <= second ? first : second
  const to = first <= second ? second : first
  await loadStatistics({ from, to })
}

const loadDayDetails = async (dateYmd) => {
  if (!dateYmd) return
  try {
    dayDetailsLoading.value = true
    const data = await apiService.get("/members/payment/transactions", {
      params: {
        page: 1,
        limit: 200,
        type: "top_up",
        from: `${dateYmd}T00:00:00`,
        to: `${dateYmd}T23:59:59.999`,
      },
    })
    selectedDetailDate.value = dateYmd
    selectedDayTransactions.value = Array.isArray(data?.items) ? data.items : []
    const total = Number(data?.total || 0)
    if (total > selectedDayTransactions.value.length) {
      toast.add({
        severity: "warn",
        summary: "Ogohlantirish",
        detail: "Bir kun uchun 200 tadan ortiq tranzaksiya bor. Birinchi 200 tasi ko'rsatildi.",
        life: 3500,
      })
    }
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    dayDetailsLoading.value = false
  }
}

const openDayDetails = async (row) => {
  const dateYmd = String(row?.date || "").trim()
  if (!dateYmd) return
  const isSameRowOpen = selectedDetailDate.value === dateYmd && expandedTopupRows.value?.[dateYmd]
  if (isSameRowOpen) {
    expandedTopupRows.value = {}
    selectedDetailDate.value = ""
    selectedDayTransactions.value = []
    return
  }
  expandedTopupRows.value = { [dateYmd]: true }
  await loadDayDetails(dateYmd)
}

watch(periodPreset, async (value) => {
  if (value === "custom") return
  await loadPresetStatistics()
})

watch(
  () => route.fullPath,
  () => {
    activeSectionIndex.value = 0
  },
  { immediate: true },
)

onMounted(async () => {
  await loadPresetStatistics()
})

const currentTopupMonth = computed(() => stats.value.dailyTopupsByMonth[topupMonthPage.value] || null)
const currentSpendingMonth = computed(() => stats.value.userSpendingByMonth[spendingMonthPage.value] || null)
const topupMonthOptions = computed(() =>
  stats.value.dailyTopupsByMonth.map((item, index) => ({
    label: formatMonthLabel(item.month),
    value: index,
  })),
)
const spendingMonthOptions = computed(() =>
  stats.value.userSpendingByMonth.map((item, index) => ({
    label: formatMonthLabel(item.month),
    value: index,
  })),
)

const onTopupMonthPage = (event) => {
  topupMonthPage.value = event.page || 0
}
const onSpendingMonthPage = (event) => {
  spendingMonthPage.value = event.page || 0
}
const onSectionTabChange = (event) => {
  activeSectionIndex.value = Number(event?.index || 0)
}
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-start mb-4 gap-3 flex-wrap">
      <h1 class="text-xl font-semibold m-0">Pullik xizmatlar statistikasi</h1>
      <div class="flex flex-column gap-2 align-items-end">
        <Tag severity="contrast" :value="`Davr: ${activePeriodLabel}`" />
        <Tag severity="info" :value="`Tanlangan: ${activePresetLabel}`" />
      </div>
    </div>
    <p class="text-sm text-color-secondary mt-0 mb-4">
      Kunlik to'ldirishlar va foydalanuvchi xarajatlari bo'yicha boshqaruv ko'rinishi.
    </p>

    <div class="flex flex-wrap gap-2 mb-4">
      <Button
        v-for="option in presetButtons"
        :key="option.value"
        :label="option.label"
        size="small"
        :severity="periodPreset === option.value ? 'primary' : 'secondary'"
        :outlined="periodPreset !== option.value"
        :disabled="option.disabled"
        @click="periodPreset = option.value"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
      <Calendar
        v-if="periodPreset === 'custom'"
        v-model="customRange"
        selectionMode="range"
        dateFormat="dd.mm.yy"
        showIcon
        :manualInput="false"
        placeholder="Tanlash davri"
      />
      <Button
        v-if="periodPreset === 'custom'"
        label="Tanlangan davrni qo'llash"
        icon="pi pi-check"
        severity="success"
        :loading="loading"
        @click="applyCustomRange"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
      <div class="statistics-summary-card surface-50 dark:surface-900 border-1 surface-border rounded-xl p-4">
        <h3 class="payment-stat-title">To'ldirishlar yig'indisi</h3>
        <p class="payment-stat-subtitle">Jami tushum (so'm)</p>
        <div class="payment-stat-number topup-number">
          {{ formatMoneyNumber(stats.summary.dailyTopupsTotal) }}
        </div>
        <div class="payment-stat-meta">
          <i class="pi pi-calendar mr-1" />
          Amallar soni: {{ totalTopupOperations }}
        </div>
      </div>
      <div class="statistics-summary-card surface-50 dark:surface-900 border-1 surface-border rounded-xl p-4">
        <h3 class="payment-stat-title">Xarajatlar yig'indisi</h3>
        <p class="payment-stat-subtitle">Jami chiqim (so'm)</p>
        <div class="payment-stat-number spending-number">
          {{ formatMoneyNumber(stats.summary.userSpendingTotal) }}
        </div>
        <div class="payment-stat-meta">
          <i class="pi pi-users mr-1" />
          Foydalanuvchilar soni: {{ stats.summary.userSpendingUsers }}
        </div>
      </div>
    </div>

    <TabView class="statistics-tabview" v-model:activeIndex="activeSectionIndex" @tab-change="onSectionTabChange">
      <TabPanel header="Kunlik to'ldirishlar">
        <div v-if="!currentTopupMonth" class="text-sm text-color-secondary mb-3">Ma'lumot topilmadi</div>
        <div v-if="topupMonthOptions.length > 0" class="mb-3">
          <SelectButton
            v-model="topupMonthPage"
            :options="topupMonthOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            class="statistics-month-selector"
          />
        </div>
        <DataTable
          :value="currentTopupMonth?.items || []"
          :loading="loading"
          v-model:expandedRows="expandedTopupRows"
          dataKey="date"
          responsiveLayout="scroll"
          stripedRows
          showGridlines
        >
          <Column field="date" header="Sana" sortable>
            <template #body="slotProps">
              {{ formatYmdDisplay(slotProps.data.date) }}
            </template>
          </Column>
          <Column field="operationsCount" header="Amallar soni" sortable />
          <Column field="totalAmount" header="Jami to'ldirish" sortable>
            <template #body="slotProps">
              {{ formatMoney(slotProps.data.totalAmount) }}
            </template>
          </Column>
          <Column header="Batafsil">
            <template #body="slotProps">
              <Button
                size="small"
                :label="selectedDetailDate === slotProps.data.date && expandedTopupRows?.[slotProps.data.date] ? 'Yopish' : 'Batafsil'"
                :icon="selectedDetailDate === slotProps.data.date && expandedTopupRows?.[slotProps.data.date] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                text
                class="detail-toggle-btn"
                :loading="dayDetailsLoading && selectedDetailDate === slotProps.data.date"
                @click="openDayDetails(slotProps.data)"
              />
            </template>
          </Column>
          <template #expansion="slotProps">
            <div class="p-2">
              <div class="flex justify-between items-center mb-2 gap-2 flex-wrap">
                <h3 class="m-0 text-base font-semibold">
                  {{ formatYmdDisplay(slotProps.data.date) }} kuni tranzaksiyalar
                </h3>
                <Tag
                  severity="info"
                  :value="`Jami: ${selectedDetailDate === slotProps.data.date ? selectedDayTransactions.length : 0} ta`"
                />
              </div>
              <DataTable
                :value="selectedDetailDate === slotProps.data.date ? selectedDayTransactions : []"
                :loading="dayDetailsLoading && selectedDetailDate === slotProps.data.date"
                responsiveLayout="scroll"
                stripedRows
                showGridlines
              >
                <Column field="createdAt" header="Sana va vaqt">
                  <template #body="detailsSlotProps">
                    {{ formatDateTimeDisplay(detailsSlotProps.data.createdAt) }}
                  </template>
                </Column>
                <Column field="userNo" header="ID karta raqami" />
                <Column field="userName" header="F.I.Sh">
                  <template #body="detailsSlotProps">
                    {{ detailsSlotProps.data.userName || "-" }}
                  </template>
                </Column>
                <Column field="type" header="Amal turi">
                  <template #body="detailsSlotProps">
                    {{ paymentTransactionTypeLabel(detailsSlotProps.data.type) }}
                  </template>
                </Column>
                <Column field="direction" header="Yo'nalish">
                  <template #body="detailsSlotProps">
                    {{ paymentTransactionDirectionLabel(detailsSlotProps.data.direction) }}
                  </template>
                </Column>
                <Column field="amount" header="Miqdor">
                  <template #body="detailsSlotProps">
                    {{ formatMoney(detailsSlotProps.data.amount) }}
                  </template>
                </Column>
                <Column field="balanceBefore" header="Amalgacha balans">
                  <template #body="detailsSlotProps">
                    {{ formatMoney(detailsSlotProps.data.balanceBefore) }}
                  </template>
                </Column>
                <Column header="To'ldirib bergan xodim">
                  <template #body="detailsSlotProps">
                    {{ detailsSlotProps.data.createdBy?.nickname || "-" }}
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </DataTable>
      </TabPanel>
      <TabPanel header="Foydalanuvchilar xarajati">
        <div v-if="!currentSpendingMonth" class="text-sm text-color-secondary mb-3">Ma'lumot topilmadi</div>
        <div v-if="spendingMonthOptions.length > 0" class="mb-3">
          <SelectButton
            v-model="spendingMonthPage"
            :options="spendingMonthOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            class="statistics-month-selector"
          />
        </div>
        <DataTable
          :value="currentSpendingMonth?.items || []"
          :loading="loading"
          responsiveLayout="scroll"
          stripedRows
          showGridlines
          sortField="totalSpent"
          :sortOrder="-1"
        >
          <Column header="#">
            <template #body="slotProps">
              {{ slotProps.index + 1 }}
            </template>
          </Column>
          <Column field="userNo" header="ID karta raqami" sortable />
          <Column field="userName" header="F.I.Sh" sortable>
            <template #body="slotProps">
              {{ slotProps.data.userName || "-" }}
            </template>
          </Column>
          <Column field="operationsCount" header="Harajat amallari soni" sortable />
          <Column field="totalSpent" header="Jami xarajat" sortable>
            <template #body="slotProps">
              {{ formatMoney(slotProps.data.totalSpent) }}
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>
  </div>
</template>

<style scoped>
.statistics-summary-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
  transition: box-shadow 0.2s ease;
}

.statistics-summary-card:hover {
  box-shadow: var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.payment-stat-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 3px 0;
  line-height: 1.2;
}

.payment-stat-subtitle {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin: 0 0 10px 0;
}

.payment-stat-number {
  font-size: clamp(1.9rem, 3vw, 2.5rem);
  font-weight: 700;
  line-height: 1;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.topup-number {
  color: #10b981;
}

.spending-number {
  color: #ef4444;
}

.payment-stat-meta {
  margin-top: 8px;
  color: var(--text-color-secondary);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.statistics-month-selector :deep(.p-togglebutton) {
  text-transform: capitalize;
  border-radius: 9999px;
  padding: 0.4rem 0.95rem;
  margin: 0;
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  transition: all 0.2s ease;
}

.statistics-month-selector :deep(.p-selectbutton) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.statistics-month-selector :deep(.p-togglebutton:not(.p-highlight):hover) {
  background: color-mix(in srgb, var(--surface-200), transparent 40%);
  border-color: color-mix(in srgb, var(--primary-color), var(--surface-border) 75%);
}

.statistics-month-selector :deep(.p-togglebutton.p-highlight) {
  background: color-mix(in srgb, var(--primary-color), #fff 88%);
  border-color: color-mix(in srgb, var(--primary-color), #000 5%);
  color: var(--primary-color);
  font-weight: 600;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--primary-color), transparent 82%);
}

.statistics-month-selector :deep(.p-togglebutton .p-button-label) {
  font-size: 0.92rem;
}

.detail-toggle-btn {
  border-radius: 9999px;
  padding: 0.25rem 0.65rem;
  color: var(--primary-color);
  font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--primary-color), var(--surface-border) 72%);
  background: color-mix(in srgb, var(--primary-color), transparent 94%);
  transition: all 0.2s ease;
}

.detail-toggle-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary-color), transparent 88%);
  border-color: color-mix(in srgb, var(--primary-color), var(--surface-border) 55%);
}

.detail-toggle-btn:deep(.p-button-icon) {
  font-size: 0.78rem;
}

.detail-toggle-btn:deep(.p-button-label) {
  font-size: 0.82rem;
}


</style>
