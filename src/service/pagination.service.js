import { ref, watch } from "vue"

const STORAGE_KEY = "vakolat.pagination.pageSize"

/** Standart tanlovlar; har bir betdagi paginator shu ro‘yxatdan foydalanadi */
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100, 300]

export const DEFAULT_PAGE_SIZE = 30

function clampPageSize(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return DEFAULT_PAGE_SIZE
  return Math.min(500, Math.max(5, Math.round(v)))
}

function loadPageSize() {
  const raw = localStorage.getItem(STORAGE_KEY)
  const n = parseInt(raw, 10)
  if (Number.isFinite(n)) {
    const c = clampPageSize(n)
    if (ROWS_PER_PAGE_OPTIONS.includes(c)) return c
    return c
  }
  return DEFAULT_PAGE_SIZE
}

export const pageSize = ref(loadPageSize())

watch(
  pageSize,
  (v) => {
    const c = clampPageSize(v)
    if (c !== v) {
      pageSize.value = c
      return
    }
    localStorage.setItem(STORAGE_KEY, String(c))
  },
  { flush: "post" },
)

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || e.newValue == null) return
    const n = parseInt(e.newValue, 10)
    if (Number.isFinite(n) && clampPageSize(n) === pageSize.value) return
    if (Number.isFinite(n)) pageSize.value = clampPageSize(n)
  })
}
