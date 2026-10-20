<template>
  <div>
    <Toast />
    <div class="flex flex-wrap justify-between items-center gap-3 p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-5">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white m-0">Kategoriyalar</h1>
      <div class="flex flex-wrap gap-2">
        <Button
          label="Ko'chirish"
          icon="pi pi-arrows-h"
          severity="secondary"
          outlined
          @click="openMoveDialog"
        />
        <Button
          label="Kategoriya qo'shish"
          icon="pi pi-plus"
          class="bg-blue-600 hover:bg-blue-700 border-0"
          @click="openAddDialog"
        />
      </div>
    </div>

    <div class="card bg-white dark:bg-zinc-800 shadow-md rounded-lg">
      <div v-if="isLoading" class="flex justify-center items-center p-8">
        <ProgressSpinner />
      </div>
      <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>
      <DataTable
        v-else
        :value="categories"
        dataKey="_id"
        responsiveLayout="scroll"
        class="p-datatable-sm"
      >
        <Column field="razdel_id" header="ID" sortable style="width: 100px">
          <template #body="{ data }">
            <span class="font-mono">{{ data.razdel_id }}</span>
          </template>
        </Column>
        <Column field="name" header="O'zbekcha" sortable />
        <Column field="name_ru" header="Ruscha" sortable>
          <template #body="{ data }">{{ data.name_ru || '—' }}</template>
        </Column>
        <Column field="name_en" header="Inglizcha" sortable>
          <template #body="{ data }">{{ data.name_en || '—' }}</template>
        </Column>
        <Column field="dissertationCount" header="Dissertatsiyalar" sortable style="width: 160px">
          <template #body="{ data }">
            <span class="tabular-nums">{{ data.dissertationCount ?? 0 }}</span>
          </template>
        </Column>
        <Column header="Amallar" style="width: 280px">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-2">
              <Button
                icon="pi pi-pencil"
                label="Tahrirlash"
                severity="secondary"
                size="small"
                outlined
                class="rounded-lg"
                @click="openEditDialog(data)"
              />
              <Button
                icon="pi pi-trash"
                label="O'chirish"
                severity="danger"
                size="small"
                outlined
                class="rounded-lg"
                @click="confirmDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      :modal="true"
      :style="{ width: '480px' }"
      :header="isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'"
      :closable="true"
      @hide="closeDialog"
    >
      <div class="space-y-4 py-2">
        <div>
          <label for="cat-name" class="block text-sm font-semibold mb-2">O'zbekcha *</label>
          <InputText
            id="cat-name"
            v-model="formData.name"
            placeholder="Masalan: Dissertatsiya"
            class="w-full"
          />
          <small class="text-gray-500">Asosiy nom. Boshqa loyiha shu maydonni o'qiydi.</small>
        </div>
        <div>
          <label for="cat-name-ru" class="block text-sm font-semibold mb-2">Ruscha</label>
          <InputText
            id="cat-name-ru"
            v-model="formData.name_ru"
            placeholder="Например: Диссертация"
            class="w-full"
          />
        </div>
        <div>
          <label for="cat-name-en" class="block text-sm font-semibold mb-2">Inglizcha</label>
          <InputText
            id="cat-name-en"
            v-model="formData.name_en"
            placeholder="For example: Dissertation"
            class="w-full"
          />
        </div>
        <div v-if="isEdit">
          <label class="block text-sm font-semibold mb-2">ID</label>
          <InputText :modelValue="String(formData.razdel_id ?? '')" class="w-full font-mono" disabled />
          <small class="text-gray-500">ID o'zgartirilmaydi (dissertatsiyalar shu ID bilan bog'langan)</small>
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" text @click="closeDialog" />
        <Button :label="isEdit ? 'Saqlash' : 'Qo\'shish'" :loading="isSaving" @click="saveCategory" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="moveDialogVisible"
      :modal="true"
      :style="{ width: '480px' }"
      header="Dissertatsiyalarni ko'chirish"
      :closable="true"
      @hide="closeMoveDialog"
    >
      <div class="space-y-4 py-2">
        <p class="text-sm text-surface-600 dark:text-surface-400 m-0">
          Bir kategoriyadagi barcha dissertatsiyalarni boshqa kategoriyaga o'tkazadi.
        </p>
        <div>
          <label for="move-from" class="block text-sm font-semibold mb-2">Qayerdan *</label>
          <Dropdown
            id="move-from"
            v-model="moveForm.fromRazdelId"
            :options="categories"
            optionLabel="name"
            optionValue="razdel_id"
            placeholder="Manba kategoriya"
            class="w-full"
          >
            <template #option="{ option }">
              <span>{{ option.name }} ({{ option.dissertationCount ?? 0 }})</span>
            </template>
            <template #value="{ value, placeholder }">
              <span v-if="value != null">{{ categoryLabel(value) }}</span>
              <span v-else>{{ placeholder }}</span>
            </template>
          </Dropdown>
        </div>
        <div>
          <label for="move-to" class="block text-sm font-semibold mb-2">Qayerga *</label>
          <Dropdown
            id="move-to"
            v-model="moveForm.toRazdelId"
            :options="moveTargetOptions"
            optionLabel="name"
            optionValue="razdel_id"
            placeholder="Nishon kategoriya"
            class="w-full"
          >
            <template #option="{ option }">
              <span>{{ option.name }} ({{ option.dissertationCount ?? 0 }})</span>
            </template>
            <template #value="{ value, placeholder }">
              <span v-if="value != null">{{ categoryLabel(value) }}</span>
              <span v-else>{{ placeholder }}</span>
            </template>
          </Dropdown>
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" text @click="closeMoveDialog" />
        <Button label="Ko'chirish" icon="pi pi-arrows-h" :loading="isMoving" @click="moveDissertations" />
      </template>
    </Dialog>

    <ConfirmDialog
      group="diss-cats"
      :pt="{
        root: { class: 'shadow-lg rounded-xl' },
        header: { class: 'text-lg font-semibold' },
        content: { class: 'text-gray-700 dark:text-gray-300' },
        footer: { class: 'flex gap-2 justify-end flex-wrap' }
      }"
      acceptLabel="Ha, o'chirish"
      rejectLabel="Bekor qilish"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { apiFetch } from '@/utils/api'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'

