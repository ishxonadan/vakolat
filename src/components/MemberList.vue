<template>
  <div class="member-registry card">
    <div class="member-registry-header">
      <div class="min-w-0">
        <h2 class="member-registry-title">{{ title }}</h2>
        <p class="member-registry-subtitle">
          {{ formattedTotal }} ta yozuv
        </p>
      </div>
      <div class="member-registry-actions">
        <Button
          type="button"
          label="Ustunlar"
          icon="pi pi-table"
          severity="secondary"
          class="member-action-btn"
          @click="toggleColumns"
        />
        <Button
          type="button"
          label="Excelga eksport"
          icon="pi pi-file-excel"
          severity="secondary"
          class="member-action-btn"
          :loading="exporting"
          @click="$emit('export-excel')"
        />
        <Button
          type="button"
          label="Yangilash"
          icon="pi pi-refresh"
          severity="secondary"
          class="member-action-btn"
          :loading="loading"
          @click="$emit('refresh')"
        />
        <Button
          v-if="showAddButton && canManageMembers"
          type="button"
          :label="addLabel"
          icon="pi pi-plus"
          class="member-action-btn member-action-btn-primary"
          @click="$emit('add-member')"
        />
      </div>
    </div>

    <Popover ref="columnsPopover" class="member-columns-popover">
      <div class="member-columns-panel">
        <div class="member-columns-panel-title">Ko'rinadigan ustunlar</div>
        <div
          v-for="column in allColumns"
          :key="column.field"
          class="member-columns-item"
        >
          <Checkbox
            v-model="visibleFields"
            :inputId="`member-col-${column.field}`"
            :value="column.field"
            :disabled="column.always"
            @change="persistVisibleFields"
          />
          <label :for="`member-col-${column.field}`">{{ column.header }}</label>
        </div>
      </div>
    </Popover>

    <div class="member-search">
      <label class="member-search-label" for="member-global-search">Qidiruv</label>
      <div class="member-search-shell" :class="{ 'is-filled': hasActiveQuery }">
        <i class="pi pi-search member-search-icon" aria-hidden="true" />
        <InputText
          id="member-global-search"
          :modelValue="searchQuery"
          class="member-search-input"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          @update:modelValue="onSearchInput"
          @keydown.enter="applySearchNow"
        />
        <button
          v-if="hasActiveQuery"
          type="button"
          class="member-search-clear"
          aria-label="Tozalash"
          @click="clearSearch"
        >
          <i class="pi pi-times" />
        </button>
      </div>
    </div>

    <DataTable
      v-model:selection="selectedRow"
      v-model:filters="columnFilterState"
      :value="members"
      :loading="loading"
      :lazy="true"
      :paginator="true"
      :rows="rowsPerPage"
      :first="first"
      :totalRecords="totalRecords"
      :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS"
      dataKey="USER_NO"
      selectionMode="single"
      :metaKeySelection="false"
      :rowHover="true"
      filterDisplay="menu"
      sortMode="single"
      :sortField="sortField"
      :sortOrder="sortOrder"
      removableSort
      resizableColumns
      columnResizeMode="expand"
      responsiveLayout="scroll"
      paginatorTemplate="RowsPerPageDropdown CurrentPageReport PrevPageLink PageLinks NextPageLink"
      currentPageReportTemplate="{first}–{last} / {totalRecords}"
      tableStyle="min-width: 72rem"
      class="member-registry-table"
      @page="onPage"
      @sort="onSort"
      @filter="onFilter"
      @column-resize-end="onColumnResizeEnd"
      @row-click="onRowClick"
    >
      <template #paginatorstart>
        <span class="member-page-size-label">Sahifada</span>
      </template>
      <template #empty>
        <div class="member-empty">Mos yozuv topilmadi</div>
      </template>

      <Column
        v-if="isVisible('USER_NO')"
        field="USER_NO"
        header="ID"
        sortable
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('USER_NO', '8.5rem')"
      >
        <template #body="{ data }">
          <button type="button" class="member-cell-link" @click.stop="$emit('row-dblclick', data)">
            <span class="font-semibold">{{ displayValue(data.USER_NO) }}</span>
          </button>
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="ID" />
        </template>
      </Column>

      <Column
        v-if="isVisible('USER_NAME')"
        field="USER_NAME"
        header="Ism"
        sortable
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('USER_NAME', '16rem')"
      >
        <template #body="{ data }">
          <button type="button" class="member-cell-link" @click.stop="$emit('row-dblclick', data)">
            <span>{{ displayValue(data.USER_NAME) }}</span>
          </button>
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="Ism" />
        </template>
      </Column>

      <Column
        v-if="isVisible('USER_POSITION')"
        field="USER_POSITION"
        header="Toifa"
        sortable
        :showFilterMatchModes="false"
        :style="columnStyle('USER_POSITION', '10rem')"
      >
        <template #body="{ data }">{{ displayValue(data.USER_POSITION) }}</template>
        <template #filter="{ filterModel }">
          <MultiSelect
            v-model="filterModel.value"
            :options="categories"
            optionLabel="label"
            optionValue="value"
            placeholder="Toifani tanlang"
            display="chip"
            class="w-full"
            :maxSelectedLabels="2"
          />
        </template>
      </Column>

      <Column
        v-if="isVisible('CARD_NO')"
        field="CARD_NO"
        header="Karta raqami"
        sortable
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('CARD_NO', '10rem')"
      >
        <template #body="{ data }">{{ displayValue(data.CARD_NO) }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="Karta" />
        </template>
      </Column>

      <Column
        v-if="isVisible('TEL_NO')"
        field="TEL_NO"
        header="Telefon"
        sortable
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('TEL_NO', '10rem')"
      >
        <template #body="{ data }">{{ displayValue(data.TEL_NO) }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="Telefon" />
        </template>
      </Column>

      <Column
        v-if="isVisible('BIRTHDAY')"
        field="BIRTHDAY"
        header="Tug'ilgan sana"
        sortable
        :showFilterMatchModes="false"
        dataType="date"
        :style="columnStyle('BIRTHDAY', '10rem')"
      >
        <template #body="{ data }">{{ formatDate(data.BIRTHDAY) }}</template>
        <template #filter="{ filterModel }">
          <div class="member-date-filter">
            <label>Dan</label>
            <Calendar
              :modelValue="dateRangePart(filterModel, 0)"
              dateFormat="dd.mm.yy"
              placeholder="Boshlanish"
              showIcon
              showButtonBar
              class="w-full"
              @update:modelValue="(value) => setDateRangePart(filterModel, 0, value)"
            />
            <label>Gacha</label>
            <Calendar
              :modelValue="dateRangePart(filterModel, 1)"
              dateFormat="dd.mm.yy"
              placeholder="Tugash"
              showIcon
              showButtonBar
              class="w-full"
              @update:modelValue="(value) => setDateRangePart(filterModel, 1, value)"
            />
          </div>
        </template>
      </Column>

      <Column
        v-if="isVisible('ADDRS')"
        field="ADDRS"
        header="Manzil"
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('ADDRS', '14rem')"
      >
        <template #body="{ data }">{{ displayValue(data.ADDRS) }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="Manzil" />
        </template>
      </Column>

      <Column
        v-if="isVisible('EMAIL')"
        field="EMAIL"
        header="Email"
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('EMAIL', '12rem')"
      >
        <template #body="{ data }">{{ displayValue(data.EMAIL) }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="Email" />
        </template>
      </Column>

      <Column
        v-if="isVisible('PASSPORT_NUMBER')"
        field="PASSPORT_NUMBER"
        header="Pasport"
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('PASSPORT_NUMBER', '10rem')"
      >
        <template #body="{ data }">
          {{ displayPassport(data) }}
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="Pasport" />
        </template>
      </Column>

      <Column
        v-if="isVisible('INSERT_DATE')"
        field="INSERT_DATE"
        header="Ro'yxatdan o'tgan"
        sortable
        :showFilterMatchModes="false"
        dataType="date"
        :style="columnStyle('INSERT_DATE', '11rem')"
      >
        <template #body="{ data }">{{ formatDate(data.INSERT_DATE) }}</template>
        <template #filter="{ filterModel }">
          <div class="member-date-filter">
            <label>Dan</label>
            <Calendar
              :modelValue="dateRangePart(filterModel, 0)"
              dateFormat="dd.mm.yy"
              placeholder="Boshlanish"
              showIcon
              showButtonBar
              class="w-full"
              @update:modelValue="(value) => setDateRangePart(filterModel, 0, value)"
            />
            <label>Gacha</label>
            <Calendar
              :modelValue="dateRangePart(filterModel, 1)"
              dateFormat="dd.mm.yy"
              placeholder="Tugash"
              showIcon
              showButtonBar
              class="w-full"
              @update:modelValue="(value) => setDateRangePart(filterModel, 1, value)"
            />
          </div>
        </template>
      </Column>

      <Column
        v-if="isVisible('STATUS_NAME')"
        field="STATUS_NAME"
        header="Holat"
        sortable
        :showFilterMatchModes="true"
        :filterMatchModeOptions="textMatchModeOptions"
        :style="columnStyle('STATUS_NAME', '8rem')"
      >
        <template #body="{ data }">{{ displayValue(data.STATUS_NAME) }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="w-full" placeholder="Holat" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Popover from 'primevue/popover'
