<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useToast } from "primevue/usetoast"
import VisitUserDialog from "@/components/VisitUserDialog.vue"
import apiService from "@/service/api.service"

const toast = useToast()
const loading = ref(false)
const periodPreset = ref("7d")
const customRange = ref(null)
const activeStat = ref("natlib-content-search")

const statOptions = [
  {
    label: "Kontent qidiruvi",
    hint: "natlib.uz",
    icon: "pi pi-search",
    value: "natlib-content-search",
  },
  {
    label: "Vaqt sarfi",
    hint: "Kutubxona tashrifi",
    icon: "pi pi-clock",
    value: "time-leaders",
  },
]
const stats = ref({
  visits: 0,
  pageviews: 0,
  from: null,
  to: null,
  page: "/search/tot/result",
})
const timeLeaders = ref({
  from: null,
  to: null,
  all: [],
  adults: [],
  youth: [],
  youthMale: [],
  youthFemale: [],
})
const ageGroup = ref("all")
const youthSex = ref("all")
const ageGroups = [
  { label: "Barcha", value: "all" },
  { label: "Kattalar", value: "adults" },
  { label: "Yoshlar", value: "youth" },
]
const profileVisible = ref(false)
const profileLoading = ref(false)
const profile = ref(null)
const visitHistory = ref([])

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
  const source = activeStat.value === "time-leaders" ? timeLeaders.value : stats.value
  const from = formatDateDisplay(source.from)
  const to = formatDateDisplay(source.to)
  if (from && to) return `${from} — ${to}`
  return activePresetLabel.value
})

const activeRows = computed(() => {
  if (ageGroup.value === "adults") return timeLeaders.value.adults
  if (ageGroup.value === "youth") {
    if (youthSex.value === "male") return timeLeaders.value.youthMale
    if (youthSex.value === "female") return timeLeaders.value.youthFemale
    return timeLeaders.value.youth
  }
  return timeLeaders.value.all
})

const ageNote = computed(() => {
  if (ageGroup.value === "adults") return "31 yoshdan katta"
  if (ageGroup.value === "youth") return "14–30 yosh"
  return ""
})

