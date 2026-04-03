<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"
import { useToast } from "primevue/usetoast"
import authService from "@/service/auth.service"
import apiService from "@/service/api.service"

const toast = useToast()
const route = useRoute()
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
  items: [{ serviceId: null, quantity: 1 }],
})

const addItem = () => form.value.items.push({ serviceId: null, quantity: 1 })
const removeItem = (idx) => {
  form.value.items.splice(idx, 1)
  if (form.value.items.length === 0) addItem()
}

const serviceById = (id) => services.value.find((s) => s._id === id)
const formatMoney = (value) => `${Math.trunc(Number(value || 0)).toLocaleString("uz-UZ")} so'm`
const itemCost = (item) => {
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
      .map((i) => ({ serviceId: i.serviceId, quantity: Number(i.quantity || 0) }))
      .filter((i) => i.serviceId && i.quantity > 0)
    if (items.length === 0) {
      toast.add({ severity: "warn", summary: "Ogohlantirish", detail: "Kamida bitta xizmat tanlang", life: 2500 })
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
    toast.add({ severity: "success", summary: "Muvaffaqiyat", detail: "Xizmat ko'rsatildi", life: 2500 })
    form.value.comment = ""
    form.value.items = [{ serviceId: null, quantity: 1 }]
    account.value = { ...(account.value || {}), balance: response.balance }
    await loadProvisions()
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
})
</script>

<template>
  <div class="card">
    <h1 class="text-xl font-semibold mb-4">Xizmat ko'rsatish</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
      <InputText
        v-model="userNoSearch"
        placeholder="ID karta raqami"
        @blur="userNoSearch = normalizeUserNoInput(userNoSearch)"
        @keyup.enter="searchUser"
      />
      <Button label="Foydalanuvchini tanlash" icon="pi pi-search" :loading="loading" @click="searchUser" />
    </div>

    <div v-if="form.userNo" class="mb-4 text-sm">
      <div><b>ID karta raqami:</b> {{ form.userNo }}</div>
      <div><b>Foydalanuvchi:</b> {{ member?.USER_NAME || "-" }}</div>
    </div>

    <div v-if="hasSelectedUser" class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <div class="border-round border-1 surface-border p-3">
        <div class="text-600 text-sm mb-1">Joriy balans</div>
        <div class="text-3xl font-bold text-900">{{ formatMoney(currentBalance) }}</div>
      </div>
      <div class="border-round border-1 p-3" :class="hasEnoughBalance ? 'border-green-300 surface-50' : 'border-red-300 surface-50'">
        <div class="text-600 text-sm mb-1">Xizmatdan keyingi balans</div>
        <div class="text-3xl font-bold" :class="hasEnoughBalance ? 'text-green-700' : 'text-red-700'">
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

    <div class="mb-4 surface-50 border-round p-3">
      <h2 class="text-lg font-semibold mb-2">Xizmatlar</h2>
      <div class="hidden md:grid grid-cols-6 gap-2 text-600 text-sm font-medium mb-2 px-1">
        <div class="col-span-3">Xizmat</div>
        <div>Soni</div>
        <div>Birlik narxi</div>
        <div>Jami</div>
      </div>
      <div v-for="(item, idx) in form.items" :key="idx" class="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
        <Dropdown
          v-model="item.serviceId"
          :options="services"
          optionLabel="name"
          optionValue="_id"
          placeholder="Xizmat tanlang"
          class="md:col-span-3"
          :disabled="!hasPositiveBalance"
        />
        <InputNumber
          v-model="item.quantity"
          :min="1"
          :useGrouping="false"
          placeholder="Soni"
          :disabled="!hasPositiveBalance"
          @input="(event) => (item.quantity = Number(event.value || 0))"
        />
        <div class="flex items-center text-sm text-700">
          {{ formatMoney(serviceById(item.serviceId)?.price || 0) }}
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium">{{ formatMoney(itemCost(item)) }}</span>
          <Button icon="pi pi-times" severity="danger" text :disabled="!hasPositiveBalance" @click="removeItem(idx)" />
        </div>
      </div>
      <Button label="Yana xizmat qo'shish" icon="pi pi-plus" text :disabled="!hasPositiveBalance" @click="addItem" />
    </div>

    <div class="mb-4">
      <h2 class="text-lg font-semibold mb-2">Zal</h2>
      <Dropdown
        v-model="form.departmentId"
        :options="departments"
        optionLabel="name"
        optionValue="_id"
        :placeholder="zalPlaceholder"
        class="w-full md:w-20rem"
        :class="{ 'p-invalid': requireZalForProvision && hasSelectedUser && !form.departmentId }"
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

    <div class="mb-4">
      <InputText v-model="form.comment" class="w-full" placeholder="Izoh" />
    </div>

    <div
      class="flex flex-wrap justify-between items-center gap-4 mb-6 p-4 border-round border-1 surface-border surface-ground"
    >
      <div class="text-lg md:text-xl font-medium text-color">
        <span class="text-color-secondary font-normal">Jami:</span>
        {{ formatMoney(totalCost) }}
      </div>
      <Button
        label="Xizmatni rasmiylashtirish"
        icon="pi pi-check-circle"
        severity="success"
        size="large"
        raised
        class="provision-submit-btn font-bold min-w-[18rem] !text-lg"
        :disabled="!form.userNo || !hasPositiveBalance || !hasEnoughBalance || totalCost <= 0 || !zalOk"
        :loading="saving"
        @click="submitProvision"
      />
    </div>

    <h2 class="text-lg font-semibold mb-2">Ko'rsatilgan xizmatlar</h2>
    <DataTable :value="provisions" responsiveLayout="scroll">
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
              :value="slotProps.data.status === 'cancelled' ? 'Bekor qilingan' : 'Faol'"
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
