<template>
  <div>
    <Toast />
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-5">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white m-0">Tillar</h1>
      <Button
        label="Til qo'shish"
        icon="pi pi-plus"
        class="bg-blue-600 hover:bg-blue-700 border-0"
        @click="openAddDialog"
      />
    </div>

    <div class="card bg-white dark:bg-zinc-800 shadow-md rounded-lg">
      <div v-if="isLoading" class="flex justify-center items-center p-8">
        <ProgressSpinner />
      </div>
      <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>
      <DataTable
        v-else
        :value="languages"
        dataKey="_id"
        responsiveLayout="scroll"
        class="p-datatable-sm"
      >
        <Column field="name" header="Nomi" sortable />
        <Column field="code" header="Kod" sortable style="width: 120px">
          <template #body="{ data }">
            <span class="font-mono">{{ data.code }}</span>
          </template>
        </Column>
        <Column header="Aliaslar" style="width: 140px">
          <template #body="{ data }">
            <span class="text-sm">{{ (data.aliases || []).join(', ') || '—' }}</span>
          </template>
        </Column>
        <Column field="isActive" header="Holat" style="width: 120px">
          <template #body="{ data }">
            <InputSwitch
              :modelValue="!!data.isActive"
              @update:modelValue="toggleActive(data, $event)"
            />
          </template>
        </Column>
        <Column header="Amallar" style="width: 100px">
          <template #body="{ data }">
            <Button
              icon="pi pi-pencil"
              text
              class="p-button-sm"
              v-tooltip.top="'Tahrirlash'"
              @click="openEditDialog(data)"
            />
            <Button
              icon="pi pi-trash"
              text
              class="p-button-sm p-button-danger"
              v-tooltip.top="'O\'chirish'"
              @click="confirmDelete(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      :modal="true"
      :style="{ width: '420px' }"
      :header="isEdit ? 'Tilni tahrirlash' : 'Yangi til qo\'shish'"
      :closable="true"
      @hide="closeDialog"
    >
      <div class="space-y-4 py-2">
        <div>
          <label for="lang-name" class="block text-sm font-semibold mb-2">Nomi *</label>
          <InputText
            id="lang-name"
            v-model="formData.name"
            placeholder="Masalan: O'zbekcha"
            class="w-full"
          />
        </div>
        <div>
          <label for="lang-code" class="block text-sm font-semibold mb-2">Kod *</label>
          <InputText
            id="lang-code"
            v-model="formData.code"
            placeholder="Masalan: uzb"
            class="w-full font-mono"
            :disabled="isEdit"
          />
          <small v-if="isEdit" class="text-gray-500">Kod o'zgartirilmaydi</small>
        </div>
        <div>
          <label for="lang-aliases" class="block text-sm font-semibold mb-2">Aliaslar (vergul bilan)</label>
          <InputText
            id="lang-aliases"
            v-model="formData.aliasesText"
            placeholder="Masalan: uz, uzk"
            class="w-full font-mono"
          />
          <small class="text-gray-500">Qisqa kodlar (uz, ru, en) — hujjatlar shu kodlar bilan ham tanlanadi</small>
        </div>
        <div class="flex items-center justify-between">
          <label for="lang-active" class="text-sm font-semibold">Faol</label>
          <InputSwitch id="lang-active" v-model="formData.isActive" />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" text @click="closeDialog" />
        <Button :label="isEdit ? 'Saqlash' : 'Qo\'shish'" @click="saveLanguage" :loading="isSaving" />
      </template>
    </Dialog>

    <ConfirmDialog />
    <ConfirmPopup />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputSwitch from 'primevue/inputswitch'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import ConfirmPopup from 'primevue/confirmpopup'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const languages = ref([])
const isLoading = ref(false)
const error = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const isSaving = ref(false)
const editingId = ref(null)

const formData = ref({
  name: '',
  code: '',
  aliasesText: '',
  isActive: true
})

const fetchLanguages = async () => {
  isLoading.value = true
  error.value = null
  try {
    const res = await fetch('/diss/languages')
    if (!res.ok) throw new Error('Yuklashda xatolik')
    languages.value = await res.json()
  } catch (e) {
    console.error(e)
    error.value = 'Tillarni yuklashda xatolik'
    toast.add({ severity: 'error', summary: 'Xato', detail: error.value, life: 3000 })
  } finally {
    isLoading.value = false
  }
}

const openAddDialog = () => {
  isEdit.value = false
  editingId.value = null
  formData.value = { name: '', code: '', aliasesText: '', isActive: true }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  editingId.value = row._id
  formData.value = {
    name: row.name || '',
    code: row.code || '',
    aliasesText: (row.aliases || []).join(', '),
    isActive: !!row.isActive
  }
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  formData.value = { name: '', code: '', aliasesText: '', isActive: true }
  editingId.value = null
}

const saveLanguage = async () => {
  const { name, code, aliasesText, isActive } = formData.value
  if (!name?.trim() || !code?.trim()) {
    toast.add({ severity: 'warn', summary: 'Diqqat', detail: 'Nomi va kod to\'ldirilishi shart', life: 3000 })
    return
  }
  const aliases = (aliasesText || '').split(',').map(s => s.trim()).filter(Boolean)
  isSaving.value = true
  try {
    const url = isEdit.value ? `/diss/languages/${editingId.value}` : '/diss/languages'
    const method = isEdit.value ? 'PUT' : 'POST'
    const body = isEdit.value
      ? { name: name.trim(), code: code.trim(), aliases, isActive }
      : { name: name.trim(), code: code.trim(), aliases, isActive }
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.message || 'Saqlashda xatolik')
    }
    toast.add({ severity: 'success', summary: 'Muvaffaqiyat', detail: isEdit.value ? 'O\'zgartirildi' : 'Qo\'shildi', life: 3000 })
    closeDialog()
    await fetchLanguages()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xato', detail: e.message || 'Xatolik', life: 3000 })
  } finally {
    isSaving.value = false
  }
}

const toggleActive = async (row, value) => {
  try {
    const res = await fetch(`/diss/languages/${row._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !!value })
    })
    if (!res.ok) throw new Error('Yangilashda xatolik')
    row.isActive = !!value
    toast.add({ severity: 'success', summary: 'Muvaffaqiyat', detail: 'Holat yangilandi', life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xato', detail: e.message, life: 3000 })
  }
}

const confirmDelete = (row) => {
  confirm.require({
    message: `"${row.name}" (${row.code}) tilini o'chirmoqchimisiz?`,
    header: 'O\'chirishni tasdiqlash',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const res = await fetch(`/diss/languages/${row._id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('O\'chirishda xatolik')
        toast.add({ severity: 'success', summary: 'O\'chirildi', life: 2000 })
        await fetchLanguages()
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Xato', detail: e.message, life: 3000 })
      }
    }
  })
}

onMounted(() => {
  fetchLanguages()
})
</script>
