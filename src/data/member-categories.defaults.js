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

function categoryRows(categories) {
  const source = Array.isArray(categories) && categories.length ? categories : DEFAULT_MEMBER_CATEGORIES
  return source
    .map((row) => ({
      code: normalizeCategoryCode(row.code || row.value),
      name: String(row.name || row.label || "").trim(),
    }))
    .filter((row) => row.code && row.name)
}

function asCategoryCode(value) {
  const digits = String(value || "").trim()
  if (!/^\d+$/.test(digits) || digits.length > 4) return ""
  return digits.padStart(4, "0")
}

function findCategory(value, categories) {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const rows = categoryRows(categories)
  const byName = rows.find((row) => row.name === raw)
  if (byName) return byName
  const alias = LEGACY_POSITION_ALIASES[raw]
  if (alias) {
    const aliased = rows.find((row) => row.code === alias)
    if (aliased) return aliased
  }
  const code = asCategoryCode(raw)
  if (!code) return null
  return rows.find((row) => row.code === code) || null
}

function positionName(value, categories) {
  const raw = String(value ?? "").trim()
  if (!raw || !/^\d+$/.test(raw)) return raw
  const match = findCategory(raw, categories)
  return match ? match.name : raw
}

function positionCode(value, categories) {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  const match = findCategory(raw, categories)
  if (match?.code) return match.code
  if (/^\d{4}$/.test(raw)) return raw
  return asCategoryCode(raw)
}

function expandPositionValues(values, categories) {
  const out = []
  const seen = new Set()
  const push = (value) => {
    const text = String(value ?? "").trim()
    if (!text || seen.has(text)) return
    seen.add(text)
    out.push(text)
  }
  for (const value of values) {
    push(value)
    const match = findCategory(value, categories)
    if (!match) continue
    push(match.code)
    push(match.name)
  }
  return out
}

async function readMemberCategories(MemberCategory) {
  const defaults = DEFAULT_MEMBER_CATEGORIES.map((row) => ({ ...row }))
  if (!MemberCategory) return { rows: defaults, fromDb: false }
  const docs = await MemberCategory.find().select("code name kafedra").lean()
  const byCode = new Map(defaults.map((row) => [row.code, row]))
  for (const doc of docs) {
    const code = normalizeCategoryCode(doc.code)
    const name = String(doc.name || "").trim()
    if (!code || !name) continue
    byCode.set(code, {
      code,
      name,
      kafedra: doc.kafedra ?? byCode.get(code)?.kafedra ?? 3,
    })
  }
  return { rows: [...byCode.values()], fromDb: true }
}

module.exports = {
  DEFAULT_MEMBER_CATEGORIES,
  LEGACY_POSITION_ALIASES,
  buildPositionCodeMap,
  normalizeCategoryCode,
  normalizeKafedra,
  toClassCode,
  findCategory,
  positionName,
  positionCode,
  expandPositionValues,
  readMemberCategories,
}
