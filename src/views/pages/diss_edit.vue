<script setup>
import { ref, onMounted } from 'vue';
import FileUpload from 'primevue/fileupload';
import axios from 'axios';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
const toast = useToast();
const route = useRoute();
const uuid = route.params.uuid;

const typeValue = ref(null);
const catValue = ref(null);
const acdValue = ref(null);
const language = ref(null);
const shifr = ref('');
const author = ref('');
const title = ref('');
const isDeleted = ref(false);

const typeDropdownValues = ref([
    { name: 'Dissertatsiya', code: 'diss' },
    { name: 'Avtoreferat', code: 'avto' },
]);

const acdDropdownValues = ref([
    { name: 'Doktor', code: 'doktor' },
    { name: 'Magistr', code: 'magistr' },
    { name: 'Nomzod', code: 'nomzod' },
    { name: 'Bakalavr', code: 'bakalavr' },
]);

const catDropdownValues = ref([]);

const languageDropdownValues = ref([
    { name: "O'zbek", code: "uz" },
    { name: "Ingliz", code: "en" },
    { name: "Rus", code: "ru" },
    { name: "Qoraqalpoq", code: "qr" },
    { name: "Arman", code: "ar" },
    { name: "Azarbajon", code: "az" },
    { name: "Belorus", code: "br" },
    { name: "Qirg'iz", code: "kg" },
    { name: "Qozoq", code: "kz" },
    { name: "Udegey", code: "ud" },
    { name: "Ukrain", code: "ua" },
    { name: "Tojik", code: "tj" },
]);

function handleLatinInput(event) {

}

const fetchDissInfo = async () => {

    try {
        const response = await axios.get(`/diss_info/${uuid}`);
        let data = response.data;
        console.log(catDropdownValues);
        typeValue.value = typeDropdownValues.value.find(option => option.name === data.type || option.code === data.type) || null;
        title.value = data.title || '';
        author.value = data.author || '';
        shifr.value = data.code || '';
        isDeleted.value = data.is_deleted === 1;
        document.getElementById('udc_bbk').value = data.udk_bbk || '';
        document.getElementById('PlaceOfPublication').value = data.place || '';
        document.getElementById('collective').value = data.collective || '';
        document.getElementById('devision').value = data.devision || '';
        document.getElementById('year').value = data.year || '';
        language.value = data.language || '';
        language.value = languageDropdownValues.value.find(option => option.name === data.language || option.code === data.language) || null;

        additional.value = data.additional || '';
        annotation.value = data.annotation || '';
        ashyo.value = data.ashyo || '';
        srn.value = data.srn || '';
        volume.value = data.volume || '';
        uploadedFilename.value = data.filename || '';
        totalSize.value = data.size || '';
        catValue.value = {}
        catValue.value = catDropdownValues.value.find(option => option.razdel_id === data.category_id) || null;

        acdValue.value = acdDropdownValues.value.find(option => option.code.toLowerCase() === data.level) || null;
        mtt.value = data.mtt || '';

    } catch (error) {
        console.error('Failed to fetch dissertation info:', error);
    }
};


const fetchCategories = async () => {
    try {
        const response = await axios.get('/diss/cats');
        catDropdownValues.value = response.data;
    } catch (error) {
        console.error('Failed to fetch categories:', error);
    }
};

const totalSize = ref(0);
const totalSizePercent = ref(0);
const isFileUploaded = ref(true);
const uploadedFilename = ref('');

