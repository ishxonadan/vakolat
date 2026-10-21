<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import axios from 'axios'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import VisitUserDialog from '@/components/VisitUserDialog.vue'
import { resolveMemberCategoryLabel } from '@/utils/memberCategories'
import { pageSize, ROWS_PER_PAGE_OPTIONS } from '@/service/pagination.service'

const router = useRouter()
const toast = useToast()

// Create axios instance with proper base URL
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  }
})

// Add auth token to requests
const apiInterceptor = api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// State
const visits = ref([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const searchQuery = ref('')
const dateRangeFilter = ref(null) // For filtering table
const dateRangeStats = ref(null) // For statistics only
const photoCache = new Map()
let visitsRequestId = 0

// Dialog state
const showUserDialog = ref(false)
const selectedUser = ref(null)
const userHistory = ref([])
const loadingHistory = ref(false)

// Statistics
const todayStats = ref({ total: 0, unique: 0, current: 0 })
const monthStats = ref({ total: 0, unique: 0, average: 0 })
const periodStats = ref({ total: 0, unique: 0, days: 0, average: 0 })

// Auto-refresh state
const autoRefreshEnabled = ref(true) // ON by default
const autoRefreshInterval = ref(null)
const lastFetchTime = ref(0)
const REFRESH_INTERVAL = 10000 // 10 seconds
const SLOW_STATS_INTERVAL = 60000
const MIN_FETCH_INTERVAL = 1000 // 1 second throttle
let lastSlowStatsAt = 0

const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const withCachedPhotos = (rows) =>
  rows.map((visit) => {
    if (!photoCache.has(visit.id)) return visit
    const photo = photoCache.get(visit.id)
    return photo ? { ...visit, userPhoto: photo } : visit
  })

const fetchPhotos = async (rows, requestId) => {
  const ids = [...new Set(rows.map((visit) => visit.id).filter((id) => id && !photoCache.has(id)))]
  if (!ids.length) return

  try {
    const response = await api.get('/visits/photos', { params: { ids: ids.join(',') } })
    const photos = response.data?.photos || {}
    for (const id of ids) {
      photoCache.set(id, photos[id] || null)
    }

    if (selectedUser.value && photoCache.has(selectedUser.value.id)) {
      const photo = photoCache.get(selectedUser.value.id)
      if (photo) {
        selectedUser.value = { ...selectedUser.value, userPhoto: photo }
      }
    }

    if (requestId !== visitsRequestId) return
    visits.value = withCachedPhotos(visits.value)
  } catch (error) {
    console.error('❌ Error fetching visit photos:', error)
  }
}

// Get photo URL - handle base64 images
const getPhotoUrl = (photo) => {
  if (!photo) return null
  
  // If it's already a data URL (base64), return as is
  if (photo.startsWith('data:image/')) {
    return photo
  }
  
  // If it looks like base64 without the data URL prefix, add it
  if (photo.match(/^[A-Za-z0-9+/=]+$/)) {
    return `data:image/jpeg;base64,${photo}`
  }
  
  // If it's a regular URL
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo
  }
  
  // If it's a relative path
  return `${window.location.origin}${photo.startsWith('/') ? '' : '/'}${photo}`
}

// Check if visitor should still be shown as "in library"
const isStillInLibrary = (visit) => {
  // If they have a ketdi time, they've left
  if (visit.ketdi) return false
  
  const now = new Date()
  const today = formatLocalDate(now)
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  // If visit is from a previous day, they must have left
  if (visit.date !== today) return false
  
  // If it's after 21:21 today, library is closed
  if (currentHour > 21 || (currentHour === 21 && currentMinute >= 21)) {
    return false
  }
  
  // Otherwise, they're still in the library
  return true
}

// Fetch user visit history
const fetchUserHistory = async (userId) => {
  loadingHistory.value = true
  try {
    const response = await api.get(`/visits/user/${userId}`)
    userHistory.value = response.data.visits || []
    console.log('📜 User history loaded:', userHistory.value.length, 'visits')
  } catch (error) {
    console.error('❌ Error fetching user history:', error)
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Foydalanuvchi tarixini yuklashda xatolik',
      life: 3000,
    })
  } finally {
    loadingHistory.value = false
  }
}

