<script setup>
import { ref, onMounted, computed } from "vue"
import { useToast } from "primevue/usetoast"
import Button from "primevue/button"
import InputText from "primevue/inputtext"
import InputSwitch from "primevue/inputswitch"
import ProgressSpinner from "primevue/progressspinner"
import apiService from "@/service/api.service"

const toast = useToast()
const companies = ref([])
const newCode = ref("")
const newName = ref("")
const searchQuery = ref("")
const loading = ref(false)

const activeCount = computed(() => companies.value.filter((row) => row.isActive !== false).length)
const filteredCompanies = computed(() => {
  const q = String(searchQuery.value || "").trim().toLowerCase()
  if (!q) return companies.value
  return companies.value.filter((row) => {
    return String(row.name || "").toLowerCase().includes(q) || String(row.code || "").includes(q)
  })
})

const loadCatalog = async () => {
  loading.value = true
  try {
    companies.value = await apiService.get("/member-companies", { params: { includeInactive: true } })
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "Tashkilotlar yuklanmadi",
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
  const code = String(newCode.value || "").trim()
  const name = String(newName.value || "").trim()
  if (!code || !name) {
    toast.add({ severity: "warn", summary: "Diqqat", detail: "Kod va nomni kiriting", life: 2500 })
    return
  }
  try {
    await apiService.post("/member-companies", { code, name })
    newCode.value = ""
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

const saveRow = async (row, { silent = false } = {}) => {
  try {
    await apiService.put(`/member-companies/${row._id}`, {
      code: row.code,
      name: row.name,
      isActive: row.isActive !== false,
    })
    if (!silent) {
      toast.add({ severity: "success", summary: "Saqlandi", life: 2000 })
    }
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Xato",
      detail: e?.message || "Yangilanmadi",
      life: 3500,
    })
    await loadCatalog()
  }
}

const toggleActive = async (row) => {
  await saveRow(row, { silent: true })
}

const deleteRow = async (row) => {
  if (!window.confirm(`"${row.name}" tashkilotini o‘chirmoqchimisiz?`)) return
  try {
    await apiService.delete(`/member-companies/${row._id}`)
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
</script>

<template>
  <div class="min-h-full bg-slate-50/90 dark:bg-surface-950 pb-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header class="mb-8">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
              <router-link
                to="/azo-bolganlar"
                class="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <i class="pi pi-arrow-left text-xs" />
                A'zo bo'lganlar
              </router-link>
              <span aria-hidden="true" class="text-surface-300 dark:text-surface-600">/</span>
              <span>Tashkilotlar</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-surface-900 dark:text-surface-0">
              Tashkilotlar
            </h1>
            <p class="text-surface-600 dark:text-surface-400 max-w-2xl text-sm sm:text-base leading-relaxed">
              Ro‘yxatga olish formasidagi tashkilotlar. Nofaol qilinganlari dropdownda chiqmaydi.
            </p>
          </div>
          <div
            class="flex shrink-0 items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 shadow-sm"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <i class="pi pi-building text-lg" />
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Ro‘yxat
              </p>
              <p class="text-lg font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                {{ companies.length }}
                <span class="text-sm font-normal text-surface-500 dark:text-surface-400">
                  / {{ activeCount }} faol
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <section
        class="mb-6 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6 shadow-sm"
      >
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-800 dark:text-surface-200">
          <span class="flex h-8 w-8 items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
            <i class="pi pi-plus text-sm" />
          </span>
          Yangi tashkilot
        </h2>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 max-w-3xl">
          <div class="w-full sm:w-40">
            <label for="member-co-new-code" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Kod
            </label>
            <InputText
              id="member-co-new-code"
              v-model="newCode"
              placeholder="0000245"
              class="w-full"
              maxlength="8"
              @keyup.enter="addNew"
            />
          </div>
          <div class="flex-1 min-w-0">
            <label for="member-co-new-name" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Nom
            </label>
            <InputText
              id="member-co-new-name"
              v-model="newName"
              placeholder="Masalan: ITPU"
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
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-surface-200 dark:border-surface-700 px-4 py-3 sm:px-5 sm:py-4"
        >
          <h2 class="text-sm font-semibold text-surface-800 dark:text-surface-200">Barcha tashkilotlar</h2>
          <div class="flex items-center gap-2">
            <InputText v-model="searchQuery" placeholder="Qidirish" class="w-52" />
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

        <div v-if="loading && companies.length === 0" class="flex flex-col items-center justify-center gap-3 py-16">
          <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
          <span class="text-sm text-surface-500">Yuklanmoqda…</span>
        </div>

        <div v-else-if="filteredCompanies.length === 0" class="py-14 text-center">
          <p class="font-medium text-surface-700 dark:text-surface-300">Hozircha tashkilot yo‘q</p>
        </div>

        <ul v-else class="divide-y divide-surface-200 dark:divide-surface-700">
          <li
            v-for="row in filteredCompanies"
            :key="row._id"
            class="flex flex-wrap items-stretch gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-3.5"
          >
            <div class="w-28 shrink-0">
              <InputText v-model="row.code" class="w-full font-mono" maxlength="8" />
            </div>
            <div class="flex-1 min-w-0">
              <InputText v-model="row.name" class="w-full" placeholder="Nom" />
            </div>
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-center gap-0.5">
                <InputSwitch v-model="row.isActive" @update:modelValue="toggleActive(row)" />
                <span
                  class="text-[0.65rem]"
                  :class="row.isActive !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-400'"
                >
                  {{ row.isActive !== false ? "Faol" : "Nofaol" }}
                </span>
              </div>
              <Button icon="pi pi-check" severity="success" rounded text v-tooltip.top="'Saqlash'" @click="saveRow(row)" />
              <Button icon="pi pi-trash" severity="danger" rounded text v-tooltip.top="'O‘chirish'" @click="deleteRow(row)" />
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
