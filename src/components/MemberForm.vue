<template>
  <div class="flex flex-column gap-4">
    <!-- Row 1: Photo spans rows | Ism | Passport -->
    <div class="flex gap-4">
      <div class="flex flex-column gap-2" style="flex: 0 0 178px; margin-bottom: 2rem;">
        <!-- Photo display area -->
        <div
          class="border-2 border-300 border-round overflow-hidden bg-gray-50 flex align-items-center justify-content-center"
          style="width: 178px; height: 189px;"
        >
          <img
            v-if="imageSource"
            :src="imageSource"
            alt="User photo"
            class="w-full h-full"
            style="object-fit: cover"
          />
          <div v-else class="text-center text-400">
            <i class="pi pi-user" style="font-size: 3rem"></i>
          </div>
        </div>

        <!-- Buttons under photo -->
        <div class="flex gap-2">
          <FileUpload
            ref="memberImage"
            mode="basic"
            accept="image/*"
            :maxFileSize="2000000"
            @select="onImageSelect"
            chooseLabel=""
            chooseIcon="pi pi-pencil"
            class="flex-1"
            auto="true"
            size="small"
            style="height: 32px"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            @click="onDeleteImage"
            :disabled="!imageSource"
            outlined
            style="height: 32px; width: 32px; padding: 0"
          />
        </div>
      </div>

      <div class="flex-1">
        <label for="userName" class="block mb-2 font-semibold text-sm">Ism *</label>
        <InputText id="userName" v-model="userName" class="w-full" />
      </div>

      <div class="flex-1">
        <label for="passportCode" class="block mb-2 font-semibold text-sm">Pasport (Seriyasi va Raqami)</label>
        <InputText
          id="passportCode"
          v-model="zipCode"
          placeholder="AA1234567"
          class="w-full"
          style="text-transform: uppercase"
        />
      </div>
    </div>

    <!-- Row 2: Empty space for photo column | Toifa | Tug'ilgan sana -->
    <div class="flex gap-4">
      <div style="flex: 0 0 178px;"></div>

      <div class="flex-1">
        <label for="userPosition" class="block mb-2 font-semibold text-sm">Toifa *</label>
        <Dropdown
          id="userPosition"
          v-model="userPosition"
          :options="categories"
          optionLabel="label"
          optionValue="value"
          placeholder="Toifani tanlang"
          class="w-full"
        />
      </div>

      <div class="flex-1">
        <label for="birthday" class="block mb-2 font-semibold text-sm">Tug'ilgan sana</label>
        <Calendar
          id="birthday"
          v-model="birthday"
          dateFormat="dd/mm/yy"
          placeholder="Sanani tanlang"
          showIcon
          class="w-full"
        />
      </div>
    </div>

    <!-- Row 3: Empty space for photo column | Telefon | Karta raqami -->
    <div class="flex gap-4">
      <div style="flex: 0 0 178px;"></div>

      <div class="flex-1">
        <label for="telNo" class="block mb-2 font-semibold text-sm">Telefon</label>
        <InputText id="telNo" v-model="telNo" placeholder="+998 XX XXX XX XX" class="w-full" />
      </div>

      <div class="flex-1">
        <label for="cardNo" class="block mb-2 font-semibold text-sm">Karta raqami</label>
        <InputText id="cardNo" v-model="cardNo" class="w-full" />
      </div>
    </div>

    <!-- Row 4: Empty space for photo column | Email | Manzil -->
    <div class="flex gap-4">
      <div style="flex: 0 0 178px;"></div>

      <div class="flex-1">
        <label for="email" class="block mb-2 font-semibold text-sm">Email (ixtiyoriy)</label>
        <InputText id="email" v-model="email" type="email" placeholder="example@mail.com" class="w-full" />
      </div>

      <div class="flex-1">
        <label for="address" class="block mb-2 font-semibold text-sm">Manzil</label>
        <Textarea id="address" v-model="addrs" rows="3" class="w-full" />
      </div>
    </div>

    <div class="flex justify-content-end gap-2 mt-4 pt-4 border-top-1 border-300">
      <Button label="Bekor qilish" icon="pi pi-times" @click="onCloseDialog" outlined severity="secondary" />
      <Button label="Saqlash" icon="pi pi-check" @click="onSaveMember" severity="success" />
    </div>
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
</script>