import { ROWS_PER_PAGE_OPTIONS } from '@/service/pagination.service'
import authService from '@/service/auth.service'

const EMPTY = '—'
const canManageMembers = computed(() => authService.hasPermission('manage_members'))

const allColumns = [
  { field: 'USER_NO', header: 'ID', always: true },
  { field: 'USER_NAME', header: 'Ism' },
  { field: 'USER_POSITION', header: 'Toifa' },
  { field: 'CARD_NO', header: 'Karta raqami' },
  { field: 'TEL_NO', header: 'Telefon' },
  { field: 'BIRTHDAY', header: "Tug'ilgan sana" },
  { field: 'ADDRS', header: 'Manzil' },
  { field: 'EMAIL', header: 'Email', hiddenByDefault: true },
  { field: 'PASSPORT_NUMBER', header: 'Pasport', hiddenByDefault: true },
  { field: 'INSERT_DATE', header: "Ro'yxatdan o'tgan" },
  { field: 'STATUS_NAME', header: 'Holat', hiddenByDefault: true },
]

const defaultVisibleFields = allColumns
  .filter((column) => column.always || !column.hiddenByDefault)
  .map((column) => column.field)

const props = defineProps({
  title: {
    type: String,
    default: "A'zo bo'lganlar"
  },
  addLabel: {
    type: String,
    default: "Yangi a'zo qo'shish"
  },
  showAddButton: {
    type: Boolean,
    default: true
  },
  exportFileName: {
    type: String,
    default: 'azo-bolganlar'
  },
  storageKey: {
    type: String,
    default: 'azo-bolganlar'
  },
  members: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  exporting: {
    type: Boolean,
    default: false
  },
  totalRecords: {
    type: Number,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  rowsPerPage: {
    type: Number,
    default: 30
  },
  searchQuery: {
    type: String,
    default: ''
  },
  sortField: {
    type: String,
    default: 'INSERT_DATE'
  },
  sortOrder: {
    type: Number,
    default: -1
  },
  searchPlaceholder: {
    type: String,
    default: 'ID, ism, karta raqami, telefon, manzil yoki toifa bo\'yicha qidirish'
  }
})

const emit = defineEmits([
  'add-member',
  'update:current-page',
  'update:rows-per-page',
  'update:searchQuery',
  'update:sortField',
  'update:sortOrder',
  'apply-search',
  'refresh',
  'export-excel',
  'row-dblclick'
])

const columnsPopover = ref()
const selectedRow = ref(null)
const visibleFields = ref([...defaultVisibleFields])
const columnWidths = ref({})
let searchDebounce = null

const first = computed(() => Math.max(0, (props.currentPage - 1) * props.rowsPerPage))

const formattedTotal = computed(() => Number(props.totalRecords || 0).toLocaleString('en-US'))

const hasActiveQuery = computed(() => Boolean(props.searchQuery?.trim()))

function isVisible(field) {
  return visibleFields.value.includes(field)
}

function displayValue(value) {
  if (value == null || String(value).trim() === '') return EMPTY
  return value
}

function displayPassport(data) {
  const series = String(data?.PASSPORT_SERIES || '').trim()
  const number = String(data?.PASSPORT_NUMBER || '').trim()
  const combined = `${series} ${number}`.trim()
  return combined || EMPTY
}

function toggleColumns(event) {
  columnsPopover.value.toggle(event)
}

function persistVisibleFields() {
  if (!visibleFields.value.includes('USER_NO')) {
    visibleFields.value = ['USER_NO', ...visibleFields.value]
  }
  try {
    localStorage.setItem(`vakolat.memberList.columns.${props.storageKey}`, JSON.stringify(visibleFields.value))
  } catch {
    // ignore storage errors
  }
}

function columnStyle(field, defaultWidth) {
  const saved = columnWidths.value[field]
  return {
    width: saved || defaultWidth,
    minWidth: '4.75rem'
  }
}

function persistColumnWidths() {
  try {
    localStorage.setItem(
      `vakolat.memberList.colWidths.${props.storageKey}`,
      JSON.stringify(columnWidths.value)
    )
  } catch {
    // ignore storage errors
  }
}

function loadColumnWidths() {
  try {
    const raw = localStorage.getItem(`vakolat.memberList.colWidths.${props.storageKey}`)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') columnWidths.value = parsed
  } catch {
    // ignore storage errors
  }
}

function onColumnResizeEnd(event) {
  const th = event?.element
  if (!th) return
  const field = visibleFields.value[th.cellIndex]
  if (!field) return
  const width = `${Math.max(72, th.offsetWidth)}px`
  columnWidths.value = { ...columnWidths.value, [field]: width }
  persistColumnWidths()
}

function loadVisibleFields() {
  try {
    const raw = localStorage.getItem(`vakolat.memberList.columns.${props.storageKey}`)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return
    const allowed = new Set(allColumns.map((column) => column.field))
    const next = parsed.filter((field) => allowed.has(field))
    if (!next.includes('USER_NO')) next.unshift('USER_NO')
    if (next.length) visibleFields.value = next
  } catch {
    // ignore storage errors
  }
}

function onSearchInput(value) {
  emit('update:searchQuery', value)
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    emit('apply-search')
  }, 300)
}

