<template>
  <Dialog
    :visible="visible"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="w-full"
    contentClass="tashriflar-user-dialog"
    :style="{ width: '90vw', maxWidth: '1200px' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="pi pi-user text-2xl text-white"></i>
        <span class="text-xl font-bold text-white">Foydalanuvchi ma'lumotlari</span>
      </div>
    </template>

    <div v-if="loading && !user" class="flex justify-center items-center py-8">
      <i class="pi pi-spin pi-spinner text-3xl text-blue-600 dark:text-blue-400"></i>
      <span class="ml-3 text-gray-600 dark:text-[var(--p-text-color)]">Yuklanmoqda...</span>
    </div>

    <div v-else-if="user" class="space-y-6">
      <div class="flex items-start gap-6 pb-6 border-b border-gray-200 dark:border-[var(--p-content-border-color)]">
        <img
          v-if="user.userPhoto"
          :src="getPhotoUrl(user.userPhoto)"
          :alt="user.userName"
          class="w-48 h-48 rounded-2xl object-cover border-4 border-blue-100 dark:border-blue-800/70 shadow-xl"
        />
        <div
          v-else
          class="w-48 h-48 rounded-2xl bg-blue-100 dark:bg-blue-900/85 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-6xl shadow-xl"
        >
          {{ user.userName?.charAt(0) || '?' }}
        </div>

        <div class="flex-1">
          <h3 class="text-2xl font-bold text-gray-900 dark:text-[var(--p-text-color)] mb-2">{{ user.userName }}</h3>
          <p class="text-lg text-gray-600 dark:text-[var(--p-text-muted-color)] mb-4">{{ user.userPosition }}</p>
          <div class="flex items-center gap-2">
            <Tag
              :value="getStatusText(user)"
              :severity="getStatusSeverity(user)"
              class="text-base px-4 py-2"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-lg font-bold text-gray-900 dark:text-[var(--p-text-color)] mb-4 flex items-center gap-2">
          <i class="pi pi-calendar text-blue-600 dark:text-blue-400"></i>
          Joriy tashrif ma'lumotlari
        </h4>
        <div class="grid grid-cols-2 gap-6">
          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-[var(--p-surface-800)] p-4 rounded-lg border border-transparent dark:border-[var(--p-content-border-color)]">
              <div class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">ID raqam</div>
              <div class="text-lg font-mono font-bold text-gray-900 dark:text-[var(--p-text-color)]">{{ user.id }}</div>
            </div>

            <div class="bg-blue-50 dark:bg-blue-900/35 p-4 rounded-lg border border-transparent dark:border-blue-800/45">
              <div class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Kelgan sana</div>
              <div class="text-lg font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ formatDate(user.date) }}</div>
            </div>

            <div class="bg-green-50 dark:bg-emerald-900/32 p-4 rounded-lg border border-transparent dark:border-emerald-800/38">
              <div class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Kelgan vaqt</div>
              <div class="text-lg font-mono font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ formatTime(user.keldi) }}</div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-[var(--p-surface-800)] p-4 rounded-lg border border-transparent dark:border-[var(--p-content-border-color)]">
              <div class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Telefon raqam</div>
              <div class="text-lg font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ user.userTel || '-' }}</div>
            </div>

            <div class="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border border-transparent dark:border-orange-800/35">
              <div class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Ketgan vaqt</div>
              <div class="text-lg font-mono font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ formatTime(user.ketdi) }}</div>
            </div>

            <div class="bg-purple-50 dark:bg-purple-900/32 p-4 rounded-lg border border-transparent dark:border-purple-800/38">
              <div class="text-sm text-gray-500 dark:text-[var(--p-text-muted-color)] mb-1">Davomiyligi</div>
              <div class="text-lg font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ user.duration || '-' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-lg font-bold text-gray-900 dark:text-[var(--p-text-color)] mb-4 flex items-center gap-2">
          <i class="pi pi-history text-purple-600 dark:text-purple-400"></i>
          Tashriflar tarixi
          <span class="text-sm font-normal text-gray-500 dark:text-[var(--p-text-muted-color)]">({{ history.length }} ta tashrif)</span>
        </h4>

        <div v-if="loading" class="flex justify-center items-center py-8">
          <i class="pi pi-spin pi-spinner text-3xl text-blue-600 dark:text-blue-400"></i>
          <span class="ml-3 text-gray-600 dark:text-[var(--p-text-color)]">Yuklanmoqda...</span>
        </div>

        <div v-else-if="history.length === 0" class="text-center py-8 text-gray-500 dark:text-[var(--p-text-muted-color)]">
          <i class="pi pi-inbox text-4xl mb-3"></i>
          <p>Tashriflar tarixi topilmadi</p>
        </div>

        <div v-else class="max-h-96 overflow-y-auto px-4">
          <div class="max-w-3xl mx-auto">
            <Timeline :value="history" align="left" class="customized-timeline">
              <template #marker="{ item }">
                <div
                  class="flex w-10 h-10 items-center justify-center text-white rounded-full shadow-md border-2 border-white dark:border-[var(--p-content-border-color)]"
                  :class="isStillInLibrary(item) ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-500 dark:bg-blue-600'"
                >
                  <i :class="isStillInLibrary(item) ? 'pi pi-clock text-sm' : 'pi pi-check text-sm'"></i>
                </div>
              </template>
              <template #content="{ item }">
                <div class="ml-3 mb-5">
                  <div class="bg-white dark:bg-[var(--p-surface-800)] rounded-xl shadow-sm border border-gray-200 dark:border-[var(--p-content-border-color)] hover:shadow-md transition-all p-4">
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-3">
                          <i class="pi pi-calendar text-blue-500 dark:text-blue-400"></i>
                          <span class="font-bold text-gray-900 dark:text-[var(--p-text-color)] text-lg">{{ formatDate(item.date) }}</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div class="flex items-center gap-2 p-2 bg-green-50 dark:bg-emerald-900/38 rounded-lg border border-transparent dark:border-emerald-800/35">
                            <i class="pi pi-sign-in text-green-600 dark:text-emerald-400 text-lg"></i>
                            <div>
                              <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">Keldi</div>
                              <div class="font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ formatTime(item.keldi) }}</div>
                            </div>
                          </div>

                          <div v-if="item.ketdi" class="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/32 rounded-lg border border-transparent dark:border-red-800/35">
                            <i class="pi pi-sign-out text-red-600 dark:text-red-400 text-lg"></i>
                            <div>
                              <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">Ketdi</div>
                              <div class="font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ formatTime(item.ketdi) }}</div>
                            </div>
                          </div>

                          <div v-else class="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/28 rounded-lg border border-transparent dark:border-yellow-800/32">
                            <i class="pi pi-clock text-yellow-600 dark:text-yellow-400 text-lg"></i>
                            <div>
                              <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">Holat</div>
                              <div class="font-semibold text-gray-900 dark:text-[var(--p-text-color)]">Kutubxonada</div>
                            </div>
                          </div>

                          <div v-if="item.duration" class="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/32 rounded-lg border border-transparent dark:border-purple-800/35">
                            <i class="pi pi-hourglass text-purple-600 dark:text-purple-400 text-lg"></i>
                            <div>
                              <div class="text-xs text-gray-500 dark:text-[var(--p-text-muted-color)]">Davomiyligi</div>
                              <div class="font-semibold text-gray-900 dark:text-[var(--p-text-color)]">{{ item.duration }}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Tag
                        :value="getStatusText(item)"
                        :severity="getStatusSeverity(item)"
                        class="text-xs ml-3"
                      />
                    </div>
                  </div>
                </div>
              </template>
            </Timeline>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button
        label="Yopish"
        icon="pi pi-times"
        severity="secondary"
        class="px-6"
        @click="emit('update:visible', false)"
      />
    </template>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Timeline from 'primevue/timeline'

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Object,
    default: null,
  },
  history: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible'])

