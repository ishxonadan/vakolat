<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useToast } from "primevue/usetoast"
import Textarea from "primevue/textarea"
import authService from "@/service/auth.service"
import apiService from "@/service/api.service"

const toast = useToast()
const route = useRoute()
const CUSTOM_PRICED_SERVICE_ID = "__custom_price__"
const loading = ref(false)
const saving = ref(false)
const cancellingId = ref(null)
const userNoSearch = ref("")
const services = ref([])
const departments = ref([])
const provisions = ref([])
const account = ref(null)
const member = ref(null)

const canCancel = authService.hasPermission("payment_cancel_provided_service")
const isRais = authService.getUserLevel() === "rais"
const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000
/** Yangi qator: orange fon → asta-sekin oddiy (CSS bilan bir xil) */
const PROVISION_NEW_ROW_HIGHLIGHT_S = 4
const highlightProvisionId = ref(null)
let highlightProvisionTimer = null
const nowTs = ref(Date.now())
let timerId = null

const normalizeUserNoInput = (value) => {
  const raw = String(value || "").trim().toUpperCase()
  if (/^\d{9}$/.test(raw)) return `AAA${raw}`
  if (/^AAA\d{9}$/.test(raw)) return raw
  return raw
}

const form = ref({
  userNo: "",
  comment: "",
  departmentId: null,
  items: [{ serviceId: null, quantity: 1, customPrice: null }],
})

const customPricedServiceOption = {
  _id: CUSTOM_PRICED_SERVICE_ID,
  name: "O'zingiz narx qo'ying",
  isCustom: true,
}
const serviceOptions = computed(() => [customPricedServiceOption, ...services.value])
const isCustomService = (item) => String(item?.serviceId || "") === CUSTOM_PRICED_SERVICE_ID

const addItem = () => form.value.items.push({ serviceId: null, quantity: 1, customPrice: null })
const removeItem = (idx) => {
  form.value.items.splice(idx, 1)
  if (form.value.items.length === 0) addItem()
}

const serviceById = (id) => services.value.find((s) => s._id === id)
const serviceOptionLabel = (serviceId) => {
  if (String(serviceId || "") === CUSTOM_PRICED_SERVICE_ID) return customPricedServiceOption.name
  return serviceById(serviceId)?.name || ""
}
const formatMoney = (value) => `${Math.trunc(Number(value || 0)).toLocaleString("uz-UZ")} so'm`
const itemCost = (item) => {
  if (isCustomService(item)) {
    return (Number(item.customPrice || 0) || 0) * (Number(item.quantity || 0) || 0)
  }
  const svc = serviceById(item.serviceId)
  return (Number(svc?.price || 0) || 0) * (Number(item.quantity || 0) || 0)
}
const totalCost = computed(() => form.value.items.reduce((sum, item) => sum + itemCost(item), 0))
const hasSelectedUser = computed(() => String(form.value.userNo || "").trim().length > 0)
const currentBalance = computed(() => Number(account.value?.balance || 0))
const remainingBalance = computed(() => currentBalance.value - totalCost.value)
const hasEnoughBalance = computed(() => remainingBalance.value >= 0)
/** Only after a user is chosen and loaded; avoids treating "no user" as balance 0 */
const hasPositiveBalance = computed(() => hasSelectedUser.value && currentBalance.value > 0)

/** Tizim boshqaruvidan: zal tanlash majburiy bo'lsa, server va klient tekshiradi */
const requireZalForProvision = ref(false)
const zalOk = computed(() => !requireZalForProvision.value || !!form.value.departmentId)

/** Tugma shartlari bajarilganda (bir marta) “arrive” animatsiyasi */
const isProvisionSubmitReady = computed(
  () =>
    !!String(form.value.userNo || "").trim() &&
    hasPositiveBalance.value &&
    hasEnoughBalance.value &&
    totalCost.value > 0 &&
    zalOk.value,
)
/** Tugma “arrive” animatsiya davomiyligi (CSS bilan bir xil saqlansin) */
const PROVISION_SUBMIT_ARRIVE_S = 1.8

const provisionSubmitArrive = ref(false)
let provisionSubmitArriveTimer = null

