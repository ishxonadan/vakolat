<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import apiService from '@/service/api.service'
import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import MemberList from '@/components/MemberList.vue'
import MemberForm from '@/components/MemberForm.vue'
import MemberRecordNav from '@/components/MemberRecordNav.vue'
import VisitHistory from '@/components/VisitHistory.vue'
import { pageSize } from '@/service/pagination.service'
import { toCategoryOptions } from '@/utils/memberCategories'

const router = useRouter()
const toast = useToast()

const memberListRef = ref()
const members = ref([])
const loading = ref(false)
const exporting = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const searchQuery = ref('')
const sortField = ref('INSERT_DATE')
const sortOrder = ref(-1)

const showDialog = ref(false)
const selectedMember = ref(null)
const activeTab = ref(0)
const userVisits = ref([])
const loadingVisits = ref(false)
const isEditMode = ref(false)
const uznelSyncEnabled = ref(false)
const memberIndex = ref(-1)
const recordNavBusy = ref(false)
let openToken = 0

const buildSearchBody = ({ page = currentPage.value, limit = pageSize.value, exportMode = false } = {}) => ({
  page,
  limit,
  search: searchQuery.value,
  sortField: sortField.value,
  sortOrder: sortOrder.value === 1 ? 'asc' : 'desc',
  export: exportMode || undefined,
  includePhoto: Boolean(memberListRef.value?.includePhoto),
  userNoPrefix: 'AA',
})

