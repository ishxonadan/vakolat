<template>
  <div>
    <Toast />
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg mb-5">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white m-0">Soha kodlari</h1>
      <Button
        label="Soha qo'shish"
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
        :value="fields"
        dataKey="_id"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        :paginator="true"
        :rows="25"
        :rowsPerPageOptions="[25, 50, 100]"
      >
        <Column field="code" header="Kod" sortable style="width: 140px">
          <template #body="{ data }">
            <span class="font-mono">{{ data.code }}</span>
          </template>
        </Column>
        <Column field="name" header="Nomi" sortable />
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
      :style="{ width: '480px' }"
      :header="isEdit ? 'Sohani tahrirlash' : 'Yangi soha qo\'shish'"
      :closable="true"
      @hide="closeDialog"
    >
      <div class="space-y-4 py-2">
        <div>
          <label for="soha-code" class="block text-sm font-semibold mb-2">Kod *</label>
          <InputText
            id="soha-code"
            v-model="formData.code"
            placeholder="Masalan: 01.00.00"
            class="w-full font-mono"
            :disabled="isEdit"
          />
          <small v-if="isEdit" class="text-gray-500">Kod o'zgartirilmaydi</small>
        </div>
        <div>
          <label for="soha-name" class="block text-sm font-semibold mb-2">Nomi *</label>
          <InputText
            id="soha-name"
            v-model="formData.name"
            placeholder="Masalan: Fizika-matematika fanlari"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" text @click="closeDialog" />
        <Button :label="isEdit ? 'Saqlash' : 'Qo\'shish'" @click="saveField" :loading="isSaving" />
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
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import ConfirmPopup from 'primevue/confirmpopup'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const fields = ref([])
const isLoading = ref(false)
const error = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const isSaving = ref(false)
const editingId = ref(null)

const formData = ref({
  code: '',
  name: ''
})

const fetchFields = async () => {
  isLoading.value = true
  error.value = null
  try {
    const res = await fetch('/diss/fields')
    if (!res.ok) throw new Error('Yuklashda xatolik')
    fields.value = await res.json()
  } catch (e) {
    console.error(e)
    error.value = 'Soha kodlarini yuklashda xatolik'
    toast.add({ severity: 'error', summary: 'Xato', detail: error.value, life: 3000 })
  } finally {
    isLoading.value = false
  }
}

const openAddDialog = () => {
  isEdit.value = false
  editingId.value = null
  formData.value = { code: '', name: '' }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  editingId.value = row._id
  formData.value = {
    code: row.code || '',
    name: row.name || ''
  }
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  formData.value = { code: '', name: '' }
  editingId.value = null
}

const saveField = async () => {
  const { code, name } = formData.value
  if (!code?.trim() || !name?.trim()) {
    toast.add({ severity: 'warn', summary: 'Diqqat', detail: 'Kod va nomi to\'ldirilishi shart', life: 3000 })
    return
  }
  isSaving.value = true
  try {
    const url = isEdit.value ? `/diss/fields/${editingId.value}` : '/diss/fields'
    const method = isEdit.value ? 'PUT' : 'POST'
    const body = isEdit.value
      ? { name: name.trim() }
      : { code: code.trim(), name: name.trim() }
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
    await fetchFields()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Xato', detail: e.message || 'Xatolik', life: 3000 })
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (row) => {
  confirm.require({
    message: `"${row.code} - ${row.name}" sohasini o'chirmoqchimisiz?`,
    header: 'O\'chirishni tasdiqlash',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const res = await fetch(`/diss/fields/${row._id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('O\'chirishda xatolik')
        toast.add({ severity: 'success', summary: 'O\'chirildi', life: 2000 })
        await fetchFields()
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Xato', detail: e.message, life: 3000 })
      }
    }
  })
}

onMounted(() => {
  fetchFields()
})
</script>