function applySearchNow() {
  if (searchDebounce) clearTimeout(searchDebounce)
  emit('apply-search')
}

function clearSearch() {
  if (searchDebounce) clearTimeout(searchDebounce)
  emit('update:searchQuery', '')
  emit('apply-search')
}

function onSort(event) {
  emit('update:sortField', event.sortField || 'INSERT_DATE')
  emit('update:sortOrder', event.sortOrder || -1)
  emit('apply-search')
}

function onPage(event) {
  emit('update:current-page', event.page + 1)
  emit('update:rows-per-page', event.rows)
}

function onRowClick(event) {
  const target = event.originalEvent?.target
  if (target?.closest?.('button, a, input, .p-checkbox')) {
    return
  }
  emit('row-dblclick', event.data)
}

function formatDate(dateString) {
  if (!dateString) return EMPTY
  try {
    let date
    if (dateString.includes('/')) {
      const parts = dateString.split('/')
      if (parts.length === 3) {
        date = new Date(parts[2], parts[1] - 1, parts[0])
      }
    } else if (dateString.includes('-')) {
      date = new Date(dateString)
    } else if (dateString.length === 8) {
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(dateString)
    }

    if (isNaN(date.getTime())) {
      return dateString
    }

    return date.toLocaleDateString('uz-UZ')
  } catch {
    return dateString
  }
}

