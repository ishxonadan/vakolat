<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import apiService from '@/service/api.service'
import FileUpload from 'primevue/fileupload'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext' // Import InputText for email field

const router = useRouter()
const toast = useToast()

const members = ref([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const rowsPerPage = ref(50)

const showDialog = ref(false)
const selectedMember = ref(null)
const activeTab = ref(0)
const userVisits = ref([])
const loadingVisits = ref(false)
const isEditMode = ref(false)

const searchFilters = ref([
  { field: 'USER_NAME', value: '' }
])

const searchFields = [
  { label: 'Ism', value: 'USER_NAME' },
  { label: 'Foydalanuvchi raqami', value: 'USER_NO' },
  { label: 'Karta raqami', value: 'CARD_NO' },
  { label: "Tug'ilgan sana", value: 'BIRTHDAY' },
  { label: 'Telefon', value: 'TEL_NO' },
  { label: 'Manzil', value: 'ADDRS' },
  { label: 'Lavozim', value: 'USER_POSITION' },
  { label: "Ro'yxatdan o'tgan sana", value: 'INSERT_DATE' }
]

const addFilter = () => {
  searchFilters.value.push({ field: 'USER_NAME', value: '' })
}

const removeFilter = (index) => {
  if (searchFilters.value.length > 1) {
    searchFilters.value.splice(index, 1)
  }
}

const applySearch = () => {
  currentPage.value = 1
  fetchMembers()
}

const clearFilters = () => {
  searchFilters.value = [{ field: 'USER_NAME', value: '' }]
  fetchMembers()
}

const hasActiveFilters = computed(() => {
  return searchFilters.value.some(f => f.value.trim() !== '')
})

const fetchMembers = async () => {
  try {
    loading.value = true
    
    const activeFilters = searchFilters.value.filter(f => f.value.trim() !== '')
    const requestBody = {
      page: currentPage.value,
      limit: rowsPerPage.value,
      filters: activeFilters
    }

    const response = await apiService.post('/members/search', requestBody)
    members.value = response.members
    totalRecords.value = response.total
  } catch (error) {
    console.error('Error fetching members:', error)
    toast.add({
      severity: 'error',
      summary: 'Xatolik',
      detail: "A'zolarni yuklashda xatolik yuz berdi",
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const onPage = (event) => {
  currentPage.value = event.page + 1
  rowsPerPage.value = event.rows
  fetchMembers()
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    let date
    if (dateString.includes('/')) {
      const parts = dateString.split('/')
      if (parts.length === 3) {
        date = new Date(parts[2], parts[1] - 1, parts[0])
      }
    } else if (dateString.includes('-')) {
      date = new Date(dateString)
    } else if (dateString.length === 8) {
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(dateString)
    }
    
    if (isNaN(date.getTime())) {
      return dateString
    }
    
    return date.toLocaleDateString('uz-UZ')
  } catch {
    return dateString
  }
}

const onRowDoubleClick = async (event) => {
  const member = event.data
  await openMemberDialog(member)
}

const openMemberDialog = async (member) => {
  selectedMember.value = { ...member }
  isEditMode.value = true
  activeTab.value = 0
  showDialog.value = true
  
  if (member.PHOTO) {
    memberImagePreview.value = member.PHOTO
  } else {
    memberImagePreview.value = null
  }
  
  if (member.USER_NO) {
    await fetchUserVisits(member.USER_NO)
  }
}

const openAddMemberDialog = () => {
  selectedMember.value = {
    USER_NO: '',
    USER_NAME: '',
    USER_POSITION: '',
    CARD_NO: '',
    TEL_NO: '',
    BIRTHDAY: '',
    ADDRS: '',
    EMAIL: '',
    PASSPORT_SERIES: '',
    PASSPORT_NUMBER: '',
    INSERT_DATE: new Date().toISOString().split('T')[0].replace(/-/g, '')
  }
  isEditMode.value = false
  activeTab.value = 0
  showDialog.value = true
  memberImagePreview.value = null
}

const memberImage = ref(null)
const memberImagePreview = ref(null)
const categories = ref([
  { label: 'Talaba', value: 'Talaba' },
  { label: 'O\'qituvchi', value: 'O\'qituvchi' },
  { label: 'Professor', value: 'Professor' },
  { label: 'Tadqiqotchi', value: 'Tadqiqotchi' },
  { label: 'Xodim', value: 'Xodim' },
  { label: 'Boshqa', value: 'Boshqa' }
])

const onImageSelect = (event) => {
  const file = event.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64String = e.target.result.split(',')[1]
      memberImagePreview.value = base64String
      selectedMember.value.PHOTO = base64String
    }
    reader.readAsDataURL(file)
  }
}

const deleteImage = () => {
  memberImagePreview.value = null
  selectedMember.value.PHOTO = null
  memberImage.value = null
}

const fetchUserVisits = async (userNo) => {
  try {
    loadingVisits.value = true
    const response = await apiService.get(`/visits/user/${userNo}`)
    userVisits.value = response.visits || []
  } catch (error) {
    console.error('Error fetching user visits:', error)
    toast.add({
      severity: 'error',
      summary: 'Xatolik',
      detail: 'Foydalanuvchi tashriflari yuklanmadi',
      life: 3000
    })
  } finally {
    loadingVisits.value = false
  }
}

const saveMember = async () => {
  try {
    if (isEditMode.value) {
      await apiService.put(`/members/${selectedMember.value.USER_NO}`, selectedMember.value)
      toast.add({
        severity: 'success',
        summary: 'Muvaffaqiyatli',
        detail: "Ma'lumotlar saqlandi",
        life: 3000
      })
    } else {
      await apiService.post('/members', selectedMember.value)
      toast.add({
        severity: 'success',
        summary: 'Muvaffaqiyatli',
        detail: "Yangi a'zo qo'shildi",
        life: 3000
      })
    }
    
    showDialog.value = false
    fetchMembers()
  } catch (error) {
    console.error('Error saving member:', error)
    toast.add({
      severity: 'error',
      summary: 'Xatolik',
      detail: "Ma'lumotlarni saqlashda xatolik yuz berdi",
      life: 3000
    })
  }
}

const closeDialog = () => {
  showDialog.value = false
  selectedMember.value = null
  userVisits.value = []
  memberImagePreview.value = null
  memberImage.value = null
}

const imageSource = computed(() => {
  if (!memberImagePreview.value) return null
  
  if (memberImagePreview.value.startsWith('data:')) {
    return memberImagePreview.value
  }
  
  return `data:image/jpeg;base64,${memberImagePreview.value}`
})

onMounted(() => {
  fetchMembers()
})
</script>

<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-bold m-0">A'zo bo'lganlar</h2>
      <Button 
        label="Yangi a'zo qo'shish" 
        icon="pi pi-plus" 
        @click="openAddMemberDialog"
        severity="success"
      />
    </div>

    <div class="mb-4 p-4 surface-ground border-round">
      <div class="flex justify-content-between align-items-center mb-3">
        <h3 class="text-lg font-semibold m-0">Qidiruv filtrlari</h3>
        <div class="flex gap-2">
          <Button 
            label="Filtr qo'shish" 
            icon="pi pi-plus" 
            size="small"
            @click="addFilter"
            outlined
          />
          <Button 
            label="Tozalash" 
            icon="pi pi-times" 
            size="small"
            severity="secondary"
            @click="clearFilters"
            :disabled="!hasActiveFilters"
            outlined
          />
        </div>
      </div>

      <div class="flex flex-column gap-3">
        <div 
          v-for="(filter, index) in searchFilters" 
          :key="index"
          class="flex gap-2 align-items-center"
        >
          <Dropdown
            v-model="filter.field"
            :options="searchFields"
            optionLabel="label"
            optionValue="value"
            placeholder="Maydonni tanlang"
            class="flex-shrink-0"
            style="width: 250px"
          />
          <InputText
            v-model="filter.value"
            placeholder="Qidiruv qiymati"
            class="flex-grow-1"
            @keyup.enter="applySearch"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            @click="removeFilter(index)"
            :disabled="searchFilters.length === 1"
            outlined
          />
        </div>
      </div>

      <div class="flex justify-content-end mt-3">
        <Button 
          label="Qidirish" 
          icon="pi pi-search" 
          @click="applySearch"
          :disabled="!hasActiveFilters"
        />
      </div>
    </div>

    <DataTable
      :value="members"
      :loading="loading"
      :paginator="true"
      :rows="rowsPerPage"
      :totalRecords="totalRecords"
      :lazy="true"
      @page="onPage"
      @row-dblclick="onRowDoubleClick"
      :rowsPerPageOptions="[25, 50, 100]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      currentPageReportTemplate="{first} dan {last} gacha, jami {totalRecords} ta"
      responsiveLayout="scroll"
      stripedRows
    >
      <Column field="USER_NO" header="ID" sortable style="min-width: 100px">
        <template #body="{ data }">
          <span class="font-bold">{{ data.USER_NO }}</span>
        </template>
      </Column>
      <Column field="USER_NAME" header="Ism" sortable style="min-width: 200px" />
      <Column field="USER_POSITION" header="Toifa" sortable style="min-width: 150px" />
      <Column field="CARD_NO" header="Karta raqami" sortable style="min-width: 150px" />
      <Column field="TEL_NO" header="Telefon" sortable style="min-width: 150px" />
      <Column field="BIRTHDAY" header="Tug'ilgan sana" sortable style="min-width: 150px">
        <template #body="{ data }">
          {{ formatDate(data.BIRTHDAY) }}
        </template>
      </Column>
      <Column field="ADDRS" header="Manzil" style="min-width: 200px" />
      <Column field="INSERT_DATE" header="Ro'yxatdan o'tgan" sortable style="min-width: 150px">
        <template #body="{ data }">
          {{ formatDate(data.INSERT_DATE) }}
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Foydalanuvchi ma\'lumotlari' : 'Yangi foydalanuvchi'"
      :modal="true"
      :closable="true"
      :style="{ width: '90vw', maxWidth: '1200px' }"
      @hide="closeDialog"
    >
      <TabView v-model:activeIndex="activeTab">
        <TabPanel header="Ma'lumotlar">
          <div class="flex gap-4" v-if="selectedMember">
            <!-- Left column: Photo section -->
            <div class="flex flex-column" style="width: 280px; flex-shrink: 0;">
              <!-- Photo display area -->
              <div 
                class="border-2 border-300 border-round overflow-hidden bg-gray-50 flex align-items-center justify-content-center"
                style="width: 280px; height: 320px;"
              >
                <img 
                  v-if="imageSource" 
                  :src="imageSource" 
                  alt="User photo" 
                  class="w-full h-full"
                  style="object-fit: cover"
                />
                <div v-else class="text-center text-400">
                  <i class="pi pi-user" style="font-size: 5rem"></i>
                  <p class="mt-3 text-sm">Rasm yuklanmagan</p>
                </div>
              </div>
              
              <!-- Buttons under photo -->
              <div class="flex gap-2 mt-2">
                <FileUpload 
                  ref="memberImage"
                  mode="basic" 
                  accept="image/*" 
                  :maxFileSize="2000000"
                  @select="onImageSelect"
                  chooseLabel="Tahrirlash"
                  class="flex-1"
                  :auto="true"
                  size="small"
                  style="height: 32px"
                >
                  <template #chooseicon>
                    <i class="pi pi-pencil" style="font-size: 0.875rem"></i>
                  </template>
                </FileUpload>
                <Button 
                  icon="pi pi-trash" 
                  severity="danger" 
                  size="small"
                  @click="deleteImage"
                  :disabled="!imageSource"
                  outlined
                  style="height: 32px; width: 32px; padding: 0"
                />
              </div>
            </div>

            <!-- Right column: Form fields in 2-column grid -->
            <div class="flex-1">
              <div class="grid p-fluid">
                <div class="col-12 md:col-6">
                  <label for="userNo" class="block mb-2 font-semibold">Foydalanuvchi raqami *</label>
                  <InputText 
                    id="userNo" 
                    v-model="selectedMember.USER_NO" 
                    :disabled="isEditMode"
                  />
                </div>
                
                <div class="col-12 md:col-6">
                  <label for="userName" class="block mb-2 font-semibold">Ism *</label>
                  <InputText id="userName" v-model="selectedMember.USER_NAME" />
                </div>
                
                <div class="col-12 md:col-6">
                  <label for="userPosition" class="block mb-2 font-semibold">Toifa *</label>
                  <Dropdown
                    id="userPosition"
                    v-model="selectedMember.USER_POSITION"
                    :options="categories"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Toifani tanlang"
                  />
                </div>
                
                <div class="col-12 md:col-6">
                  <label for="cardNo" class="block mb-2 font-semibold">Karta raqami</label>
                  <InputText id="cardNo" v-model="selectedMember.CARD_NO" />
                </div>
                
                <div class="col-12 md:col-6">
                  <label for="telNo" class="block mb-2 font-semibold">Telefon</label>
                  <InputText id="telNo" v-model="selectedMember.TEL_NO" placeholder="+998 XX XXX XX XX" />
                </div>
                
                <div class="col-12 md:col-6">
                  <label for="email" class="block mb-2 font-semibold">Email (ixtiyoriy)</label>
                  <InputText id="email" v-model="selectedMember.EMAIL" type="email" placeholder="example@mail.com" />
                </div>
                
                <div class="col-12 md:col-6">
                  <label for="birthday" class="block mb-2 font-semibold">Tug'ilgan sana</label>
                  <Calendar 
                    id="birthday" 
                    v-model="selectedMember.BIRTHDAY" 
                    dateFormat="dd/mm/yy"
                    placeholder="Sanani tanlang"
                    showIcon
                  />
                </div>
                
                <div class="col-12 md:col-6">
                  <div class="grid">
                    <div class="col-6">
                      <label for="passportSeries" class="block mb-2 font-semibold">Pasport seriyasi</label>
                      <InputText 
                        id="passportSeries" 
                        v-model="selectedMember.PASSPORT_SERIES" 
                        placeholder="AA"
                        style="text-transform: uppercase"
                      />
                    </div>
                    <div class="col-6">
                      <label for="passportNumber" class="block mb-2 font-semibold">Pasport raqami</label>
                      <InputText 
                        id="passportNumber" 
                        v-model="selectedMember.PASSPORT_NUMBER" 
                        placeholder="1234567"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="col-12">
                  <label for="address" class="block mb-2 font-semibold">Manzil</label>
                  <Textarea id="address" v-model="selectedMember.ADDRS" rows="2" />
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-content-end gap-2 mt-4 pt-4 border-top-1 border-300">
            <Button label="Bekor qilish" icon="pi pi-times" @click="closeDialog" outlined severity="secondary" />
            <Button label="Saqlash" icon="pi pi-check" @click="saveMember" severity="success" />
          </div>
        </TabPanel>

        <TabPanel header="Tashriflar tarixi" v-if="isEditMode">
          <DataTable
            :value="userVisits"
            :loading="loadingVisits"
            :paginator="true"
            :rows="10"
            responsiveLayout="scroll"
            stripedRows
          >
            <Column field="date" header="Sana" sortable style="min-width: 120px" />
            <Column field="keldi" header="Keldi" sortable style="min-width: 100px" />
            <Column field="ketdi" header="Ketdi" sortable style="min-width: 100px">
              <template #body="{ data }">
                {{ data.ketdi || '-' }}
              </template>
            </Column>
            <Column field="duration" header="Davomiyligi" style="min-width: 120px">
              <template #body="{ data }">
                {{ data.duration || '-' }}
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>
    </Dialog>
  </div>
</template>
