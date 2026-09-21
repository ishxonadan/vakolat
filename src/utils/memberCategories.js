const FALLBACK = [
  { label: "Talaba", value: "0001" },
  { label: "O'quvchi", value: "0002" },
  { label: "Abituriyent", value: "0003" },
  { label: "Magistr", value: "0004" },
  { label: "Ilmiy xodim", value: "0005" },
  { label: "Dotsent", value: "0006" },
  { label: "Professor", value: "0007" },
  { label: "Xizmatchi", value: "0008" },
  { label: "Ishchi", value: "0009" },
  { label: "Ishsiz", value: "0010" },
  { label: "Pensioner", value: "0011" },
  { label: "Chet el", value: "0012" },
  { label: "Akademik", value: "0015" },
  { label: "O'qituvchi", value: "0016" },
  { label: "Shifokor", value: "0017" },
  { label: "Tadbirkor", value: "0018" },
  { label: "Boshqa", value: "9999" },
]

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
    }))
    .filter((row) => row.label && row.value)
}

export function resolveMemberCategoryLabel(value, categories = FALLBACK) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const match = categories.find((row) => row.value === raw || row.label === raw)
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