function csvValue(value) {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function cellExportValue(row, field) {
  if (field === 'BIRTHDAY' || field === 'INSERT_DATE') return formatDate(row[field]) === EMPTY ? '' : formatDate(row[field])
  if (field === 'PASSPORT_NUMBER') {
    const value = displayPassport(row)
    return value === EMPTY ? '' : value
  }
  const value = row[field]
  return value == null ? '' : String(value)
}

function downloadCsv(rows = [], total = rows.length) {
  const columns = allColumns.filter((column) => visibleFields.value.includes(column.field))
  const header = columns.map((column) => csvValue(column.header)).join(',')
  const lines = rows.map((row) => columns.map((column) => csvValue(cellExportValue(row, column.field))).join(','))
  const blob = new Blob(['\uFEFF' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `${props.exportFileName}-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return { exported: rows.length, total }
}

onMounted(() => {
  loadVisibleFields()
  loadColumnWidths()
})

defineExpose({ downloadCsv })
</script>

<style scoped>
.member-registry {
  padding: 1.25rem 1.25rem 0.75rem;
}

.member-registry-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.15rem;
  flex-wrap: wrap;
}

.member-registry-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.member-registry-subtitle {
  margin: 0.2rem 0 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.member-registry-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
}

.member-registry-actions :deep(.member-action-btn.p-button) {
  min-height: 2.5rem;
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.01em;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.member-registry-actions :deep(.member-action-btn-primary.p-button) {
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.12),
    0 2px 8px color-mix(in srgb, var(--p-primary-color, var(--primary-color)) 28%, transparent);
}

.member-search {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 1.1rem;
}

.member-search-label {
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-color-secondary);
}

.member-search-shell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 2.85rem;
  padding: 0 0.85rem;
  border: 1px solid var(--p-content-border-color, var(--surface-border));
  border-radius: 12px;
  background: var(--p-content-background, var(--surface-ground));
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.member-search-shell:focus-within {
  border-color: var(--p-primary-color, var(--primary-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-primary-color, var(--primary-color)) 18%, transparent);
}

.member-search-icon {
  flex: 0 0 auto;
  color: var(--text-color-secondary);
  font-size: 0.95rem;
}

.member-search-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 0.65rem 0 !important;
  font-size: 0.95rem;
}

.member-search-clear {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-color-secondary) 12%, transparent);
  color: var(--text-color-secondary);
  cursor: pointer;
}

.member-search-clear:hover {
  color: var(--text-color);
  background: color-mix(in srgb, var(--text-color-secondary) 22%, transparent);
}

.member-cell-link {
  display: inline-flex;
  align-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  cursor: pointer;
  text-align: left;
  max-width: 100%;
}

.member-cell-link span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-cell-link:hover span {
  text-decoration: underline;
}

.member-empty {
  text-align: center;
  padding: 1.5rem 0;
  color: var(--text-color-secondary);
}

.member-page-size-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-right: 0.35rem;
}

.member-columns-panel {
  min-width: 14rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.15rem 0.1rem;
}

.member-columns-panel-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.15rem;
}

.member-columns-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.member-columns-item label {
  cursor: pointer;
}

:deep(.member-registry-table .p-datatable-table) {
  table-layout: fixed;
}

:deep(.member-registry-table .p-datatable-thead > tr > th) {
  white-space: nowrap;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  padding: 0.7rem 1rem 0.7rem 0.85rem;
  position: relative;
  user-select: none;
  overflow: hidden;
  border-color: var(--p-content-border-color, var(--surface-border));
}

:deep(.member-registry-table [data-pc-section="headercontent"]),
:deep(.member-registry-table .p-datatable-column-header-content) {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  min-width: 0;
}

:deep(.member-registry-table [data-pc-section="title"]),
:deep(.member-registry-table .p-datatable-column-title) {
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.member-registry-table [data-pc-section="sort"]),
:deep(.member-registry-table [data-pc-section="sorticon"]),
:deep(.member-registry-table .p-datatable-sort-icon) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 0.95rem;
  height: 0.95rem;
  flex: 0 0 auto;
  margin: 0;
  color: var(--text-color-secondary);
  opacity: 0;
  background: none;
  overflow: visible;
  transition: opacity 0.12s ease, color 0.12s ease;
}

:deep(.member-registry-table [data-pc-section="sort"] svg),
:deep(.member-registry-table [data-pc-section="sorticon"] svg),
:deep(.member-registry-table .p-datatable-sort-icon svg),
:deep(.member-registry-table .p-datatable-sort-icon i) {
  width: 0.85rem !important;
  height: 0.85rem !important;
  opacity: 1;
}

:deep(.member-registry-table .p-datatable-thead > tr > th:hover [data-pc-section="sort"]),
:deep(.member-registry-table .p-datatable-thead > tr > th:hover [data-pc-section="sorticon"]),
:deep(.member-registry-table .p-datatable-thead > tr > th:hover .p-datatable-sort-icon) {
  opacity: 0.7;
}

:deep(.member-registry-table th[aria-sort="ascending"] [data-pc-section="sort"]),
:deep(.member-registry-table th[aria-sort="descending"] [data-pc-section="sort"]),
:deep(.member-registry-table th[aria-sort="ascending"] [data-pc-section="sorticon"]),
:deep(.member-registry-table th[aria-sort="descending"] [data-pc-section="sorticon"]),
:deep(.member-registry-table th[aria-sort="ascending"] .p-datatable-sort-icon),
:deep(.member-registry-table th[aria-sort="descending"] .p-datatable-sort-icon) {
  opacity: 1;
  color: var(--p-primary-color, var(--primary-color));
}

:deep(.member-registry-table [data-pc-section="filtermenubutton"]),
:deep(.member-registry-table [data-pc-section="filterbutton"]),
:deep(.member-registry-table .p-datatable-column-filter-button) {
  margin-left: auto;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 8px;
  color: var(--text-color-secondary);
  opacity: 0.45;
  transition: opacity 0.12s ease, background-color 0.12s ease, color 0.12s ease;
}

:deep(.member-registry-table .p-datatable-thead > tr > th:hover [data-pc-section="filtermenubutton"]),
:deep(.member-registry-table .p-datatable-thead > tr > th:hover [data-pc-section="filterbutton"]),
:deep(.member-registry-table .p-datatable-thead > tr > th:hover .p-datatable-column-filter-button),
:deep(.member-registry-table [data-pc-section="filtermenubutton"]:hover),
:deep(.member-registry-table [data-pc-section="filterbutton"]:hover),
:deep(.member-registry-table .p-datatable-column-filter-button:hover) {
  opacity: 1;
}

:deep(.member-registry-table [data-pc-section="filtermenubutton"].p-highlight),
:deep(.member-registry-table [data-pc-section="filterbutton"].p-highlight),
:deep(.member-registry-table .p-datatable-column-filter-button.p-highlight),
:deep(.member-registry-table [data-pc-section="filtermenubutton"][aria-expanded="true"]),
:deep(.member-registry-table [data-pc-section="filterbutton"][aria-expanded="true"]) {
  opacity: 1;
  color: var(--p-primary-color, var(--primary-color));
  background: color-mix(in srgb, var(--p-primary-color, var(--primary-color)) 14%, transparent);
}

:deep(.member-registry-table .p-datatable-column-resizer),
:deep(.member-registry-table [data-pc-section="columnresizer"]) {
  width: 14px;
  right: 0;
  cursor: col-resize;
  z-index: 2;
}

:deep(.member-registry-table .p-datatable-column-resizer)::after,
:deep(.member-registry-table [data-pc-section="columnresizer"])::after {
  content: "";
  position: absolute;
  top: 22%;
  bottom: 22%;
  left: 50%;
  width: 2px;
  border-radius: 999px;
  background: transparent;
  transform: translateX(-50%);
  transition: background-color 0.12s ease, top 0.12s ease, bottom 0.12s ease, width 0.12s ease;
}

:deep(.member-registry-table .p-datatable-thead > tr > th:hover .p-datatable-column-resizer)::after,
:deep(.member-registry-table .p-datatable-thead > tr > th:hover [data-pc-section="columnresizer"])::after {
  background: color-mix(in srgb, var(--text-color-secondary) 38%, transparent);
}

:deep(.member-registry-table .p-datatable-column-resizer:hover)::after,
:deep(.member-registry-table [data-pc-section="columnresizer"]:hover)::after,
:deep(.member-registry-table .p-datatable-column-resizer:active)::after,
:deep(.member-registry-table [data-pc-section="columnresizer"]:active)::after {
  top: 10%;
  bottom: 10%;
  width: 3px;
  background: var(--p-primary-color, var(--primary-color));
}

:deep(.p-datatable-resize-helper),
:deep(.p-column-resizer-helper) {
  width: 2px;
  background: var(--p-primary-color, var(--primary-color));
}

:deep(.member-registry-table .p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.member-registry-table .p-datatable-tbody > tr > td) {
  padding: 0.85rem 1rem;
  font-size: 0.975rem;
  line-height: 1.45;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.member-registry-table .p-datatable-tbody > tr:nth-child(even)) {
  background: color-mix(in srgb, var(--p-content-hover-background, var(--surface-hover)) 55%, transparent);
}

:deep(.member-registry-table .p-datatable-paginator-bottom) {
  border-top: 1px solid var(--p-content-border-color, var(--surface-border));
  padding: 0.65rem 0.25rem;
}
</style>
