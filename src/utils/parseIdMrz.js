const MRZ_CHAR = /[A-Z0-9<]/

function compactMrz(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, "")
}

function mrzNamePart(value) {
  return String(value || "")
    .replace(/</g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function titleCaseMrzName(value) {
  return mrzNamePart(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}

function parseYyMmDd(value, { expiry = false } = {}) {
  if (!/^\d{6}$/.test(value)) return null
  const yy = Number(value.slice(0, 2))
  const month = Number(value.slice(2, 4))
  const day = Number(value.slice(4, 6))
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const now = new Date()
  let year = 2000 + yy
  if (!expiry) {
    const candidate = new Date(year, month - 1, day)
    if (candidate > now) year = 1900 + yy
  } else if (year < now.getFullYear() - 1) {
    year = 2100 + yy
  }
  const date = new Date(year, month - 1, day)
  return isNaN(date.getTime()) ? null : date
}

function splitDocumentNumber(documentNumber) {
  const clean = String(documentNumber || "").replace(/</g, "").trim()
  const match = clean.match(/^([A-Z]{1,3})(\d+)$/)
  if (!match) {
    return { documentNumber: clean, series: "", number: clean }
  }
  return { documentNumber: clean, series: match[1], number: match[2] }
}

function extractPinfl(value) {
  const match = String(value || "").replace(/</g, "").match(/\d{14}/)
  return match ? match[0] : ""
}

function sexFromPinfl(pinfl) {
  const digit = String(pinfl || "")[0]
  if ("246".includes(digit)) return "F"
  if ("135".includes(digit)) return "M"
  return ""
}

function normalizeSex(value, pinfl = "") {
  const raw = String(value || "").trim().toUpperCase()
  if (raw === "F" || raw === "FEMALE" || raw === "AYOL") return "F"
  if (raw === "M" || raw === "MALE" || raw === "ERKAK") return "M"
  const lower = String(value || "").trim().toLowerCase()
  if (lower === "ayol") return "F"
  if (lower === "erkak") return "M"
  return sexFromPinfl(pinfl)
}

function parseTd1(mrz) {
  if (mrz.length < 90) return null
  const line1 = mrz.slice(0, 30)
  const line2 = mrz.slice(30, 60)
  const line3 = mrz.slice(60, 90)

  const documentNumber = line1.slice(5, 14).replace(/</g, "")
  const pinfl = extractPinfl(line1.slice(15, 30))
  const birthDate = parseYyMmDd(line2.slice(0, 6))
  const sex = normalizeSex(line2.charAt(7) === "<" ? "" : line2.charAt(7), pinfl)
  const expiryDate = parseYyMmDd(line2.slice(8, 14), { expiry: true })
  const nationality = line2.slice(15, 18).replace(/</g, "")
  const nameParts = line3.split("<<")
  const surname = titleCaseMrzName(nameParts[0])
  const givenNames = titleCaseMrzName(nameParts.slice(1).join(" "))
  const fullName = [surname, givenNames].filter(Boolean).join(" ")
  const parsedNumber = splitDocumentNumber(documentNumber)

  if (!parsedNumber.documentNumber && !fullName) return null

  return {
    format: "td1",
    documentType: line1.slice(0, 2).replace(/</g, ""),
    issuingState: line1.slice(2, 5),
    documentNumber: parsedNumber.documentNumber,
    passportSeries: parsedNumber.series,
    passportNumber: parsedNumber.number,
    pinfl,
    birthDate,
    sex,
    expiryDate,
    nationality: nationality === "XXX" ? "UZB" : nationality,
    surname,
    givenNames,
    fullName,
  }
}

function parseTd3(mrz) {
  if (mrz.length < 88) return null
  const line1 = mrz.slice(0, 44)
  const line2 = mrz.slice(44, 88)
  if (!line1.startsWith("P")) return null

  const nameParts = line1.slice(5).split("<<")
  const surname = titleCaseMrzName(nameParts[0])
  const givenNames = titleCaseMrzName(nameParts.slice(1).join(" "))
  const documentNumber = line2.slice(0, 9).replace(/</g, "")
  const parsedNumber = splitDocumentNumber(documentNumber)
  const nationality = line2.slice(10, 13).replace(/</g, "")
  const birthDate = parseYyMmDd(line2.slice(13, 19))
  const pinfl = extractPinfl(line2.slice(28, 42))
  const sex = normalizeSex(line2.charAt(20) === "<" ? "" : line2.charAt(20), pinfl)
  const expiryDate = parseYyMmDd(line2.slice(21, 27), { expiry: true })

  return {
    format: "td3",
    documentType: "P",
    issuingState: line1.slice(2, 5),
    documentNumber: parsedNumber.documentNumber,
    passportSeries: parsedNumber.series,
    passportNumber: parsedNumber.number,
    pinfl,
    birthDate,
    sex,
    expiryDate,
    nationality,
    surname,
    givenNames,
    fullName: [surname, givenNames].filter(Boolean).join(" "),
  }
}

export function looksLikeIdMrz(raw) {
  const compact = compactMrz(raw)
  return compact.length >= 60 && /[IACP][A-Z<][A-Z]{3}/.test(compact)
}

export function parseIdMrz(raw) {
  const compact = compactMrz(raw)
  if (compact.length < 60) return null

  const td1Match = compact.match(/[IAC][A-Z<][A-Z]{3}[A-Z0-9<]{85}/)
  if (td1Match) {
    const parsed = parseTd1(td1Match[0].slice(0, 90))
    if (parsed?.fullName || parsed?.documentNumber) return parsed
  }

  const td3Match = compact.match(/P[A-Z<][A-Z]{3}[A-Z0-9<]{83}/)
  if (td3Match) {
    const parsed = parseTd3(td3Match[0].slice(0, 88))
    if (parsed?.fullName || parsed?.documentNumber) return parsed
  }

  if (compact.length >= 90) return parseTd1(compact.slice(0, 90))
  if (compact.startsWith("P") && compact.length >= 88) return parseTd3(compact.slice(0, 88))
  return null
}

export function isMrzCharsetKey(key) {
  return key.length === 1 && MRZ_CHAR.test(key.toUpperCase())
}

export { normalizeSex, sexFromPinfl }
