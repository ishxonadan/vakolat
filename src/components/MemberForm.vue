<template>
  <form class="member-form" autocomplete="off" @submit.prevent="onSaveMember" @paste="onScanPaste">
    <div class="member-form-layout">
      <aside class="photo-card">
        <div class="photo-card-label">Rasm</div>
        <div class="photo-preview">
          <img
            v-if="imageSource"
            :src="imageSource"
            alt="Foydalanuvchi rasmi"
            class="photo-img"
          />
          <div v-else class="photo-placeholder">
            <i class="pi pi-user" />
            <span>Rasm yo'q</span>
          </div>
        </div>
        <div v-if="canManageMembers" class="photo-buttons">
          <Button
            type="button"
            icon="pi pi-camera"
            label="Kamera"
            size="small"
            outlined
            class="photo-btn"
            @click="showWebcamDialog = true"
          />
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="photo-file-input"
            @change="onFilePicked"
          />
          <Button
            type="button"
            icon="pi pi-upload"
            label="Yuklash"
            size="small"
            class="photo-btn"
            @click="fileInput?.click()"
          />
          <Button
            type="button"
            icon="pi pi-trash"
            label="O'chirish"
            size="small"
            outlined
            severity="danger"
            class="photo-btn"
            :disabled="!imageSource"
            @click="onDeleteImage"
          />
        </div>
      </aside>

      <div class="member-form-fields">
        <section class="form-section">
          <div class="section-header">
            <h3>Shaxsiy ma'lumotlar</h3>
            <p>ID karta QR kodini skanerlang — ism, pasport, PINFL, jinsi va fuqarolik avtomatik to'ldiriladi</p>
          </div>
          <div class="form-grid">
            <div v-if="canGenerateUznelId || isEditMode || userNo" class="form-field full-width">
              <label class="field-label" for="userNo">ID</label>
              <div class="id-lookup">
                <InputText
                  id="userNo"
                  v-model="userNo"
                  class="id-lookup-input"
                  placeholder="ID"
                  :readonly="isEditMode"
                  autocomplete="off"
                />
                <Button
                  v-if="canGenerateUznelId && canManageMembers && !isEditMode"
                  type="button"
                  icon="pi pi-search"
                  class="id-lookup-search"
                  severity="secondary"
                  outlined
                  :loading="fetchingUserNo"
                  :disabled="fetchingUserNo"
                  aria-label="Uznel ID olish"
                  @click="fetchUznelUserId"
                />
              </div>
            </div>

            <div class="form-field full-width">
              <label class="field-label" for="userName">
                Ism va familiya <span class="required">*</span>
              </label>
              <InputText
                id="userName"
                v-model="userName"
                class="w-full"
                placeholder="Familiya Ism Sharif"
                :invalid="submitted && !userName.trim()"
                autocomplete="off"
              />
            </div>

            <div class="form-field">
              <label class="field-label" for="userPosition">
                Toifa <span class="required">*</span>
              </label>
              <Dropdown
                id="userPosition"
                v-model="userPosition"
                :options="categories"
                optionLabel="label"
                optionValue="value"
                placeholder="Toifani tanlang"
                class="w-full"
                :invalid="submitted && !userPosition"
              />
            </div>

            <div class="form-field">
              <label class="field-label" for="sex">Jinsi</label>
              <Dropdown
                id="sex"
                v-model="sex"
                :options="sexOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Tanlang"
                class="w-full"
                showClear
                appendTo="body"
              />
            </div>

            <div class="form-field">
              <label class="field-label" for="passportCode">Pasport</label>
              <InputText
                id="passportCode"
                v-model="zipCode"
                placeholder="AA1234567"
                class="w-full passport-input"
                autocomplete="off"
              />
            </div>

            <div class="form-field">
              <label class="field-label" for="nationality">Fuqarolik</label>
              <Dropdown
                id="nationality"
                v-model="nationality"
                :options="nationalityOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Tanlang"
                class="w-full"
                filter
                filterPlaceholder="Qidirish"
                showClear
                appendTo="body"
              />
            </div>

            <div class="form-field">
              <label class="field-label" for="birthday">Tug'ilgan sana</label>
              <Calendar
                id="birthday"
                v-model="birthday"
                dateFormat="dd.mm.yy"
                placeholder="kk.oo.yyyy"
                showIcon
                showButtonBar
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label class="field-label" for="pinfl">PINFL</label>
              <InputText
                id="pinfl"
                v-model="pinfl"
                placeholder="14 xonali JSHSHIR"
                class="w-full"
                maxlength="14"
                inputmode="numeric"
                autocomplete="off"
                @input="onPinflInput"
              />
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-header">
            <h3>Aloqa ma'lumotlari</h3>
            <p>Telefon va manzil</p>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label class="field-label" for="telNo">Telefon</label>
              <div class="phone-input" :class="{ 'has-custom-code': isCustomDialCode }">
                <Dropdown
                  v-model="phoneCode"
                  :options="phoneCodes"
                  optionValue="code"
                  optionLabel="label"
                  class="phone-code"
                  :filter="true"
                  filterPlaceholder="Mamlakat yoki kod"
                  panelClass="phone-code-panel"
                  overlayClass="phone-code-panel"
                  appendTo="body"
                >
                  <template #value="{ value }">
                    <span>{{ displayDialCode(value) }}</span>
                  </template>
                  <template #option="{ option }">
                    <span class="phone-code-option">
                      <span>{{ option.code === CUSTOM_PHONE_CODE ? '+' : option.code }}</span>
                      <span class="phone-code-country">{{ option.country }}</span>
                    </span>
                  </template>
                </Dropdown>
                <InputText
                  v-if="isCustomDialCode"
                  :modelValue="customPhoneCode"
                  class="phone-custom-code"
                  placeholder="+000"
                  inputmode="tel"
                  autocomplete="off"
                  aria-label="Maxsus kod"
                  @update:modelValue="onCustomPhoneCodeInput"
                />
                <InputText
                  id="telNo"
                  :modelValue="phoneLocalDisplay"
                  :placeholder="phoneLocalPlaceholder"
                  class="phone-local"
                  inputmode="tel"
                  autocomplete="off"
                  @update:modelValue="onPhoneLocalInput"
                />
              </div>
            </div>

            <div class="form-field">
              <label class="field-label" for="email">Email</label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="name@example.com"
                class="w-full"
                autocomplete="off"
              />
            </div>

            <div class="form-field full-width">
              <label class="field-label" for="address">Manzil</label>
              <Textarea
                id="address"
                v-model="addrs"
                rows="2"
                class="w-full"
                placeholder="Viloyat, tuman, ko'cha, uy"
                autoResize
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <div class="form-actions">
      <Button
        type="button"
        label="Bekor qilish"
        icon="pi pi-times"
        outlined
        severity="secondary"
        @click="onCloseDialog"
      />
      <Button type="submit" v-if="canManageMembers" label="Saqlash" icon="pi pi-check" severity="success" />
      <Button
        v-if="canGenerateUznelId && canManageMembers"
        type="button"
        label="Uznelga sinxronizatsiya"
        icon="pi pi-cloud-upload"
        class="uznel-sync-btn"
        :disabled="!uznelSyncEnabled || syncingUznel"
        :loading="syncingUznel"
        @click="syncToUznel"
      />
    </div>

    <WebcamCapture
      v-model:visible="showWebcamDialog"
      :targetWidth="178"
      :targetHeight="189"
      @capture="onWebcamCapture"
    />
  </form>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import WebcamCapture from './WebcamCapture.vue'
