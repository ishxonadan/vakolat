const DEFAULT_MEMBER_CATEGORIES = [
  { code: "0001", name: "Talaba" },
  { code: "0002", name: "O'quvchi" },
  { code: "0003", name: "Abituriyent" },
  { code: "0004", name: "Magistr" },
  { code: "0005", name: "Ilmiy xodim" },
  { code: "0006", name: "Dotsent" },
  { code: "0007", name: "Professor" },
  { code: "0008", name: "Xizmatchi" },
  { code: "0009", name: "Ishchi" },
  { code: "0010", name: "Ishsiz" },
  { code: "0011", name: "Pensioner" },
  { code: "0012", name: "Chet el" },
  { code: "0015", name: "Akademik" },
  { code: "0016", name: "O'qituvchi" },
  { code: "0017", name: "Shifokor" },
  { code: "0018", name: "Tadbirkor" },
  { code: "9999", name: "Boshqa" },
]

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
}
