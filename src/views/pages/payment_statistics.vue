<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useToast } from "primevue/usetoast"
import TabView from "primevue/tabview"
import TabPanel from "primevue/tabpanel"
import SelectButton from "primevue/selectbutton"
import apiService from "@/service/api.service"

const toast = useToast()
const route = useRoute()
const loading = ref(false)
const activeSectionIndex = ref(0)
const topupMonthPage = ref(0)
const spendingMonthPage = ref(0)
const periodPreset = ref("year_to_date")
const customRange = ref(null)
const stats = ref({
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
  { label: "1-yanvardan hozirgacha", value: "year_to_date" },
  { label: "1-chorak (1-yanvar - 31-mart)", value: "q1" },
  { label: "2-chorak (1-yanvar - 30-iyun)", value: "q2" },
  { label: "1-yanvar - 20-dekabr", value: "dec20" },
  { label: "Tanlash", value: "custom" },
]

const formatMoney = (value) => `${Math.trunc(Number(value || 0)).toLocaleString("uz-UZ")} so'm`
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

const getPresetRange = (preset) => {
  const now = new Date()
  const year = now.getFullYear()
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
    const data = await apiService.get("/members/payment/statistics", {
      params: {
        from: from ? formatDateToYmd(from) : undefined,
        to: to ? formatDateToYmd(to) : undefined,
      },
    })
    stats.value = {
      from: data?.from || null,
      to: data?.to || null,
      dailyTopups: Array.isArray(data?.dailyTopups) ? data.dailyTopups : [],
      dailyTopupsByMonth: Array.isArray(data?.dailyTopupsByMonth) ? data.dailyTopupsByMonth : [],
      userSpending: Array.isArray(data?.userSpending) ? data.userSpending : [],
      userSpendingByMonth: Array.isArray(data?.userSpendingByMonth) ? data.userSpendingByMonth : [],
      summary: {
        dailyTopupsTotal: Number(data?.summary?.dailyTopupsTotal || 0),
        dailyTopupsDays: Number(data?.summary?.dailyTopupsDays || 0),
        userSpendingTotal: Number(data?.summary?.userSpendingTotal || 0),
        userSpendingUsers: Number(data?.summary?.userSpendingUsers || 0),
      },
    }
    topupMonthPage.value = 0
    spendingMonthPage.value = 0
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
        <div class="text-sm text-color-secondary mb-1">To'ldirishlar yig'indisi</div>
        <div class="text-2xl font-semibold">{{ formatMoney(stats.summary.dailyTopupsTotal) }}</div>
        <div class="text-xs text-color-secondary mt-2">
          <i class="pi pi-calendar mr-1" />
          Kunlar soni: {{ stats.summary.dailyTopupsDays }}
        </div>
      </div>
      <div class="statistics-summary-card surface-50 dark:surface-900 border-1 surface-border rounded-xl p-4">
        <div class="text-sm text-color-secondary mb-1">Xarajatlar yig'indisi</div>
        <div class="text-2xl font-semibold">{{ formatMoney(stats.summary.userSpendingTotal) }}</div>
        <div class="text-xs text-color-secondary mt-2">
          <i class="pi pi-users mr-1" />
          Foydalanuvchilar soni: {{ stats.summary.userSpendingUsers }}
        </div>
      </div>
    </div>

    <TabView class="statistics-tabview" v-model:activeIndex="activeSectionIndex" @tab-change="onSectionTabChange">
      <TabPanel header="Kunlik to'ldirishlar">
        <div v-if="!currentTopupMonth" class="text-sm text-color-secondary mb-3">Ma'lumot topilmadi</div>
        <div v-if="topupMonthOptions.length > 0" class="mb-3">
          <label class="block text-sm font-medium text-color-secondary mb-2">Oy bo'yicha</label>
          <SelectButton
            v-model="topupMonthPage"
            :options="topupMonthOptions"
            optionLabel="label"
            optionValue="value"
            class="statistics-month-selector"
          />
        </div>
        <DataTable
          :value="currentTopupMonth?.items || []"
          :loading="loading"
          responsiveLayout="scroll"
          stripedRows
          showGridlines
        >
          <Column field="date" header="Sana">
            <template #body="slotProps">
              {{ formatYmdDisplay(slotProps.data.date) }}
            </template>
          </Column>
          <Column field="operationsCount" header="Amallar soni" />
          <Column field="totalAmount" header="Jami to'ldirish">
            <template #body="slotProps">
              {{ formatMoney(slotProps.data.totalAmount) }}
            </template>
          </Column>
        </DataTable>
      </TabPanel>
      <TabPanel header="Foydalanuvchilar xarajati">
        <div v-if="!currentSpendingMonth" class="text-sm text-color-secondary mb-3">Ma'lumot topilmadi</div>
        <div v-if="spendingMonthOptions.length > 0" class="mb-3">
          <label class="block text-sm font-medium text-color-secondary mb-2">Oy bo'yicha</label>
          <SelectButton
            v-model="spendingMonthPage"
            :options="spendingMonthOptions"
            optionLabel="label"
            optionValue="value"
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
          <Column field="userNo" header="ID karta raqami" />
          <Column field="userName" header="F.I.Sh">
            <template #body="slotProps">
              {{ slotProps.data.userName || "-" }}
            </template>
          </Column>
          <Column field="operationsCount" header="Harajat amallari soni" />
          <Column field="totalSpent" header="Jami xarajat">
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
  transition: box-shadow 0.2s ease;
}

.statistics-summary-card:hover {
  box-shadow: 0 6px 22px color-mix(in srgb, var(--surface-900), transparent 88%);
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

</style>