const triggerProvisionSubmitArrive = () => {
  provisionSubmitArrive.value = false
  nextTick(() => {
    requestAnimationFrame(() => {
      provisionSubmitArrive.value = true
      if (provisionSubmitArriveTimer) clearTimeout(provisionSubmitArriveTimer)
      provisionSubmitArriveTimer = setTimeout(() => {
        provisionSubmitArrive.value = false
        provisionSubmitArriveTimer = null
      }, PROVISION_SUBMIT_ARRIVE_S * 1000 + 150)
    })
  })
}

watch(
  isProvisionSubmitReady,
  (ready, wasReady) => {
    if (ready && !wasReady) triggerProvisionSubmitArrive()
  },
  { flush: "post" },
)
const zalPlaceholder = computed(() =>
  requireZalForProvision.value ? "Zalni tanlang (majburiy)" : "Zalni tanlang (ixtiyoriy)",
)
const getCancelDeadline = (row) => new Date(row.createdAt).getTime() + CANCEL_WINDOW_MS
const canCancelRow = (row) => {
  if (isRais) return true
  return nowTs.value <= getCancelDeadline(row)
}
const formatCountdown = (row) => {
  const diff = getCancelDeadline(row) - nowTs.value
  if (diff <= 0) return "Muddat tugagan"
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours} soat ${minutes} daqiqa`
}
const cancelButtonLabel = (row) => {
  if (isRais) return "Bekor qilish"
  return `Bekor qilish (${formatCountdown(row)})`
}

const provisionTableRowClass = (data) => {
  const id = data?._id != null ? String(data._id) : ""
  if (highlightProvisionId.value && id === highlightProvisionId.value) {
    return "provision-new-row"
  }
  return null
}

/** Populated User from API (providedBy / cancelledBy) */
const staffDisplay = (user) => {
  if (!user) return "—"
  const name = [user.firstname, user.lastname].filter(Boolean).join(" ").trim()
  if (name) return name
  if (user.nickname) return user.nickname
  return "—"
}

const departmentDisplay = (row) => {
  const d = row?.departmentId
  if (!d) return "—"
  if (typeof d === "object" && d.name) return d.name
  return "—"
}

const loadServices = async () => {
  services.value = await apiService.get("/members/payment/services")
  services.value = services.value.filter((s) => s.isActive !== false)
}

const loadDepartments = async () => {
  departments.value = await apiService.get("/members/payment/departments")
}

const loadSystemSettings = async () => {
  try {
    const data = await apiService.get("/system/settings")
    requireZalForProvision.value = !!data.paymentRequireZalForServiceProvision
  } catch {
    requireZalForProvision.value = false
  }
}

const loadUser = async () => {
  const userNo = String(form.value.userNo || "").trim()
  if (!userNo) {
    account.value = null
    member.value = null
    return
  }
  const data = await apiService.get(`/members/payment/accounts/${encodeURIComponent(userNo)}`)
  account.value = data.account || { userNo, balance: 0 }
  member.value = data.member || null
}

const loadProvisions = async () => {
  const userNo = String(form.value.userNo || "").trim()
  if (!userNo) {
    provisions.value = []
    return
  }
  const data = await apiService.get("/members/payment/service-provisions", { params: { userNo, limit: 100 } })
  provisions.value = data.items || []
}

const searchUser = async () => {
  try {
    loading.value = true
    form.value.userNo = normalizeUserNoInput(userNoSearch.value)
    userNoSearch.value = form.value.userNo
    await Promise.all([loadUser(), loadProvisions()])
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

const submitProvision = async () => {
  try {
    saving.value = true
    const userNo = String(form.value.userNo || "").trim()
    if (!userNo) {
      toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "ID karta raqami kiriting", life: 2500 })
      return
    }

    const items = form.value.items
      .map((i) => ({
        serviceId: i.serviceId,
        quantity: Number(i.quantity || 0),
        customPrice: isCustomService(i) ? Number(i.customPrice || 0) : undefined,
      }))
      .filter((i) => i.serviceId && i.quantity > 0)
    if (items.length === 0) {
      toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "Kamida bitta xizmat tanlang", life: 2500 })
      return
    }
    if (items.some((i) => i.serviceId === CUSTOM_PRICED_SERVICE_ID && !(Number(i.customPrice) > 0))) {
      toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "Maxsus xizmat uchun narxni kiriting", life: 2500 })
      return
    }

    if (!zalOk.value) {
      toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "Zalni tanlang", life: 2500 })
      return
    }

    const response = await apiService.post("/members/payment/service-provisions", {
      userNo,
      comment: form.value.comment,
      items,
      departmentId: form.value.departmentId || null,
    })
    const newProvisionId =
      response?.provision?._id != null ? String(response.provision._id) : null
    toast.add({ severity: "success", summary: "Muvaffaqiyat", detail: "Xizmat ko'rsatildi", life: 2500 })
    form.value.comment = ""
    form.value.items = [{ serviceId: null, quantity: 1, customPrice: null }]
    account.value = { ...(account.value || {}), balance: response.balance }
    await loadProvisions()
    if (newProvisionId) {
      highlightProvisionId.value = newProvisionId
      if (highlightProvisionTimer) clearTimeout(highlightProvisionTimer)
      highlightProvisionTimer = setTimeout(() => {
        highlightProvisionId.value = null
        highlightProvisionTimer = null
      }, PROVISION_NEW_ROW_HIGHLIGHT_S * 1000 + 200)
    }
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3500 })
  } finally {
    saving.value = false
  }
}

const cancelProvision = async (row) => {
  try {
    cancellingId.value = row._id
    await apiService.post(`/members/payment/service-provisions/${row._id}/cancel`, {
      reason: "Xodim tomonidan bekor qilindi",
    })
    toast.add({ severity: "success", summary: "Muvaffaqiyat", detail: "Xizmat bekor qilindi", life: 2500 })
    await Promise.all([loadUser(), loadProvisions()])
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3500 })
  } finally {
    cancellingId.value = null
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadServices(), loadDepartments(), loadSystemSettings()])
    const presetUserNo = normalizeUserNoInput(route.query.userNo)
    if (presetUserNo) {
      userNoSearch.value = presetUserNo
      await searchUser()
    }
  } catch (error) {
    toast.add({ severity: "error", summary: "Xato", detail: error.message, life: 3000 })
  }
  timerId = setInterval(() => {
    nowTs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
  if (provisionSubmitArriveTimer) clearTimeout(provisionSubmitArriveTimer)
  if (highlightProvisionTimer) clearTimeout(highlightProvisionTimer)
})
</script>

<template>
  <div class="card payment-provision-page">
    <h1 class="text-xl font-semibold mb-4 text-color">Xizmat ko'rsatish</h1>

    <div class="provision-toolbar-row flex flex-col md:flex-row md:flex-nowrap md:items-end gap-4 mb-4 max-w-5xl">
      <div class="flex flex-col gap-2 w-full md:flex-1 md:min-w-0 md:max-w-[22rem]">
        <label for="provision-zal" class="text-sm font-medium text-color leading-tight">Zal</label>
        <Dropdown
          id="provision-zal"
          v-model="form.departmentId"
          :options="departments"
          optionLabel="name"
          optionValue="_id"
          :placeholder="zalPlaceholder"
          class="provision-zal-dropdown w-full"
          :class="{ 'p-invalid': requireZalForProvision && hasSelectedUser && !form.departmentId }"
          :panel-style="{ minWidth: 'min(22rem, 90vw)' }"
        />
      </div>
      <div class="flex flex-col gap-2 w-full md:flex-1 md:min-w-0">
        <label for="provision-user-no" class="text-sm font-medium text-color leading-tight">ID karta raqami</label>
        <InputText
          id="provision-user-no"
          v-model="userNoSearch"
          name="vakolat-service-provision-user-no"
          placeholder="Masalan: AAA200300951"
          class="w-full"
          autocomplete="off"
          autocapitalize="characters"
          autocorrect="off"
          spellcheck="false"
          data-lpignore="true"
          data-1p-ignore
          @blur="userNoSearch = normalizeUserNoInput(userNoSearch)"
          @keyup.enter="searchUser"
        />
      </div>
      <div class="flex flex-col gap-2 w-full md:w-auto md:flex-shrink-0 md:min-w-[12rem]">
        <span class="text-sm font-medium text-color-secondary leading-tight min-h-[1.25rem] md:block hidden">Qidiruv</span>
        <Button
          label="Foydalanuvchini tanlash"
          icon="pi pi-search"
          class="provision-toolbar-btn provision-user-pick-btn w-full md:w-auto whitespace-nowrap"
          :loading="loading"
          @click="searchUser"
        />
      </div>
    </div>

    <div v-if="form.userNo" class="mb-4 text-sm text-color border-round border-1 surface-border surface-50 p-3 max-w-3xl">
      <div><span class="text-color-secondary font-medium">ID karta raqami:</span> {{ form.userNo }}</div>
      <div class="mt-1"><span class="text-color-secondary font-medium">Foydalanuvchi:</span> {{ member?.USER_NAME || "-" }}</div>
    </div>

    <div v-if="hasSelectedUser" class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 max-w-4xl">
      <div class="border-round border-1 surface-border p-3">
        <div class="text-color-secondary text-sm mb-1">Joriy balans</div>
        <div class="text-3xl font-bold text-color">{{ formatMoney(currentBalance) }}</div>
      </div>
      <div class="border-round border-1 p-3" :class="hasEnoughBalance ? 'border-green-300 surface-50' : 'border-red-300 surface-50'">
        <div class="text-color-secondary text-sm mb-1">Xizmatdan keyingi balans</div>
        <div class="text-3xl font-bold" :class="hasEnoughBalance ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">
          {{ formatMoney(remainingBalance) }}
        </div>
      </div>
    </div>

    <Message
      v-if="hasSelectedUser && !hasEnoughBalance && totalCost > 0"
      severity="error"
      :closable="false"
      class="mb-4"
    >
      Balans yetarli emas. Xizmatni rasmiylashtirish uchun qo'shimcha mablag' kerak.
    </Message>

    <div class="mb-4 surface-50 border-round border-1 surface-border p-3 md:p-4 provision-services-block">
      <h2 class="text-lg font-semibold mb-3 text-color">Xizmatlar</h2>
      <div
        class="hidden md:grid grid-cols-[minmax(0,2fr)_7rem_9.5rem_10.5rem_auto] gap-x-3 gap-y-1 text-xs font-semibold text-color-secondary uppercase tracking-wide mb-3 px-1 border-b border-surface-200 dark:border-[var(--p-content-border-color)] pb-2"
      >
        <div>Xizmat</div>
        <div class="text-center">Soni</div>
        <div class="text-right">Birlik narxi</div>
        <div class="text-right">Jami</div>
        <div class="w-12 shrink-0" aria-hidden="true" />
      </div>
      <div
        v-for="(item, idx) in form.items"
        :key="idx"
        class="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_7rem_9.5rem_10.5rem_auto] gap-x-3 gap-y-2 md:gap-y-0 md:items-center mb-4 md:mb-3 pb-4 md:pb-0 border-b border-surface-200 dark:border-[var(--p-content-border-color)] md:border-0 last:border-0 last:pb-0 last:mb-3"
      >
        <Dropdown
          v-model="item.serviceId"
          :options="serviceOptions"
          optionLabel="name"
          optionValue="_id"
          placeholder="Xizmat tanlang"
          class="w-full"
          :disabled="!hasPositiveBalance"
          @change="isCustomService(item) ? null : (item.customPrice = null)"
        >
          <template #option="slotProps">
            <div class="flex items-center justify-between gap-2 w-full">
              <span>{{ slotProps.option.name }}</span>
              <Tag
                v-if="slotProps.option.isCustom"
                value="Maxsus"
                severity="warning"
                class="custom-service-option-tag"
              />
            </div>
          </template>
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex items-center gap-2">
              <span>{{ serviceOptionLabel(slotProps.value) }}</span>
              <Tag
                v-if="String(slotProps.value || '') === CUSTOM_PRICED_SERVICE_ID"
                value="Maxsus"
                severity="warning"
                class="custom-service-option-tag"
              />
            </div>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
        </Dropdown>
        <div class="flex md:contents flex-col gap-1">
          <span class="text-xs font-medium text-color-secondary md:hidden">Soni</span>
          <InputNumber
            v-model="item.quantity"
            :min="1"
            :useGrouping="false"
            placeholder="1"
            class="provision-qty-input w-full md:w-full md:max-w-[7rem]"
            :disabled="!hasPositiveBalance"
            @input="(event) => (item.quantity = Number(event.value || 0))"
          />
        </div>
        <div class="flex md:flex-col md:items-end justify-between md:justify-center gap-1">
          <span class="text-xs font-medium text-color-secondary md:hidden">Birlik narxi</span>
          <template v-if="isCustomService(item)">
            <InputNumber
              v-model="item.customPrice"
              :min="1"
              :useGrouping="false"
              placeholder="Narx kiriting"
              class="provision-custom-price-input w-full md:w-full"
              :disabled="!hasPositiveBalance"
            />
          </template>
          <span
            v-else
            class="tabular-nums text-sm text-color-secondary font-medium md:text-right md:w-full provision-unit-price"
          >{{ formatMoney(serviceById(item.serviceId)?.price || 0) }}</span>
        </div>
        <div class="flex md:flex-col md:items-end justify-between md:justify-center gap-2">
          <span class="text-xs font-medium text-color-secondary md:hidden">Jami</span>
          <span
            class="tabular-nums text-base font-semibold text-color md:text-right md:w-full leading-none"
          >{{ formatMoney(itemCost(item)) }}</span>
        </div>
        <div class="flex justify-end md:justify-center items-center pt-1 md:pt-0">
          <Button
            v-tooltip.top="'Qatorni olib tashlash'"
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            :disabled="!hasPositiveBalance"
            @click="removeItem(idx)"
          />
        </div>
      </div>
      <div
        class="provision-add-service-row mt-2 md:mt-3 pt-4 border-t border-dashed border-surface-300 dark:border-surface-600"
      >
        <Button
          label="Yana xizmat qo'shish"
          icon="pi pi-plus-circle"
          severity="secondary"
          outlined
          class="provision-add-service-btn"
          :disabled="!hasPositiveBalance"
          @click="addItem"
        />
      </div>
    </div>

    <div class="mb-4 max-w-5xl">
      <label for="provision-comment" class="block text-sm font-medium text-color mb-2">Izoh</label>
      <Textarea
        id="provision-comment"
        v-model="form.comment"
        class="w-full provision-comment-field"
        placeholder="Ixtiyoriy izoh…"
        :rows="4"
        :auto-resize="true"
      />
    </div>

    <Message
      v-if="requireZalForProvision && hasSelectedUser && !form.departmentId"
      severity="warn"
      :closable="false"
      class="mb-4"
    >
      Tizim sozlamalariga ko'ra zal tanlash majburiy.
    </Message>

    <Message v-if="hasSelectedUser && !hasPositiveBalance" severity="warn" :closable="false" class="mb-4">
      Balans 0 so'm. Xizmat tanlash uchun avval foydalanuvchi balansini to'ldiring.
    </Message>

    <div
      class="provision-cta-bar flex flex-wrap justify-between items-center gap-4 mb-6 rounded-2xl border-1 surface-border surface-ground p-4 md:p-5"
    >
      <div>
        <div class="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400 mb-1">
          Yakuniy qadam
        </div>
        <div class="text-lg md:text-xl font-medium text-color">
          <span class="text-color-secondary font-normal">Jami:</span>
          {{ formatMoney(totalCost) }}
        </div>
      </div>
      <Button
        label="Xizmatni rasmiylashtirish"
        icon="pi pi-check-circle"
        severity="success"
        size="large"
        class="provision-submit-btn"
        :class="{ 'provision-submit-btn--arrive': provisionSubmitArrive }"
        :style="
          provisionSubmitArrive ? { '--provision-submit-arrive-duration': `${PROVISION_SUBMIT_ARRIVE_S}s` } : {}
        "
        :disabled="!form.userNo || !hasPositiveBalance || !hasEnoughBalance || totalCost <= 0 || !zalOk"
        :loading="saving"
        @click="submitProvision"
      />
    </div>

    <h2 class="text-lg font-semibold mb-3 text-color">Ko'rsatilgan xizmatlar</h2>
    <DataTable
      :value="provisions"
      responsiveLayout="scroll"
      class="payment-provisions-table"
      :class="{ 'payment-provisions-table--highlighting': highlightProvisionId != null }"
      :rowClass="provisionTableRowClass"
    >
      <Column field="createdAt" header="Sana">
        <template #body="slotProps">{{ new Date(slotProps.data.createdAt).toLocaleString() }}</template>
      </Column>
      <Column header="Xodim">
        <template #body="slotProps">
          <span class="text-sm">{{ staffDisplay(slotProps.data.providedBy) }}</span>
        </template>
      </Column>
      <Column header="Zal">
        <template #body="slotProps">
          <span class="text-sm">{{ departmentDisplay(slotProps.data) }}</span>
        </template>
      </Column>
      <Column field="totalAmount" header="Jami summa">
        <template #body="slotProps">
          {{ formatMoney(slotProps.data.totalAmount) }}
        </template>
      </Column>
      <Column field="status" header="Holat">
        <template #body="slotProps">
          <div class="flex flex-column gap-1">
            <Tag
              :value="slotProps.data.status === 'cancelled' ? 'Bekor qilingan' : 'Bajarildi'"
              :severity="slotProps.data.status === 'cancelled' ? 'danger' : 'success'"
            />
            <span v-if="slotProps.data.status === 'cancelled'" class="text-500 text-xs">
              Bekor qildi: {{ staffDisplay(slotProps.data.cancelledBy) }}
            </span>
          </div>
        </template>
      </Column>
      <Column header="Xizmatlar">
        <template #body="slotProps">
          <div v-for="item in slotProps.data.items" :key="item._id || item.serviceId" class="text-sm">
            {{ item.serviceName }} x {{ item.quantity }} = {{ formatMoney(item.totalPrice) }}
          </div>
        </template>
      </Column>
      <Column field="comment" header="Izoh" />
      <Column header="Amallar">
        <template #body="slotProps">
          <Button
            v-if="canCancel && slotProps.data.status !== 'cancelled' && canCancelRow(slotProps.data)"
            :label="cancelButtonLabel(slotProps.data)"
            icon="pi pi-undo"
            severity="danger"
            size="small"
            :loading="cancellingId === slotProps.data._id"
            @click="cancelProvision(slotProps.data)"
          />
          <span v-else-if="canCancel && slotProps.data.status !== 'cancelled'" class="text-500 text-sm">
            Bekor qilish muddati tugagan
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
/* Yuqori qator: maydonlar va tugma bir xil balandlik, md+ pastki chiziq tekis */
.provision-toolbar-row :deep(.p-inputtext) {
  min-height: 2.75rem;
  box-sizing: border-box;
}

.provision-toolbar-row :deep(.p-select) {
  min-height: 2.75rem;
  box-sizing: border-box;
}

.provision-toolbar-row :deep(.provision-toolbar-btn.p-button) {
  min-height: 2.75rem;
  box-sizing: border-box;
}

/* Foydalanuvchini tanlash: indigo — asosiy tugma va yashil rasmiylashtirishdan alohida */
.provision-toolbar-row :deep(.provision-user-pick-btn.p-button:not(:disabled)) {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, #6366f1, #fff 14%) 0%,
    #4f46e5 46%,
    color-mix(in srgb, #4338ca, #000 8%) 100%
  );
  border-color: #4338ca;
  color: #fff;
}

.provision-toolbar-row :deep(.provision-user-pick-btn.p-button:not(:disabled):hover) {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, #818cf8, #fff 10%) 0%,
    #6366f1 50%,
    color-mix(in srgb, #4f46e5, #000 6%) 100%
  );
  border-color: #4f46e5;
  color: #fff;
  filter: brightness(1.03);
}

.provision-toolbar-row :deep(.provision-user-pick-btn.p-button:focus-visible) {
  box-shadow: 0 0 0 3px color-mix(in srgb, #6366f1, transparent 55%);
}

.app-dark .provision-toolbar-row :deep(.provision-user-pick-btn.p-button:not(:disabled)) {
  background: linear-gradient(180deg, #6366f1 0%, #4338ca 100%);
  border-color: #818cf8;
}

.app-dark .provision-toolbar-row :deep(.provision-user-pick-btn.p-button:not(:disabled):hover) {
  background: linear-gradient(180deg, #818cf8 0%, #6366f1 100%);
  border-color: #a5b4fc;
}

/* Zal: trigger to‘liq kenglik; panel alohida */
:deep(.provision-zal-dropdown.p-select),
:deep(.provision-zal-dropdown) {
  max-width: 100%;
  width: 100%;
}

.provision-comment-field {
  min-height: 6.5rem;
  line-height: 1.5;
}

.provision-services-block :deep(.provision-qty-input input),
.provision-services-block :deep(.provision-qty-input .p-inputnumber-input) {
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.provision-services-block :deep(.provision-custom-price-input input),
.provision-services-block :deep(.provision-custom-price-input .p-inputnumber-input) {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

:deep(.custom-service-option-tag.p-tag) {
  font-size: 0.72rem;
  padding: 0.12rem 0.4rem;
}

.provision-add-service-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.provision-services-block :deep(.provision-add-service-btn.p-button) {
  font-weight: 600;
  font-size: 0.9375rem;
  letter-spacing: 0.01em;
  padding: 0.65rem 1.2rem;
  border-radius: var(--p-border-radius-lg, 0.75rem);
  gap: 0.5rem;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.provision-services-block :deep(.provision-add-service-btn.p-button:not(:disabled):hover) {
  background: color-mix(in srgb, var(--p-primary-color), transparent 92%) !important;
  border-color: color-mix(in srgb, var(--p-primary-color), var(--p-content-border-color) 35%) !important;
  color: var(--p-primary-color) !important;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--p-primary-color), transparent 88%);
}

.app-dark .provision-services-block :deep(.provision-add-service-btn.p-button:not(:disabled):hover) {
  background: color-mix(in srgb, var(--p-primary-color), transparent 88%) !important;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--p-primary-color), transparent 70%);
}

.provision-cta-bar {
  border-left: 4px solid var(--p-green-500, #22c55e);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--p-green-500, #22c55e), transparent 85%),
    0 8px 28px color-mix(in srgb, var(--surface-ground, #f8fafc), #000 8%);
}

.app-dark .provision-cta-bar {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--p-green-400, #4ade80), transparent 75%),
    0 12px 40px color-mix(in srgb, #000, transparent 55%);
}

/* Tugma ichidagi “shine” — afzallik bilan ko‘rinadi */
@keyframes provision-submit-inner-shine {
  0% {
    transform: translateX(-140%) skewX(-22deg);
    opacity: 0;
  }
  8% {
    opacity: 0.95;
  }
  42% {
    transform: translateX(200%) skewX(-22deg);
    opacity: 0.95;
  }
  50% {
    opacity: 0;
  }
  100% {
    transform: translateX(200%) skewX(-22deg);
    opacity: 0;
  }
}

@keyframes provision-submit-inner-glow {
  0%,
  100% {
    box-shadow:
      0 4px 0 color-mix(in srgb, var(--p-green-700, #15803d), transparent 35%),
      0 10px 28px color-mix(in srgb, var(--p-green-500, #22c55e), transparent 45%),
      inset 0 0 0 0 rgba(255, 255, 255, 0);
  }
  22% {
    box-shadow:
      0 4px 0 color-mix(in srgb, var(--p-green-700, #15803d), transparent 30%),
      0 10px 32px color-mix(in srgb, var(--p-green-400, #4ade80), transparent 35%),
      inset 0 0 22px rgba(255, 255, 255, 0.22);
  }
  55% {
    box-shadow:
      0 4px 0 color-mix(in srgb, var(--p-green-700, #15803d), transparent 34%),
      0 14px 36px rgba(34, 197, 94, 0.35),
      inset 0 0 12px rgba(255, 255, 255, 0.1);
  }
}

@keyframes provision-submit-inner-glow-dark {
  0%,
  100% {
    box-shadow:
      0 3px 0 color-mix(in srgb, #000, transparent 40%),
      0 8px 32px color-mix(in srgb, var(--p-green-400, #4ade80), transparent 55%),
      inset 0 0 0 0 rgba(255, 255, 255, 0);
  }
  25% {
    box-shadow:
      0 3px 0 color-mix(in srgb, #000, transparent 35%),
      0 12px 40px color-mix(in srgb, var(--p-green-400, #4ade80), transparent 45%),
      inset 0 0 24px rgba(255, 255, 255, 0.14);
  }
  55% {
    box-shadow:
      0 3px 0 color-mix(in srgb, #000, transparent 38%),
      0 14px 38px rgba(74, 222, 128, 0.28),
      inset 0 0 14px rgba(255, 255, 255, 0.08);
  }
}

:deep(.provision-submit-btn.p-button) {
  min-width: min(100%, 20rem);
  padding: 0.9rem 2.35rem !important;
  font-size: 1.0625rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.03em;
  transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
}

:deep(.provision-submit-btn.p-button:not(:disabled)) {
  color: #fff;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--p-green-500, #22c55e), #fff 8%) 0%,
    var(--p-green-500, #22c55e) 45%,
    color-mix(in srgb, var(--p-green-500, #22c55e), #000 12%) 100%
  );
  border-color: color-mix(in srgb, var(--p-green-600, #16a34a), #000 5%);
  box-shadow:
    0 4px 0 color-mix(in srgb, var(--p-green-700, #15803d), transparent 35%),
    0 10px 28px color-mix(in srgb, var(--p-green-500, #22c55e), transparent 45%);
}

:deep(.provision-submit-btn.p-button:not(:disabled) .p-button-label),
:deep(.provision-submit-btn.p-button:not(:disabled) .p-button-icon),
:deep(.provision-submit-btn.p-button:not(:disabled) .p-button-loading-icon) {
  position: relative;
  z-index: 2;
}

:deep(.provision-submit-btn.p-button:not(:disabled).provision-submit-btn--arrive)::before {
  content: "";
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: 0;
  width: 50%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.45) 44%,
    rgba(255, 255, 255, 0.14) 54%,
    transparent 100%
  );
  animation: provision-submit-inner-shine var(--provision-submit-arrive-duration, 1.8s) ease-in-out both;
}

:deep(.provision-submit-btn.p-button:not(:disabled):hover) {
  filter: brightness(1.06);
  box-shadow:
    0 4px 0 color-mix(in srgb, var(--p-green-700, #15803d), transparent 30%),
    0 12px 32px color-mix(in srgb, var(--p-green-500, #22c55e), transparent 40%);
}

:deep(.provision-submit-btn.p-button:not(:disabled).provision-submit-btn--arrive) {
  animation: provision-submit-inner-glow var(--provision-submit-arrive-duration, 1.8s) ease-in-out both;
}

.app-dark :deep(.provision-submit-btn.p-button:not(:disabled).provision-submit-btn--arrive)::before {
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.58) 42%,
    rgba(255, 255, 255, 0.2) 56%,
    transparent 100%
  );
}

.app-dark :deep(.provision-submit-btn.p-button:not(:disabled).provision-submit-btn--arrive) {
  animation: provision-submit-inner-glow-dark var(--provision-submit-arrive-duration, 1.8s) ease-in-out both;
}

.app-dark :deep(.provision-submit-btn.p-button:not(:disabled)) {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--p-green-500, #22c55e), #fff 12%) 0%,
    var(--p-green-600, #16a34a) 100%
  );
  border-color: color-mix(in srgb, var(--p-green-500, #22c55e), #000 8%);
  box-shadow:
    0 3px 0 color-mix(in srgb, #000, transparent 40%),
    0 8px 32px color-mix(in srgb, var(--p-green-400, #4ade80), transparent 55%);
}

.app-dark :deep(.provision-submit-btn.p-button:not(:disabled):hover) {
  filter: brightness(1.06);
  box-shadow:
    0 3px 0 color-mix(in srgb, #000, transparent 40%),
    0 12px 32px color-mix(in srgb, var(--p-green-400, #4ade80), transparent 40%);
}

:deep(.provision-submit-btn.p-button:disabled) {
  opacity: 0.55;
  box-shadow: none;
}

/* Yangi ko'rsatilgan xizmat qatori: orange → asta normal */
@keyframes provision-new-row-highlight {
  0% {
    background-color: color-mix(in srgb, var(--p-orange-500, #f97316) 44%, transparent);
  }
  35% {
    background-color: color-mix(in srgb, var(--p-orange-500, #f97316) 22%, transparent);
  }
  100% {
    background-color: transparent;
  }
}

@keyframes provision-new-row-highlight-dark {
  0% {
    background-color: color-mix(in srgb, var(--p-orange-400, #fb923c) 38%, transparent);
  }
  40% {
    background-color: color-mix(in srgb, var(--p-orange-400, #fb923c) 14%, transparent);
  }
  100% {
    background-color: transparent;
  }
}

:deep(.payment-provisions-table .p-datatable-tbody > tr.provision-new-row > td) {
  animation: provision-new-row-highlight 4s ease-out forwards;
}

.app-dark :deep(.payment-provisions-table .p-datatable-tbody > tr.provision-new-row > td) {
  animation: provision-new-row-highlight-dark 4s ease-out forwards;
}
</style>
