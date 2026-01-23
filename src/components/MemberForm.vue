<template>
  <div class="member-form">
    <!-- Photo Section -->
    <div class="photo-section">
      <h3 class="section-title">
        <i class="pi pi-image"></i>
        Rasm
      </h3>
      <div class="photo-upload-area">
        <div class="photo-preview">
          <img
            v-if="imageSource"
            :src="imageSource"
            alt="User photo"
            class="photo-img"
          />
          <div v-else class="photo-placeholder">
            <i class="pi pi-user"></i>
            <span>Rasm yuklang</span>
          </div>
        </div>
        <div class="photo-buttons">
          <Button
            icon="pi pi-camera"
            label="Kamera"
            severity="info"
            size="small"
            @click="showWebcamDialog = true"
            outlined
            class="photo-btn"
          />
          <FileUpload
            ref="memberImage"
            mode="basic"
            accept="image/*"
            :maxFileSize="2000000"
            @select="onImageSelect"
            chooseLabel="Yuklash"
            chooseIcon="pi pi-upload"
            auto="true"
            size="small"
            severity="success"
            outlined
            class="photo-btn"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            @click="onDeleteImage"
            :disabled="!imageSource"
            outlined
            class="photo-btn"
            v-tooltip.top="'O\'chirish'"
          />
        </div>
      </div>
    </div>

    <!-- Personal Information -->
    <div class="form-section">
      <h3 class="section-title">
        <i class="pi pi-user"></i>
        Shaxsiy ma'lumotlar
      </h3>
      <div class="form-grid">
        <div class="form-field">
          <label for="userName" class="field-label">
            <i class="pi pi-user text-blue-500"></i>
            Ism va familiya *
          </label>
          <InputText 
            id="userName" 
            v-model="userName" 
            class="w-full" 
            placeholder="To'liq ism kiriting"
            autocomplete="off"
          />
        </div>

        <div class="form-field">
          <label for="passportCode" class="field-label">
            <i class="pi pi-id-card text-blue-500"></i>
            Pasport
          </label>
          <InputText
            id="passportCode"
            v-model="zipCode"
            placeholder="AA1234567"
            class="w-full"
            style="text-transform: uppercase"
            autocomplete="off"
          />
        </div>

        <div class="form-field">
          <label for="userPosition" class="field-label">
            <i class="pi pi-briefcase text-blue-500"></i>
            Toifa *
          </label>
          <Dropdown
            id="userPosition"
            v-model="userPosition"
            :options="categories"
            optionLabel="label"
            optionValue="value"
            placeholder="Toifani tanlang"
            class="w-full"
            autocomplete="off"
          />
        </div>

        <div class="form-field">
          <label for="birthday" class="field-label">
            <i class="pi pi-calendar text-blue-500"></i>
            Tug'ilgan sana
          </label>
          <Calendar
            id="birthday"
            v-model="birthday"
            dateFormat="dd/mm/yy"
            placeholder="Sanani tanlang"
            showIcon
            class="w-full"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <!-- Contact Information -->
    <div class="form-section">
      <h3 class="section-title">
        <i class="pi pi-phone"></i>
        Aloqa ma'lumotlari
      </h3>
      <div class="form-grid">
        <div class="form-field">
          <label for="telNo" class="field-label">
            <i class="pi pi-phone text-green-500"></i>
            Telefon
          </label>
          <InputText 
            id="telNo" 
            v-model="telNo" 
            placeholder="+998 XX XXX XX XX" 
            class="w-full"
            autocomplete="off"
          />
        </div>

        <div class="form-field">
          <label for="email" class="field-label">
            <i class="pi pi-envelope text-green-500"></i>
            Email
          </label>
          <InputText 
            id="email" 
            v-model="email" 
            type="email" 
            placeholder="example@mail.com" 
            class="w-full"
            autocomplete="off"
          />
        </div>

        <div class="form-field">
          <label for="cardNo" class="field-label">
            <i class="pi pi-credit-card text-green-500"></i>
            Karta raqami
          </label>
          <InputText 
            id="cardNo" 
            v-model="cardNo" 
            placeholder="1234 5678 9012" 
            class="w-full"
            autocomplete="off"
          />
        </div>

        <div class="form-field full-width">
          <label for="address" class="field-label">
            <i class="pi pi-map-marker text-green-500"></i>
            Manzil
          </label>
          <Textarea 
            id="address" 
            v-model="addrs" 
            rows="2" 
            class="w-full" 
            placeholder="To'liq manzilni kiriting"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="form-actions">
      <Button label="Bekor qilish" icon="pi pi-times" @click="onCloseDialog" outlined severity="secondary" size="large" />
      <Button label="Saqlash" icon="pi pi-check" @click="onSaveMember" severity="success" size="large" />
    </div>

    <!-- Webcam Dialog -->
    <WebcamCapture
      v-model:visible="showWebcamDialog"
      :targetWidth="178"
      :targetHeight="189"
      @capture="onWebcamCapture"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import FileUpload from 'primevue/fileupload'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import WebcamCapture from './WebcamCapture.vue'

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
  }
})

const emit = defineEmits(['close-dialog', 'save-member', 'image-select', 'delete-image'])

const memberImage = ref(null)
const showWebcamDialog = ref(false)

const userName = ref('')
const userPosition = ref('')
const cardNo = ref('')
const telNo = ref('')
const birthday = ref(null)
const addrs = ref('')
const email = ref('')
const zipCode = ref('')

watch(() => props.selectedMember, (newVal) => {
  if (newVal) {
    userName.value = newVal.USER_NAME || ''
    userPosition.value = newVal.USER_POSITION || ''
    cardNo.value = newVal.CARD_NO || ''
    telNo.value = newVal.TEL_NO || ''
    birthday.value = newVal.BIRTHDAY ? new Date(newVal.BIRTHDAY) : null
    addrs.value = newVal.ADDRS || ''
    email.value = newVal.EMAIL || ''
    zipCode.value = newVal.ZIP_CODE || ''
  }
}, { immediate: true })

const onImageSelect = (event) => {
  emit('image-select', event)
}

const onDeleteImage = () => {
  emit('delete-image')
}

const onCloseDialog = () => {
  emit('close-dialog')
}

const onSaveMember = () => {
  const updatedMember = {
    ...props.selectedMember,
    USER_NAME: userName.value,
    USER_POSITION: userPosition.value,
    CARD_NO: cardNo.value,
    TEL_NO: telNo.value,
    BIRTHDAY: birthday.value,
    ADDRS: addrs.value,
    EMAIL: email.value,
    ZIP_CODE: zipCode.value
  }
  emit('save-member', updatedMember)
}

const onWebcamCapture = (imageData) => {
  // Convert the captured image to a file-like object
  const event = {
    files: [dataURLtoFile(imageData, 'webcam-capture.jpg')]
  }
  onImageSelect(event)
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
  gap: 1.5rem;
}

.photo-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px dashed #cbd5e1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
}

.section-title i {
  color: #3b82f6;
}

.photo-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.photo-preview {
  width: 160px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  border: 3px solid #e2e8f0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
  color: #94a3b8;
  gap: 0.5rem;
}

.photo-placeholder i {
  font-size: 3rem;
}

.photo-placeholder span {
  font-size: 0.875rem;
  font-weight: 500;
}

.photo-buttons {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
}

.photo-btn {
  flex: 1;
  max-width: 120px;
}

.form-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: #475569;
}

.field-label i {
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 2px solid #e2e8f0;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