function customRemoveUploadedFileCallback(originalCallback) {
    isFileUploaded.value = false;
    if (originalCallback) {
        originalCallback(0);
    }
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function onTemplatedUpload(event) {
    console.log('Uploaded file:', event.files[0]);
    const response = JSON.parse(event.xhr.response); // Parse the JSON response
    uploadedFilename.value = response.file.filename; // Store the filename

    isFileUploaded.value = true;
}

function onSelectedFiles(event) {
    if (event.files.length > 1) {
        console.error('Only one file is allowed.');
        event.preventDefault();
    } else {
        const file = event.files[0];
        totalSize.value = file.size;
        totalSizePercent.value = (file.size / file.size) * 100; // Set progress to 100% once the file is fully selected
    }
}

function onRemoveTemplatingFile(file, removeFileCallback) {
    console.log(53);

    removeFileCallback(file);
    totalSize.value -= file.size;
    totalSizePercent.value = (totalSize.value / 1_000_000) * 100;
    isFileUploaded.value = false;
}


function saveData() {

    const data = {
        type: typeValue.value.name,
        title: title.value,
        author: author.value,
        code: shifr.value,
        udk_bbk: document.getElementById('udc_bbk').value,
        place: document.getElementById('PlaceOfPublication').value,
        collective: document.getElementById('collective').value,
        devision: document.getElementById('devision').value,
        year: document.getElementById('year').value,
        language: language?.value?.name ?? null,
        additional: additional.value,
        annotation: annotation.value,
        ashyo: ashyo.value,
        srn: srn.value,
        volume: volume.value,
        filename: uploadedFilename.value,
        size: totalSize.value,
        category_id: catValue?.value?.razdel_id?? null,
        level: acdValue.value.code,
        mtt: mtt.value,
        is_deleted: isDeleted.value ? 1 : 0
    };
    // console.log(data);

    fetch('/diss_save/' + uuid, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (response.ok) {
            toast.add({ severity: 'success', summary: 'Bajarildi', detail: "Hujjat muvaffaqiyatli o'zgartirildi", life: 3000 });
            setTimeout(() => {
            window.location.href = '/diss';
        }, 2000); // Redirect after 3 seconds
        } else {
            toast.add({ severity: 'warn', summary: 'Xato', detail: "Serverdan xato javob keldi", life: 3000 });
            // alert('Xatolik yuz berdi.');
        }
    }).catch(error => {
        // console.error('Error:', error);
        // alert('Xatolik yuz berdi');
        toast.add({ severity: 'error', summary: 'Xato', detail: "Serverga ulanib bo'lmadi", life: 3000 });
    });
}

onMounted(() => {
    fetchCategories();
    fetchDissInfo();
});

</script>

<template>
    <!-- 
<FileUpload
        name="demo[]"
        url="/diss/upload"
        accept=".pdf"
        :multiple="false"
        :auto="true"
        :disabled="isFileUploaded"
        @upload="onTemplatedUpload"
        @select="onSelectedFiles"
    >
        <template #header="{ chooseCallback, uploadCallback, clearCallback, files }">
            <div class="flex flex-wrap justify-between items-center flex-1 gap-4">
                <ProgressBar :value="totalSizePercent" :showValue="false" class="md:w-20rem h-1 w-full md:ml-auto">
                    <span class="whitespace-nowrap">{{ formatSize(totalSize) }} / {{ formatSize(1_000_000) }}</span>
                </ProgressBar>
            </div>
        </template>
<template #content="{ files, uploadedFiles, removeUploadedFileCallback, removeFileCallback, messages }">
            <div class="flex flex-col gap-8 pt-4">
                <Message
                    v-for="message of messages"
                    :key="message"
                    :class="{ 'mb-8': !files.length && !uploadedFiles.length }"
                    severity="error"
                >
                    {{ message }}
                </Message>

                <div v-if="files.length > 0">
                    <h5>Pending</h5>
                    <div class="flex flex-wrap justify-center items-center gap-4">
                        <div
                            v-for="(file, index) of files"
                            :key="file.name + file.type + file.size"
                            class="p-8 rounded-border flex flex-col border border-surface items-center gap-4"
                        >
                            <span class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden">{{ file.name }}</span>
                            <div>{{ formatSize(file.size) }}</div>
                            <Badge value="Pending" severity="warn" />
                            <Button
                                icon="pi pi-times"
                                @click="onRemoveTemplatingFile(file, removeFileCallback, index)"
                                outlined
                                rounded
                                severity="danger"
                            />
                        </div>
                    </div>
                </div>

                <div v-if="uploadedFiles.length > 0">
                    <h5>Tayyor</h5>
                    <div class="flex flex-wrap justify-center items-center gap-4">
                        <div
                            v-for="(file, index) of uploadedFiles"
                            :key="file.name + file.type + file.size"
                            class="p-8 rounded-border flex flex-col border border-surface items-center gap-4"
                        >
                            <span class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden">{{ file.name }}</span>
                            <div>{{ formatSize(file.size) }}</div>
                            <Badge value="Yuklandi" class="mt-4" severity="success" />
                            <Button
                                icon="pi pi-times"
                                @click="customRemoveUploadedFileCallback(removeUploadedFileCallback)"
                                outlined
                                rounded
                                severity="danger"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </template>
<template #empty>
            <div class="flex items-center justify-center flex-col">
                <i class="pi pi-cloud-upload !border-2 !rounded-full !p-8 !text-4xl !text-muted-color" />
                <p class="mt-6 mb-0">Faylni shu joyga uloqtiring</p>
            </div>
        </template>
