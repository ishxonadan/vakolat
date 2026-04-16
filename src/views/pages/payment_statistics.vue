<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useToast } from "primevue/usetoast"
import apiService from "@/service/api.service"

const toast = useToast()
const loading = ref(false)
const periodPreset = ref("year_to_date")
const customRange = ref(null)
const stats = ref({
  from: null,
  to: null,
  dailyTopups: [],
  userSpending: [],
  summary: {
    dailyTopupsTotal: 0,
    dailyTopupsDays: 0,
    userSpendingTotal: 0,
    userSpendingUsers: 0,
  },
})

const periodOptions = [
  { label: "1-yanvardan hozirgacha", value: "year_to_date" },
  { label: "1-yanvar - 31-mart (1-chorak)", value: "q1" },
  { label: "1-yanvar - 30-iyun (2-chorak)", value: "q2" },
  { label: "1-yanvar - 20-dekabr", value: "dec20" },
  { label: "Custom", value: "custom" },
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
  const from = formatDateDisplay(stats.value.from)
  const to = formatDateDisplay(stats.value.to)
  return `${from} - ${to}`
})

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
      userSpending: Array.isArray(data?.userSpending) ? data.userSpending : [],
      summary: {
        dailyTopupsTotal: Number(data?.summary?.dailyTopupsTotal || 0),
        dailyTopupsDays: Number(data?.summary?.dailyTopupsDays || 0),
        userSpendingTotal: Number(data?.summary?.userSpendingTotal || 0),
        userSpendingUsers: Number(data?.summary?.userSpendingUsers || 0),
      },
    }
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
    toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "Custom davr uchun boshlanish va tugash sanasini tanlang", life: 3000 })
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

onMounted(loadPresetStatistics)
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4 gap-3 flex-wrap">
      <h1 class="text-xl font-semibold m-0">Pullik xizmatlar statistikasi</h1>
      <Tag severity="info" :value="`Davr: ${activePeriodLabel}`" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <Dropdown
        v-model="periodPreset"
        :options="periodOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Davrni tanlang"
      />
      <Calendar
        v-if="periodPreset === 'custom'"
        v-model="customRange"
        selectionMode="range"
        dateFormat="dd.mm.yy"
        showIcon
        :manualInput="false"
        placeholder="Custom davr"
      />
      <Button
        v-if="periodPreset === 'custom'"
        label="Custom davrni qo'llash"
        icon="pi pi-check"
        :loading="loading"
        @click="applyCustomRange"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
      <div class="surface-50 dark:surface-900 border-1 surface-border rounded-xl p-4">
        <div class="text-sm text-color-secondary mb-1">Kunlik to'ldirishlar yig'indisi</div>
        <div class="text-2xl font-semibold">{{ formatMoney(stats.summary.dailyTopupsTotal) }}</div>
        <div class="text-xs text-color-secondary mt-2">Kunlar soni: {{ stats.summary.dailyTopupsDays }}</div>
      </div>
      <div class="surface-50 dark:surface-900 border-1 surface-border rounded-xl p-4">
        <div class="text-sm text-color-secondary mb-1">Foydalanuvchilar xarajatlari yig'indisi</div>
        <div class="text-2xl font-semibold">{{ formatMoney(stats.summary.userSpendingTotal) }}</div>
        <div class="text-xs text-color-secondary mt-2">Foydalanuvchilar soni: {{ stats.summary.userSpendingUsers }}</div>
      </div>
    </div>

    <div class="mb-5">
      <h2 class="text-lg font-semibold mb-3">1) Kunlik to'ldirishlar</h2>
      <DataTable :value="stats.dailyTopups" :loading="loading" responsiveLayout="scroll">
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
    </div>

    <div>
      <h2 class="text-lg font-semibold mb-3">2) Foydalanuvchilar xarajati</h2>
      <DataTable :value="stats.userSpending" :loading="loading" responsiveLayout="scroll">
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
    </div>
  </div>
</template>