// Show user details
const showUserDetails = async (user) => {
  selectedUser.value = withCachedPhotos([user])[0]
  showUserDialog.value = true
  if (!selectedUser.value.userPhoto) {
    fetchPhotos([user], visitsRequestId)
  }
  await fetchUserHistory(user.id)
}

// Fetch visits
const fetchVisits = async (isAutoRefresh = false) => {
  // Throttle: don't fetch if less than 1 second since last fetch
  const now = Date.now()
  if (now - lastFetchTime.value < MIN_FETCH_INTERVAL) {
    console.log('⏱️ Throttled: Too soon since last fetch')
    return
  }
  
  lastFetchTime.value = now
  const requestId = ++visitsRequestId
  
  // Only show loading spinner for manual refresh, not auto-refresh
  if (!isAutoRefresh) {
    loading.value = true
  }
  
  try {
    console.log('🔄 Fetching visits for page:', currentPage.value)
    
    // Build query string manually to ensure it's sent correctly
    const params = new URLSearchParams()
    params.append('page', currentPage.value.toString())
    params.append('limit', pageSize.value.toString())
    
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }

    if (dateRangeFilter.value && dateRangeFilter.value.length === 2 && dateRangeFilter.value[1]) {
      params.append('startDate', formatLocalDate(dateRangeFilter.value[0]))
      params.append('endDate', formatLocalDate(dateRangeFilter.value[1]))
    }

    const queryString = params.toString()
    console.log('📤 Query string:', queryString)

    const response = await api.get(`/visits?${queryString}`)
    if (requestId !== visitsRequestId) return
    
    console.log('📥 Response:', {
      visitsCount: response.data.visits.length,
      pagination: response.data.pagination
    })
    
    visits.value = withCachedPhotos(response.data.visits)
    totalRecords.value = response.data.pagination.total
    fetchPhotos(response.data.visits, requestId)
    
    if (response.data.visits.length > 0) {
      console.log('📍 First visit:', response.data.visits[0].date, response.data.visits[0].keldi)
      console.log('📍 Last visit:', response.data.visits[response.data.visits.length - 1].date, response.data.visits[response.data.visits.length - 1].keldi)
    }
  } catch (error) {
    console.error('❌ Error fetching visits:', error)
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Tashriflarni yuklashda xatolik',
      life: 3000,
    })
  } finally {
    if (requestId === visitsRequestId) {
      loading.value = false
    }
  }
}

// Fetch statistics. Year-long period stats stay off the 10s refresh.
const fetchStatistics = async ({ includeSlow = true } = {}) => {
  try {
    console.log('📊 Fetching statistics...')

    const requests = [api.get('/visits/stats/today')]
    if (includeSlow) {
      requests.push(api.get('/visits/stats/month'))
      if (dateRangeStats.value && dateRangeStats.value.length === 2 && dateRangeStats.value[1]) {
        const startDate = formatLocalDate(dateRangeStats.value[0])
        const endDate = formatLocalDate(dateRangeStats.value[1])
        requests.push(api.get('/visits/stats/period', { params: { startDate, endDate } }))
      }
    }

    const [today, month, period] = await Promise.all(requests)

    todayStats.value = today.data
    if (month) monthStats.value = month.data
    if (period) {
      periodStats.value = period.data
    } else if (includeSlow) {
      periodStats.value = { total: 0, unique: 0, days: 0, average: 0 }
    }
  } catch (error) {
    console.error('❌ Error fetching statistics:', error)
    console.error('❌ Error details:', error.response?.data || error.message)
    
    toast.add({
      severity: 'error',
      summary: 'Statistika yuklashda xatolik',
      detail: error.response?.data?.error || error.message,
      life: 5000
    })
  }
}

// Computed
const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value))

// Methods
const onVisitRowClick = (event) => {
  if (event?.data) showUserDetails(event.data)
}

const onPageChange = (event) => {
  console.log('📄 Page change event:', event)
  if (event.rows != null && event.rows !== pageSize.value) {
    pageSize.value = event.rows
    return
  }
  currentPage.value = event.page + 1
  console.log('📄 New current page:', currentPage.value)
  fetchVisits(false)
}

const onSearch = () => {
  console.log('🔍 Search triggered:', searchQuery.value)
  currentPage.value = 1
  fetchVisits(false)
}

const onDateFilterChange = () => {
  console.log('📅 Date filter changed:', dateRangeFilter.value)
  currentPage.value = 1
  fetchVisits(false)
}