</FileUpload> -->

    <Fluid v-if="isFileUploaded" class="flex flex-col md:flex-row gap-4">
        <div class="md:w-full">
            <div class="card flex flex-col gap-4">

                <div class="flex space-x-2">
                    <div class="md:w-1/5">
                        <Select v-model="typeValue" :options="typeDropdownValues" optionLabel="name"
                            placeholder="Hujjat turi" />
                    </div>
                    <div class="md:w-1/5">
                        <Select v-model="catValue" :options="catDropdownValues" optionLabel="name"
                            placeholder="Yo'nalishi" />
                    </div>
                    <div class="md:w-1/5">
                        <Select v-model="acdValue" :options="acdDropdownValues" optionLabel="name"
                            placeholder="Akademik daraja" />
                    </div>
                </div>
                <div class="flex space-x-2">
                    <div class="md:w-full">
                        <InputText v-model="title" id="title" type="text" placeholder="Hujjat nomi*"
                            autocomplete="off" />
                    </div>
                    <div class="md:w-1/2">
                        <InputText v-model="author" id="author" type="text" placeholder="Muallif ism sharifi*"
                            autocomplete="off" />
                    </div>

                </div>
                <div class="flex space-x-2">


                    <div class="md:w-1/3">
                        <InputText v-model="shifr" id="code" type="text" placeholder="Shifr*" autocomplete="off"
                            @input="handleLatinInput" />
                    </div>

                    <div class="md:w-1/3">
                        <InputText id="udc_bbk" type="text" placeholder="UDK yoki BBK" autocomplete="off"
                            @input="handleLatinInput" />
                    </div>

                    <div class="md:w-1/3">
                        <InputText id="mtt" type="text" placeholder="Mutahassisligi" autocomplete="off"
                            @input="handleLatinInput" />
                    </div>
                </div>

                <div class="flex space-x-2">
                    <div class="md:w-1/2">
                        <InputText id="srn" type="text" placeholder="Davlat ro'yxatga olish raqami" autocomplete="off"
                            @input="handleLatinInput" />
                    </div>
                    <div class="md:w-1/2">
                        <InputText id="ashyo" type="text" placeholder="Ashyo raqami (инвентарь)" autocomplete="off"
                            @input="handleLatinInput" />
                    </div>

                </div>


                <div class="flex space-x-2">

                    <div class="md:w-1/2">
                        <InputText id="PlaceOfPublication" type="text" placeholder="Nashr qilingan mintaqa (shahar)"
                            autocomplete="off" @input="handleLatinInput" />
                    </div>
                    <div class="md:w-1/2">
                        <InputText id="collective" type="text" placeholder="Tashkilot" autocomplete="off"
                            @input="handleLatinInput" />
                    </div>
                    <div class="md:w-1/2">
                        <InputText id="devision" type="text" placeholder="Bo'linma" autocomplete="off"
                            @input="handleLatinInput" />
                    </div>



                </div>

                <div class="flex space-x-2">
                    <div class="md:w-1/5">
                        <InputText id="year" type="text" placeholder="Himoya yili" autocomplete="off" />
                    </div>
                    <!-- <div class="md:w-1/2">
                        <DatePicker :showIcon="true" :showButtonBar="true" v-model="calendarValue"></DatePicker>
                    </div> -->

                </div>


                <div class="font-semibold text-xl">Fayl bo'yicha ma'lumot</div>

                <div class="flex space-x-2">
                    <div class="md:w-1/4">
                        <Select v-model="language" :options="languageDropdownValues" optionLabel="name"
                            placeholder="Hujjat tili" />
                    </div>
                    <div class="md:w-1/5">
                        <InputText id="volume" type="text" placeholder="Sahifalar soni" autocomplete="off"
                            class="border border-gray-300 rounded p-2" />
                    </div>

                </div>

                <div class="font-semibold text-xl">Qo'shimcha ma'lumotlar</div>
                <div class="flex space-x-2">
                    <div class="md:w-full">
                        <InputText id="annotation" type="text" placeholder="Annotatsiyasi" autocomplete="off">
                        </InputText>
                    </div>
                </div>



                <div class="flex space-x-2">
                    <div class="md:w-full">
                        <InputText id="additional" type="text" placeholder="Qo'shimcha ma'lumot" autocomplete="off">
                        </InputText>
                    </div>
                </div>

                <div class="flex space-x-2">
                    <div class="md:w-full">
                        <div class="flex items-center space-x-2">
                            <input id="is_deleted" type="checkbox" v-model="isDeleted"
                                class="form-checkbox h-5 w-5 text-blue-600" />
                            <label for="is_deleted" class="text-gray-700 dark:text-white">Hujjatni berkitish</label>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end mt-4">
                    <div class="card flex flex-col gap-4">
                        <div class="flex flex-wrap gap-2">
                            <Button label="Submit" @click="saveData">Saqlash</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Fluid>

</template>
