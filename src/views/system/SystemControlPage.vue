<script setup>
import { ref, onMounted } from "vue"
import { useToast } from "primevue/usetoast"
import InputSwitch from "primevue/inputswitch"
import Button from "primevue/button"
import apiService from "@/service/api.service"

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const requireZal = ref(false)

const load = async () => {
  loading.value = true
  try {
    const data = await apiService.get("/system/settings")
    requireZal.value = !!data.paymentRequireZalForServiceProvision
  } catch (e) {
    toast.add({ severity: "error", summary: "Xato", detail: e.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  try {
    await apiService.put("/system/settings", {
      paymentRequireZalForServiceProvision: requireZal.value,
    })
    toast.add({
      severity: "success",
      summary: "Saqlandi",
      detail: "Tizim sozlamalari yangilandi",
      life: 2500,
    })
  } catch (e) {
    toast.add({ severity: "error", summary: "Xato", detail: e.message, life: 3500 })
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="card max-w-3xl mx-auto">
    <h1 class="text-2xl font-semibold mb-2 text-color">Tizim boshqaruvi</h1>
    <p class="text-color-secondary text-sm mb-6">
      Barcha foydalanuvchilarga ta'sir qiladigan umumiy parametrlar.
    </p>

    <div v-if="loading" class="text-color-secondary">Yuklanmoqda...</div>

    <div v-else class="flex flex-col gap-6">
      <div
        class="flex flex-wrap items-center justify-between gap-4 p-4 border-round border-1 surface-border surface-ground"
      >
        <div>
          <div class="font-semibold text-color mb-1">Xizmat ko'rsatishda zal majburyati</div>
          <p class="text-sm text-color-secondary m-0 max-w-xl">
            Yoqilganda, "Xizmat ko'rsatish" sahifasida zal tanlanmaguncha rasmiylashtirish mumkin bo'lmaydi.
            O'chirilganda zal ixtiyoriy bo'lib qoladi.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <InputSwitch
            v-model="requireZal"
            :disabled="saving"
            input-id="require-zal-switch"
          />
          <label for="require-zal-switch" class="text-sm text-color cursor-pointer">
            {{ requireZal ? "Majburiy" : "Ixtiyoriy" }}
          </label>
        </div>
      </div>

      <div>
        <Button label="Saqlash" icon="pi pi-check" :loading="saving" :disabled="loading" @click="save" />
      </div>
    </div>
  </div>
</template>
