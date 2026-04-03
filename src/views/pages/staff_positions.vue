<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from "vue"
import { useToast } from "primevue/usetoast"
import Sortable from "sortablejs"
import Button from "primevue/button"
import InputText from "primevue/inputtext"
import InputSwitch from "primevue/inputswitch"
import ProgressSpinner from "primevue/progressspinner"
import apiService from "@/service/api.service"

const toast = useToast()
const positionsAll = ref([])
const newName = ref("")
const loading = ref(false)
const reorderSaving = ref(false)
const listRef = ref(null)
let sortableInstance = null

const activeCount = computed(() => positionsAll.value.filter((p) => p.isActive !== false).length)

const loadCatalog = async () => {
  loading.value = true
  try {
    positionsAll.value = await apiService.get("/staff-positions", { params: { includeInactive: true } })
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "Lavozimlar yuklanmadi",
      life: 3500,
    })
  } finally {
    loading.value = false
  }
}

function destroySortable() {
  sortableInstance?.destroy()
  sortableInstance = null
}

function initSortable() {
  if (!listRef.value || positionsAll.value.length === 0) return
  destroySortable()
  sortableInstance = Sortable.create(listRef.value, {
    animation: 200,
    easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    handle: ".drag-handle-square",
    ghostClass: "position-sortable-ghost",
    chosenClass: "position-sortable-chosen",
    dragClass: "position-sortable-drag",
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 6,
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      const list = [...positionsAll.value]
      const [moved] = list.splice(oldIndex, 1)
      list.splice(newIndex, 0, moved)
      list.forEach((p, i) => {
        p.sortOrder = i + 1
      })
      positionsAll.value = list
      void persistOrder()
    },
  })
}

watch(
  () => positionsAll.value.map((p) => p._id).join(),
  async () => {
    await nextTick()
    destroySortable()
    if (listRef.value && positionsAll.value.length > 0) {
      initSortable()
    }
  },
)

onMounted(() => {
  loadCatalog()
})

onBeforeUnmount(() => {
  destroySortable()
})

const addNew = async () => {
  const name = String(newName.value || "").trim()
  if (!name) {
    toast.add({ severity: "warn", summary: "Diqqat", detail: "Lavozim nomini kiriting", life: 2500 })
    return
  }
  try {
    await apiService.post("/staff-positions", { name })
    newName.value = ""
    toast.add({ severity: "success", summary: "Qo‘shildi", life: 2500 })
    await loadCatalog()
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "Saqlanmadi",
      life: 3500,
    })
  }
}

const saveRow = async (row) => {
  try {
    await apiService.put(`/staff-positions/${row._id}`, {
      name: row.name,
      isActive: row.isActive !== false,
    })
    toast.add({ severity: "success", summary: "Saqlandi", life: 2000 })
    await loadCatalog()
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "Yangilanmadi",
      life: 3500,
    })
  }
}

const deleteRow = async (row) => {
  try {
    await apiService.delete(`/staff-positions/${row._id}`)
    toast.add({ severity: "success", summary: "O‘chirildi", life: 2500 })
    await loadCatalog()
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "O‘chirilmadi",
      life: 4000,
    })
  }
}

async function persistOrder() {
  const orderedIds = positionsAll.value.map((p) => p._id)
  reorderSaving.value = true
  try {
    const updated = await apiService.put("/staff-positions/reorder", { orderedIds })
    positionsAll.value = updated
    toast.add({ severity: "success", summary: "Tartib saqlandi", life: 1800 })
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "Tartib saqlanmadi",
      life: 3500,
    })
    await loadCatalog()
  } finally {
    reorderSaving.value = false
  }
}
</script>

