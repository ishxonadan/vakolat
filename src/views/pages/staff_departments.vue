<script setup>
import { ref, onMounted, computed } from "vue"
import { useToast } from "primevue/usetoast"
import { useConfirm } from "primevue/useconfirm"
import Button from "primevue/button"
import InputText from "primevue/inputtext"
import InputSwitch from "primevue/inputswitch"
import Tag from "primevue/tag"
import ProgressSpinner from "primevue/progressspinner"
import ConfirmDialog from "primevue/confirmdialog"
import apiService from "@/service/api.service"

/** Standart bo‘lim — `routes/staff-departments.constants.js` bilan mos */
const DEFAULT_UNASSIGNED_DEPT = "bo'lim yo'q"

const toast = useToast()
const confirm = useConfirm()
const staffDeptsAll = ref([])
const newDeptName = ref("")
const loading = ref(false)

const sortedDepts = computed(() => {
  const list = [...staffDeptsAll.value]
  list.sort((a, b) => {
    const da = isDefaultUnassignedDept(a) ? 0 : 1
    const db = isDefaultUnassignedDept(b) ? 0 : 1
    if (da !== db) return da - db
    return String(a.name || "").localeCompare(String(b.name || ""), "uz", { sensitivity: "base" })
  })
  return list
})

const activeCount = computed(() => staffDeptsAll.value.filter((d) => d.isActive !== false).length)

function isDefaultUnassignedDept(row) {
  return row?.name === DEFAULT_UNASSIGNED_DEPT
}

function rowClassForDept(data) {
  return isDefaultUnassignedDept(data) ? "dept-row-default" : undefined
}

const loadCatalog = async () => {
  loading.value = true
  try {
    staffDeptsAll.value = await apiService.get("/staff-departments", { params: { includeInactive: true } })
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "Bo‘limlar yuklanmadi",
      life: 3500,
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCatalog()
})