const formatDuration = (seconds) => {
  const total = Math.max(0, Number(seconds || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours} soat ${minutes} daqiqa`
  return `${minutes} daqiqa`
}

const openMember = async (userNo) => {
  profile.value = null
  visitHistory.value = []
  profileVisible.value = true
  profileLoading.value = true
  try {
    const [user, history] = await Promise.all([
      apiService.get(`/visits/member/${encodeURIComponent(userNo)}`),
      apiService.get(`/visits/user/${encodeURIComponent(userNo)}`),
    ])
    const visits = Array.isArray(history?.visits) ? history.visits : []
    const latest = visits[0] || {}
    profile.value = {
      id: user?.USER_NO || userNo,
      userName: user?.USER_NAME || latest.userName || userNo,
      userPosition: user?.USER_POSITION || latest.userPosition || "-",
      userTel: user?.TEL_NO || null,
      userPhoto: user?.PHOTO || null,
      date: latest.date,
      keldi: latest.keldi,
      ketdi: latest.ketdi,
      duration: latest.duration,
    }
    visitHistory.value = visits
  } catch (error) {
    profileVisible.value = false
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: error?.message || "Foydalanuvchi yuklanmadi",
      life: 3500,
    })
  } finally {
    profileLoading.value = false
  }
}

const formattedVisits = computed(() => Number(stats.value.visits || 0).toLocaleString("uz-UZ"))
const formattedPageviews = computed(() => Number(stats.value.pageviews || 0).toLocaleString("uz-UZ"))

const loadStatistics = async () => {
  if (periodPreset.value === "custom") return
  const params = { period: periodPreset.value }
  if (activeStat.value === "time-leaders") {
    await fetchTimeLeaders(params)
    return
  }
  await fetchStatistics(params)
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

const fetchTimeLeaders = async (params) => {
  try {
    loading.value = true
    const data = await apiService.get("/visits/time-leaders", { params })
    timeLeaders.value = {
      from: data?.from || null,
      to: data?.to || null,
      all: Array.isArray(data?.all) ? data.all : [],
      adults: Array.isArray(data?.adults) ? data.adults : [],
      youth: Array.isArray(data?.youth) ? data.youth : [],
      youthMale: Array.isArray(data?.youthMale) ? data.youthMale : [],
      youthFemale: Array.isArray(data?.youthFemale) ? data.youthFemale : [],
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
  const params = {
    period: "custom",
    from: formatDateToYmd(from),
    to: formatDateToYmd(to),
  }
  if (activeStat.value === "time-leaders") {
    await fetchTimeLeaders(params)
    return
  }
  await fetchStatistics(params)
}

watch(periodPreset, async (value) => {
  if (value === "custom") return
  await loadStatistics()
})

watch(activeStat, async () => {
  await loadStatistics()
})

onMounted(() => {
  loadStatistics()
})
</script>

<template>
  <div class="stats-page">
    <header class="stats-header">
      <div>
        <h1>Statistika</h1>
        <p>{{ activePeriodLabel }}</p>
      </div>
    </header>

    <div class="stat-switch" role="tablist">
      <button
        v-for="option in statOptions"
        :key="option.value"
        type="button"
        role="tab"
        class="stat-switch-item"
        :class="{ 'is-active': activeStat === option.value }"
        :aria-selected="activeStat === option.value"
        @click="activeStat = option.value"
      >
        <i :class="option.icon" />
        <span>
          <strong>{{ option.label }}</strong>
          <small>{{ option.hint }}</small>
        </span>
      </button>
    </div>

    <section class="stats-panel">
      <div class="period-bar">
        <span class="period-label">Davr</span>
        <div class="period-pills">
          <button
            v-for="option in presetButtons"
            :key="option.value"
            type="button"
            class="period-pill"
            :class="{ 'is-active': periodPreset === option.value }"
            :disabled="option.disabled || loading"
            @click="periodPreset = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div v-if="periodPreset === 'custom'" class="custom-range">
        <Calendar
          v-model="customRange"
          selectionMode="range"
          dateFormat="dd.mm.yy"
          showIcon
          :manualInput="false"
          placeholder="Boshlanish — tugash"
        />
        <Button
          label="Qo'llash"
          icon="pi pi-check"
          :loading="loading"
          @click="applyCustomRange"
        />
      </div>

      <div v-if="activeStat === 'natlib-content-search'" class="metric-grid">
        <article class="metric-card">
          <span>Tashrif</span>
          <strong>
            <i v-if="loading" class="pi pi-spin pi-spinner" />
            <template v-else>{{ formattedVisits }}</template>
          </strong>
          <small>natlib.uz kontent qidiruvi</small>
        </article>
        <article class="metric-card">
          <span>Ko'rish</span>
          <strong>
            <i v-if="loading" class="pi pi-spin pi-spinner" />
            <template v-else>{{ formattedPageviews }}</template>
          </strong>
          <small>natlib.uz kontent qidiruvi</small>
        </article>
      </div>

      <article v-else class="leader-card">
        <div class="leader-card-head">
          <div>
            <div class="sex-switch" role="group" aria-label="Yosh guruhi">
              <button
                v-for="group in ageGroups"
                :key="group.value"
                type="button"
                :class="{ 'is-active': ageGroup === group.value }"
                @click="ageGroup = group.value"
              >
                {{ group.label }}
              </button>
            </div>
            <p v-if="ageNote" class="leader-note">{{ ageNote }}</p>
          </div>
          <div v-if="ageGroup === 'youth'" class="sex-switch" role="group" aria-label="Yoshlar jinsi">
            <button type="button" :class="{ 'is-active': youthSex === 'all' }" @click="youthSex = 'all'">Hamma</button>
            <button type="button" :class="{ 'is-active': youthSex === 'female' }" @click="youthSex = 'female'">Ayol</button>
            <button type="button" :class="{ 'is-active': youthSex === 'male' }" @click="youthSex = 'male'">Erkak</button>
          </div>
        </div>
        <p v-if="loading" class="leader-empty"><i class="pi pi-spin pi-spinner" /> Yuklanmoqda</p>
        <p v-else-if="activeRows.length === 0" class="leader-empty">Bu davrda ma'lumot yo'q</p>
        <ol v-else>
          <li v-for="row in activeRows" :key="`${ageGroup}-${youthSex}-${row.place}`">
              <button type="button" class="leader-row" @click="openMember(row.userNo)">
                <span class="place" :data-place="row.place">{{ row.place }}</span>
                <span class="leader-person">
                  <strong>{{ row.name }}</strong>
                  <small>{{ row.userNo }}</small>
                </span>
                <span class="leader-time">{{ formatDuration(row.seconds) }}</span>
              </button>
            </li>
          </ol>
      </article>
    </section>

    <VisitUserDialog
      v-model:visible="profileVisible"
      :user="profile"
      :history="visitHistory"
      :loading="profileLoading"
    />
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.stats-header p {
  margin: 0.25rem 0 0;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.stat-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-switch-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-align: left;
  padding: 0.95rem 1rem;
  border-radius: 0.9rem;
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  color: var(--text-color);
  cursor: pointer;
}

.stat-switch-item i {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border-radius: 0.65rem;
  background: var(--surface-100, var(--surface-ground));
  color: var(--text-color-secondary);
}

.stat-switch-item strong,
.stat-switch-item small {
  display: block;
}

.stat-switch-item strong {
  font-size: 0.95rem;
}

.stat-switch-item small {
  margin-top: 0.15rem;
  color: var(--text-color-secondary);
  font-size: 0.78rem;
}

.stat-switch-item.is-active {
  border-color: var(--primary-color);
  box-shadow: inset 0 0 0 1px var(--primary-color);
}

.stat-switch-item.is-active i {
  background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
}

.stats-panel {
  padding: 1.1rem;
  border: 1px solid var(--surface-border);
  border-radius: 1rem;
  background: var(--surface-card);
}

.period-bar {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.period-label {
  flex: 0 0 auto;
  padding-top: 0.45rem;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-color-secondary);
}

.period-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.period-pill {
  border: 1px solid var(--surface-border);
  background: transparent;
  color: var(--text-color);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.period-pill.is-active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--primary-color-text, #fff);
}

.period-pill:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.custom-range {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 1rem;
}

.metric-grid,
.leader-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.metric-card {
  padding: 1.1rem 1.15rem;
  border-radius: 0.85rem;
  background: var(--surface-ground);
}

.metric-card span,
.metric-card small {
  display: block;
  color: var(--text-color-secondary);
}

.metric-card span {
  font-size: 0.8rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.metric-card strong {
  display: block;
  margin: 0.35rem 0 0.2rem;
  font-size: 2.4rem;
  font-weight: 680;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.leader-card {
  padding: 1rem 1rem 0.4rem;
  border-radius: 0.85rem;
  background: var(--surface-ground);
}

.leader-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.leader-card h2 {
  margin: 0;
  font-size: 0.95rem;
}

.sex-switch {
  display: inline-flex;
  padding: 0.15rem;
  border-radius: 999px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
}

.sex-switch button {
  border: 0;
  background: transparent;
  color: var(--text-color-secondary);
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
}

.sex-switch button.is-active {
  background: var(--primary-color);
  color: var(--primary-color-text, #fff);
}

.leader-card ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

.leader-note {
  margin: 0.15rem 0 0;
  color: var(--text-color-secondary);
  font-size: 0.8rem;
}

.leader-card li {
  border-top: 1px solid var(--surface-border);
}

.leader-row {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.7rem 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.leader-row:hover strong {
  color: var(--primary-color);
}

.place {
  width: 1.7rem;
  height: 1.7rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--surface-card);
  color: var(--text-color-secondary);
}

.place[data-place="1"] {
  background: #f5d76e;
  color: #5c4813;
}

.place[data-place="2"] {
  background: #d5dde6;
  color: #3d4a57;
}

.place[data-place="3"] {
  background: #e7c4a4;
  color: #6a4124;
}

.leader-person {
  min-width: 0;
}

.leader-person strong,
.leader-person small {
  display: block;
}

.leader-person strong {
  font-size: 0.92rem;
}

.leader-person small,
.leader-time {
  color: var(--text-color-secondary);
  font-size: 0.78rem;
}

.leader-time {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.leader-empty {
  margin: 0 0 0.8rem;
  color: var(--text-color-secondary);
  font-size: 0.88rem;
}

@media (max-width: 1100px) {
  .leader-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .stat-switch,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