const toast = useToast()
const confirm = useConfirm()

const categories = ref([])
const isLoading = ref(false)
const error = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const isSaving = ref(false)
const editingId = ref(null)
const emptyForm = () => ({ name: '', name_ru: '', name_en: '', razdel_id: null })
const formData = ref(emptyForm())

const moveDialogVisible = ref(false)
const isMoving = ref(false)
const moveForm = ref({ fromRazdelId: null, toRazdelId: null })

const moveTargetOptions = computed(() =>
  categories.value.filter((row) => row.razdel_id !== moveForm.value.fromRazdelId),
)

const categoryLabel = (razdelId) => {
  const row = categories.value.find((c) => c.razdel_id === razdelId)
  return row ? `${row.name} (${row.dissertationCount ?? 0})` : String(razdelId)
}

const fetchCategories = async () => {
  isLoading.value = true
  error.value = null
  try {
    const res = await apiFetch('/api/diss/razdels?includeCounts=true')
    if (!res.ok) throw new Error('Yuklashda xatolik')
    categories.value = await res.json()
  } catch (e) {
    console.error(e)
    error.value = 'Kategoriyalarni yuklashda xatolik'
    toast.add({ severity: 'error', summary: 'Xato', detail: error.value, life: 3000 })
  } finally {
    isLoading.value = false
  }
}

const openAddDialog = () => {
  isEdit.value = false
  editingId.value = null
  formData.value = emptyForm()
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  editingId.value = row._id
  formData.value = {
    name: row.name || '',
    name_ru: row.name_ru || '',
    name_en: row.name_en || '',
    razdel_id: row.razdel_id,
  }
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  formData.value = emptyForm()
  editingId.value = null
}

