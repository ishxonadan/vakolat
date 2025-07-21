<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const products = ref([]);
const currentPage = ref(1);
const isLoading = ref(false);
const error = ref(null);

const fetchData = async (page = 1) => {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await axios.get(`/diss_list/${page}`);
    console.log('Fetched Data:', response.data.results);
    products.value = response.data.results;
  } catch (err) {
    error.value = 'Error fetching data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData(currentPage.value);
});

const onPageChange = (event) => {
  currentPage.value = event.page + 1;  // Convert from 0-based to 1-based index
  fetchData(currentPage.value);
};

</script>

<script>
export default {
    methods: {
        goToAddPage() {
            this.$router.push('/diss_add');
        },
        editButton(item_id){
          this.$router.push('/diss_edit/'+item_id);
        }
    }
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 shadow-md rounded-lg" style="margin-bottom: 20px;">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Dissertatsiyalar</h1>
      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all" @click="goToAddPage">
        Qo'shish
      </button>
    </div>
    <div v-if="isLoading" class="flex justify-center items-center p-4">
      <p>Ma'lumotlar yuklanvotti...</p>
    </div>
    <div v-if="error" class="flex justify-center items-center p-4">
      <p>{{ error }}</p>
    </div>
    <DataTable v-if="!isLoading && !error" :value="products" :rows="30" :paginator="true" :page="currentPage - 1" responsiveLayout="scroll">
      <Column field="title" header="Nomi" :sortable="true" style="width: 40%">
        <template #body="slotProps">
          <span :class="{'text-red-600': slotProps.data.is_deleted === 1}">
            {{ slotProps.data.title }}
          </span>
        </template>
      </Column>
      <Column field="author" header="Muallifi" :sortable="true" style="width: 30%"></Column>
      <Column field="code" header="Shifri" :sortable="true" style="width: 20%"></Column>
      <Column style="width: 10%" header="O'zgartirish">
        <template #body="slotProps">
          <Button icon="pi pi-pencil" type="button" class="p-button-text" @click="editButton(slotProps.data.uuid)"></Button>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
