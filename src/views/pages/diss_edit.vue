<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const uuid = route.params.uuid;

const title = ref('');
const author = ref('');
const code = ref('');
const udk_bbk = ref('');
const place = ref('');
const collective = ref('');
const devision = ref('');
const year = ref('');
const approved_date = ref(null);
const language = ref('uzb');
const additional = ref('');
const annotation = ref('');
const ashyo = ref('');
const srn = ref('');
const mtt = ref('');
const volume = ref('');
const type = ref('');
const level = ref('');
const category_id = ref(null);
const categories = ref([]);
const loading = ref(true);
const uploadedFile = ref(null);
const uploadedFileName = ref('');
const isUploading = ref(false);
const currentFileName = ref('');

const languageOptions = [
  { label: 'O\'zbekcha', value: 'uzb' },
  { label: 'Русский', value: 'rus' },
  { label: 'English', value: 'eng' }
];

const typeOptions = [
  { label: 'Doktorlik', value: 'doktorlik' },
  { label: 'Nomzodlik', value: 'nomzodlik' },
  { label: 'Magistrlik', value: 'magistrlik' }
];

const levelOptions = [
  { label: 'Davlat', value: 'davlat' },
  { label: 'Xalqaro', value: 'xalqaro' }
];

onMounted(async () => {
  try {
    loading.value = true;
    
    // Load categories
    const catsResponse = await fetch('/diss/cats');
    const catsData = await catsResponse.json();
    categories.value = catsData.map(cat => ({
      label: cat.name,
      value: cat.razdel_id
    }));
    
    // Load document data
    const response = await fetch(`/diss_info/${uuid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }
    const data = await response.json();
    
    title.value = data.title || '';
    author.value = data.author || '';
    code.value = data.code || '';
    udk_bbk.value = data.udk_bbk || '';
    place.value = data.place || '';
    collective.value = data.collective || '';
    devision.value = data.devision || '';
    year.value = data.year || '';
    approved_date.value = data.approved_date ? new Date(data.approved_date) : null;
    language.value = data.language || 'uzb';
    additional.value = data.additional || '';
    annotation.value = data.annotation || '';
    ashyo.value = data.ashyo || '';
    srn.value = data.srn || '';
    mtt.value = data.mtt || '';
    volume.value = data.volume || '';
    type.value = data.type || '';
    level.value = data.level || '';
    category_id.value = data.category_id || null;
    currentFileName.value = data.filename || '';
    
  } catch (error) {
    console.error('Error fetching document:', error);
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Ma\'lumotlarni yuklashda xatolik yuz berdi', 
      life: 3000 
    });
  } finally {
    loading.value = false;
  }
});

const onFileSelect = async (event) => {
  const file = event.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Faqat PDF fayllar qabul qilinadi', 
      life: 3000 
    });
    return;
  }

  isUploading.value = true;
  const formData = new FormData();
  formData.append('demo[]', file);

  try {
    const response = await fetch('/diss/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    uploadedFileName.value = data.file.filename;
    uploadedFile.value = file;
    
    toast.add({ 
      severity: 'success', 
      summary: 'Muvaffaqiyat', 
      detail: 'Fayl muvaffaqiyatli yuklandi', 
      life: 3000 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Faylni yuklashda xatolik', 
      life: 3000 
    });
  } finally {
    isUploading.value = false;
  }
};

async function saveData() {
  // Validate required fields
  if (!title.value || !author.value || !code.value || !type.value || !level.value || !category_id.value) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Barcha majburiy maydonlarni to\'ldiring', 
      life: 3000 
    });
    return;
  }

  const data = {
    title: title.value,
    author: author.value,
    code: code.value,
    udk_bbk: udk_bbk.value,
    place: place.value,
    collective: collective.value,
    devision: devision.value,
    year: year.value,
    approved_date: approved_date.value,
    language: language.value,
    additional: additional.value,
    annotation: annotation.value,
    ashyo: ashyo.value,
    srn: srn.value,
    mtt: mtt.value,
    volume: volume.value,
    type: type.value,
    level: level.value,
    category_id: category_id.value
  };

  // If new file was uploaded, include it
  if (uploadedFileName.value) {
    data.filename = uploadedFileName.value;
    data.size = uploadedFile.value?.size || 0;
  }

  try {
    const response = await fetch(`/diss_save/${uuid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Update failed');
    }

    const result = await response.json();
    
    toast.add({ 
      severity: 'success', 
      summary: 'Bajarildi', 
      detail: 'Ma\'lumotlar muvaffaqiyatli yangilandi', 
      life: 3000 
    });
    
    setTimeout(() => {
      router.push('/diss');
    }, 2000);
  } catch (error) {
    console.error('Error updating data:', error);
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Ma\'lumotlarni yangilashda xatolik', 
      life: 3000 
    });
  }
}

function cancelEdit() {
  router.push('/diss');
}

function viewCurrentFile() {
  window.open(`/diss_file/${uuid}`, '_blank');
}
</script>

