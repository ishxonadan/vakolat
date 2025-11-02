<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import apiService from '@/service/api.service'
import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import MemberList from '@/components/MemberList.vue'
import MemberForm from '@/components/MemberForm.vue'
import VisitHistory from '@/components/VisitHistory.vue'

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
    BIRTHDAY: null,
    ADDRS: '',
    EMAIL: '',
    PASSPORT_SERIES: '',
    PASSPORT_NUMBER: '',
    INSERT_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
    ZIP_CODE: ''
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

const saveMember = async (updatedMember) => {
  try {
    if (isEditMode.value) {
      await apiService.put(`/members/${updatedMember.USER_NO}`, updatedMember)
      toast.add({
        severity: 'success',
        summary: 'Muvaffaqiyatli',
        detail: "Ma'lumotlar saqlandi",
        life: 3000
      })
    } else {
      await apiService.post('/members', updatedMember)
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
  <div>
    <MemberList
      :members="members"
      :loading="loading"
      :total-records="totalRecords"
      :current-page="currentPage"
      :rows-per-page="rowsPerPage"
      :search-filters="searchFilters"
      :search-fields="searchFields"
      @add-member="openAddMemberDialog"
      @update:current-page="(page) => { currentPage = page; fetchMembers() }"
      @update:rows-per-page="(rows) => { rowsPerPage = rows; fetchMembers() }"
      @apply-search="() => { currentPage = 1; fetchMembers() }"
      @row-dblclick="(member) => openMemberDialog(member)"
    />

    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Foydalanuvchi ma\'lumotlari' : 'Yangi foydalanuvchi'"
      :modal="true"
      :closable="true"
      :style="{ width: '90vw', maxWidth: '1400px' }"
      @hide="closeDialog"
    >
      <TabView v-model:activeIndex="activeTab">
        <TabPanel header="Ma'lumotlar">
          <MemberForm
            :selected-member="selectedMember"
            :categories="categories"
            :image-source="imageSource"
            @close-dialog="closeDialog"
            @save-member="saveMember"
            @image-select="onImageSelect"
            @delete-image="deleteImage"
          />
        </TabPanel>

        <TabPanel v-if="isEditMode" header="Tashriflar tarixi">
          <VisitHistory
            :user-visits="userVisits"
            :loading-visits="loadingVisits"
          />
        </TabPanel>
      </TabView>
    </Dialog>
  </div>
</template>
