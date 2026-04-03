<script setup>
import { ref, onMounted } from "vue"
import { useToast } from "primevue/usetoast"
import apiService from "@/service/api.service"

const toast = useToast()
const loadingDepartments = ref(false)
const departments = ref([])

const showDepartmentDialog = ref(false)
const departmentForm = ref({ _id: null, name: "", code: "", isActive: true })

const loadDepartments = async () => {
  try {
    loadingDepartments.value = true
    departments.value = await apiService.get("/members/payment/departments")
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loadingDepartments.value = false
  }
}

const saveDepartment = async () => {
  try {
    if (departmentForm.value._id) {
      await apiService.put(`/members/payment/departments/${departmentForm.value._id}`, departmentForm.value)
    } else {
      await apiService.post("/members/payment/departments", departmentForm.value)
    }
    showDepartmentDialog.value = false
    await loadDepartments()
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
}

const removeDepartment = async (row) => {
  try {
    await apiService.delete(`/members/payment/departments/${row._id}`)
    await loadDepartments()
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
}

const openNewDepartment = () => {
  departmentForm.value = { _id: null, name: "", code: "", isActive: true }
  showDepartmentDialog.value = true
}

const openEditDepartment = (row) => {
  departmentForm.value = { ...row }
  showDepartmentDialog.value = true
}

onMounted(async () => {
  await loadDepartments()
})
</script>

<template>
  <div class="card">
    <h1 class="text-xl font-semibold mb-4">Zallar</h1>
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-semibold">Zallar ro'yxati</h2>
      <Button label="Yangi zal" icon="pi pi-plus" @click="openNewDepartment" />
    </div>
    <DataTable :value="departments" :loading="loadingDepartments" responsiveLayout="scroll">
      <Column field="name" header="Nomi" />
      <Column field="code" header="Kodi" />
      <Column field="isActive" header="Holat">
        <template #body="slotProps">
          <Tag :value="slotProps.data.isActive ? 'Faol' : 'Nofaol'" :severity="slotProps.data.isActive ? 'success' : 'danger'" />
        </template>
      </Column>
      <Column header="Amallar">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" severity="info" size="small" @click="openEditDepartment(slotProps.data)" />
            <Button icon="pi pi-trash" severity="danger" size="small" @click="removeDepartment(slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDepartmentDialog" modal header="Zal" :style="{ width: '450px' }">
      <div class="flex flex-col gap-3">
        <InputText v-model="departmentForm.name" placeholder="Nomi" />
        <InputText v-model="departmentForm.code" placeholder="Kodi" />
        <div class="flex items-center gap-2">
          <Checkbox v-model="departmentForm.isActive" inputId="department-active" binary />
          <label for="department-active">Faol</label>
        </div>
      </div>
      <template #footer>
        <Button label="Bekor qilish" severity="secondary" @click="showDepartmentDialog = false" />
        <Button label="Saqlash" @click="saveDepartment" />
      </template>
    </Dialog>
  </div>
</template>
