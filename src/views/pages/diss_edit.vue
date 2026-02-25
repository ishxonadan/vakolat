<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { apiFetch } from '@/utils/api';
import authService from '@/service/auth.service';
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
const language = ref('uz');
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
  { label: 'Dissertatsiya', value: 'Dissertatsiya' },
  { label: 'Avtoreferat', value: 'Avtoreferat' }
]);
const loading = ref(true);
const uploadedFile = ref(null);
const uploadedFileName = ref('');
const isUploading = ref(false);
const currentFileName = ref('');

const languageOptions = ref([]);
const sohaOptions = ref([]);
const validLanguageCodes = ref([]);
const invalidLanguage = computed(() => validLanguageCodes.value.length > 0 && !validLanguageCodes.value.includes(language.value));

const loadLevels = async () => {
  try {
    const response = await apiFetch('/api/diss/levels');
    const data = await response.json();
    levelOptions.value = (data || [])
      .filter(l => l.isActive === true)
      .map(l => ({
        label: l.name,
        value: l.mark
      }));
  } catch (error) {
    console.error('Error loading levels:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Darajalarni yuklashda xatolik',
      life: 3000
    });
  }
};

const loadLanguages = async () => {
  try {
    const response = await apiFetch('/api/diss/languages');
    const data = await response.json();
    languageOptions.value = (data || [])
      .filter(lang => lang.isActive === true)
      .map(lang => ({ label: lang.name, value: lang.code }));
  } catch (error) {
    console.error('Error loading languages:', error);
    toast.add({
      severity: 'error',
      summary: 'Xato',
      detail: 'Tillarni yuklashda xatolik',
      life: 3000
    });
  }
};

