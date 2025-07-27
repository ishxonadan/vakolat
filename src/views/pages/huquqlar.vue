<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Huquqlar boshqaruvi</h1>
    </div>

    <TabView>
      <!-- Permissions Tab -->
      <TabPanel header="Huquqlar">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Huquqlar ro'yxati</h3>
          <Button @click="showPermissionDialog = true" icon="pi pi-plus" label="Yangi huquq" />
        </div>

        <DataTable 
          :value="permissions" 
          :loading="loadingPermissions"
          paginator 
          :rows="10"
          responsiveLayout="scroll"
        >
          <Column field="name" header="Huquq nomi" sortable />
          <Column field="description" header="Tavsif" sortable />
          <Column field="isActive" header="Holat" sortable>
            <template #body="slotProps">
              <Tag :value="slotProps.data.isActive ? 'Faol' : 'Nofaol'" :severity="slotProps.data.isActive ? 'success' : 'danger'" />
            </template>
          </Column>
          <Column header="Amallar">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button 
                  @click="editPermission(slotProps.data)" 
                  icon="pi pi-pencil" 
                  size="small" 
                  severity="info"
                  v-tooltip="'Tahrirlash'"
                />
                <Button 
                  @click="togglePermissionStatus(slotProps.data)" 
                  :icon="slotProps.data.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                  size="small" 
                  :severity="slotProps.data.isActive ? 'warning' : 'success'"
                  :v-tooltip="slotProps.data.isActive ? 'Faolsizlashtirish' : 'Faollashtirish'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- Permission Groups Tab -->
      <TabPanel header="Huquq guruhlari">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Huquq guruhlari</h3>
          <Button @click="showGroupDialog = true" icon="pi pi-plus" label="Yangi guruh" />
        </div>

        <DataTable 
          :value="permissionGroups" 
          :loading="loadingGroups"
          paginator 
          :rows="10"
          responsiveLayout="scroll"
        >
          <Column field="name" header="Guruh nomi" sortable />
          <Column field="description" header="Tavsif" sortable />
          <Column field="permissions" header="Huquqlar soni">
            <template #body="slotProps">
              <Badge :value="slotProps.data.permissions?.length || 0" />
            </template>
          </Column>
          <Column field="isActive" header="Holat" sortable>
            <template #body="slotProps">
              <Tag :value="slotProps.data.isActive ? 'Faol' : 'Nofaol'" :severity="slotProps.data.isActive ? 'success' : 'danger'" />
            </template>
          </Column>
          <Column header="Amallar">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button 
                  @click="editGroup(slotProps.data)" 
                  icon="pi pi-pencil" 
                  size="small" 
                  severity="info"
                  v-tooltip="'Tahrirlash'"
                />
                <Button 
                  @click="toggleGroupStatus(slotProps.data)" 
                  :icon="slotProps.data.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                  size="small" 
                  :severity="slotProps.data.isActive ? 'warning' : 'success'"
                  :v-tooltip="slotProps.data.isActive ? 'Faolsizlashtirish' : 'Faollashtirish'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>

    <!-- Permission Dialog -->
    <Dialog v-model:visible="showPermissionDialog" modal header="Huquq qo'shish/tahrirlash" :style="{ width: '500px' }">
      <div class="space-y-4">
        <div>
          <label for="permissionName" class="block text-sm font-medium mb-2">Huquq nomi *</label>
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

        <div class="flex items-center">
          <Checkbox 
            id="permissionActive"
            v-model="currentPermission.isActive" 
            binary
          />
          <label for="permissionActive" class="ml-2">Faol</label>
        </div>
      </div>
      
      <template #footer>
        <Button label="Bekor qilish" @click="showPermissionDialog = false" severity="secondary" />
        <Button label="Saqlash" @click="savePermission" :loading="saving" />
      </template>
    </Dialog>

    <!-- Permission Group Dialog -->
    <Dialog v-model:visible="showGroupDialog" modal header="Huquq guruhi qo'shish/tahrirlash" :style="{ width: '600px' }">
      <div class="space-y-4">
        <div>
          <label for="groupName" class="block text-sm font-medium mb-2">Guruh nomi *</label>
          <InputText 
            id="groupName"
            v-model="currentGroup.name" 
            class="w-full"
            placeholder="Administratorlar"
          />
        </div>
        
        <div>
          <label for="groupDescription" class="block text-sm font-medium mb-2">Tavsif *</label>
          <InputText 
            id="groupDescription"
            v-model="currentGroup.description" 
            class="w-full"
            placeholder="Tizim administratorlari uchun huquqlar"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Huquqlar</label>
          <div class="border rounded p-4 max-h-60 overflow-y-auto">
            <div v-if="activePermissions.length === 0" class="text-center text-gray-500 py-4">
              <i class="pi pi-info-circle text-2xl mb-2 block"></i>
              <p>Hozircha faol huquqlar mavjud emas</p>
            </div>
            <div v-else class="grid grid-cols-1 gap-2">
              <div v-for="permission in activePermissions" :key="permission._id" class="flex items-center">
                <Checkbox 
                  :id="permission._id"
                  v-model="currentGroup.permissions" 
                  :value="permission._id"
                />
                <label :for="permission._id" class="ml-2 text-sm">
                  <span class="font-medium">{{ permission.name }}</span>
                  <span class="text-gray-500 block">{{ permission.description }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center">
          <Checkbox 
            id="groupActive"
            v-model="currentGroup.isActive" 
            binary
          />
          <label for="groupActive" class="ml-2">Faol</label>
        </div>
      </div>
      
      <template #footer>
        <Button label="Bekor qilish" @click="showGroupDialog = false" severity="secondary" />
        <Button label="Saqlash" @click="saveGroup" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const toast = useToast();
const permissions = ref([]);
const permissionGroups = ref([]);
const loadingPermissions = ref(false);
const loadingGroups = ref(false);
const saving = ref(false);
const showPermissionDialog = ref(false);
const showGroupDialog = ref(false);

const currentPermission = ref({
  name: '',
  description: '',
  isActive: true
});

const currentGroup = ref({
  name: '',
  description: '',
  permissions: [],
  isActive: true
});

const activePermissions = computed(() => {
  return permissions.value.filter(p => p.isActive);
});

const loadPermissions = async () => {
  try {
    loadingPermissions.value = true;
    const data = await apiService.get('/admin/permissions');
    permissions.value = data;
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Huquqlarni yuklashda xatolik', 
      life: 3000 
    });
  } finally {
    loadingPermissions.value = false;
  }
};