<template>
  <div class="p-6 bg-white rounded-lg shadow-md mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Dissertatsiyani tahrirlash</h2>
    
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>
    
    <div v-else class="card">
      <!-- Title -->
      <div class="flex flex-col mb-4">
        <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Sarlavha*</label>
        <InputText 
          v-model="title" 
          id="title" 
          type="text" 
          class="w-full p-3" 
        />
      </div>

      <!-- Author -->
      <div class="flex flex-col mb-4">
        <label for="author" class="block text-sm font-medium text-gray-700 mb-1">Muallif*</label>
        <InputText 
          v-model="author" 
          id="author" 
          type="text" 
          class="w-full p-3" 
        />
      </div>

      <!-- Code and UDK/BBK -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/2">
          <label for="code" class="block text-sm font-medium text-gray-700 mb-1">Kod*</label>
          <InputText 
            v-model="code" 
            id="code" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/2">
          <label for="udk_bbk" class="block text-sm font-medium text-gray-700 mb-1">UDK/BBK</label>
          <InputText 
            v-model="udk_bbk" 
            id="udk_bbk" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
      </div>

      <!-- Type and Level -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/2">
          <label for="type" class="block text-sm font-medium text-gray-700 mb-1">Turi*</label>
          <Dropdown 
            v-model="type" 
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Turini tanlang"
            class="w-full"
          />
        </div>
        <div class="md:w-1/2">
          <label for="level" class="block text-sm font-medium text-gray-700 mb-1">Daraja*</label>
          <Dropdown 
            v-model="level" 
            :options="levelOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Darajani tanlang"
            class="w-full"
          />
        </div>
      </div>

      <!-- Category and Language -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/2">
          <label for="category" class="block text-sm font-medium text-gray-700 mb-1">Kategoriya*</label>
          <Dropdown 
            v-model="category_id" 
            :options="categories"
            optionLabel="label"
            optionValue="value"
            placeholder="Kategoriyani tanlang"
            class="w-full"
          />
        </div>
        <div class="md:w-1/2">
          <label for="language" class="block text-sm font-medium text-gray-700 mb-1">Til</label>
          <Dropdown 
            v-model="language" 
            :options="languageOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>

      <!-- Place, Collective, Devision -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/3">
          <label for="place" class="block text-sm font-medium text-gray-700 mb-1">Joy</label>
          <InputText 
            v-model="place" 
            id="place" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/3">
          <label for="collective" class="block text-sm font-medium text-gray-700 mb-1">Kollektiv</label>
          <InputText 
            v-model="collective" 
            id="collective" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/3">
          <label for="devision" class="block text-sm font-medium text-gray-700 mb-1">Bo'lim</label>
          <InputText 
            v-model="devision" 
            id="devision" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
      </div>

      <!-- Year and Approved Date -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/2">
          <label for="year" class="block text-sm font-medium text-gray-700 mb-1">Yil</label>
          <InputText 
            v-model="year" 
            id="year" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/2">
          <label for="approved_date" class="block text-sm font-medium text-gray-700 mb-1">Tasdiqlangan sana</label>
          <Calendar 
            v-model="approved_date" 
            id="approved_date" 
            dateFormat="dd.mm.yy"
            class="w-full"
          />
        </div>
      </div>

      <!-- Ashyo, SRN, MTT, Volume -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="md:w-1/4">
          <label for="ashyo" class="block text-sm font-medium text-gray-700 mb-1">Ashyo</label>
          <InputText 
            v-model="ashyo" 
            id="ashyo" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/4">
          <label for="srn" class="block text-sm font-medium text-gray-700 mb-1">SRN</label>
          <InputText 
            v-model="srn" 
            id="srn" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/4">
          <label for="mtt" class="block text-sm font-medium text-gray-700 mb-1">MTT</label>
          <InputText 
            v-model="mtt" 
            id="mtt" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
        <div class="md:w-1/4">
          <label for="volume" class="block text-sm font-medium text-gray-700 mb-1">Hajm</label>
          <InputText 
            v-model="volume" 
            id="volume" 
            type="text" 
            class="w-full p-3" 
          />
        </div>
      </div>

      <!-- Annotation -->
      <div class="flex flex-col mb-4">
        <label for="annotation" class="block text-sm font-medium text-gray-700 mb-1">Annotatsiya</label>
        <Textarea 
          v-model="annotation" 
          id="annotation" 
          rows="4" 
          class="w-full p-3" 
        />
      </div>

      <!-- Additional -->
      <div class="flex flex-col mb-4">
        <label for="additional" class="block text-sm font-medium text-gray-700 mb-1">Qo'shimcha ma'lumot</label>
        <Textarea 
          v-model="additional" 
          id="additional" 
          rows="3" 
          class="w-full p-3" 
        />
      </div>

      <!-- Current File -->
      <div v-if="currentFileName" class="flex flex-col mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Joriy fayl</label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">{{ currentFileName }}</span>
          <Button 
            icon="pi pi-eye" 
            label="Ko'rish" 
            @click="viewCurrentFile"
            class="p-button-sm"
            outlined
          />
        </div>
      </div>

      <!-- File Upload -->
      <div class="flex flex-col mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Yangi PDF fayl yuklash (ixtiyoriy)</label>
        <FileUpload 
          mode="basic" 
          accept="application/pdf" 
          :maxFileSize="50000000"
          @select="onFileSelect"
          :auto="false"
          chooseLabel="Fayl tanlash"
          :disabled="isUploading"
        />
        <small v-if="uploadedFileName" class="text-green-600 mt-2">
          Yangi fayl yuklandi: {{ uploadedFileName }}
        </small>
      </div>

      <!-- Submit buttons -->
      <div class="flex justify-center gap-4 mt-6">
        <Button 
          label="Saqlash" 
          @click="saveData"
          class="px-6 py-3 text-white font-medium"
          icon="pi pi-save"
          iconPos="left"
          :disabled="isUploading"
        />
        <Button 
          label="Bekor qilish" 
          @click="cancelEdit"
          class="px-6 py-3 font-medium"
          severity="secondary"
          outlined
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-button) {
  background-color: #4f46e5;
  border-color: #4f46e5;
}

:deep(.p-button:hover) {
  background-color: #4338ca;
  border-color: #4338ca;
}

:deep(.p-button.p-button-outlined) {
  color: #4f46e5;
  background-color: transparent;
}

:deep(.p-button.p-button-outlined:hover) {
  background-color: rgba(79, 70, 229, 0.04);
}
</style>
