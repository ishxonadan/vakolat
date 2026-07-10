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
  summary: {
    totalDocuments: 0,
    activeDocuments: 0,
    dissertatsiyaCount: 0,
    avtoreferatCount: 0,
    registeredUsers: 0,
    directionsCount: 0,
    pageViews: 0,
    searchQueries: 0,
    downloads: 0,
  },
})

const periodOptions = [
  { label: "1-yanvardan hozirgacha", value: "year_to_date" },
  { label: "1-chorak (1-yanvar - 31-mart)", value: "q1" },
  { label: "2-chorak (1-aprel - 30-iyun)", value: "q2" },
  { label: "3-chorak (1-iyul - 30-sentabr)", value: "q3" },
  { label: "Yillik (1-yanvar - 31-dekabr)", value: "yearly" },
  { label: "Tanlash", value: "custom" },
]

const statCards = computed(() => [
  {
    key: "totalDocuments",
    title: "Umumiy yozuvlar soni",
    value: stats.value.summary.totalDocuments,
    periodScoped: false,
    icon: "pi pi-database",
    color: "var(--primary-color)",
  },
  {
    key: "activeDocuments",
    title: "Ulardan faol hujjatlar",
    value: stats.value.summary.activeDocuments,
    periodScoped: false,
    icon: "pi pi-check-circle",
    color: "#10b981",
  },
  {
    key: "dissertatsiyaCount",
    title: "Dissertatsiya",
    value: stats.value.summary.dissertatsiyaCount,
    periodScoped: false,
    icon: "pi pi-book",
    color: "#3b82f6",
  },
  {
    key: "avtoreferatCount",
    title: "Avtoreferat",
    value: stats.value.summary.avtoreferatCount,
    periodScoped: false,
    icon: "pi pi-file",
    color: "#8b5cf6",
  },
  {
    key: "registeredUsers",
    title: "Umumiy ro'yxatdan o'tgan foydalanuvchilar soni",
    value: stats.value.summary.registeredUsers,
    periodScoped: false,
    icon: "pi pi-users",
    color: "#0ea5e9",
  },
  {
    key: "directionsCount",
    title: "Yo'nalishlar soni",
    value: stats.value.summary.directionsCount,
    periodScoped: false,
    icon: "pi pi-sitemap",
    color: "#f59e0b",
  },
  {
    key: "pageViews",
    title: "Ko'rilgan sahifalar",
    value: stats.value.summary.pageViews,
    periodScoped: true,
    icon: "pi pi-eye",
    color: "#14b8a6",
  },
  {
    key: "searchQueries",
    title: "Qidiruv so'rovnomalari",
    value: stats.value.summary.searchQueries,
    periodScoped: true,
    icon: "pi pi-search",
    color: "#6366f1",
  },
  {
    key: "downloads",
    title: "Yuklanganlar soni",
    value: stats.value.summary.downloads,
    periodScoped: true,
    icon: "pi pi-download",
    color: "#ef4444",
  },
])

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
const formatNumber = (value) => Number(value || 0).toLocaleString("uz-UZ")

const getPresetRange = (preset) => {
  const now = new Date()
  const year = now.getFullYear()
  const yearStart = new Date(year, 0, 1)

  if (preset === "q1") return { from: yearStart, to: new Date(year, 2, 31) }
  if (preset === "q2") return { from: new Date(year, 3, 1), to: new Date(year, 5, 30) }
  if (preset === "q3") return { from: new Date(year, 6, 1), to: new Date(year, 8, 30) }
  if (preset === "yearly") return { from: yearStart, to: new Date(year, 11, 31) }
  return { from: yearStart, to: now }
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

const isPeriodOptionDisabled = (value) => {
  const now = new Date()
  const year = now.getFullYear()
  if (value === "q1") return now < new Date(year, 3, 1)
  if (value === "q2") return now < new Date(year, 6, 1)
  if (value === "q3") return now < new Date(year, 9, 1)
  if (value === "yearly") return now < new Date(year, 11, 1)
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
    const data = await apiService.get("/diss/statistics", {
      params: {
        from: from ? formatDateToYmd(from) : undefined,
        to: to ? formatDateToYmd(to) : undefined,
      },
    })
    stats.value = {
      from: data?.from || null,
      to: data?.to || null,
      summary: {
        totalDocuments: Number(data?.summary?.totalDocuments || 0),
        activeDocuments: Number(data?.summary?.activeDocuments || 0),
        dissertatsiyaCount: Number(data?.summary?.dissertatsiyaCount || 0),
        avtoreferatCount: Number(data?.summary?.avtoreferatCount || 0),
        registeredUsers: Number(data?.summary?.registeredUsers || 0),
        directionsCount: Number(data?.summary?.directionsCount || 0),
        pageViews: Number(data?.summary?.pageViews || 0),
        searchQueries: Number(data?.summary?.searchQueries || 0),
        downloads: Number(data?.summary?.downloads || 0),
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
    toast.add({
      severity: "warn",
      summary: "Ogohlantirish",
      detail: "Tanlash davri uchun boshlanish va tugash sanasini tanlang",
      life: 3000,
    })
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

onMounted(async () => {
  await loadPresetStatistics()
})
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-start mb-4 gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold m-0">Dissertatsiya statistikasi</h1>
        <p class="text-sm text-color-secondary mt-2 mb-0">
          Hujjatlar, foydalanuvchilar va faollik ko'rsatkichlari bo'yicha umumiy ko'rinish.
        </p>
      </div>
      <Tag severity="contrast" :value="`Davr: ${activePeriodLabel}`" />
    </div>

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

    <div class="diss-stats-grid">
      <div
        v-for="card in statCards"
        :key="card.key"
        class="diss-stat-card surface-50 dark:surface-900 border-1 surface-border rounded-xl p-4"
        :class="{ 'diss-stat-card--period': card.periodScoped }"
      >
        <div class="flex justify-between items-start gap-3 mb-3">
          <h3 class="diss-stat-title m-0">{{ card.title }}</h3>
          <i :class="card.icon" class="diss-stat-icon" :style="{ color: card.color }" />
        </div>
        <div class="diss-stat-number" :style="{ color: card.color }">
          <span v-if="loading" class="pi pi-spin pi-spinner text-2xl" />
          <span v-else>{{ formatNumber(card.value) }} ta</span>
        </div>
        <div v-if="card.periodScoped" class="diss-stat-meta">
          Tanlangan davr bo'yicha
        </div>
        <div v-else class="diss-stat-meta">
          Umumiy ko'rsatkich
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diss-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.diss-stat-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.diss-stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.diss-stat-card--period {
  border-color: color-mix(in srgb, var(--primary-color), var(--surface-border) 70%);
}

.diss-stat-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1.35;
}

.diss-stat-icon {
  font-size: 1.15rem;
  opacity: 0.9;
}

.diss-stat-number {
  font-size: clamp(1.8rem, 3vw, 2.35rem);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.diss-stat-meta {
  margin-top: 0.65rem;
  color: var(--text-color-secondary);
  font-size: 0.78rem;
}
</style>
