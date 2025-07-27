<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Ruxsatlar boshqaruvi</h1>
      <Button @click="showAddDialog = true" icon="pi pi-plus" label="Yangi ruxsat" />
    </div>

    <DataTable 
      :value="permissions" 
      :loading="loading"
      paginator 
      :rows="10"
      responsiveLayout="scroll"
    >
      <Column field="name" header="Ruxsat nomi" sortable />
      <Column field="description" header="Tavsif" sortable />
      <Column field="category" header="Kategoriya" sortable />
      <Column header="Amallar">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button 
              @click="editPermission(slotProps.data)" 
              icon="pi pi-pencil" 
              size="small" 
              severity="info"
            />
            <Button 
              @click="deletePermission(slotProps.data)" 
              icon="pi pi-trash" 
              size="small" 
              severity="danger"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Add/Edit Permission Dialog -->
    <Dialog v-model:visible="showAddDialog" modal header="Ruxsat qo'shish/tahrirlash" :style="{ width: '450px' }">
      <div class="space-y-4">
        <div>
          <label for="permissionName" class="block text-sm font-medium mb-2">Ruxsat nomi *</label>
          <InputText 
            id="permissionName"
            v-model="currentPermission.name" 
            class="w-full"
            placeholder="manage_users"
          />
        </div>
        
        <div>
          <label for="permissionDescription" class="block text-sm font-medium mb-2">Tavsif *</label>
          <InputText 
            id="permissionDescription"
            v-model="currentPermission.description" 
            class="w-full"
            placeholder="Foydalanuvchilarni boshqarish"
          />
        </div>
        
        <div>
          <label for="permissionCategory" class="block text-sm font-medium mb-2">Kategoriya</label>
          <Dropdown 
            id="permissionCategory"
            v-model="currentPermission.category" 
            :options="categories"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="Kategoriyani tanlang"
          />
        </div>
      </div>
      
      <template #footer>
        <Button label="Bekor qilish" @click="showAddDialog = false" severity="secondary" />
        <Button label="Saqlash" @click="savePermission" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const toast = useToast();
const permissions = ref([]);
const loading = ref(false);
const saving = ref(false);
const showAddDialog = ref(false);
const currentPermission = ref({
  name: '',
  description: '',
  category: ''
});

const categories = ref([
  { label: 'Foydalanuvchilar', value: 'users' },
  { label: 'Dissertatsiyalar', value: 'dissertations' },
  { label: 'Chiptalar', value: 'tickets' },
  { label: 'Hisobotlar', value: 'reports' },
  { label: 'Ma\'lumotlar', value: 'data' },
  { label: 'Tizim', value: 'system' }
]);

const loadPermissions = async () => {
  try {
    loading.value = true;
    const data = await apiService.get('/api/admin/permissions');
    permissions.value = data;
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Ruxsatlarni yuklashda xatolik', 
      life: 3000 
    });
  } finally {
    loading.value = false;
  }
};

const savePermission = async () => {
  if (!currentPermission.value.name || !currentPermission.value.description) {
    toast.add({ 
      severity: 'warn', 
      summary: 'Ogohlantirish', 
      detail: 'Barcha majburiy maydonlarni to\'ldiring', 
      life: 3000 
    });
    return;
  }

  try {
    saving.value = true;
    
    if (currentPermission.value._id) {
      // Update existing permission
      await apiService.put(`/api/admin/permissions/${currentPermission.value._id}`, currentPermission.value);
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: 'Ruxsat yangilandi', 
        life: 3000 
      });
    } else {
      // Create new permission
      await apiService.post('/api/admin/permissions', currentPermission.value);
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: 'Yangi ruxsat yaratildi', 
        life: 3000 
      });
    }
    
    showAddDialog.value = false;
    currentPermission.value = { name: '', description: '', category: '' };
    loadPermissions();
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: error.error || 'Ruxsatni saqlashda xatolik', 
      life: 3000 
    });
  } finally {
    saving.value = false;
  }
};

const editPermission = (permission) => {
  currentPermission.value = { ...permission };
  showAddDialog.value = true;
};

const deletePermission = async (permission) => {
  if (confirm('Bu ruxsatni o\'chirishni xohlaysizmi?')) {
    try {
      await apiService.delete(`/api/admin/permissions/${permission._id}`);
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: 'Ruxsat o\'chirildi', 
        life: 3000 
      });
      loadPermissions();
    } catch (error) {
      toast.add({ 
        severity: 'error', 
        summary: 'Xato', 
        detail: 'Ruxsatni o\'chirishda xatolik', 
        life: 3000 
      });
    }
  }
};

onMounted(() => {
  loadPermissions();
});
</script>
