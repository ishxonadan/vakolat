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
import Dialog from 'primevue/dialog'
import Timeline from 'primevue/timeline'

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
const rowsPerPage = ref(20)
const searchQuery = ref('')
const dateRangeFilter = ref(null) // For filtering table
const dateRangeStats = ref(null) // For statistics only

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
const MIN_FETCH_INTERVAL = 1000 // 1 second throttle

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
  const today = now.toISOString().split('T')[0]
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
  selectedUser.value = user
  showUserDialog.value = true
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
  
  // Only show loading spinner for manual refresh, not auto-refresh
  if (!isAutoRefresh) {
    loading.value = true
  }
  
  try {
    console.log('🔄 Fetching visits for page:', currentPage.value)
    
    // Build query string manually to ensure it's sent correctly
    const params = new URLSearchParams()
    params.append('page', currentPage.value.toString())
    params.append('limit', rowsPerPage.value.toString())
    
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }

    if (dateRangeFilter.value && dateRangeFilter.value.length === 2) {
      params.append('startDate', dateRangeFilter.value[0].toISOString().split('T')[0])
      params.append('endDate', dateRangeFilter.value[1].toISOString().split('T')[0])
    }

    const queryString = params.toString()
    console.log('📤 Query string:', queryString)

    const response = await api.get(`/visits?${queryString}`)
    
    console.log('📥 Response:', {
      visitsCount: response.data.visits.length,
      pagination: response.data.pagination
    })
    
    visits.value = response.data.visits
    totalRecords.value = response.data.pagination.total
    
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
    loading.value = false
  }
}

// Fetch statistics
const fetchStatistics = async () => {
  try {
    const [today, month] = await Promise.all([
      api.get('/visits/stats/today'),
      api.get('/visits/stats/month'),
    ])

    todayStats.value = today.data
    monthStats.value = month.data

    // Fetch period stats if date range is selected
    if (dateRangeStats.value && dateRangeStats.value.length === 2) {
      const startDate = dateRangeStats.value[0].toISOString().split('T')[0]
      const endDate = dateRangeStats.value[1].toISOString().split('T')[0]
      const period = await api.get(`/visits/stats/period?startDate=${startDate}&endDate=${endDate}`)
      periodStats.value = period.data
    } else {
      periodStats.value = { total: 0, unique: 0, days: 0, average: 0 }
    }
  } catch (error) {
    console.error('Error fetching statistics:', error)
  }
}

// Computed
const totalPages = computed(() => Math.ceil(totalRecords.value / rowsPerPage.value))

// Methods
const onPageChange = (event) => {
  console.log('📄 Page change event:', event)
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
  if (!time) return '-'
  return time
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
    fetchVisits(true) // Pass true to indicate auto-refresh
    fetchStatistics() // Also update statistics
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
  fetchVisits(false) // Manual refresh shows loading
  fetchStatistics()
}

// Watch for rows per page changes
watch(rowsPerPage, (newValue) => {
  console.log('📊 Rows per page changed:', newValue)
  currentPage.value = 1
  fetchVisits(false)
})

// Lifecycle
onMounted(() => {
  console.log('🚀 Component mounted')
  fetchVisits(false)
  fetchStatistics()
  startAutoRefresh() // Start auto-refresh on mount
})

onUnmounted(() => {
  stopAutoRefresh() // Clean up on unmount
})
</script>