const onDateStatsChange = () => {
  console.log('📊 Date stats changed:', dateRangeStats.value)
  fetchStatistics()
}

const clearFilters = () => {
  console.log('🧹 Clearing filters')
  searchQuery.value = ''
  dateRangeFilter.value = null
  dateRangeStats.value = null
  currentPage.value = 1
  periodStats.value = { total: 0, unique: 0, days: 0, average: 0 }
  fetchVisits(false)
  fetchStatistics()
}

const formatTime = (time) => {
  if (!time) return '—'
  return time
}

const positionLabel = (value) => {
  const text = resolveMemberCategoryLabel(value)
  if (!text || text === '-' || text === '—' || /^noma.?lum$/i.test(text)) return ''
  return text
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('uz-UZ')
}

const formatDateTime = (date, time) => {
  if (!date) return '-'
  return `${formatDate(date)} ${time || ''}`
}

const getStatusSeverity = (visit) => {
  if (isStillInLibrary(visit)) return 'success'
  return 'secondary'
}

const getStatusText = (visit) => {
  if (isStillInLibrary(visit)) return 'Kutubxonada'
  return 'Chiqdi'
}

const startAutoRefresh = () => {
  autoRefreshEnabled.value = true
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
  }
  autoRefreshInterval.value = setInterval(() => {
    fetchVisits(true)
    const now = Date.now()
    const includeSlow = now - lastSlowStatsAt >= SLOW_STATS_INTERVAL
    if (includeSlow) lastSlowStatsAt = now
    fetchStatistics({ includeSlow })
  }, REFRESH_INTERVAL)
  console.log('▶️ Auto-refresh started (10 seconds)')
}

const stopAutoRefresh = () => {
  autoRefreshEnabled.value = false
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
  console.log('⏸️ Auto-refresh stopped')
}

const manualRefresh = () => {
  lastSlowStatsAt = Date.now()
  fetchVisits(false)
  fetchStatistics({ includeSlow: true })
}

// Watch for rows per page changes
watch(pageSize, (newValue) => {
  console.log('📊 Rows per page changed:', newValue)
  currentPage.value = 1
  fetchVisits(false)
})

// Lifecycle
onMounted(() => {
  console.log('🚀 Component mounted')
  
  // Set default date range to this year (January 1 till today)
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1) // January 1 of current year
  dateRangeStats.value = [startOfYear, today]
  lastSlowStatsAt = Date.now()
  
  // Show the table first. Year stats run after that response, not in front of it.
  fetchVisits(false).finally(() => {
    fetchStatistics({ includeSlow: true })
  })
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh() // Clean up on unmount
})
</script>