const fetchMembers = async () => {
  try {
    loading.value = true
    const response = await apiService.post('/members/search', buildSearchBody())
    members.value = response.members
    totalRecords.value = response.total
    if (showDialog.value && selectedMember.value?.USER_NO && !recordNavBusy.value) {
      memberIndex.value = members.value.findIndex((row) => row.USER_NO === selectedMember.value.USER_NO)
    }
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

const applySearch = () => {
  currentPage.value = 1
  fetchMembers()
}

const exportExcel = async () => {
  try {
    exporting.value = true
    const response = await apiService.post('/members/search', buildSearchBody({ page: 1, limit: 5000, exportMode: true }))
    const result = memberListRef.value?.downloadCsv(response.members || [], response.total)
    const exported = result?.exported || 0
    toast.add({
      severity: 'success',
      summary: 'Eksport',
      detail: exported < (response.total || 0)
        ? `${exported} ta yozuv eksport qilindi (jami ${response.total})`
        : `${exported} ta yozuv eksport qilindi`,
      life: 3000
    })
  } catch (error) {
    console.error('Error exporting members:', error)
    toast.add({
      severity: 'error',
      summary: 'Xatolik',
      detail: 'Excelga eksport qilib bo\'lmadi',
      life: 3000
    })
  } finally {
    exporting.value = false
  }
}



function memberIsUznelSynced(member) {
  return Boolean(member?.UZNEL_SYNCED || member?.USER_SEQ_NO || member?.SEQUENCE_NO)
}

const recordOrder = computed(() => {
  if (!isEditMode.value || memberIndex.value < 0) return null
  return (currentPage.value - 1) * pageSize.value + memberIndex.value + 1
})

const canRecordPrev = computed(() => recordOrder.value != null && recordOrder.value > 1)
const canRecordNext = computed(() => recordOrder.value != null && recordOrder.value < totalRecords.value)

const openMemberDialog = async (member, { keepTab = false } = {}) => {
  const token = ++openToken
  memberIndex.value = members.value.findIndex((row) => row.USER_NO && row.USER_NO === member.USER_NO)
  selectedMember.value = { ...member }
  isEditMode.value = true
  uznelSyncEnabled.value = memberIsUznelSynced(member)
  if (!keepTab) activeTab.value = 0
  showDialog.value = true
  memberImagePreview.value = member.PHOTO || null
  userVisits.value = []

  if (member.USER_NO) {
    try {
      const full = await apiService.get(`/members/by-user-no/${member.USER_NO}`)
      if (token !== openToken) return
      selectedMember.value = { ...full }
      memberImagePreview.value = full.PHOTO || null
      uznelSyncEnabled.value = memberIsUznelSynced(full)
    } catch (error) {
      console.error('Error fetching member details:', error)
    }
    await fetchUserVisits(member.USER_NO, token)
  }
}

const stepMember = async (delta) => {
  if (recordNavBusy.value) return
  if (delta < 0 && !canRecordPrev.value) return
  if (delta > 0 && !canRecordNext.value) return
  const nextIndex = memberIndex.value + delta
  if (nextIndex >= 0 && nextIndex < members.value.length) {
    await openMemberDialog(members.value[nextIndex], { keepTab: true })
    return
  }
  recordNavBusy.value = true
  try {
    currentPage.value += delta > 0 ? 1 : -1
    await fetchMembers()
    const row = delta > 0 ? members.value[0] : members.value.at(-1)
    if (row) await openMemberDialog(row, { keepTab: true })
  } finally {
    recordNavBusy.value = false
  }
}

const openAddMemberDialog = () => {
  memberIndex.value = -1
  selectedMember.value = {
    USER_NO: '',
    USER_NAME: '',
    USER_POSITION: '',
    PINFL: '',
    TEL_NO: '',
    BIRTHDAY: null,
    ADDRS: '',
    EMAIL: '',
    PASSPORT_SERIES: '',
    PASSPORT_NUMBER: '',
    SEX: '',
    NATIONALITY: 'UZB',
    INSERT_DATE: (() => {
      const now = new Date()
      const p = (n) => String(n).padStart(2, '0')
      return (
        `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`
        + `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
      )
    })(),
    ZIP_CODE: '',
    CMPNY_CODE: '',
    FULL_CODE: '',
  }
  isEditMode.value = false
  uznelSyncEnabled.value = false
  activeTab.value = 0
  showDialog.value = true
  memberImagePreview.value = null
}

const memberImage = ref(null)
const memberImagePreview = ref(null)
const categories = ref(toCategoryOptions())

const loadCategories = async () => {
  try {
    const rows = await apiService.get('/member-categories')
    if (Array.isArray(rows) && rows.length) {
      categories.value = toCategoryOptions(rows)
    }
  } catch (error) {
    console.error('Error loading member categories:', error)
  }
}

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

const fetchUserVisits = async (userNo, token = openToken) => {
  try {
    loadingVisits.value = true
    const response = await apiService.get(`/visits/user/${userNo}`)
    if (token !== openToken) return
    userVisits.value = response.visits || []
  } catch (error) {
    if (token !== openToken) return
    console.error('Error fetching user visits:', error)
    toast.add({
      severity: 'error',
      summary: 'Xatolik',
      detail: 'Foydalanuvchi tashriflari yuklanmadi',
      life: 3000
    })
  } finally {
    if (token === openToken) loadingVisits.value = false
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
        detail: "Yangi a'zo qo'shildi. Endi Uznelga sinxronizatsiya qilishingiz mumkin",
        life: 3500
      })
      isEditMode.value = true
    }

    selectedMember.value = { ...updatedMember }
    uznelSyncEnabled.value = true
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

const onUznelSynced = (member) => {
  selectedMember.value = { ...selectedMember.value, ...member }
  uznelSyncEnabled.value = true
}

const closeDialog = () => {
  showDialog.value = false
  memberIndex.value = -1
  selectedMember.value = null
  userVisits.value = []
  memberImagePreview.value = null
  memberImage.value = null
  uznelSyncEnabled.value = false
}

const imageSource = computed(() => {
  if (!memberImagePreview.value) return null
  
  if (memberImagePreview.value.startsWith('data:')) {
    return memberImagePreview.value
  }
  
  return `data:image/jpeg;base64,${memberImagePreview.value}`
})

watch(pageSize, () => {
  currentPage.value = 1
  fetchMembers()
})

const onUpdateCurrentPage = (p) => {
  currentPage.value = p
  fetchMembers()
}

const onUpdateRowsPerPage = (r) => {
  pageSize.value = r
}

onMounted(() => {
  fetchMembers()
  loadCategories()
})
</script>

<template>
  <div>
    <MemberList
      ref="memberListRef"
      title="A'zo bo'lganlar"
      :members="members"
      :loading="loading"
      :exporting="exporting"
      :total-records="totalRecords"
      :current-page="currentPage"
      :rows-per-page="pageSize"
      v-model:searchQuery="searchQuery"
      v-model:sortField="sortField"
      v-model:sortOrder="sortOrder"
      storage-key="azo-bolganlar"
      export-file-name="azo-bolganlar"
      :categories="categories"
      @add-member="openAddMemberDialog"
      @update:current-page="onUpdateCurrentPage"
      @update:rows-per-page="onUpdateRowsPerPage"
      @apply-search="applySearch"
      @refresh="fetchMembers"
      @export-excel="exportExcel"
      @row-dblclick="openMemberDialog"
    />

    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Foydalanuvchi ma\'lumotlari' : 'Yangi foydalanuvchi'"
      :modal="true"
      :closable="true"
      :style="{ width: 'min(1240px, 96vw)' }"
      :breakpoints="{ '960px': '96vw' }"
      class="member-record-dialog member-record-dialog-raised"
      @hide="closeDialog"
    >
      <TabView v-if="isEditMode && selectedMember" v-model:activeIndex="activeTab">
        <TabPanel header="Ma'lumotlar">
          <MemberForm
            :selected-member="selectedMember"
            :categories="categories"
            :image-source="imageSource"
            :is-edit-mode="true"
            :can-generate-uznel-id="true"
            :uznel-sync-enabled="uznelSyncEnabled"
            :record-order="recordOrder"
            :can-record-prev="canRecordPrev"
            :can-record-next="canRecordNext"
            :record-nav-busy="recordNavBusy"
            @close-dialog="closeDialog"
            @save-member="saveMember"
            @uznel-synced="onUznelSynced"
            @new-member="openAddMemberDialog"
            @image-select="onImageSelect"
            @delete-image="deleteImage"
            @record-prev="stepMember(-1)"
            @record-next="stepMember(1)"
          />
        </TabPanel>
        <TabPanel header="Tashriflar tarixi">
          <VisitHistory
            :user-visits="userVisits"
            :loading-visits="loadingVisits"
          />
          <div v-if="recordOrder != null" class="visit-record-nav">
            <MemberRecordNav
              :order="recordOrder"
              :can-prev="canRecordPrev"
              :can-next="canRecordNext"
              :busy="recordNavBusy"
              @prev="stepMember(-1)"
              @next="stepMember(1)"
            />
          </div>
        </TabPanel>
      </TabView>
      <MemberForm
        v-else-if="selectedMember"
        :selected-member="selectedMember"
        :categories="categories"
        :image-source="imageSource"
        :is-edit-mode="false"
        :can-generate-uznel-id="true"
        :uznel-sync-enabled="uznelSyncEnabled"
        @close-dialog="closeDialog"
        @save-member="saveMember"
        @uznel-synced="onUznelSynced"
        @new-member="openAddMemberDialog"
        @image-select="onImageSelect"
        @delete-image="deleteImage"
      />
    </Dialog>
  </div>
</template>

<style scoped>
.visit-record-nav {
  display: flex;
  margin-top: 0.75rem;
}
</style>

<style>
.p-dialog-mask:has(.member-record-dialog-raised) {
  align-items: flex-start;
  padding-top: 3.25rem;
}

.member-record-dialog-raised.p-dialog {
  max-height: calc(100vh - 4.5rem);
}
</style>
