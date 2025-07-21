<script setup>
import { ref, onMounted, computed } from 'vue';

const dropdownItems = ref([
    { name: 'Option 1', code: 'Option 1' },
    { name: 'Option 2', code: 'Option 2' },
    { name: 'Option 3', code: 'Option 3' }
]);

const dropdownItem = ref(null);
const personnelList = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10;
const totalPages = ref(0);

const fetchPersonnel = async () => {
    try {
        const response = await fetch('/users');
        const data = await response.json();
        personnelList.value = data;
        totalPages.value = Math.ceil(data.length / itemsPerPage);
    } catch (error) {
        console.error('Error fetching personnel:', error);
    }
};

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return personnelList.value.slice(start, start + itemsPerPage);
});

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};

const editItem = (item) => {
    console.log('Edit item:', item);
};

const downloadItem = async (item) => {
    // const response = await fetch('/download/'+item);
    //     const data = await response.json();
    // console.log('Download item:', item);
    window.location.href = '/download/dogovor/' + item;
    console.log('Redirecting to download item:', item);
};
const downloadItem2 = async (item) => {
    // const response = await fetch('/download/'+item);
    //     const data = await response.json();
    // console.log('Download item:', item);
    window.location.href = '/download/material/' + item;
    console.log('Redirecting to download item:', item);
};

const deleteItem = async (id) => {
    try {
        const response = await fetch(`/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
            personnelList.value = personnelList.value.filter(item => item._id !== id);
            totalPages.value = Math.ceil(personnelList.value.length / itemsPerPage);
        } else {
            console.error('Failed to delete item');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
};

onMounted(fetchPersonnel);
</script>

<script>
export default {
    methods: {
        goToAddPage() {
            this.$router.push('/add');
        }
    }
}
</script>

<template>
    <div class="flex flex-col p-6 bg-gray-50 dark:bg-zinc-900 min-h-screen">
        <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg">
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">"Vakolat" dasturiga xush kelibsiz</h1>
            <!-- <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all" @click="goToAddPage">Добавить</button> -->
        </div>

   


    </div>
</template>

<style scoped>
.layout-menu {
    list-style-type: none;
    padding: 0;
}
</style>
