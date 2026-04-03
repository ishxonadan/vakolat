<script setup>
import { ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import TabView from "primevue/tabview"
import TabPanel from "primevue/tabpanel"
import SettingsPassword from "./SettingsPassword.vue"
import SettingsPagination from "./SettingsPagination.vue"

const route = useRoute()
const router = useRouter()

const activeIndex = ref(0)

watch(
  () => [route.path, route.query.tab],
  () => {
    activeIndex.value = route.query.tab === "pagination" ? 1 : 0
  },
  { immediate: true },
)

const onTabChange = (event) => {
  const idx = event.index
  if (idx === 1) {
    router.replace({ path: "/settings", query: { tab: "pagination" } })
  } else {
    router.replace({ path: "/settings", query: {} })
  }
}
</script>

<template>
  <div class="card max-w-4xl mx-auto">
    <h1 class="text-2xl font-semibold mb-2 text-color">Sozlamalar</h1>
    <p class="text-color-secondary text-sm mb-4">Hisob va interfeys sozlamalari.</p>

    <TabView v-model:activeIndex="activeIndex" @tab-change="onTabChange">
      <TabPanel header="Parol">
        <SettingsPassword />
      </TabPanel>
      <TabPanel header="Sahifalash">
        <SettingsPagination />
      </TabPanel>
    </TabView>
  </div>
</template>