const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPhotoUrl = (photo) => {
  if (!photo) return null
  if (photo.startsWith('data:image/')) return photo
  if (photo.match(/^[A-Za-z0-9+/=]+$/)) return `data:image/jpeg;base64,${photo}`
  if (photo.startsWith('http://') || photo.startsWith('https://')) return photo
  return `${window.location.origin}${photo.startsWith('/') ? '' : '/'}${photo}`
}

const isStillInLibrary = (visit) => {
  if (!visit || visit.ketdi) return false
  const now = new Date()
  if (visit.date !== formatLocalDate(now)) return false
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  if (currentHour > 21 || (currentHour === 21 && currentMinute >= 21)) return false
  return true
}

const formatTime = (time) => {
  if (!time) return '-'
  return time
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('uz-UZ')
}

const getStatusSeverity = (visit) => (isStillInLibrary(visit) ? 'success' : 'secondary')

const getStatusText = (visit) => (isStillInLibrary(visit) ? 'Kutubxonada' : 'Chiqdi')
</script>

<style>
.p-dialog:has(.tashriflar-user-dialog) .p-dialog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 1.5rem;
}

.p-dialog:has(.tashriflar-user-dialog) .p-dialog-header .p-dialog-close-button,
.p-dialog:has(.tashriflar-user-dialog) .p-dialog-header .p-dialog-header-icon {
  color: white;
}

.p-dialog:has(.tashriflar-user-dialog) .p-dialog-content {
  padding: 2rem;
}

.p-dialog:has(.tashriflar-user-dialog) .p-dialog-footer {
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.p-dialog:has(.tashriflar-user-dialog) .customized-timeline {
  padding: 1rem 0;
}

.p-dialog:has(.tashriflar-user-dialog) .customized-timeline .p-timeline-event {
  min-height: 100px;
}

.p-dialog:has(.tashriflar-user-dialog) .customized-timeline .p-timeline-event-opposite {
  display: none;
}

.p-dialog:has(.tashriflar-user-dialog) .customized-timeline .p-timeline-event-marker {
  border: 0;
  background: transparent;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.p-dialog:has(.tashriflar-user-dialog) .customized-timeline .p-timeline-event-connector {
  background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
  width: 3px;
  margin: 0 auto;
}

.p-dialog:has(.tashriflar-user-dialog) .customized-timeline .p-timeline-event-content {
  flex: 1;
  padding: 0;
}

.p-dialog:has(.tashriflar-user-dialog) .customized-timeline .p-timeline-event-separator {
  align-items: flex-start;
  gap: 1rem;
}

.app-dark .p-dialog:has(.tashriflar-user-dialog) .p-dialog-content {
  background: var(--p-content-background);
  color: var(--p-text-color);
}

.app-dark .p-dialog:has(.tashriflar-user-dialog) .p-dialog-footer {
  background: var(--p-content-background);
  border-top-color: var(--p-content-border-color);
}

.app-dark .p-dialog:has(.tashriflar-user-dialog) .customized-timeline .p-timeline-event-connector {
  background: linear-gradient(to bottom, #60a5fa, #a78bfa);
  opacity: 0.85;
}
</style>