<template>
  <div class="tashriflar-page p-6 text-gray-900 dark:text-[var(--p-text-color)]">
    <!-- Statistics Cards - Horizontal Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <!-- Today's Stats Card -->
      <div class="bg-white dark:bg-[var(--p-content-background)] rounded-xl shadow-sm p-6 border border-gray-100 dark:border-[var(--p-content-border-color)] hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-calendar text-blue-600 dark:text-blue-400 text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Bugungi tashriflar</h3>
            <div class="flex items-baseline gap-3 flex-wrap">
              <span class="text-3xl font-bold text-gray-900 dark:text-[var(--p-text-color)]">{{ todayStats.total }}</span>
              <span class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)]">{{ todayStats.unique }} noyob | {{ todayStats.current }} hozir kutubxonada</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Month Stats Card -->
      <div class="bg-white dark:bg-[var(--p-content-background)] rounded-xl shadow-sm p-6 border border-gray-100 dark:border-[var(--p-content-border-color)] hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-green-50 dark:bg-emerald-900/38 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-chart-line text-green-600 dark:text-emerald-400 text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Shu oy</h3>
            <div class="flex items-baseline gap-3 flex-wrap">
              <span class="text-3xl font-bold text-gray-900 dark:text-[var(--p-text-color)]">{{ monthStats.total }}</span>
              <span class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)]">{{ monthStats.unique }} noyob | O'rtacha: {{ monthStats.average }}/kun</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Period Stats Card with Date Selector -->
      <div class="bg-white dark:bg-[var(--p-content-background)] rounded-xl shadow-sm p-6 border border-gray-100 dark:border-[var(--p-content-border-color)] hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4 mb-3">
          <div class="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-900/38 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-filter text-purple-600 dark:text-purple-400 text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Tanlangan davr</h3>
            <div class="flex items-baseline gap-3 flex-wrap">
              <span class="text-3xl font-bold text-gray-900 dark:text-[var(--p-text-color)]">{{ periodStats.total || 0 }}</span>
              <span class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)]" v-if="periodStats.days">
                {{ periodStats.days }} kun | O'rtacha: {{ periodStats.average }}/kun
              </span>
              <span class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)]" v-else>Davrni tanlang</span>
            </div>
          </div>
        </div>
        <!-- Date Range Selector for Statistics -->
        <Calendar
          v-model="dateRangeStats"
          selectionMode="range"
          :manualInput="false"
          dateFormat="dd.mm.yy"
          placeholder="Sana oralig'ini tanlang"
          @date-select="onDateStatsChange"
          class="w-full text-sm tashriflar-stats-calendar"
        />
      </div>
    </div>

    <!-- Visits Table -->
    <div class="bg-white dark:bg-[var(--p-content-background)] rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-[var(--p-content-border-color)]">
      <!-- Cool Header with Gradient -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <i class="pi pi-users text-white text-xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white">Tashriflar ro'yxati</h2>
              <p class="text-blue-100 text-sm mt-1">Kutubxona tashrif qiluvchilar ma'lumotlari (eng oxirgi avval)</p>
            </div>
          </div>
          
          <!-- Filters in Header -->
          <div class="flex items-center gap-3">
            <!-- Auto-refresh controls -->
            <div class="flex items-center gap-2 mr-2">
              <Button
                v-if="!autoRefreshEnabled"
                icon="pi pi-play"
                @click="startAutoRefresh"
                severity="success"
                rounded
                text
                class="w-10 h-10"
                v-tooltip.bottom="'Avtomatik yangilashni yoqish'"
              />
              <Button
                v-if="autoRefreshEnabled"
                icon="pi pi-pause"
                @click="stopAutoRefresh"
                severity="warning"
                rounded
                text
                class="w-10 h-10"
                v-tooltip.bottom="'Avtomatik yangilashni to\'xtatish'"
              />
              <Button
                icon="pi pi-refresh"
                @click="manualRefresh"
                severity="info"
                rounded
                text
                class="w-10 h-10"
                v-tooltip.bottom="'Qo\'lda yangilash'"
              />
            </div>

            <!-- Search -->
            <div class="relative" style="min-width: 250px;">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 z-10"></i>
              <InputText
                v-model="searchQuery"
                placeholder="Ism yoki ID..."
                @keyup.enter="onSearch"
                class="w-full bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:bg-white/20"
                style="padding-left: 2.5rem;"
              />
            </div>

            <!-- Date Range Filter -->
            <Calendar
              v-model="dateRangeFilter"
              selectionMode="range"
              :manualInput="false"
              dateFormat="dd.mm.yy"
              placeholder="Sana filtri"
              @date-select="onDateFilterChange"
              class="tashriflar-toolbar-calendar"
            />

            <!-- Search Button -->
            <Button
              icon="pi pi-search"
              label="Qidirish"
              @click="onSearch"
              severity="info"
              class="bg-white/20 border-white/30 text-white hover:bg-white/30"
            />

            <!-- Clear Button -->
            <Button
              icon="pi pi-filter-slash"
              label="Tozalash"
              @click="clearFilters"
              severity="secondary"
              outlined
              class="border-white/30 text-white hover:bg-white/10"
            />
          </div>
        </div>
      </div>

      <!-- Table -->
      <DataTable
        :value="visits"
        :loading="loading"
        :rows="pageSize"
        :totalRecords="totalRecords"
        :lazy="true"
        :paginator="true"
        @page="onPageChange"
        @row-click="onVisitRowClick"
        v-model:rows="pageSize"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS"
        currentPageReportTemplate="{first}–{last} / {totalRecords}"
        class="tashriflar-table"
        tableStyle="width: 100%"
      >
        <Column field="userName" header="Tashrif buyuruvchi" style="width: 38%">
          <template #body="{ data }">
            <div class="visit-person">
              <img
                v-if="data.userPhoto"
                :src="getPhotoUrl(data.userPhoto)"
                :alt="data.userName"
                class="visit-avatar"
              />
              <div v-else class="visit-avatar visit-avatar-empty">
                {{ data.userName?.charAt(0) || '?' }}
              </div>
              <div class="visit-person-text">
                <strong>{{ data.userName || data.id }}</strong>
                <small>{{ data.id }}<template v-if="positionLabel(data.userPosition)"> · {{ positionLabel(data.userPosition) }}</template></small>
              </div>
            </div>
          </template>
        </Column>

        <Column field="date" header="Sana" style="width: 12%">
          <template #body="{ data }">
            <span class="visit-meta">{{ formatDate(data.date) }}</span>
          </template>
        </Column>

        <Column field="keldi" header="Keldi" style="width: 11%">
          <template #body="{ data }">
            <span class="visit-time">{{ formatTime(data.keldi) }}</span>
          </template>
        </Column>

        <Column field="ketdi" header="Ketdi" style="width: 11%">
          <template #body="{ data }">
            <span class="visit-time">{{ formatTime(data.ketdi) }}</span>
          </template>
        </Column>

        <Column field="duration" header="Davomiyligi" style="width: 12%">
          <template #body="{ data }">
            <span class="visit-meta">{{ data.duration || '—' }}</span>
          </template>
        </Column>

        <Column field="status" header="Holat" style="width: 16%">
          <template #body="{ data }">
            <Tag :value="getStatusText(data)" :severity="getStatusSeverity(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <VisitUserDialog
      v-model:visible="showUserDialog"
      :user="selectedUser"
      :history="userHistory"
      :loading="loadingHistory"
    />
  </div>