const saveCategory = async () => {
  const name = String(formData.value.name || '').trim()
  if (!name) {
    toast.add({ severity: 'warn', summary: 'Diqqat', detail: 'O\'zbekcha nomi to\'ldirilishi shart', life: 3000 })
    return
  }
  isSaving.value = true
  try {
    const url = isEdit.value ? `/api/diss/razdels/${editingId.value}` : '/api/diss/razdels'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify({
        name,
        name_ru: String(formData.value.name_ru || '').trim(),
        name_en: String(formData.value.name_en || '').trim(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Saqlashda xatolik')
    toast.add({
      severity: 'success',
      summary: 'Muvaffaqiyat',
      detail: isEdit.value ? 'O\'zgartirildi' : 'Qo\'shildi',
      life: 3000,
    })
    closeDialog()
    await fetchCategories()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xato', detail: e.message || 'Xatolik', life: 3000 })
  } finally {
    isSaving.value = false
  }
}

const openMoveDialog = () => {
  moveForm.value = { fromRazdelId: null, toRazdelId: null }
  moveDialogVisible.value = true
}

const closeMoveDialog = () => {
  moveDialogVisible.value = false
  moveForm.value = { fromRazdelId: null, toRazdelId: null }
}

const moveDissertations = async () => {
  const { fromRazdelId, toRazdelId } = moveForm.value
  if (fromRazdelId == null || toRazdelId == null) {
    toast.add({
      severity: 'warn',
      summary: 'Diqqat',
      detail: 'Manba va nishon kategoriyalarni tanlang',
      life: 3000,
    })
    return
  }
  if (fromRazdelId === toRazdelId) {
    toast.add({
      severity: 'warn',
      summary: 'Diqqat',
      detail: 'Manba va nishon bir xil bo\'lmasligi kerak',
      life: 3000,
    })
    return
  }

  const fromLabel = categoryLabel(fromRazdelId)
  const toLabel = categoryLabel(toRazdelId)
  confirm.require({
    group: 'diss-cats',
    message: `"${fromLabel}" dagi barcha dissertatsiyalarni "${toLabel}" ga ko'chirmoqchimisiz?`,
    header: "Ko'chirishni tasdiqlash",
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Bekor qilish',
    acceptLabel: "Ha, ko'chirish",
    rejectClass: 'p-button-secondary p-button-outlined rounded-lg',
    acceptClass: 'p-button-primary rounded-lg',
    accept: async () => {
      isMoving.value = true
      try {
        const res = await apiFetch('/api/diss/razdels/move', {
          method: 'POST',
          body: JSON.stringify({ fromRazdelId, toRazdelId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || "Ko'chirishda xatolik")
        toast.add({
          severity: 'success',
          summary: 'Muvaffaqiyat',
          detail: `${data.modified ?? 0} ta dissertatsiya ko'chirildi`,
          life: 3500,
        })
        closeMoveDialog()
        await fetchCategories()
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Xato', detail: e.message, life: 3500 })
      } finally {
        isMoving.value = false
      }
    },
  })
}

const confirmDelete = (row) => {
  const count = row.dissertationCount ?? 0
  if (count > 0) {
    toast.add({
      severity: 'warn',
      summary: 'O\'chirib bo\'lmaydi',
      detail: `Bu kategoriyada ${count} ta dissertatsiya bor. Avval "Ko'chirish" orqali boshqa kategoriyaga o'tkazing`,
      life: 5000,
    })
    return
  }
  confirm.require({
    group: 'diss-cats',
    message: `"${row.name}" kategoriyasini o'chirmoqchimisiz?`,
    header: "O'chirishni tasdiqlash",
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Bekor qilish',
    acceptLabel: "Ha, o'chirish",
    rejectClass: 'p-button-secondary p-button-outlined rounded-lg',
    acceptClass: 'p-button-danger rounded-lg',
    accept: async () => {
      try {
        const res = await apiFetch(`/api/diss/razdels/${row._id}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || "O'chirishda xatolik")
        toast.add({ severity: 'success', summary: 'Muvaffaqiyat', detail: "Kategoriya o'chirildi", life: 2000 })
        await fetchCategories()
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Xato', detail: e.message, life: 3500 })
      }
    },
  })
}

onMounted(() => {
  fetchCategories()
})
</script>