<template>
  <div class="staff-positions-page min-h-full bg-slate-50/90 dark:bg-surface-950 pb-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header class="mb-8">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
              <router-link
                to="/xodimlar"
                class="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <i class="pi pi-arrow-left text-xs" />
                Xodimlar
              </router-link>
              <span aria-hidden="true" class="text-surface-300 dark:text-surface-600">/</span>
              <span>Lavozimlar</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-surface-900 dark:text-surface-0">
              Lavozimlar
            </h1>
            <p class="text-surface-600 dark:text-surface-400 max-w-2xl text-sm sm:text-base leading-relaxed">
              Unvon va toifa ro‘yxati — xodim kartalaridagi dropdown va tartib shu yerda boshqariladi. Chapdagi
              kvadratdan ushlab tartibni o‘zgartiring; raqamlar avtomatik yangilanadi.
            </p>
          </div>
          <div
            class="flex shrink-0 items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 shadow-sm"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <i class="pi pi-id-card text-lg" />
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Ro‘yxat
              </p>
              <p class="text-lg font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                {{ positionsAll.length }}
                <span class="text-sm font-normal text-surface-500 dark:text-surface-400">
                  / {{ activeCount }} faol
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div
        class="mb-6 flex gap-3 rounded-xl border border-violet-200/80 bg-violet-50/80 px-4 py-3.5 text-sm dark:border-violet-900/40 dark:bg-violet-950/20"
      >
        <i class="pi pi-arrows-alt mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" />
        <div class="space-y-1 text-surface-700 dark:text-surface-300">
          <p class="font-medium text-surface-900 dark:text-surface-100">Tartibni o‘zgartirish</p>
          <p class="text-surface-600 dark:text-surface-400 leading-snug">
            Chapdagi kvadratni ushlab sudrab boshqa qator ustiga qo‘ying. O‘zgarishlar serverga yoziladi;
            <span class="font-medium text-surface-800 dark:text-surface-200">tartib raqami</span> (1, 2, 3, …)
            avtomatik hisoblanadi — kichik raqam ro‘yxatda yuqoriroq.
          </p>
        </div>
      </div>

      <section
        class="mb-6 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6 shadow-sm"
      >
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-800 dark:text-surface-200">
          <span class="flex h-8 w-8 items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
            <i class="pi pi-plus text-sm" />
          </span>
          Yangi lavozim
        </h2>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 max-w-2xl">
          <div class="flex-1 min-w-0">
            <label for="staff-pos-new-name" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Nom
            </label>
            <InputText
              id="staff-pos-new-name"
              v-model="newName"
              placeholder="Masalan: Yetakchi mutaxassis"
              class="w-full"
              @keyup.enter="addNew"
            />
          </div>
          <Button label="Qo‘shish" icon="pi pi-plus" class="shrink-0" @click="addNew" />
        </div>
      </section>

      <section
        class="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm overflow-hidden"
      >
        <div
          class="flex items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-700 px-4 py-3 sm:px-5 sm:py-4"
        >
          <h2 class="text-sm font-semibold text-surface-800 dark:text-surface-200">Barcha lavozimlar</h2>
          <div class="flex items-center gap-2">
            <span
              v-if="reorderSaving"
              class="text-xs text-surface-500 flex items-center gap-1.5"
            >
              <ProgressSpinner style="width: 1rem; height: 1rem" stroke-width="4" />
              Saqlanmoqda…
            </span>
            <Button
              type="button"
              icon="pi pi-refresh"
              severity="secondary"
              text
              rounded
              :loading="loading"
              v-tooltip.bottom="'Yangilash'"
              aria-label="Ro‘yxatni yangilash"
              @click="loadCatalog"
            />
          </div>
        </div>

        <div v-if="loading && positionsAll.length === 0" class="flex flex-col items-center justify-center gap-3 py-16">
          <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
          <span class="text-sm text-surface-500">Yuklanmoqda…</span>
        </div>

        <div v-else-if="positionsAll.length === 0" class="py-14 text-center">
          <div
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400"
          >
            <i class="pi pi-inbox text-2xl" />
          </div>
          <p class="font-medium text-surface-700 dark:text-surface-300">Hozircha lavozim yo‘q</p>
          <p class="mt-1 text-sm text-surface-500">
            Yuqoridagi forma orqali qo‘shing yoki server ishga tushganda standart ro‘yxat yaratiladi.
          </p>
        </div>

        <ul v-else ref="listRef" class="staff-positions-sortable divide-y divide-surface-200 dark:divide-surface-700">
          <li
            v-for="(p, idx) in positionsAll"
            :key="p._id"
            class="position-row group flex flex-wrap items-stretch gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-3.5 transition-[background-color,box-shadow] duration-200"
          >
            <div
              class="drag-handle-square shrink-0 flex flex-col items-center justify-center gap-0.5 w-[3.25rem] h-[3.25rem] sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/80 text-surface-500 dark:text-surface-400 cursor-grab active:cursor-grabbing select-none hover:border-primary/50 hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10 transition-colors touch-none"
              title="Sudrab tartibni o‘zgartiring"
            >
              <i class="pi pi-bars text-sm opacity-80" />
              <span class="text-[0.65rem] font-bold tabular-nums leading-none text-surface-700 dark:text-surface-200">
                {{ idx + 1 }}
              </span>
            </div>

            <div class="flex flex-1 flex-col sm:flex-row min-w-0 gap-3 sm:items-center sm:gap-4">
              <div class="flex-1 min-w-0">
                <label class="sr-only" :for="`pos-name-${p._id}`">Lavozim nomi</label>
                <InputText
                  :id="`pos-name-${p._id}`"
                  v-model="p.name"
                  class="w-full"
                  placeholder="Nom"
                />
              </div>
              <div class="flex items-center gap-3 sm:shrink-0">
                <div class="flex flex-col items-center gap-0.5 border-l border-surface-200 dark:border-surface-700 pl-3">
                  <InputSwitch v-model="p.isActive" />
                  <span
                    class="text-[0.65rem]"
                    :class="
                      p.isActive !== false
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-surface-400 dark:text-surface-500'
                    "
                  >
                    {{ p.isActive !== false ? "Faol" : "Nofaol" }}
                  </span>
                </div>
                <div class="flex items-center gap-1 pl-1">
                  <Button
                    icon="pi pi-check"
                    severity="success"
                    rounded
                    text
                    v-tooltip.top="'Saqlash'"
                    aria-label="Saqlash"
                    @click="saveRow(p)"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    rounded
                    text
                    v-tooltip.top="'O‘chirish'"
                    aria-label="O‘chirish"
                    @click="deleteRow(p)"
                  />
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* SortableJS: Trello-style placeholder + lifted drag clone (forceFallback) */
:deep(.position-sortable-ghost) {
  opacity: 0.45;
  background: color-mix(in srgb, var(--p-primary-color) 14%, transparent) !important;
  border: 2px dashed color-mix(in srgb, var(--p-primary-color) 50%, transparent);
  border-radius: 0.75rem;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

:deep(.position-sortable-chosen .drag-handle-square) {
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--p-primary-color) 45%, transparent);
}
</style>

/* forceFallback drags append to body — must be global */
<style>
.position-sortable-drag {
  cursor: grabbing !important;
  opacity: 1 !important;
  transform: rotate(2.5deg) scale(1.02);
  box-shadow:
    0 12px 28px -4px rgb(0 0 0 / 0.18),
    0 4px 8px -3px rgb(0 0 0 / 0.12);
  border-radius: 0.75rem;
  background: var(--p-content-background);
  z-index: 9999 !important;
}
</style>