import apiService from '@/service/api.service'
import authService from '@/service/auth.service'
import { isMrzCharsetKey, normalizeSex, parseIdMrz, sexFromPinfl } from '@/utils/parseIdMrz'
import {
  CUSTOM_PHONE_CODE,
  composePhoneNumber,
  formatLocalNumber,
  isCustomPhoneCode,
  localLengthFor,
  normalizeDialCode,
  parsePhoneNumber,
  phoneCodeOptions,
} from '@/utils/phoneNumber'

const props = defineProps({
  selectedMember: {
    type: Object,
    required: true
  },
  categories: {
    type: Array,
    required: true
  },
  imageSource: {
    type: String,
    default: null
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  canGenerateUznelId: {
    type: Boolean,
    default: false
  },
  uznelSyncEnabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close-dialog', 'save-member', 'image-select', 'delete-image', 'uznel-synced'])
const toast = useToast()
const canManageMembers = computed(() => authService.hasPermission('manage_members'))

const fileInput = ref(null)
const showWebcamDialog = ref(false)
const submitted = ref(false)
const fetchingUserNo = ref(false)
const syncingUznel = ref(false)

const sexOptions = [
  { label: 'Ayol', value: 'F' },
  { label: 'Erkak', value: 'M' },
]

const nationalityOptions = [
  { label: "O'zbekiston", value: 'UZB' },
  { label: 'Rossiya', value: 'RUS' },
  { label: "Qozog'iston", value: 'KAZ' },
  { label: "Qirg'iziston", value: 'KGZ' },
  { label: 'Tojikiston', value: 'TJK' },
  { label: 'Turkmaniston', value: 'TKM' },
  { label: 'Ozarbayjon', value: 'AZE' },
  { label: 'Turkiya', value: 'TUR' },
  { label: 'Xitoy', value: 'CHN' },
  { label: 'Koreya', value: 'KOR' },
  { label: 'Hindiston', value: 'IND' },
  { label: 'Afg\'oniston', value: 'AFG' },
  { label: 'Ukraina', value: 'UKR' },
  { label: 'Belarus', value: 'BLR' },
  { label: 'AQSH', value: 'USA' },
  { label: 'Germaniya', value: 'DEU' },
  { label: 'BAA', value: 'ARE' },
]

const phoneCodes = phoneCodeOptions()

const userNo = ref('')
const userName = ref('')
const userPosition = ref('')
const pinfl = ref('')
const phoneCode = ref('+998')
const customPhoneCode = ref('+')
const phoneLocal = ref('')
const birthday = ref(null)
const addrs = ref('')
const email = ref('')
const zipCode = ref('')
const sex = ref('')
const nationality = ref('')
const scannedPassportSeries = ref('')
const scannedPassportNumber = ref('')

const isCustomDialCode = computed(() => isCustomPhoneCode(phoneCode.value))
const activeDialCode = computed(() => (
  isCustomDialCode.value ? customPhoneCode.value : phoneCode.value
))
const phoneLocalDisplay = computed(() => formatLocalNumber(activeDialCode.value, phoneLocal.value))
const phoneLocalPlaceholder = computed(() => (activeDialCode.value === '+998' ? '90 123 45 67' : 'Raqam'))

let scanBuffer = ''
let scanLastAt = 0
let scanSnapshot = null
const SCAN_GAP_MS = 120

watch(() => props.selectedMember, (newVal) => {
  submitted.value = false
  if (!newVal) return
  userNo.value = newVal.USER_NO || ''
  userName.value = newVal.USER_NAME || ''
  userPosition.value = newVal.USER_POSITION || ''
  pinfl.value = newVal.PINFL || ''
  applyParsedPhone(parsePhoneNumber(newVal.TEL_NO))
  birthday.value = parseBirthday(newVal.BIRTHDAY)
  addrs.value = newVal.ADDRS || ''
  email.value = newVal.EMAIL || ''
  zipCode.value = newVal.ZIP_CODE || ''
  sex.value = normalizeSex(newVal.SEX, newVal.PINFL)
  nationality.value = newVal.NATIONALITY || ''
  ensureNationalityOption(nationality.value)
  scannedPassportSeries.value = newVal.PASSPORT_SERIES || ''
  scannedPassportNumber.value = newVal.PASSPORT_NUMBER || ''
}, { immediate: true })

watch(phoneCode, (code) => {
  if (!isCustomPhoneCode(code)) customPhoneCode.value = '+'
  capPhoneLocal()
})

function ensureNationalityOption(code) {
  if (!code || nationalityOptions.some((item) => item.value === code)) return
  nationalityOptions.push({ label: code, value: code })
}

function displayDialCode(value) {
  if (isCustomPhoneCode(value)) return customPhoneCode.value !== '+' ? customPhoneCode.value : '+'
  return value || '+998'
}

function capPhoneLocal() {
  phoneLocal.value = phoneLocal.value.slice(0, localLengthFor(activeDialCode.value))
}

function applyParsedPhone(parsed) {
  if (parsed.custom) {
    phoneCode.value = CUSTOM_PHONE_CODE
    customPhoneCode.value = parsed.code
  } else {
    phoneCode.value = parsed.code
    customPhoneCode.value = '+'
  }
  phoneLocal.value = parsed.local
}

function onCustomPhoneCodeInput(value) {
  const normalized = normalizeDialCode(value)
  const known = phoneCodes.find((item) => item.code === normalized)
  if (known && !isCustomPhoneCode(known.code)) {
    phoneCode.value = known.code
    customPhoneCode.value = '+'
  } else {
    customPhoneCode.value = normalized
  }
  capPhoneLocal()
}

function takeScanSnapshot() {
  scanSnapshot = {
    userName: userName.value,
    zipCode: zipCode.value,
    pinfl: pinfl.value,
    phoneCode: phoneCode.value,
    customPhoneCode: customPhoneCode.value,
    phoneLocal: phoneLocal.value,
    email: email.value,
    addrs: addrs.value,
    sex: sex.value,
    nationality: nationality.value,
  }
}

function applyParsedId(parsed) {
  if (!parsed) return false
  const snapshot = scanSnapshot || {}

  if (parsed.fullName) userName.value = parsed.fullName
  else userName.value = snapshot.userName ?? userName.value

  if (parsed.documentNumber) zipCode.value = parsed.documentNumber
  else zipCode.value = snapshot.zipCode ?? zipCode.value

  if (parsed.birthDate) birthday.value = parsed.birthDate
  if (parsed.pinfl) pinfl.value = parsed.pinfl
  else pinfl.value = snapshot.pinfl ?? pinfl.value

  const parsedSex = normalizeSex(parsed.sex, parsed.pinfl)
  if (parsedSex) sex.value = parsedSex
  else sex.value = snapshot.sex ?? sex.value

  if (parsed.nationality) {
    ensureNationalityOption(parsed.nationality)
    nationality.value = parsed.nationality
  } else {
    nationality.value = snapshot.nationality ?? nationality.value
  }

  if (parsed.passportSeries) scannedPassportSeries.value = parsed.passportSeries
  if (parsed.passportNumber) scannedPassportNumber.value = parsed.passportNumber

  phoneCode.value = snapshot.phoneCode ?? phoneCode.value
  customPhoneCode.value = snapshot.customPhoneCode ?? customPhoneCode.value
  phoneLocal.value = snapshot.phoneLocal ?? phoneLocal.value
  email.value = snapshot.email ?? email.value
  addrs.value = snapshot.addrs ?? addrs.value

  toast.add({
    severity: 'success',
    summary: 'ID skanerlandi',
    detail: parsed.fullName || parsed.documentNumber,
    life: 2500
  })
  return true
}

function consumeScanBuffer(event) {
  const parsed = parseIdMrz(scanBuffer)
  scanBuffer = ''
  scanLastAt = 0
  if (!parsed) {
    scanSnapshot = null
    return false
  }
  event?.preventDefault()
  event?.stopPropagation()
  applyParsedId(parsed)
  scanSnapshot = null
  return true
}

function onScanKeydown(event) {
  if (!canManageMembers.value || showWebcamDialog.value) return

  const now = Date.now()
  if (now - scanLastAt > SCAN_GAP_MS) {
    scanBuffer = ''
    scanSnapshot = null
  }

  if (event.key === 'Enter') {
    if (scanBuffer.length >= 60) consumeScanBuffer(event)
    else {
      scanBuffer = ''
      scanSnapshot = null
    }
    return
  }

  if (!isMrzCharsetKey(event.key)) return
  if (!scanBuffer) takeScanSnapshot()
  scanLastAt = now
  scanBuffer += event.key.toUpperCase()
}

function onScanPaste(event) {
  if (!canManageMembers.value) return
  const text = event.clipboardData?.getData('text') || ''
  const parsed = parseIdMrz(text)
  if (!parsed) return
  event.preventDefault()
  takeScanSnapshot()
  applyParsedId(parsed)
  scanSnapshot = null
}

onMounted(() => {
  window.addEventListener('keydown', onScanKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onScanKeydown, true)
})

function pad2(value) {
  return String(value).padStart(2, '0')
}

function toLocalYyyymmdd(value) {
  if (value === undefined || value === null || value === '') return ''
  if (value instanceof Date && !isNaN(value.getTime())) {
    return `${value.getFullYear()}${pad2(value.getMonth() + 1)}${pad2(value.getDate())}`
  }
  const raw = String(value).trim()
  if (/^\d{8}$/.test(raw)) return raw
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return `${dateOnly[1]}${dateOnly[2]}${dateOnly[3]}`
  const parsed = new Date(raw)
  if (isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}${pad2(parsed.getMonth() + 1)}${pad2(parsed.getDate())}`
}

function parseBirthday(value) {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const ymd = toLocalYyyymmdd(value)
  if (!/^\d{8}$/.test(ymd)) return null
  return new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)))
}

const onImageSelect = (event) => {
  emit('image-select', event)
}

const onFilePicked = (event) => {
  const files = event.target.files
  if (!files?.length) return
  const file = files[0]
  if (file.size > 2000000) {
    toast.add({
      severity: 'warn',
      summary: 'Rasm hajmi',
      detail: "Rasm 2 MB dan oshmasligi kerak",
      life: 2500
    })
    event.target.value = ''
    return
  }
  onImageSelect({ files: [file] })
  event.target.value = ''
}

const onDeleteImage = () => {
  emit('delete-image')
}

async function fetchUznelUserId() {
  if (!canManageMembers.value || props.isEditMode || fetchingUserNo.value) return
  fetchingUserNo.value = true
  try {
    const response = await apiService.post('/members/uznel-id', {})
    const nextId = String(response?.USER_NO || '').trim()
    if (!nextId) throw new Error('Uznel ID olinmadi')
    userNo.value = nextId
    toast.add({
      severity: 'success',
      summary: 'ID olindi',
      detail: nextId,
      life: 2500
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Uznel ID',
      detail: error.message || 'ID olinmadi',
      life: 3500
    })
  } finally {
    fetchingUserNo.value = false
  }
}

function onPinflInput() {
  pinfl.value = String(pinfl.value || '').replace(/\D/g, '').slice(0, 14)
  if (!sex.value) {
    const derived = sexFromPinfl(pinfl.value)
    if (derived) sex.value = derived
  }
}

function onPhoneLocalInput(value) {
  phoneLocal.value = String(value || '').replace(/\D/g, '').slice(0, localLengthFor(activeDialCode.value))
}

function onCloseDialog() {
  emit('close-dialog')
}

function buildMemberPayload() {
  const maskId = userNo.value.trim()
  return {
    ...props.selectedMember,
    USER_NO: maskId,
    USER_ID: maskId,
    USER_NAME: userName.value.trim(),
    USER_POSITION: userPosition.value,
    PINFL: pinfl.value.trim(),
    TEL_NO: composePhoneNumber(activeDialCode.value, phoneLocal.value),
    BIRTHDAY: toLocalYyyymmdd(birthday.value),
    INSERT_DATE: toLocalYyyymmdd(props.selectedMember?.INSERT_DATE) || toLocalYyyymmdd(new Date()),
    ADDRS: addrs.value.trim(),
    EMAIL: email.value.trim(),
    ZIP_CODE: zipCode.value.trim().toUpperCase(),
    PASSPORT_SERIES: scannedPassportSeries.value || undefined,
    PASSPORT_NUMBER: scannedPassportNumber.value || undefined,
    SEX: sex.value || '',
    NATIONALITY: nationality.value || '',
    PHOTO: props.selectedMember?.PHOTO || undefined,
  }
}

const onSaveMember = () => {
  if (!canManageMembers.value) return
  submitted.value = true
  if (!userName.value.trim() || !userPosition.value) {
    toast.add({
      severity: 'warn',
      summary: 'Majburiy maydonlar',
      detail: "Ism va toifani to'ldiring",
      life: 2500
    })
    return
  }
  if (props.canGenerateUznelId && !props.isEditMode && !userNo.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'ID kerak',
      detail: "Qidiruv tugmasi orqali Uznel ID oling",
      life: 3000
    })
    return
  }

  emit('save-member', buildMemberPayload())
}

async function syncToUznel() {
  if (!canManageMembers.value || !props.uznelSyncEnabled || syncingUznel.value) return
  submitted.value = true
  if (!userNo.value.trim() || !userName.value.trim() || !userPosition.value || !toLocalYyyymmdd(birthday.value)) {
    toast.add({
      severity: 'warn',
      summary: 'Majburiy maydonlar',
      detail: "Avval ID, ism, toifa va tug'ilgan sanani to'ldiring",
      life: 3000
    })
    return
  }

  syncingUznel.value = true
  try {
    const payload = buildMemberPayload()
    const response = await apiService.post('/members/uznel-sync', payload)
    emit('uznel-synced', {
      ...payload,
      USER_SEQ_NO: response?.USER_SEQ_NO || payload.USER_SEQ_NO,
      SEQUENCE_NO: response?.SEQUENCE_NO || response?.USER_SEQ_NO || payload.SEQUENCE_NO,
      UZNEL_SYNCED: Boolean(response?.USER_SEQ_NO || response?.SEQUENCE_NO),
      UZNEL_ORG_ROW: response?.UZNEL_ORG_ROW || payload.UZNEL_ORG_ROW,
      LIB_USE_LDATE: response?.LIB_USE_LDATE || payload.LIB_USE_LDATE,
    })
    const action = response?.updated ? 'yangilandi' : 'yozildi'
    toast.add({
      severity: response?.photoError ? 'warn' : 'success',
      summary: 'Uznel',
      detail: response?.photoError
        ? `${payload.USER_NO} ma'lumotlari ${action}, lekin rasm: ${response.photoError}`
        : response?.photoSynced
          ? `${payload.USER_NO} ma'lumotlari va rasm ${action}`
          : `${payload.USER_NO} ma'lumotlari ${action}`,
      life: 3500
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Uznel',
      detail: error.message || "Sinxronizatsiya muvaffaqiyatsiz",
      life: 4000
    })
  } finally {
    syncingUznel.value = false
  }
}

