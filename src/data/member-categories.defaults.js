const DEFAULT_MEMBER_CATEGORIES = [
  { code: "0001", name: "Talaba", kafedra: 3 },
  { code: "0002", name: "O'quvchi", kafedra: 3 },
  { code: "0003", name: "Abituriyent", kafedra: 3 },
  { code: "0004", name: "Magistr", kafedra: 4 },
  { code: "0005", name: "Ilmiy xodim", kafedra: 3 },
  { code: "0006", name: "Dotsent", kafedra: 3 },
  { code: "0007", name: "Professor", kafedra: 3 },
  { code: "0008", name: "Xizmatchi", kafedra: 3 },
  { code: "0009", name: "Ishchi", kafedra: 3 },
  { code: "0010", name: "Ishsiz", kafedra: 3 },
  { code: "0011", name: "Pensioner", kafedra: 3 },
  { code: "0012", name: "Chet el", kafedra: 3 },
  { code: "0015", name: "Akademik", kafedra: 3 },
  { code: "0016", name: "O'qituvchi", kafedra: 3 },
  { code: "0017", name: "Shifokor", kafedra: 3 },
  { code: "0018", name: "Tadbirkor", kafedra: 3 },
  { code: "9999", name: "Boshqa", kafedra: 3 },
]

function normalizeKafedra(value) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 4) return null
  return n
}

function toClassCode(kafedra) {
  const n = normalizeKafedra(kafedra)
  if (n == null) return ""
  return String(n).padStart(4, "0")
}

const LEGACY_POSITION_ALIASES = {
  "O‘qituvchi": "0016",
  "O`qituvchi": "0016",
  Tadqiqotchi: "0005",
  Xodim: "0008",
}

function buildPositionCodeMap() {
  const map = { ...LEGACY_POSITION_ALIASES }
  for (const row of DEFAULT_MEMBER_CATEGORIES) {
    map[row.code] = row.code
    map[row.name] = row.code
  }
  return map
}

function normalizeCategoryCode(value) {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits) return ""
  return digits.slice(0, 4).padStart(4, "0")
}

module.exports = {
  DEFAULT_MEMBER_CATEGORIES,
  LEGACY_POSITION_ALIASES,
  buildPositionCodeMap,
  normalizeCategoryCode,
  normalizeKafedra,
  toClassCode,
}