const addNew = async () => {
  const name = String(newDeptName.value || "").trim()
  if (!name) {
    toast.add({ severity: "warn", summary: "Diqqat", detail: "Bo‘lim nomini kiriting", life: 2500 })
    return
  }
  try {
    await apiService.post("/staff-departments", { name })
    newDeptName.value = ""
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
    await apiService.put(`/staff-departments/${row._id}`, {
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

const tryDeleteDepartment = async (row, confirmReassign) => {
  const q = confirmReassign ? "?confirmReassign=1" : ""
  await apiService.delete(`/staff-departments/${row._id}${q}`)
  toast.add({ severity: "success", summary: "O‘chirildi", life: 2500 })
  await loadCatalog()
}

const deleteRow = async (row) => {
  if (isDefaultUnassignedDept(row)) {
    toast.add({
      severity: "warn",
      summary: "Diqqat",
      detail: `«${DEFAULT_UNASSIGNED_DEPT}» standart bo‘limini o‘chirib bo‘lmaydi`,
      life: 4000,
    })
    return
  }
  try {
    await tryDeleteDepartment(row, false)
  } catch (e) {
    if (e.status === 409 && e.payload?.needsReassignConfirm) {
      const n = e.payload.expertCount ?? "—"
      confirm.require({
        message: `Bu bo‘limda ${n} ta xodim bor. Bo‘limni o‘chirsangiz, ularning barchasi «${DEFAULT_UNASSIGNED_DEPT}» bo‘limiga avtomatik o‘tkaziladi.`,
        header: "Bo‘limni o‘chirish",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Ha, o‘tkazish va o‘chirish",
        rejectLabel: "Bekor qilish",
        acceptClass: "p-button-warning",
        accept: async () => {
          try {
            await tryDeleteDepartment(row, true)
          } catch (err) {
            toast.add({
              severity: "error",
              summary: "Xato",
              detail: err?.message || "O‘chirilmadi",
              life: 4000,
            })
          }
        },
      })
      return
    }
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "O‘chirilmadi",
      life: 4000,
    })
  }
}
</script>

<template>
  <ConfirmDialog />
  <div class="staff-departments-page min-h-full bg-slate-50/90 dark:bg-surface-950 pb-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <!-- Header -->
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
              <span>Tashkiliy tuzilma</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-surface-900 dark:text-surface-0">
              Tashkiliy bo‘limlar
            </h1>
            <p class="text-surface-600 dark:text-surface-400 max-w-2xl text-sm sm:text-base leading-relaxed">
              Guruhlar <span class="font-medium text-surface-800 dark:text-surface-200">pullik zallar</span> yoki
              <span class="font-medium text-surface-800 dark:text-surface-200">huquq guruhi</span> bilan bog‘lanmaydi — faqat
              xodimlar ro‘yxatidagi filtr va kartalar uchun.
            </p>
          </div>
          <div
            class="flex shrink-0 items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 shadow-sm"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <i class="pi pi-building text-lg" />
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Ro‘yxat
              </p>
              <p class="text-lg font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                {{ staffDeptsAll.length }}
                <span class="text-sm font-normal text-surface-500 dark:text-surface-400">
                  / {{ activeCount }} faol
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <!-- Info -->
      <div
        class="mb-6 flex gap-3 rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3.5 text-sm dark:border-sky-900/50 dark:bg-sky-950/25"
      >
        <i class="pi pi-info-circle mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div class="space-y-2 text-surface-700 dark:text-surface-300">
          <p class="font-medium text-surface-900 dark:text-surface-100">Standart «{{ DEFAULT_UNASSIGNED_DEPT }}» bo‘limi</p>
          <ul class="list-disc space-y-1 pl-5 text-surface-600 dark:text-surface-400 leading-snug">
            <li>Boshqa bo‘lim o‘chirilganda undagi xodimlar shu yerga o‘tkaziladi — avval tasdiqlash oynasi chiqadi.</li>
            <li>Standart bo‘limning nomini o‘zgartirib yoki butunlay o‘chirib bo‘lmaydi.</li>
          </ul>
        </div>
      </div>

      <!-- Add -->
      <section
        class="mb-6 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6 shadow-sm"
      >
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-800 dark:text-surface-200">
          <span class="flex h-8 w-8 items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
            <i class="pi pi-plus text-sm" />
          </span>
          Yangi bo‘lim
        </h2>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 max-w-2xl">
          <div class="flex-1 min-w-0">
            <label for="staff-dept-new-name" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Nom
            </label>
            <InputText
              id="staff-dept-new-name"
              v-model="newDeptName"
              placeholder="Masalan: Kadrlar bo‘limi"
              class="w-full"
              @keyup.enter="addNew"
            />
          </div>
          <Button label="Qo‘shish" icon="pi pi-plus" class="shrink-0" @click="addNew" />
        </div>
      </section>

      <!-- Table -->
      <section
        class="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm overflow-hidden"
      >
        <div
          class="flex items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-700 px-4 py-3 sm:px-5 sm:py-4"
        >
          <h2 class="text-sm font-semibold text-surface-800 dark:text-surface-200">Barcha bo‘limlar</h2>
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

        <div v-if="loading && staffDeptsAll.length === 0" class="flex flex-col items-center justify-center gap-3 py-16">
          <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
          <span class="text-sm text-surface-500">Yuklanmoqda…</span>
        </div>

        <template v-else>
          <DataTable
            :value="sortedDepts"
            data-key="_id"
            :loading="loading && staffDeptsAll.length > 0"
            striped-rows
            :row-class="rowClassForDept"
            class="dept-table text-sm border-0"
          >
            <Column field="name" header="Bo‘lim nomi" sortable style="min-width: 14rem">
              <template #body="{ data }">
                <div class="flex flex-wrap items-center gap-2 py-0.5">
                  <InputText
                    v-model="data.name"
                    class="w-full min-w-[12rem] max-w-md"
                    :disabled="isDefaultUnassignedDept(data)"
                    :placeholder="isDefaultUnassignedDept(data) ? DEFAULT_UNASSIGNED_DEPT : ''"
                  />
                  <Tag
                    v-if="isDefaultUnassignedDept(data)"
                    severity="info"
                    value="Standart"
                    icon="pi pi-shield"
                    class="shrink-0 text-xs"
                  />
                </div>
              </template>
            </Column>

            <Column header="Holat" style="width: 7rem" class="text-center">
              <template #body="{ data }">
                <div class="flex flex-col items-center gap-1">
                  <InputSwitch v-model="data.isActive" />
                  <span
                    class="text-xs"
                    :class="
                      data.isActive !== false
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-surface-400 dark:text-surface-500'
                    "
                  >
                    {{ data.isActive !== false ? "Faol" : "Nofaol" }}
                  </span>
                </div>
              </template>
            </Column>

            <Column header="Amallar" style="width: 8.5rem" :exportable="false">
              <template #body="{ data }">
                <div class="flex flex-wrap items-center justify-end gap-1">
                  <Button
                    icon="pi pi-check"
                    severity="success"
                    rounded
                    text
                    v-tooltip.top="'Saqlash'"
                    aria-label="Saqlash"
                    @click="saveRow(data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    rounded
                    text
                    v-tooltip.top="isDefaultUnassignedDept(data) ? 'Standart bo‘limni o‘chirib bo‘lmaydi' : 'O‘chirish'"
                    :disabled="isDefaultUnassignedDept(data)"
                    aria-label="O‘chirish"
                    @click="deleteRow(data)"
                  />
                </div>
              </template>
            </Column>

            <template #empty>
              <div class="py-14 text-center">
                <div
                  class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400"
                >
                  <i class="pi pi-inbox text-2xl" />
                </div>
                <p class="font-medium text-surface-700 dark:text-surface-300">Hozircha bo‘lim yo‘q</p>
                <p class="mt-1 text-sm text-surface-500">Yuqoridagi forma orqali birinchi bo‘limni qo‘shing.</p>
              </div>
            </template>
          </DataTable>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.staff-departments-page :deep(.dept-table.p-datatable) {
  --p-datatable-body-cell-padding: 0.75rem 1rem;
}

.staff-departments-page :deep(.p-datatable thead th) {
  background: var(--p-surface-50);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--p-surface-600);
}

.app-dark .staff-departments-page :deep(.p-datatable thead th) {
  background: var(--p-surface-800);
  color: var(--p-surface-400);
}

.staff-departments-page :deep(tr.dept-row-default > td) {
  box-shadow: inset 3px 0 0 0 var(--p-primary-color);
}

.staff-departments-page :deep(tr.dept-row-default) {
  background: color-mix(in srgb, var(--p-primary-color) 6%, transparent);
}

.app-dark .staff-departments-page :deep(tr.dept-row-default) {
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
}
</style>
