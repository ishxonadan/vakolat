<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useToast } from "primevue/usetoast"
import Dialog from "primevue/dialog"
import Tag from "primevue/tag"
import apiService from "@/service/api.service"
import { resolveMemberCategoryLabel } from "@/utils/memberCategories"

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
  male: [],
  female: [],
  youth: [],
})
const leaderGroups = [
  { label: "Erkaklar", value: "male" },
  { label: "Ayollar", value: "female" },
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

const formatDuration = (seconds) => {
  const total = Math.max(0, Number(seconds || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours} soat ${minutes} daqiqa`
  return `${minutes} daqiqa`
}

const currentVisit = computed(() => visitHistory.value[0] || null)

const profilePhoto = computed(() => {
  const raw = String(profile.value?.PHOTO || "").trim()
  if (!raw) return ""
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("http")) return raw
  return `data:image/jpeg;base64,${raw}`
})

const profilePosition = computed(() => resolveMemberCategoryLabel(profile.value?.USER_POSITION) || "—")

const localToday = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

const stillInLibrary = (visit) => {
  if (!visit || visit.ketdi) return false
  if (visit.date !== localToday()) return false
  const now = new Date()
  return now.getHours() < 21 || (now.getHours() === 21 && now.getMinutes() < 21)
}

const showValue = (value) => {
  const text = value == null ? "" : String(value).trim()
  return text || "-"
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
    profile.value = user
    visitHistory.value = Array.isArray(history?.visits) ? history.visits : []
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
      male: Array.isArray(data?.male) ? data.male : [],
      female: Array.isArray(data?.female) ? data.female : [],
      youth: Array.isArray(data?.youth) ? data.youth : [],
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

      <div v-else class="leader-grid">
        <article v-for="group in leaderGroups" :key="group.value" class="leader-card">
          <h2>{{ group.label }}</h2>
          <p v-if="group.value === 'youth'" class="leader-note">14–30 yosh</p>
          <p v-if="loading" class="leader-empty"><i class="pi pi-spin pi-spinner" /> Yuklanmoqda</p>
          <p v-else-if="(timeLeaders[group.value] || []).length === 0" class="leader-empty">Bu davrda ma'lumot yo'q</p>
          <ol v-else>
            <li v-for="row in timeLeaders[group.value]" :key="`${group.value}-${row.place}`">
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
      </div>
    </section>

    <Dialog
      v-model:visible="profileVisible"
      modal
      :draggable="false"
      :style="{ width: 'min(920px, 94vw)' }"
      contentClass="visit-profile-dialog"
    >
      <div v-if="profileLoading" class="leader-empty"><i class="pi pi-spin pi-spinner" /> Yuklanmoqda</div>
      <div v-else-if="profile" class="visit-profile">
        <div class="visit-profile-head">
          <img v-if="profilePhoto" :src="profilePhoto" alt="" class="visit-profile-photo" />
          <div v-else class="visit-profile-photo visit-profile-photo-empty">
            {{ profile.USER_NAME?.charAt(0) || "?" }}
          </div>
          <div>
            <h3>{{ profile.USER_NAME || profile.USER_NO }}</h3>
            <p>{{ profilePosition }}</p>
            <Tag
              :value="stillInLibrary(currentVisit) ? 'Kutubxonada' : 'Chiqdi'"
              :severity="stillInLibrary(currentVisit) ? 'success' : 'secondary'"
            />
          </div>
        </div>

        <section>
          <h4><i class="pi pi-calendar" /> Joriy tashrif ma'lumotlari</h4>
          <div class="visit-facts">
            <div class="visit-fact">
              <span>ID raqam</span>
              <strong>{{ showValue(profile.USER_NO) }}</strong>
            </div>
            <div class="visit-fact">
              <span>Telefon raqam</span>
              <strong>{{ showValue(profile.TEL_NO) }}</strong>
            </div>
            <div class="visit-fact visit-fact-date">
              <span>Kelgan sana</span>
              <strong>{{ showValue(currentVisit?.date) }}</strong>
            </div>
            <div class="visit-fact visit-fact-out">
              <span>Ketgan vaqt</span>
              <strong>{{ showValue(currentVisit?.ketdi) }}</strong>
            </div>
            <div class="visit-fact visit-fact-in">
              <span>Kelgan vaqt</span>
              <strong>{{ showValue(currentVisit?.keldi) }}</strong>
            </div>
            <div class="visit-fact visit-fact-duration">
              <span>Davomiyligi</span>
              <strong>{{ showValue(currentVisit?.duration) }}</strong>
            </div>
          </div>
        </section>

        <section>
          <h4>
            <i class="pi pi-history" />
            Tashriflar tarixi
            <small>({{ visitHistory.length }} ta tashrif)</small>
          </h4>
          <p v-if="visitHistory.length === 0" class="leader-empty">Tashriflar tarixi topilmadi</p>
          <ul v-else class="visit-history">
            <li v-for="item in visitHistory" :key="item._id || `${item.date}-${item.keldi}`">
              <div>
                <strong>{{ showValue(item.date) }}</strong>
                <span>Keldi {{ showValue(item.keldi) }}</span>
              </div>
              <div>
                <span>{{ item.ketdi ? `Ketdi ${item.ketdi}` : "Kutubxonada" }}</span>
                <span v-if="item.duration">{{ item.duration }}</span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </Dialog>
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

.leader-card h2 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
}

.leader-card ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

.leader-note {
  margin: -0.35rem 0 0.75rem;
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

.visit-profile {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.visit-profile-head {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.visit-profile-photo {
  width: 5.5rem;
  height: 5.5rem;
  object-fit: cover;
  border-radius: 0.9rem;
  border: 3px solid #dbeafe;
  flex-shrink: 0;
}

.visit-profile-photo-empty {
  display: grid;
  place-items: center;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 1.6rem;
  font-weight: 700;
}

.visit-profile-head h3 {
  margin: 0 0 0.2rem;
  font-size: 1.25rem;
}

.visit-profile-head p {
  margin: 0 0 0.45rem;
  color: var(--text-color-secondary);
}

.visit-profile h4 {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.visit-profile h4 small {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.visit-facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.visit-fact {
  padding: 0.85rem 1rem;
  border-radius: 0.7rem;
  background: var(--surface-ground);
}

.visit-fact span {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--text-color-secondary);
  font-size: 0.8rem;
}

.visit-fact strong {
  font-size: 1.05rem;
}

.visit-fact-date { background: #eff6ff; }
.visit-fact-in { background: #ecfdf3; }
.visit-fact-out { background: #fff7ed; }
.visit-fact-duration { background: #f5f3ff; }

.visit-history {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.visit-history li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.7rem;
}

.visit-history strong,
.visit-history span {
  display: block;
}

.visit-history span {
  color: var(--text-color-secondary);
  font-size: 0.82rem;
}

@media (max-width: 1100px) {
  .leader-grid,
  .visit-facts {
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
