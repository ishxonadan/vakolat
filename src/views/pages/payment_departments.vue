<script setup>
import { ref, onMounted } from "vue"
import { useToast } from "primevue/usetoast"
import apiService from "@/service/api.service"

const toast = useToast()
const loadingDepartments = ref(false)
const loadingAssignments = ref(false)
const loadingExperts = ref(false)
const departments = ref([])
const assignments = ref([])
const experts = ref([])

const showDepartmentDialog = ref(false)
const departmentForm = ref({ _id: null, name: "", code: "", isActive: true })
const assignForm = ref({ expertId: null, departmentId: null })

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

const loadAssignments = async () => {
  try {
    loadingAssignments.value = true
    assignments.value = await apiService.get("/members/payment/user-departments")
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loadingAssignments.value = false
  }
}

const loadExperts = async () => {
  try {
    loadingExperts.value = true
    experts.value = await apiService.get("/members/payment/experts")
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loadingExperts.value = false
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
    await Promise.all([loadDepartments(), loadAssignments()])
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
}

const addAssignment = async () => {
  try {
    await apiService.post("/members/payment/user-departments", assignForm.value)
    assignForm.value = { expertId: null, departmentId: null }
    await loadAssignments()
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
}

const removeAssignment = async (row) => {
  try {
    await apiService.delete("/members/payment/user-departments", {
      expertId: row.expertId?._id,
      departmentId: row.departmentId?._id,
    })
    await loadAssignments()
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
  await Promise.all([loadDepartments(), loadAssignments(), loadExperts()])
})
</script>

<template>
  <div class="card">
    <h1 class="text-xl font-semibold mb-4">Bo'limlar va tegishli foydalanuvchilar</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-lg font-semibold">Bo'limlar</h2>
          <Button label="Yangi bo'lim" icon="pi pi-plus" @click="openNewDepartment" />
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
      </div>

      <div>
        <h2 class="text-lg font-semibold mb-3">Vakil bo'lim birikmalari</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <Dropdown
            v-model="assignForm.expertId"
            :options="experts"
            optionLabel="nickname"
            optionValue="_id"
            placeholder="Vakil"
            :loading="loadingExperts"
            filter
          >
            <template #option="slotProps">
              <div>
                <div class="font-semibold">{{ slotProps.option.nickname }}</div>
                <div class="text-xs text-gray-500">
                  {{ slotProps.option.firstname }} {{ slotProps.option.lastname }}
                </div>
              </div>
            </template>
          </Dropdown>
          <Dropdown
            v-model="assignForm.departmentId"
            :options="departments"
            optionLabel="name"
            optionValue="_id"
            placeholder="Bo'lim"
          />
          <Button label="Biriktirish" icon="pi pi-check" @click="addAssignment" />
        </div>

        <DataTable :value="assignments" :loading="loadingAssignments" responsiveLayout="scroll">
          <Column field="expertId.nickname" header="Vakil login" />
          <Column header="Vakil">
            <template #body="slotProps">
              {{ slotProps.data.expertId ? `${slotProps.data.expertId.firstname || ""} ${slotProps.data.expertId.lastname || ""}`.trim() : "-" }}
            </template>
          </Column>
          <Column header="Bo'lim">
            <template #body="slotProps">
              {{ slotProps.data.departmentId?.name || "-" }}
            </template>
          </Column>
          <Column header="Amal">
            <template #body="slotProps">
              <Button icon="pi pi-times" severity="danger" size="small" @click="removeAssignment(slotProps.data)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <Dialog v-model:visible="showDepartmentDialog" modal header="Bo'lim" :style="{ width: '450px' }">
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