</template>

<style scoped>
:deep(.tashriflar-table .p-datatable-thead > tr > th) {
  background: #f8fafc;
  color: #64748b;
  font-weight: 650;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.tashriflar-table .p-datatable-tbody > tr > td) {
  padding: 0.55rem 0.85rem;
  vertical-align: middle;
}

:deep(.tashriflar-table .p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.tashriflar-table .p-datatable-tbody > tr:hover) {
  background: #f8fafc;
}

.visit-person {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.visit-avatar {
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
  background: #dbeafe;
  border: 1px solid var(--p-content-border-color, var(--surface-border));
}

.visit-avatar-empty {
  display: grid;
  place-items: center;
  color: #1d4ed8;
  font-weight: 700;
  font-size: 1.75rem;
}

.visit-person-text {
  min-width: 0;
}

.visit-person-text strong,
.visit-person-text small {
  display: block;
}

.visit-person-text strong {
  font-size: 0.92rem;
  font-weight: 650;
  color: var(--p-text-color, #0f172a);
}

.visit-person-text small,
.visit-meta,
.visit-time {
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.8rem;
}

.visit-time {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

:deep(.p-paginator) {
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* Header toolbar datepicker (gradient strip) */
:deep(.tashriflar-toolbar-calendar .p-inputtext),
:deep(.tashriflar-toolbar-calendar input) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

:deep(.tashriflar-toolbar-calendar .p-inputtext::placeholder),
:deep(.tashriflar-toolbar-calendar input::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}
</style>

<!-- Qora tema: Prime semantic tokenlar (jadval, paginator, dialog, kalendar) -->
<style>
.app-dark .tashriflar-page .p-datatable .p-datatable-thead > tr > th {
  background: var(--p-surface-800);
  color: var(--p-text-muted-color);
  border-bottom-color: var(--p-content-border-color);
}

.app-dark .tashriflar-page .p-datatable .p-datatable-tbody > tr {
  background: var(--p-surface-950);
}

.app-dark .tashriflar-page .p-datatable .p-datatable-tbody > tr > td {
  color: var(--p-text-color);
  border-color: var(--p-content-border-color);
}

.app-dark .tashriflar-page .p-datatable .p-datatable-tbody > tr:hover {
  background: var(--p-content-hover-background);
}

.app-dark .tashriflar-page .p-paginator {
  background: var(--p-surface-800);
  border-top-color: var(--p-content-border-color);
  color: var(--p-text-color);
}

.app-dark .tashriflar-page .tashriflar-stats-calendar .p-inputtext,
.app-dark .tashriflar-page .tashriflar-stats-calendar input {
  background: var(--p-surface-800);
  color: var(--p-text-color);
  border-color: var(--p-content-border-color);
}

.app-dark .tashriflar-page .tashriflar-stats-calendar .p-inputtext::placeholder,
.app-dark .tashriflar-page .tashriflar-stats-calendar input::placeholder {
  color: var(--p-text-muted-color);
}
</style>
