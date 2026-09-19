const DEFAULT_SEARCH_FIELDS = [
  "USER_NO",
  "USER_NAME",
  "PINFL",
  "CARD_NO",
  "TEL_NO",
  "ADDRS",
  "USER_POSITION",
  "EMAIL",
  "PASSPORT_SERIES",
  "PASSPORT_NUMBER",
  "NATIONALITY",
  "USER_ID",
]

const ALLOWED_FILTER_FIELDS = new Set([
  ...DEFAULT_SEARCH_FIELDS,
  "BIRTHDAY",
  "INSERT_DATE",
  "STATUS_NAME",
  "STATUS_CODE",
  "TYPE_NAME",
  "SEX",
])

const APOSTROPHE_CLASS = "['ʻʼ‘’`´′]"
const APOSTROPHE_RE = /['ʻʼ‘’`´′]/

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function tokenize(value) {
  return String(value || "")
    .trim()
    .slice(0, 200)
    .split(/[\s,.;:|/\\-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function toFuzzyUzbekRegex(token, { anchoredStart = false, anchoredEnd = false } = {}) {
  let pattern = ""
  for (const char of Array.from(String(token))) {
    const lower = char.toLowerCase()
    if (APOSTROPHE_RE.test(lower)) continue
    if (lower === "o") {
      pattern += `o${APOSTROPHE_CLASS}?`
      continue
    }
    if (lower === "g") {
      pattern += `g${APOSTROPHE_CLASS}?`
      continue
    }
    if (lower === "h" || lower === "x") {
      pattern += "[hx]"
      continue
    }
    pattern += escapeRegex(char)
  }
  if (!pattern) return null
  return new RegExp(`${anchoredStart ? "^" : ""}${pattern}${anchoredEnd ? "$" : ""}`, "i")
}

function tokenRegexes(value) {
  return tokenize(value).map((token) => toFuzzyUzbekRegex(token)).filter(Boolean)
}

function toYyyymmdd(value) {
  if (!value) return null
  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}${month}${day}`
  }
  const raw = String(value).trim()
  if (/^\d{8}$/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10).replace(/-/g, "")
  const parsed = new Date(raw)
  if (isNaN(parsed.getTime())) return null
  return toYyyymmdd(parsed)
}

function dateRangeClause(field, from, to) {
  const fromKey = toYyyymmdd(from)
  const toKey = toYyyymmdd(to)
  if (!fromKey && !toKey) return null

  const compact = {}
  if (fromKey) compact.$gte = fromKey
  if (toKey) compact.$lte = toKey

  const iso = {}
  if (fromKey) iso.$gte = `${fromKey.slice(0, 4)}-${fromKey.slice(4, 6)}-${fromKey.slice(6, 8)}`
  if (toKey) iso.$lte = `${toKey.slice(0, 4)}-${toKey.slice(4, 6)}-${toKey.slice(6, 8)}T23:59:59.999Z`

  return {
    $or: [{ [field]: compact }, { [field]: iso }],
  }
}

function compileFieldFilter(filter) {
  if (!filter || !ALLOWED_FILTER_FIELDS.has(filter.field)) return null
  const mode = String(filter.matchMode || "contains")

  if (mode === "between") {
    return dateRangeClause(filter.field, filter.from, filter.to)
  }

  if (mode === "in") {
    const values = Array.isArray(filter.value)
      ? filter.value.map((item) => String(item || "").trim()).filter(Boolean)
      : []
    if (!values.length) return null
    return { [filter.field]: { $in: values } }
  }

  const raw = String(filter.value ?? "").trim()
  if (!raw) return null

  if (mode === "startsWith") {
    const regex = toFuzzyUzbekRegex(raw, { anchoredStart: true })
    return regex ? { [filter.field]: regex } : null
  }
  if (mode === "endsWith") {
    const regex = toFuzzyUzbekRegex(raw, { anchoredEnd: true })
    return regex ? { [filter.field]: regex } : null
  }
  if (mode === "equals") {
    const regex = toFuzzyUzbekRegex(raw, { anchoredStart: true, anchoredEnd: true })
    return regex ? { [filter.field]: regex } : null
  }
  if (mode === "notEquals") {
    const regex = toFuzzyUzbekRegex(raw, { anchoredStart: true, anchoredEnd: true })
    return regex ? { [filter.field]: { $not: regex } } : null
  }
  if (mode === "notContains") {
    const tokens = tokenRegexes(raw)
    if (!tokens.length) return null
    return { $nor: tokens.map((regex) => ({ [filter.field]: regex })) }
  }

  const tokens = tokenRegexes(raw)
  if (tokens.length === 1) return { [filter.field]: tokens[0] }
  if (tokens.length > 1) return { $and: tokens.map((regex) => ({ [filter.field]: regex })) }
  return null
}

function matchAnyField(regex, searchFields) {
  return { $or: searchFields.map((field) => ({ [field]: regex })) }
}

function parseLimit(body, { max = 500 } = {}) {
  const requested = Number.parseInt(body?.limit, 10)
  const fallback = Number.isFinite(requested) ? requested : 50
  return Math.min(Math.max(fallback, 1), max)
}

function parsePage(body) {
  const requested = Number.parseInt(body?.page, 10)
  return Number.isFinite(requested) && requested > 0 ? requested : 1
}

function parseSort(body, defaultField = "INSERT_DATE") {
  const sortField = ALLOWED_FILTER_FIELDS.has(body?.sortField) ? body.sortField : defaultField
  const rawOrder = body?.sortOrder
  const ascending = rawOrder === "asc" || rawOrder === 1 || rawOrder === "1"
  return { [sortField]: ascending ? 1 : -1 }
}

function buildMemberSearchFilter(body, searchFields = DEFAULT_SEARCH_FIELDS) {
  const clauses = []
  const searchTokens = tokenRegexes(body?.search)
  if (searchTokens.length === 1) {
    clauses.push(matchAnyField(searchTokens[0], searchFields))
  } else if (searchTokens.length > 1) {
    clauses.push({
      $and: searchTokens.map((regex) => matchAnyField(regex, searchFields)),
    })
  }

  const filters = Array.isArray(body?.filters) ? body.filters : []
  for (const filter of filters) {
    const clause = compileFieldFilter(filter)
    if (clause) clauses.push(clause)
  }

  if (clauses.length === 0) return {}
  if (clauses.length === 1) return clauses[0]
  return { $and: clauses }
}

module.exports = {
  ALLOWED_FILTER_FIELDS,
  DEFAULT_SEARCH_FIELDS,
  buildMemberSearchFilter,
  parseLimit,
  parsePage,
  parseSort,
  tokenize,
}
