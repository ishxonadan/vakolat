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
  <div class="max-w-5xl mx-auto p-8">
    <div v-if="loading" class="flex justify-center items-center py-16">
      <ProgressSpinner />
    </div>
    
    <div v-else class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl shadow-xl p-8">
      <h2 class="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Dissertatsiyani tahrirlash
      </h2>
      
      <div class="space-y-6">
        <!-- Title -->
        <div class="form-group">
          <label for="title" class="form-label">Sarlavha*</label>
          <InputText 
            v-model="title" 
            id="title" 
            type="text" 
            class="form-input" 
            placeholder="Dissertatsiya sarlavhasini kiriting"
          />
        </div>

        <!-- Author -->
        <div class="form-group">
          <label for="author" class="form-label">Muallif*</label>
          <InputText 
            v-model="author" 
            id="author" 
            type="text" 
            class="form-input" 
            placeholder="Muallif ismini kiriting"
          />
        </div>

        <!-- Code and UDK/BBK -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group">
            <label for="code" class="form-label">Shifr*</label>
            <InputText 
              v-model="code" 
              id="code" 
              type="text" 
              class="form-input" 
              placeholder="Shifr raqamini kiriting"
            />
          </div>
          <div class="form-group">
            <label for="udk_bbk" class="form-label">UDK/BBK</label>
            <InputText 
              v-model="udk_bbk" 
              id="udk_bbk" 
              type="text" 
              class="form-input" 
              placeholder="UDK/BBK raqamini kiriting"
            />
          </div>
        </div>

        <!-- Type and Level -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group">
            <label for="type" class="form-label">Turi*</label>
            <Dropdown 
              v-model="type" 
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Turini tanlang"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="level" class="form-label">Daraja*</label>
            <Dropdown 
              v-model="level" 
              :options="levelOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Darajani tanlang"
              class="form-input"
            />
          </div>
        </div>

        <!-- Category and Language -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group">
            <label for="category" class="form-label">Kategoriya*</label>
            <Dropdown 
              v-model="category_id" 
              :options="categories"
              optionLabel="label"
              optionValue="value"
              placeholder="Kategoriyani tanlang"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="language" class="form-label">Til</label>
            <Dropdown 
              v-model="language" 
              :options="languageOptions"
              optionLabel="label"
              optionValue="value"
              class="form-input"
            />
          </div>
        </div>

        <!-- Place, Collective, Devision -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="form-group">
            <label for="place" class="form-label">Joy</label>
            <InputText 
              v-model="place" 
              id="place" 
              type="text" 
              class="form-input" 
              placeholder="Joyni kiriting"
            />
          </div>
          <div class="form-group">
            <label for="collective" class="form-label">Kollektiv</label>
            <InputText 
              v-model="collective" 
              id="collective" 
              type="text" 
              class="form-input" 
              placeholder="Kollektivni kiriting"
            />
          </div>
          <div class="form-group">
            <label for="devision" class="form-label">Bo'lim</label>
            <InputText 
              v-model="devision" 
              id="devision" 
              type="text" 
              class="form-input" 
              placeholder="Bo'limni kiriting"
            />
          </div>
        </div>

        <!-- Year and Approved Date -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group">
            <label for="year" class="form-label">Yil</label>
            <InputText 
              v-model="year" 
              id="year" 
              type="text" 
              class="form-input" 
              placeholder="Yilni kiriting"
            />
          </div>
          <div class="form-group">
            <label for="approved_date" class="form-label">Tasdiqlangan sana</label>
            <Calendar 
              v-model="approved_date" 
              id="approved_date" 
              dateFormat="dd.mm.yy"
              class="form-input"
              placeholder="Sanani tanlang"
            />
          </div>
        </div>

        <!-- Ashyo, SRN, MTT, Volume -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="form-group">
            <label for="ashyo" class="form-label">Ashyo</label>
            <InputText 
              v-model="ashyo" 
              id="ashyo" 
              type="text" 
              class="form-input" 
              placeholder="Ashyo"
            />
          </div>
          <div class="form-group">
            <label for="srn" class="form-label">SRN</label>
            <InputText 
              v-model="srn" 
              id="srn" 
              type="text" 
              class="form-input" 
              placeholder="SRN"
            />
          </div>
          <div class="form-group">
            <label for="mtt" class="form-label">MTT</label>
            <InputText 
              v-model="mtt" 
              id="mtt" 
              type="text" 
              class="form-input" 
              placeholder="MTT"
            />
          </div>
          <div class="form-group">
            <label for="volume" class="form-label">Hajm</label>
            <InputText 
              v-model="volume" 
              id="volume" 
              type="text" 
              class="form-input" 
              placeholder="Hajm"
            />
          </div>
        </div>

        <!-- Annotation -->
        <div class="form-group">
          <label for="annotation" class="form-label">Annotatsiya</label>
          <Textarea 
            v-model="annotation" 
            id="annotation" 
            rows="4" 
            class="form-input" 
            placeholder="Annotatsiyani kiriting"
          />
        </div>

        <!-- Additional -->
        <div class="form-group">
          <label for="additional" class="form-label">Qo'shimcha ma'lumot</label>
          <Textarea 
            v-model="additional" 
            id="additional" 
            rows="3" 
            class="form-input" 
            placeholder="Qo'shimcha ma'lumotlarni kiriting"
          />
        </div>

        <!-- Current File -->
        <div v-if="currentFileName" class="form-group">
          <label class="form-label">Joriy fayl</label>
          <div class="flex items-center gap-3 p-4 bg-blue-50 dark:bg-zinc-700 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <i class="pi pi-file-pdf text-red-500 text-2xl"></i>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{{ currentFileName }}</span>
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
        <div class="form-group">
          <label class="form-label">Yangi PDF fayl yuklash (ixtiyoriy)</label>
          <FileUpload 
            mode="basic" 
            accept="application/pdf" 
            :maxFileSize="50000000"
            @select="onFileSelect"
            :auto="false"
            chooseLabel="Fayl tanlash"
            :disabled="isUploading"
            class="w-full"
          />
          <small v-if="uploadedFileName" class="text-green-600 font-medium mt-2 block">
            ✓ Yangi fayl yuklandi: {{ uploadedFileName }}
          </small>
        </div>

        <!-- Submit buttons -->
        <div class="flex justify-center gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-zinc-700">
          <Button 
            label="Saqlash" 
            @click="saveData"
            class="px-8 py-3 text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-lg transition-all"
            icon="pi pi-save"
            iconPos="left"
            :disabled="isUploading"
          />
          <Button 
            label="Bekor qilish" 
            @click="cancelEdit"
            class="px-8 py-3 font-semibold"
            severity="secondary"
            outlined
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-group {
  @apply flex flex-col;
}

.form-label {
  @apply block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2;
}

.form-input {
  @apply w-full;
}

:deep(.p-inputtext),
:deep(.p-dropdown),
:deep(.p-calendar),
:deep(.p-textarea) {
  @apply rounded-lg border-2 border-gray-200 dark:border-zinc-700 
         focus:border-blue-500 dark:focus:border-blue-400 
         transition-all duration-200 shadow-sm
         bg-white dark:bg-zinc-800;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
}

:deep(.p-inputtext:hover),
:deep(.p-dropdown:hover),
:deep(.p-calendar:hover),
:deep(.p-textarea:hover) {
  @apply border-blue-300 dark:border-blue-600;
}

:deep(.p-fileupload-choose) {
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 
         hover:from-blue-700 hover:to-indigo-700 
         border-0 rounded-lg shadow-md transition-all;
  padding: 0.75rem 1.5rem;
}
</style>
