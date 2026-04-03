<script setup>
import { useToast } from "primevue/usetoast"
import {
  pageSize,
  ROWS_PER_PAGE_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from "@/service/pagination.service"

const toast = useToast()

const options = ROWS_PER_PAGE_OPTIONS.map((n) => ({ label: String(n), value: n }))

const save = () => {
  toast.add({
    severity: "success",
    summary: "Saqlangan",
    detail: "Sahifalash sozlamasi qo'llanildi. Barcha tegishli jadvallar yangi qiymatdan foydalanadi.",
    life: 4000,
  })
}
</script>

<template>
  <div>
    <h2 class="text-lg font-medium mb-2">Sahifalash</h2>
    <p class="text-sm text-600 mb-4 max-w-2xl">
      Bitta sahifada nechta qator ko‘rinishini belgilang. Bu sozliga jadvallar (tashriflar, chiptalar,
      balanslar, dissertatsiyalar, huquqlar va boshqalar) amal qiladi.
    </p>

    <div class="flex flex-col sm:flex-row gap-3 align-items-start sm:align-items-end max-w-md">
      <div class="flex flex-column gap-1 flex-1">
        <label for="pagination-size" class="text-sm font-medium">Har sahifada qatorlar</label>
        <Dropdown
          id="pagination-size"
          v-model="pageSize"
          :options="options"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          @change="save"
        />
      </div>
    </div>

    <p class="text-xs text-500 mt-3">
      Standart qiymat: {{ DEFAULT_PAGE_SIZE }}. Har bir jadvalning pastki qismidan ham boshqa o‘lchamni tanlash
      mumkin — u ham saqlanadi.
    </p>
  </div>
</template>
