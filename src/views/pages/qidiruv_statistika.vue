<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useToast } from "primevue/usetoast"
import apiService from "@/service/api.service"

const toast = useToast()
const loading = ref(false)
const periodPreset = ref("7d")
const customRange = ref(null)
const stats = ref({
  visits: 0,
  pageviews: 0,
  from: null,
  to: null,
  page: "/search/tot/result",
})

const periodOptions = [
  { label: "Bugun", value: "today" },
  { label: "3 kun", value: "3d" },
  { label: "7 kun", value: "7d" },
  { label: "Shu oy", value: "this_month" },
  { label: "1-yanvardan hozirgacha", value: "year_to_date" },
  { label: "1-chorak (1-yanvar - 31-mart)", value: "q1" },
  { label: "2-chorak (1-yanvar - 30-iyun)", value: "q2" },
  { label: "Yil davomida (1-yanvar - 20-dekabr)", value: "dec20" },
  { label: "Tanlash", value: "custom" },
]

const pad2 = (value) => String(value).padStart(2, "0")
const formatDateToYmd = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}
const formatDateDisplay = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("uz-UZ")
}

const isPeriodOptionDisabled = (value) => {
  const now = new Date()
  const year = now.getFullYear()
  if (value === "q1") return now < new Date(year, 3, 1)
  if (value === "q2") return now < new Date(year, 6, 1)
  if (value === "dec20") return now < new Date(year, 11, 1)
  return false
}

const presetButtons = computed(() =>
  periodOptions.map((option) => ({
    ...option,
    disabled: isPeriodOptionDisabled(option.value),
  })),
)

const activePresetLabel = computed(
  () => periodOptions.find((option) => option.value === periodPreset.value)?.label || "Davr",
)

const activePeriodLabel = computed(() => {
  const from = formatDateDisplay(stats.value.from)
  const to = formatDateDisplay(stats.value.to)
  if (from && to) return `${from} — ${to}`
  return activePresetLabel.value
})

const formattedVisits = computed(() => Number(stats.value.visits || 0).toLocaleString("uz-UZ"))
const formattedPageviews = computed(() => Number(stats.value.pageviews || 0).toLocaleString("uz-UZ"))

const loadStatistics = async () => {
  if (periodPreset.value === "custom") return
  await fetchStatistics({ period: periodPreset.value })
}

const fetchStatistics = async (params) => {
  try {
    loading.value = true
    const data = await apiService.get("/search-stats", { params })
    stats.value = {
      visits: Number(data?.visits || 0),
      pageviews: Number(data?.pageviews || 0),
      from: data?.from || null,
      to: data?.to || null,
      page: data?.page || "/search/tot/result",
    }
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: error?.message || "Statistika yuklanmadi",
      life: 3500,
    })
  } finally {
    loading.value = false
  }
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
  await fetchStatistics({
    period: "custom",
    from: formatDateToYmd(from),
    to: formatDateToYmd(to),
  })
}

watch(periodPreset, async (value) => {
  if (value === "custom") return
  await loadStatistics()
})

onMounted(() => {
  loadStatistics()
})
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-start mb-4 gap-3 flex-wrap">
      <h1 class="text-xl font-semibold m-0">Statistika</h1>
      <div class="flex flex-column gap-2 align-items-end">
        <Tag severity="contrast" :value="`Davr: ${activePeriodLabel}`" />
        <Tag severity="info" :value="`Tanlangan: ${activePresetLabel}`" />
      </div>
    </div>
    <p class="text-sm text-color-secondary mt-0 mb-4">
      Saytda qidiruv natijalari sahifasi (<span class="font-mono">{{ stats.page }}</span>) necha marta ochilgani.
    </p>

    <div class="flex flex-wrap gap-2 mb-4">
      <Button
        v-for="option in presetButtons"
        :key="option.value"
        :label="option.label"
        size="small"
        :severity="periodPreset === option.value ? 'primary' : 'secondary'"
        :outlined="periodPreset !== option.value"
        :disabled="option.disabled || loading"
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

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
      <div class="statistics-summary-card surface-50 dark:surface-900 border-1 surface-border rounded-xl p-5">
        <h3 class="m-0 text-sm font-medium text-color-secondary">Tashrif</h3>
        <div class="text-4xl font-semibold mt-2 tabular-nums">
          <i v-if="loading" class="pi pi-spin pi-spinner text-2xl" />
          <span v-else>{{ formattedVisits }}</span>
        </div>
      </div>
      <div class="statistics-summary-card surface-50 dark:surface-900 border-1 surface-border rounded-xl p-5">
        <h3 class="m-0 text-sm font-medium text-color-secondary">Ko'rish</h3>
        <div class="text-4xl font-semibold mt-2 tabular-nums">
          <i v-if="loading" class="pi pi-spin pi-spinner text-2xl" />
          <span v-else>{{ formattedPageviews }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