const loadPermissionGroups = async () => {
  try {
    loadingGroups.value = true;
    const data = await apiService.get('/admin/permission-groups');
    permissionGroups.value = data;
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Huquq guruhlarini yuklashda xatolik', 
      life: 3000 
    });
  } finally {
    loadingGroups.value = false;
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
      await apiService.put(`/admin/permissions/${currentPermission.value._id}`, currentPermission.value);
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: 'Huquq yangilandi', 
        life: 3000 
      });
    } else {
      await apiService.post('/admin/permissions', currentPermission.value);
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: 'Yangi huquq yaratildi', 
        life: 3000 
      });
    }
    
    showPermissionDialog.value = false;
    currentPermission.value = { name: '', description: '', isActive: true };
    loadPermissions();
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: error.error || 'Huquqni saqlashda xatolik', 
      life: 3000 
    });
  } finally {
    saving.value = false;
  }
};

const saveGroup = async () => {
  if (!currentGroup.value.name || !currentGroup.value.description) {
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
    
    if (currentGroup.value._id) {
      await apiService.put(`/admin/permission-groups/${currentGroup.value._id}`, currentGroup.value);
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: 'Huquq guruhi yangilandi', 
        life: 3000 
      });
    } else {
      await apiService.post('/admin/permission-groups', currentGroup.value);
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: 'Yangi huquq guruhi yaratildi', 
        life: 3000 
      });
    }
    
    showGroupDialog.value = false;
    currentGroup.value = { name: '', description: '', permissions: [], isActive: true };
    loadPermissionGroups();
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: error.error || 'Huquq guruhini saqlashda xatolik', 
      life: 3000 
    });
  } finally {
    saving.value = false;
  }
};

const editPermission = (permission) => {
  currentPermission.value = { ...permission };
  showPermissionDialog.value = true;
};

const editGroup = (group) => {
  currentGroup.value = { 
    ...group,
    permissions: group.permissions?.map(p => p._id || p) || []
  };
  showGroupDialog.value = true;
};

const togglePermissionStatus = async (permission) => {
  try {
    await apiService.put(`/admin/permissions/${permission._id}`, {
      ...permission,
      isActive: !permission.isActive
    });
    
    toast.add({ 
      severity: 'success', 
      summary: 'Muvaffaqiyat', 
      detail: `Huquq ${permission.isActive ? 'faolsizlashtirildi' : 'faollashtirildi'}`, 
      life: 3000 
    });
    
    loadPermissions();
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Huquq holatini o\'zgartirishda xatolik', 
      life: 3000 
    });
  }
};

const toggleGroupStatus = async (group) => {
  try {
    await apiService.put(`/admin/permission-groups/${group._id}`, {
      ...group,
      isActive: !group.isActive
    });
    
    toast.add({ 
      severity: 'success', 
      summary: 'Muvaffaqiyat', 
      detail: `Huquq guruhi ${group.isActive ? 'faolsizlashtirildi' : 'faollashtirildi'}`, 
      life: 3000 
    });
    
    loadPermissionGroups();
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Huquq guruhi holatini o\'zgartirishda xatolik', 
      life: 3000 
    });
  }
};

onMounted(() => {
  loadPermissions();
  loadPermissionGroups();
});
</script>
