<script setup>
import { ref, onMounted } from "vue"
import { useToast } from "primevue/usetoast"
import apiService from "@/service/api.service"

const toast = useToast()
const loading = ref(false)
const services = ref([])
const showDialog = ref(false)
const form = ref({ _id: null, name: "", code: "", price: 0, isActive: true })

const loadServices = async () => {
  try {
    loading.value = true
    services.value = await apiService.get("/members/payment/services")
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

const openNew = () => {
  form.value = { _id: null, name: "", code: "", price: 0, isActive: true }
  showDialog.value = true
}

const openEdit = (row) => {
  form.value = { ...row }
  showDialog.value = true
}

const save = async () => {
  try {
    if (form.value._id) {
      await apiService.put(`/members/payment/services/${form.value._id}`, form.value)
    } else {
      await apiService.post("/members/payment/services", form.value)
    }
    showDialog.value = false
    await loadServices()
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
}

const removeItem = async (row) => {
  try {
    await apiService.delete(`/members/payment/services/${row._id}`)
    await loadServices()
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
}

onMounted(loadServices)
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">Pullik xizmatlar</h1>
      <Button label="Yangi xizmat" icon="pi pi-plus" @click="openNew" />
    </div>

    <DataTable :value="services" :loading="loading" responsiveLayout="scroll">
      <Column field="name" header="Nomi" />
      <Column field="code" header="Kodi" />
      <Column field="price" header="Narxi" />
      <Column field="isActive" header="Holat">
        <template #body="slotProps">
          <Tag :value="slotProps.data.isActive ? 'Faol' : 'Nofaol'" :severity="slotProps.data.isActive ? 'success' : 'danger'" />
        </template>
      </Column>
      <Column header="Amallar">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" severity="info" size="small" @click="openEdit(slotProps.data)" />
            <Button icon="pi pi-trash" severity="danger" size="small" @click="removeItem(slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDialog" modal header="Xizmat" :style="{ width: '450px' }">
      <div class="flex flex-col gap-3">
        <InputText v-model="form.name" placeholder="Nomi" />
        <InputText v-model="form.code" placeholder="Kodi" />
        <InputNumber v-model="form.price" :min="0" placeholder="Narxi" />
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.isActive" binary inputId="service-active" />
          <label for="service-active">Faol</label>
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" @click="showDialog = false" />
        <Button label="Saqlash" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