const onWebcamCapture = (imageData) => {
  onImageSelect({
    files: [dataURLtoFile(imageData, 'webcam-capture.jpg')]
  })
  showWebcamDialog.value = false
}

const dataURLtoFile = (dataurl, filename) => {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}
</script>

<style scoped>
.member-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.member-form-layout {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.photo-card {
  border: 1px solid var(--p-content-border-color, var(--surface-border));
  background: var(--p-content-background, var(--surface-ground));
  border-radius: 12px;
  padding: 0.9rem;
}

.photo-card-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  margin-bottom: 0.65rem;
}

.photo-preview {
  width: 100%;
  aspect-ratio: 178 / 189;
  border-radius: 10px;
  overflow: hidden;
  background: var(--p-surface-100, #f1f5f9);
  border: 1px solid var(--p-content-border-color, var(--surface-border));
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: var(--text-color-secondary);
}

.photo-placeholder i {
  font-size: 2rem;
}

.photo-placeholder span {
  font-size: 0.8rem;
}

.photo-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.photo-btn {
  width: 100%;
}

.photo-file-input {
  display: none;
}

.member-form-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.form-section {
  border: 1px solid var(--p-content-border-color, var(--surface-border));
  background: var(--p-content-background, var(--surface-card));
  border-radius: 12px;
  padding: 1rem 1.1rem 1.15rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.section-header p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.required {
  color: var(--p-red-500, #ef4444);
}

.passport-input {
  text-transform: uppercase;
}

.id-lookup {
  display: flex;
  width: 100%;
  min-width: 0;
}

.id-lookup-input {
  flex: 1;
  min-width: 0;
}

.id-lookup-search {
  flex-shrink: 0;
  width: 2.75rem;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -1px;
}

.id-lookup:has(.id-lookup-search) :deep(.id-lookup-input),
.id-lookup:has(.id-lookup-search) :deep(.p-inputtext) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.phone-input {
  display: flex;
  width: 100%;
  min-width: 0;
}

.phone-code {
  width: 7.6rem;
  flex-shrink: 0;
}

.phone-input.has-custom-code .phone-code {
  width: 5.8rem;
}

.phone-code :deep(.p-dropdown),
.phone-code :deep(.p-select) {
  width: 100%;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.phone-custom-code {
  width: 4.6rem;
  flex-shrink: 0;
  border-radius: 0 !important;
}

.phone-local {
  flex: 1;
  min-width: 0;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.phone-code-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.phone-code-country {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--p-content-border-color, var(--surface-border));
}

.uznel-sync-btn.p-button,
.uznel-sync-btn {
  background: #eef6ff !important;
  border: 1px solid #8ec8f0 !important;
  color: #1565a8 !important;
}

.uznel-sync-btn.p-button:enabled:hover,
.uznel-sync-btn:enabled:hover {
  background: #dceefe !important;
  border-color: #64b5f6 !important;
  color: #0d47a1 !important;
}

.uznel-sync-btn.p-button:disabled,
.uznel-sync-btn:disabled {
  opacity: 0.5;
  color: #7aa3c9 !important;
}

@media (max-width: 768px) {
  .member-form-layout,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .photo-card {
    max-width: 16rem;
    margin: 0 auto;
  }
}
</style>

<style>
.phone-code-panel {
  min-width: 22rem;
}

.phone-code-panel .phone-code-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.phone-code-panel .phone-code-country {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
}
</style>
