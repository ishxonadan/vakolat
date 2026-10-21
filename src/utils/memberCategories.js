const FALLBACK = [
  { label: "Talaba", value: "0001", kafedra: 3 },
  { label: "O'quvchi", value: "0002", kafedra: 3 },
  { label: "Abituriyent", value: "0003", kafedra: 3 },
  { label: "Magistr", value: "0004", kafedra: 4 },
  { label: "Ilmiy xodim", value: "0005", kafedra: 3 },
  { label: "Dotsent", value: "0006", kafedra: 3 },
  { label: "Professor", value: "0007", kafedra: 3 },
  { label: "Xizmatchi", value: "0008", kafedra: 3 },
  { label: "Ishchi", value: "0009", kafedra: 3 },
  { label: "Ishsiz", value: "0010", kafedra: 3 },
  { label: "Pensioner", value: "0011", kafedra: 3 },
  { label: "Chet el", value: "0012", kafedra: 3 },
  { label: "Akademik", value: "0015", kafedra: 3 },
  { label: "O'qituvchi", value: "0016", kafedra: 3 },
  { label: "Shifokor", value: "0017", kafedra: 3 },
  { label: "Tadbirkor", value: "0018", kafedra: 3 },
  { label: "Boshqa", value: "9999", kafedra: 3 },
]

export const KAFEDRA_OPTIONS = [
  { label: "1", value: 1, disabled: true },
  { label: "2", value: 2, disabled: false },
  { label: "3", value: 3, disabled: false },
  { label: "4", value: 4, disabled: false },
]

export function normalizeKafedra(value) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 4) return null
  return n
}

export function toClassCode(kafedra) {
  const n = normalizeKafedra(kafedra)
  if (n == null) return ""
  return String(n).padStart(4, "0")
}

export function classCodeToKafedra(classCode) {
  const digits = String(classCode || "").replace(/\D/g, "")
  if (!digits) return null
  return normalizeKafedra(Number(digits))
}

export function resolveKafedraForCategory(categoryValue, categories = FALLBACK) {
  const raw = String(categoryValue || "").trim()
  if (!raw) return null
  const match = categories.find((row) => row.value === raw || row.label === raw)
  return normalizeKafedra(match?.kafedra)
}

const LEGACY_NAME_TO_CODE = {
  Tadqiqotchi: "0005",
  Xodim: "0008",
  "O‘qituvchi": "0016",
  "O`qituvchi": "0016",
}

export function toCategoryOptions(rows) {
  if (!Array.isArray(rows) || !rows.length) return [...FALLBACK]
  return rows
    .map((row) => ({
      label: row.name || row.label,
      value: row.code || row.value,
      kafedra: normalizeKafedra(row.kafedra) ?? 3,
    }))
    .filter((row) => row.label && row.value)
}

export function resolveMemberCategoryLabel(value, categories = FALLBACK) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const code = /^\d+$/.test(raw) && raw.length <= 4 ? raw.padStart(4, "0") : raw
  const match = categories.find((row) => row.value === raw || row.value === code || row.label === raw)
  return match?.label || raw
}

export function normalizeMemberCategoryValue(value, categories = FALLBACK) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (/^\d{4}$/.test(raw)) return raw
  const match = categories.find((row) => row.label === raw || row.value === raw)
  if (match?.value) return match.value
  return LEGACY_NAME_TO_CODE[raw] || raw
}
