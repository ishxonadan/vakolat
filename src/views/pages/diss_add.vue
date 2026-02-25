<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

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
const soha_kodi = ref('');
const ilmiy_rahbar = ref('');
const annotation = ref('');
const ashyo = ref('');
const srn = ref('');
const mtt = ref('');
const volume = ref('');
const level = ref('');
const type = ref('');
const category_id = ref(null);
const categories = ref([]);
const levelOptions = ref([]);
const documentTypeOptions = ref([
  { label: 'Dissertatisya', value: 'Dissertatisya' },
  { label: 'Avtoreferat', value: 'Avtoreferat' }
]);
const uploadedFile = ref(null);
const uploadedFileName = ref('');
const isUploading = ref(false);

const languageOptions = [
  { label: 'O\'zbekcha', value: 'uzb' },
  { label: 'Русский', value: 'rus' },
  { label: 'English', value: 'eng' }
];

const loadCategories = async () => {
  try {
    const response = await fetch('/diss/cats');
    const data = await response.json();
    categories.value = data.map(cat => ({
      label: cat.name,
      value: cat.razdel_id
    }));
  } catch (error) {
    console.error('Error loading categories:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Kategoriyalarni yuklashda xatolik',
      life: 3000
    });
  }
};

const loadAcademicDegrees = async () => {
  try {
    const response = await fetch('/diss/levels');
    const data = await response.json();
    levelOptions.value = data.map(level => ({
      label: level.name,
      value: level.mark
    }));
  } catch (error) {
    console.error('Error loading academic degrees:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Akademik darajalarni yuklashda xatolik',
      life: 3000
    });
  }
};

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
  if (!title.value || !author.value || !code.value || !level.value || !type.value || !category_id.value) {
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
    soha_kodi: soha_kodi.value,
    ilmiy_rahbar: ilmiy_rahbar.value,
    annotation: annotation.value,
    ashyo: ashyo.value,
    srn: srn.value,
    mtt: mtt.value,
    volume: volume.value,
    level: level.value,
    type: type.value,
    category_id: category_id.value,
    filename: uploadedFileName.value,
    size: uploadedFile.value?.size || 0
  };

  try {
    const response = await fetch('/diss_save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Save failed');
    }

    const result = await response.json();
    
    toast.add({ 
      severity: 'success', 
      summary: 'Bajarildi', 
      detail: 'Ma\'lumotlar muvaffaqiyatli saqlandi', 
      life: 3000 
    });
    
    setTimeout(() => {
      router.push('/diss');
    }, 2000);
  } catch (error) {
    console.error('Error saving data:', error);
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Ma\'lumotlarni saqlashda xatolik', 
      life: 3000 
    });
  }
}

function cancelAdd() {
  router.push('/diss');
}

onMounted(async () => {
  await loadCategories();
  await loadAcademicDegrees();
});
</script>

<template>
  <div class="max-w-5xl mx-auto p-8">
    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl shadow-xl p-8">
      <h2 class="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Dissertatsiya qo'shish
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

        <!-- Academic Degree and Document Type -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group">
            <label for="level" class="form-label">Akademik daraja*</label>
            <Dropdown
              v-model="level"
              :options="levelOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Akademik darajani tanlang"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="type" class="form-label">Turi*</label>
            <Dropdown
              v-model="type"
              :options="documentTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Turini tanlang"
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
            <label for="collective" class="form-label">Tashkilot</label>
            <InputText 
              v-model="collective" 
              id="collective" 
              type="text" 
              class="form-input" 
              placeholder="Tashkilotni kiriting"
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
            <label for="ashyo" class="form-label">Ashyolar ro'yxati (Invertar)</label>
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

        <!-- Soha kodi -->
        <div class="form-group">
          <label for="soha_kodi" class="form-label">Soha kodi</label>
          <Textarea
            v-model="soha_kodi"
            id="soha_kodi"
            rows="4"
            class="form-input"
            placeholder="Soha kodini kiriting. Bir nechta soha kodini kiritsa bo'ladi"
          />
        </div>

        <!-- Ilmiy rahbar/maslahatchi -->
        <div class="form-group">
          <label for="ilmiy_rahbar" class="form-label">Ilmiy rahbar/maslahatchi</label>
          <Textarea
            v-model="ilmiy_rahbar"
            id="ilmiy_rahbar"
            rows="4"
            class="form-input"
            placeholder="Ilmiy rahbar/maslahatchi ismini kiriting"
          />
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

        <!-- File Upload -->
        <div class="form-group">
          <label class="form-label">PDF fayl (ixtiyoriy)</label>
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
            ✓ Yuklangan: {{ uploadedFileName }}
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
            @click="cancelAdd"
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