onMounted(async () => {
  try {
    loading.value = true;

    // Load categories, levels, languages and soha fields in parallel
    const [catsResult, levelsResult, langResult, fieldsResult] = await Promise.allSettled([
      apiFetch('/api/diss/cats').then(r => r.json()),
      apiFetch('/api/diss/levels').then(r => r.json()),
      apiFetch('/api/diss/languages').then(r => r.json()),
      apiFetch('/api/diss/fields').then(r => r.json())
    ]);

    const catsData = catsResult.status === 'fulfilled' && Array.isArray(catsResult.value) ? catsResult.value : [];
    categories.value = catsData
      .filter(cat => cat != null && cat.name != null && cat.razdel_id != null)
      .map(cat => ({ label: String(cat.name), value: Number(cat.razdel_id) }));

    const levelsData = levelsResult.status === 'fulfilled' && Array.isArray(levelsResult.value) ? levelsResult.value : [];
    const activeLevels = levelsData.filter(l => l.isActive === true);
    levelOptions.value = activeLevels.map(l => ({
      label: l.name,
      value: l.mark
    }));

    const langData = langResult.status === 'fulfilled' ? (langResult.value || []) : [];
    const activeLangs = (Array.isArray(langData) ? langData : []).filter(l => l.isActive === true);
    validLanguageCodes.value = activeLangs.map(l => l.code);
    languageOptions.value = activeLangs.map(l => ({ label: l.name, value: l.code }));

    const fieldsData = fieldsResult.status === 'fulfilled' && Array.isArray(fieldsResult.value) ? fieldsResult.value : [];
    sohaOptions.value = fieldsData.map(item => ({ label: `${item.code} - ${item.name}`, value: item.code }));

    // Load document data
    const response = await apiFetch(`/api/diss_info/${uuid}`);
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

    // approved_date in DB may be a real Date (ISO string) or legacy string "dd.MM.yyyy"
    if (data.approved_date) {
      if (data.approved_date instanceof Date) {
        approved_date.value = data.approved_date;
      } else if (typeof data.approved_date === 'string') {
        const match = data.approved_date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (match) {
          const [, dd, mm, yyyy] = match;
          approved_date.value = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        } else {
          // Fallback for ISO or other parseable formats
          const parsed = new Date(data.approved_date);
          approved_date.value = isNaN(parsed.getTime()) ? null : parsed;
        }
      } else {
        const parsed = new Date(data.approved_date);
        approved_date.value = isNaN(parsed.getTime()) ? null : parsed;
      }
    } else {
      approved_date.value = null;
    }
    additional.value = data.additional || '';
    soha_kodi.value = data.soha_kodi || '';
    // If document's soha_kodi is not in the list (e.g. legacy free text), add it so dropdown can show selection
    if (soha_kodi.value && !sohaOptions.value.some(o => o.value === soha_kodi.value)) {
      sohaOptions.value = [...sohaOptions.value, { label: soha_kodi.value, value: soha_kodi.value }];
    }
    ilmiy_rahbar.value = data.ilmiy_rahbar || '';
    annotation.value = data.annotation || '';
    ashyo.value = data.ashyo || '';
    srn.value = data.srn || '';
    mtt.value = data.mtt || '';
    volume.value = data.volume || '';
    level.value = data.level || '';
    type.value = (data.type === 'Dissertatisya' ? 'Dissertatsiya' : (data.type || ''));

    // If document's level is not in active list (e.g. disabled), add it so dropdown can show selection
    if (level.value && !levelOptions.value.some(o => o.value === level.value)) {
      const levelDoc = levelsData.find(l => l.mark === level.value);
      levelOptions.value = [
        ...levelOptions.value,
        { label: levelDoc ? levelDoc.name : level.value, value: level.value }
      ];
    }

    // Language: resolve document code via DB (code or aliases); dropdown uses canonical code from API
    const docLang = data.language || '';
    const resolved = activeLangs.find(l => l.code === docLang || (l.aliases && l.aliases.includes(docLang)));
    language.value = resolved ? resolved.code : docLang;
    if (!resolved && docLang) {
      languageOptions.value = [...languageOptions.value, { label: `${docLang} (ro'yxatda yo'q)`, value: docLang }];
    }

    // Category: ensure number type so dropdown matches (Mongo may return NumberLong or string)
    category_id.value = data.category_id != null ? Number(data.category_id) : null;

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
    const response = await fetch('/api/diss/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authService.getToken()}` },
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
    category_id: category_id.value
  };

  // If new file was uploaded, include it
  if (uploadedFileName.value) {
    data.filename = uploadedFileName.value;
    data.size = uploadedFile.value?.size || 0;
  }

  try {
    const response = await apiFetch(`/api/diss_save/${uuid}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = result.error || result.details || 'Update failed';
      throw new Error(msg);
    }
    
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
      detail: error.message || 'Ma\'lumotlarni yangilashda xatolik', 
      life: 5000 
    });
  }
}

function cancelEdit() {
  router.push('/diss');
}

function viewCurrentFile() {
  window.open(`/api/diss_file/${uuid}`, '_blank');
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
            <div :class="{ 'language-invalid': invalidLanguage }">
              <Dropdown 
                v-model="language" 
                :options="languageOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Tilni tanlang"
                :class="['form-input', { 'p-invalid': invalidLanguage }]"
              />
              <small v-if="invalidLanguage" class="text-red-600 dark:text-red-400 font-medium block mt-1">
                Bu til ro'yxatda mavjud emas. Tilni Tillar bo'limida qo'shing yoki boshqa tilni tanlang.
              </small>
            </div>
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
        <div class="form-group soha-dropdown-wrapper">
          <label for="soha_kodi" class="form-label">Soha kodi</label>
          <Dropdown
            v-model="soha_kodi"
            :options="sohaOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Soha kodini tanlang"
            class="form-input soha-dropdown"
            :filter="true"
            filterPlaceholder="Qidirish..."
            showClear
            appendTo="self"
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

.soha-dropdown-wrapper {
  position: relative;
}
/* Shrink the trigger field when the list is open */
.soha-dropdown-wrapper:has(.p-dropdown-panel) :deep(.p-dropdown) {
  max-width: 22rem;
  width: auto;
}
/* Keep overlay panel fixed max width; long labels truncate so page doesn't shift */
.soha-dropdown-wrapper :deep(.p-dropdown-panel) {
  left: 0 !important;
  right: auto !important;
  min-width: 100%;
  max-width: min(32rem, calc(100vw - 2rem)) !important;
  width: max-content !important;
  box-sizing: border-box;
}
.soha-dropdown-wrapper :deep(.p-dropdown-panel .p-dropdown-item),
.soha-dropdown-wrapper :deep(.p-dropdown-panel .p-dropdown-item-label) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.soha-dropdown-wrapper :deep(.p-dropdown-panel .p-dropdown-items-wrapper) {
  overflow-x: hidden;
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

.language-invalid :deep(.p-dropdown) {
  @apply border-red-500 dark:border-red-400;
}
.language-invalid :deep(.p-dropdown .p-dropdown-label),
.language-invalid :deep(.p-dropdown .p-inputtext) {
  @apply text-red-600 dark:text-red-400 font-medium;
}
</style>