<template>
  <div class="p-6">
    <!-- Statistics Cards - Horizontal Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <!-- Today's Stats Card -->
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-calendar text-blue-600 text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-500 mb-1">Bugungi tashriflar</h3>
            <div class="flex items-baseline gap-3">
              <span class="text-3xl font-bold text-gray-900">{{ todayStats.total }}</span>
              <span class="text-sm text-gray-500">{{ todayStats.unique }} noyob | {{ todayStats.current }} hozir kutubxonada</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Month Stats Card -->
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-chart-line text-green-600 text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-500 mb-1">Shu oy</h3>
            <div class="flex items-baseline gap-3">
              <span class="text-3xl font-bold text-gray-900">{{ monthStats.total }}</span>
              <span class="text-sm text-gray-500">{{ monthStats.unique }} noyob | O'rtacha: {{ monthStats.average }}/kun</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Period Stats Card with Date Selector -->
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4 mb-3">
          <div class="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-filter text-purple-600 text-2xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-500 mb-1">Tanlangan davr</h3>
            <div class="flex items-baseline gap-3">
              <span class="text-3xl font-bold text-gray-900">{{ periodStats.total || 0 }}</span>
              <span class="text-sm text-gray-500" v-if="periodStats.days">
                {{ periodStats.days }} kun | O'rtacha: {{ periodStats.average }}/kun
              </span>
              <span class="text-sm text-gray-500" v-else>Davrni tanlang</span>
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
          class="w-full text-sm"
        />
      </div>
    </div>

    <!-- Visits Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <!-- Cool Header with Gradient -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
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
            <div class="relative">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-blue-300"></i>
              <InputText
                v-model="searchQuery"
                placeholder="Ism yoki ID..."
                @keyup.enter="onSearch"
                class="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:bg-white/20"
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
              class="bg-white/10 border-white/20"
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
        :rows="rowsPerPage"
        :totalRecords="totalRecords"
        :lazy="true"
        :paginator="true"
        @page="onPageChange"
        v-model:rows="rowsPerPage"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[10, 20, 50]"
        currentPageReportTemplate="{first} - {last} / {totalRecords}"
        class="text-base"
      >
        <Column field="id" header="ID" style="min-width: 120px">
          <template #body="{ data }">
            <span class="font-mono font-bold text-gray-900 text-base">{{ data.id }}</span>
          </template>
        </Column>

        <Column field="userName" header="F.I.O" style="min-width: 280px">
          <template #body="{ data }">
            <div 
              class="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              @click="showUserDetails(data)"
            >
              <img
                v-if="data.userPhoto"
                :src="getPhotoUrl(data.userPhoto)"
                :alt="data.userName"
                class="w-20 h-20 rounded-full object-cover border-3 border-gray-200 hover:border-blue-400 transition-colors shadow-md"
                @error="(e) => { e.target.style.display = 'none'; console.error('Photo load error for:', data.id) }"
              />
              <div
                v-else
                class="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl shadow-md"
              >
                {{ data.userName?.charAt(0) || '?' }}
              </div>
              <div>
                <div class="font-semibold text-gray-900 text-base">{{ data.userName }}</div>
                <div class="text-sm text-gray-500">{{ data.userPosition }}</div>
              </div>
            </div>
          </template>
        </Column>

        <Column field="date" header="Sana" style="min-width: 130px">
          <template #body="{ data }">
            <span class="text-gray-700 text-base">{{ formatDate(data.date) }}</span>
          </template>
        </Column>

        <Column field="keldi" header="Keldi" style="min-width: 110px">
          <template #body="{ data }">
            <span class="font-mono text-gray-700 text-base">{{ formatTime(data.keldi) }}</span>
          </template>
        </Column>

        <Column field="ketdi" header="Ketdi" style="min-width: 110px">
          <template #body="{ data }">
            <span class="font-mono text-gray-700 text-base">{{ formatTime(data.ketdi) }}</span>
          </template>
        </Column>

        <Column field="duration" header="Davomiyligi" style="min-width: 130px">
          <template #body="{ data }">
            <span class="text-gray-700 text-base">{{ data.duration || '-' }}</span>
          </template>
        </Column>

        <Column field="status" header="Holat" style="min-width: 140px">
          <template #body="{ data }">
            <Tag :value="getStatusText(data)" :severity="getStatusSeverity(data)" class="text-sm" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- User Details Dialog -->
    <Dialog 
      v-model:visible="showUserDialog" 
      :modal="true" 
      :closable="true"
      :draggable="false"
      class="w-full"
      :style="{ width: '90vw', maxWidth: '1200px' }"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <i class="pi pi-user text-2xl text-white"></i>
          <span class="text-xl font-bold text-white">Foydalanuvchi ma'lumotlari</span>
        </div>
      </template>

      <div v-if="selectedUser" class="space-y-6">
        <!-- User Photo and Basic Info -->
        <div class="flex items-start gap-6 pb-6 border-b">
          <img
            v-if="selectedUser.userPhoto"
            :src="getPhotoUrl(selectedUser.userPhoto)"
            :alt="selectedUser.userName"
            class="w-48 h-48 rounded-2xl object-cover border-4 border-blue-100 shadow-xl"
          />
          <div
            v-else
            class="w-48 h-48 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-6xl shadow-xl"
          >
            {{ selectedUser.userName?.charAt(0) || '?' }}
          </div>
          
          <div class="flex-1">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ selectedUser.userName }}</h3>
            <p class="text-lg text-gray-600 mb-4">{{ selectedUser.userPosition }}</p>
            <div class="flex items-center gap-2">
              <Tag 
                :value="getStatusText(selectedUser)" 
                :severity="getStatusSeverity(selectedUser)" 
                class="text-base px-4 py-2"
              />
            </div>
          </div>
        </div>

        <!-- Current Visit Details -->
        <div>
          <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="pi pi-calendar text-blue-600"></i>
            Joriy tashrif ma'lumotlari
          </h4>
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">ID raqam</div>
                <div class="text-lg font-mono font-bold text-gray-900">{{ selectedUser.id }}</div>
              </div>

              <div class="bg-blue-50 p-4 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">Kelgan sana</div>
                <div class="text-lg font-semibold text-gray-900">{{ formatDate(selectedUser.date) }}</div>
              </div>

              <div class="bg-green-50 p-4 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">Kelgan vaqt</div>
                <div class="text-lg font-mono font-semibold text-gray-900">{{ formatTime(selectedUser.keldi) }}</div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">Telefon raqam</div>
                <div class="text-lg font-semibold text-gray-900">{{ selectedUser.userTel || '-' }}</div>
              </div>

              <div class="bg-orange-50 p-4 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">Ketgan vaqt</div>
                <div class="text-lg font-mono font-semibold text-gray-900">{{ formatTime(selectedUser.ketdi) }}</div>
              </div>

              <div class="bg-purple-50 p-4 rounded-lg">
                <div class="text-sm text-gray-500 mb-1">Davomiyligi</div>
                <div class="text-lg font-semibold text-gray-900">{{ selectedUser.duration || '-' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Visit History Timeline -->
        <div>
          <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="pi pi-history text-purple-600"></i>
            Tashriflar tarixi
            <span class="text-sm font-normal text-gray-500">({{ userHistory.length }} ta tashrif)</span>
          </h4>
          
          <div v-if="loadingHistory" class="flex justify-center items-center py-8">
            <i class="pi pi-spin pi-spinner text-3xl text-blue-600"></i>
            <span class="ml-3 text-gray-600">Yuklanmoqda...</span>
          </div>

          <div v-else-if="userHistory.length === 0" class="text-center py-8 text-gray-500">
            <i class="pi pi-inbox text-4xl mb-3"></i>
            <p>Tashriflar tarixi topilmadi</p>
          </div>

          <div v-else class="max-h-96 overflow-y-auto">
            <Timeline :value="userHistory" align="left" class="customized-timeline">
              <template #marker="{ item }">
                <span 
                  class="flex w-8 h-8 items-center justify-center text-white rounded-full shadow-lg"
                  :class="isStillInLibrary(item) ? 'bg-green-500' : 'bg-gray-400'"
                >
                  <i :class="isStillInLibrary(item) ? 'pi pi-clock' : 'pi pi-check'"></i>
                </span>
              </template>
              <template #content="{ item }">
                <div class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-4">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                      <div class="font-bold text-gray-900 text-lg">
                        {{ formatDate(item.date) }}
                      </div>
                      <div class="text-base text-gray-600 mt-2">
                        <span class="inline-flex items-center gap-2">
                          <i class="pi pi-sign-in text-green-600"></i>
                          Keldi: <strong class="text-lg">{{ formatTime(item.keldi) }}</strong>
                        </span>
                        <span v-if="item.ketdi" class="inline-flex items-center gap-2 ml-4">
                          <i class="pi pi-sign-out text-red-600"></i>
                          Ketdi: <strong class="text-lg">{{ formatTime(item.ketdi) }}</strong>
                        </span>
                      </div>
                    </div>
                    <Tag 
                      :value="getStatusText(item)" 
                      :severity="getStatusSeverity(item)"
                      class="text-sm"
                    />
                  </div>
                  <div v-if="item.duration" class="text-base text-gray-600 mt-2 flex items-center gap-2">
                    <i class="pi pi-clock text-purple-600"></i>
                    <span>Davomiyligi: <strong class="text-lg">{{ item.duration }}</strong></span>
                  </div>
                </div>
              </template>
            </Timeline>
          </div>
        </div>
      </div>

      <template #footer>
        <Button 
          label="Yopish" 
          icon="pi pi-times" 
          @click="showUserDialog = false" 
          severity="secondary"
          class="px-6"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 1.25rem;
  border-bottom: 2px solid #e2e8f0;
  font-size: 1rem;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 1.25rem;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: #f8fafc;
}

:deep(.p-paginator) {
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

:deep(.p-calendar input) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

:deep(.p-calendar input::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.p-dialog .p-dialog-header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 1.5rem;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 2rem;
}

:deep(.p-dialog .p-dialog-footer) {
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Custom Timeline Styles - Keep line left, center content */
:deep(.customized-timeline .p-timeline-event-marker) {
  border: 0;
  background: transparent;
}

:deep(.customized-timeline .p-timeline-event-connector) {
  background-color: #cbd5e1;
  width: 2px;
}

:deep(.customized-timeline .p-timeline-event-content) {
  flex: 1;
  display: flex;
  justify-content: center;
  padding-left: 2rem;
}

:deep(.customized-timeline .p-timeline-event-content > div) {
  width: 100%;
  max-width: 600px;
}

:deep(.customized-timeline .p-timeline-event-separator) {
  align-items: center;
}
</style>
