<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Foydalanuvchi ruxsatlari</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Users List -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Foydalanuvchilar</h3>
        <DataTable 
          :value="users" 
          :loading="loadingUsers"
          selectionMode="single"
          v-model:selection="selectedUser"
          @row-select="onUserSelect"
          responsiveLayout="scroll"
        >
          <Column field="nickname" header="Login" />
          <Column field="firstname" header="Ism" />
          <Column field="lastname" header="Familiya" />
          <Column field="level" header="Daraja" />
        </DataTable>
      </div>

      <!-- User Permissions -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">
          Ruxsatlar
          <span v-if="selectedUser" class="text-sm text-gray-500">
            ({{ selectedUser.firstname }} {{ selectedUser.lastname }})
          </span>
        </h3>
        
        <div v-if="!selectedUser" class="text-center text-gray-500 py-8">
          Foydalanuvchini tanlang
        </div>
        
        <div v-else>
          <div class="mb-4">
            <Button 
              @click="saveUserPermissions" 
              label="Saqlash" 
              icon="pi pi-save"
              :loading="saving"
              class="mr-2"
            />
            <Button 
              @click="loadUserPermissions" 
              label="Yangilash" 
              icon="pi pi-refresh"
              severity="secondary"
            />
          </div>
          
          <div v-if="loadingPermissions" class="text-center py-4">
            <ProgressSpinner />
          </div>
          
          <div v-else class="space-y-4">
            <div v-for="category in groupedPermissions" :key="category.name" class="border rounded p-4">
              <h4 class="font-semibold mb-3 text-blue-600">{{ category.label }}</h4>
              <div class="grid grid-cols-1 gap-2">
                <div v-for="permission in category.permissions" :key="permission._id" class="flex items-center">
                  <Checkbox 
                    :id="permission._id"
                    v-model="userPermissions" 
                    :value="permission.name"
                  />
                  <label :for="permission._id" class="ml-2 text-sm">
                    <span class="font-medium">{{ permission.name }}</span>
                    <span class="text-gray-500 block">{{ permission.description }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const toast = useToast();
const users = ref([]);
const permissions = ref([]);
const selectedUser = ref(null);
const userPermissions = ref([]);
const loadingUsers = ref(false);
const loadingPermissions = ref(false);
const saving = ref(false);

const categoryLabels = {
  users: 'Foydalanuvchilar',
  dissertations: 'Dissertatsiyalar',
  tickets: 'Chiptalar',
  reports: 'Hisobotlar',
  data: 'Ma\'lumotlar',
  system: 'Tizim'
};

const groupedPermissions = computed(() => {
  const groups = {};
  
  permissions.value.forEach(permission => {
    const category = permission.category || 'other';
    if (!groups[category]) {
      groups[category] = {
        name: category,
        label: categoryLabels[category] || category,
        permissions: []
      };
    }
    groups[category].permissions.push(permission);
  });
  
  return Object.values(groups);
});

const loadUsers = async () => {
  try {
    loadingUsers.value = true;
    const data = await apiService.get('/api/experts');
    users.value = data;
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Foydalanuvchilarni yuklashda xatolik', 
      life: 3000 
    });
  } finally {
    loadingUsers.value = false;
  }
};

const loadPermissions = async () => {
  try {
    const data = await apiService.get('/api/admin/permissions');
    permissions.value = data;
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Ruxsatlarni yuklashda xatolik', 
      life: 3000 
    });
  }
};

const loadUserPermissions = async () => {
  if (!selectedUser.value) return;
  
  try {
    loadingPermissions.value = true;
    const data = await apiService.get(`/api/admin/user-permissions/${selectedUser.value._id}`);
    userPermissions.value = data.permissions || [];
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Foydalanuvchi ruxsatlarini yuklashda xatolik', 
      life: 3000 
    });
  } finally {
    loadingPermissions.value = false;
  }
};

const saveUserPermissions = async () => {
  if (!selectedUser.value) return;
  
  try {
    saving.value = true;
    await apiService.post(`/api/admin/user-permissions/${selectedUser.value._id}`, {
      permissions: userPermissions.value
    });
    
    toast.add({ 
      severity: 'success', 
      summary: 'Muvaffaqiyat', 
      detail: 'Foydalanuvchi ruxsatlari saqlandi', 
      life: 3000 
    });
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Ruxsatlarni saqlashda xatolik', 
      life: 3000 
    });
  } finally {
    saving.value = false;
  }
};

const onUserSelect = (event) => {
  selectedUser.value = event.data;
  loadUserPermissions();
};

onMounted(() => {
  loadUsers();
  loadPermissions();
});
</script>
