const axios = require("axios")
const https = require("https")

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

const DEFAULT_URL = "https://uznel.natlib.uz:444/FN/Manager/action.do"
const DEFAULT_USERID = "ILHOM"
const DEFAULT_LOCATION = "R0000000"
const DEFAULT_GRADE = "0001"
const DEFAULT_LOAN_CHECK = "0001"
const DEFAULT_STATUS = "0001"
const DEFAULT_TEMPLATE = "00000001"
const DEFAULT_CMPNY = "0000238"
const DEFAULT_CLASS = "0003"
const SYNC_DELAY_MS = 400

const POSITION_CODES = {
  Talaba: "0001",
  "O'qituvchi": "0002",
  "O‘qituvchi": "0002",
  Professor: "0003",
  Tadqiqotchi: "0004",
  Xodim: "0005",
  Boshqa: "0006",
}

const STUSER_COLUMNS = `		<ColumnInfo>
			<Column id="ADDRS" type="STRING" size="200" prop="default" />
			<Column id="BIRTHDAY" type="STRING" size="8" prop="default" />
			<Column id="EMAIL" type="STRING" size="200" prop="default" />
			<Column id="FAMILY_ID" type="STRING" size="20" prop="default" />
			<Column id="GPIN" type="STRING" size="50" prop="default" />
			<Column id="GRADE_CODE" type="STRING" size="4" prop="default" />
			<Column id="INSERT_DATE" type="STRING" size="8" prop="default" />
			<Column id="LOAN_CHECK" type="STRING" size="4" prop="default" />
			<Column id="LOCATION" type="STRING" size="8" prop="default" />
			<Column id="MOBILE_NO" type="STRING" size="50" prop="default" />
			<Column id="PROCESS_ADMIN_ID" type="STRING" size="20" prop="default" />
			<Column id="REMARK" type="STRING" size="1000" prop="default" />
			<Column id="RES_REG_NO" type="STRING" size="15" prop="default" />
			<Column id="SEX" type="STRING" size="4" prop="default" />
			<Column id="STATUS_CODE" type="STRING" size="4" prop="default" />
			<Column id="TEL_NO" type="STRING" size="50" prop="default" />
			<Column id="TEMPLATE_CODE" type="STRING" size="8" prop="default" />
			<Column id="UPDATE_DATE" type="STRING" size="8" prop="default" />
			<Column id="USER_ID" type="STRING" size="256" prop="default" />
			<Column id="USER_NAME" type="STRING" size="256" prop="default" />
			<Column id="USER_NO" type="STRING" size="20" prop="default" />
			<Column id="USER_POSITION" type="STRING" size="4" prop="default" />
			<Column id="WEB_ID" type="STRING" size="20" prop="default" />
			<Column id="ZIP_CODE" type="STRING" size="50" prop="default" />
			<Column id="FAMILY_CNT" type="STRING" size="256" prop="default" />
			<Column id="PASSWORD" type="STRING" size="256" prop="default" />
			<Column id="SEQ_NO" type="STRING" size="256" prop="default" />
			<Column id="CMPNY_CODE" type="STRING" size="256" prop="default" />
			<Column id="FULL_CODE" type="STRING" size="256" prop="default" />
			<Column id="DEPT_CODE" type="STRING" size="256" prop="default" />
			<Column id="SMS_CHECK" type="STRING" size="256" prop="default" />
			<Column id="MAIL_CHECK" type="STRING" size="256" prop="default" />
			<Column id="CARD_PASSWORD" type="STRING" size="256"  />
			<Column id="LIB_USE_LDATE" type="STRING" size="256"  />
			<Column id="CLASS_CODE" type="STRING" size="256"  />
			<Column id="LOGIN_DATE" type="STRING" size="256"  />
			<Column id="UN_AGREE_FLAG" type="STRING" size="256"  />
			<Column id="UN_AGREE_DATE" type="STRING" size="256"  />
		</ColumnInfo>`

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/ /g, "&#32;")
}

function parseParameter(xml, id) {
  const match = String(xml || "").match(new RegExp(`<Parameter id="${id}"[^>]*>([\\s\\S]*?)</Parameter>`, "i"))
  return match ? String(match[1] || "").trim() : ""
}

function pad2(value) {
  return String(value).padStart(2, "0")
}

function fromLocalDate(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
}

function toYyyymmdd(value) {
  if (value === undefined || value === null || value === "") return ""
  if (value instanceof Date && !isNaN(value.getTime())) {
    return fromLocalDate(value)
  }
  const raw = String(value).trim()
  if (/^\d{8}$/.test(raw)) return raw
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return `${dateOnly[1]}${dateOnly[2]}${dateOnly[3]}`
  const dmy = raw.match(/^(\d{2})[./](\d{2})[./](\d{4})$/)
  if (dmy) return `${dmy[3]}${dmy[2]}${dmy[1]}`
  const parsed = new Date(raw)
  if (isNaN(parsed.getTime())) return ""
  return fromLocalDate(parsed)
}

function todayYyyymmdd() {
  return toYyyymmdd(new Date())
}

function addYearsYyyymmdd(yyyymmdd, years) {
  const source = toYyyymmdd(yyyymmdd) || todayYyyymmdd()
  const year = Number(source.slice(0, 4))
  const month = Number(source.slice(4, 6))
  const day = Number(source.slice(6, 8))
  const date = new Date(year + years, month - 1, day)
  if (date.getMonth() !== month - 1) date.setDate(0)
  return toYyyymmdd(date)
}

function mapSex(value) {
  const raw = String(value || "").trim().toUpperCase()
  if (raw === "0001" || raw === "0002") return raw
  if (raw === "M" || raw === "ERKAK" || raw === "MALE") return "0001"
  if (raw === "F" || raw === "AYOL" || raw === "FEMALE") return "0002"
  return ""
}

function mapPosition(value) {
  const raw = String(value || "").trim()
  if (/^\d{4}$/.test(raw)) return raw
  return POSITION_CODES[raw] || DEFAULT_GRADE
}

function mapTelNo(value) {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("998") && digits.length >= 12) return digits.slice(3, 12)
  if (digits.length > 9 && digits.length <= 12) return digits.slice(-9)
  return digits
}

function xmlCol(id, value) {
  return `\t\t\t\t<Col id="${id}">${xmlEscape(value ?? "")}</Col>\n`
}

function resolveMemberMaskId(member) {
  const userNo = String(member?.USER_NO || "").trim()
  if (!userNo) {
    throw new Error("USER_NO kerak")
  }
  return userNo
}

function buildUserCols(member) {
  const userNo = resolveMemberMaskId(member)
  const insertDate = toYyyymmdd(member.INSERT_DATE) || todayYyyymmdd()
  const birthday = toYyyymmdd(member.BIRTHDAY)
  const userId = process.env.UZNEL_USERID || DEFAULT_USERID
  const location = process.env.UZNEL_LOCATION || DEFAULT_LOCATION
  return [
    xmlCol("ADDRS", member.ADDRS),
    birthday ? xmlCol("BIRTHDAY", birthday) : "",
    xmlCol("GRADE_CODE", member.GRADE_CODE || process.env.UZNEL_GRADE_CODE || DEFAULT_GRADE),
    xmlCol("INSERT_DATE", insertDate),
    xmlCol("LOAN_CHECK", member.LOAN_CHECK || DEFAULT_LOAN_CHECK),
    xmlCol("LOCATION", member.LOCATION || location),
    xmlCol("PROCESS_ADMIN_ID", userId),
    xmlCol("SEX", mapSex(member.SEX) || "0001"),
    xmlCol("STATUS_CODE", member.STATUS_CODE || DEFAULT_STATUS),
    xmlCol("TEL_NO", mapTelNo(member.TEL_NO)),
    xmlCol("TEMPLATE_CODE", member.TEMPLATE_CODE || process.env.UZNEL_TEMPLATE_CODE || DEFAULT_TEMPLATE),
    xmlCol("USER_ID", userNo),
    xmlCol("USER_NAME", member.USER_NAME),
    xmlCol("USER_NO", userNo),
    xmlCol("USER_POSITION", mapPosition(member.USER_POSITION)),
    xmlCol("ZIP_CODE", String(member.ZIP_CODE || "").trim().toUpperCase()),
    xmlCol("CMPNY_CODE", member.CMPNY_CODE || process.env.UZNEL_CMPNY_CODE || DEFAULT_CMPNY),
    xmlCol("SMS_CHECK", member.SMS_CHECK || "Y"),
    xmlCol("MAIL_CHECK", member.MAIL_CHECK || "Y"),
    xmlCol("LIB_USE_LDATE", addYearsYyyymmdd(todayYyyymmdd(), 3)),
    xmlCol("CLASS_CODE", member.CLASS_CODE || process.env.UZNEL_CLASS_CODE || DEFAULT_CLASS),
  ].join("")
}

function buildUserDataset(member, rowType) {
  const rowOpen = rowType ? `<Row type="${rowType}">` : "<Row>"
  return `	<Dataset id="inds_stuser">
${STUSER_COLUMNS}
		<Rows>
			${rowOpen}
${buildUserCols(member)}			</Row>
		</Rows>
	</Dataset>
	<Dataset id="inds_userNotice">
		<ColumnInfo />
		<Rows>
		</Rows>
	</Dataset>`
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postUznelXml(xmlPayload) {
  const url = process.env.UZNEL_URL || DEFAULT_URL
  const cookie = String(process.env.UZNEL_COOKIE || "").trim().replace(/^['"]|['"]$/g, "")
  const origin = url.split("/FN/")[0]
  const headers = {
    Accept: "application/xml, text/xml, */*",
    "Cache-Control": "no-cache, no-store",
    "Content-Type": "text/xml",
    Origin: origin,
    Pragma: "no-cache",
    Referer: `${origin}/FN/app/index.html`,
    "X-Requested-With": "XMLHttpRequest",
  }
  if (cookie) headers.Cookie = cookie

  const { data } = await axios({
    method: "POST",
    url,
    timeout: xmlPayload.length > 50000 ? 45000 : 20000,
    httpsAgent,
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    responseType: "text",
    transformResponse: [(body) => body],
    data: xmlPayload,
  })

  const xml = typeof data === "string" ? data : String(data || "")
  return {
    xml,
    errorCode: parseParameter(xml, "ErrorCode"),
    errorMsg: parseParameter(xml, "ErrorMsg"),
  }
}

function assertUznelOk(result, fallback) {
  if (result.errorCode === "0") return result
  const error = new Error(result.errorMsg || fallback)
  error.uznelCode = result.errorCode
  throw error
}

async function fetchNextUserMaskId() {
  const userId = process.env.UZNEL_USERID || DEFAULT_USERID
  const location = process.env.UZNEL_LOCATION || DEFAULT_LOCATION
  const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.nexacroplatform.com/platform/dataset">
	<Parameters>
		<Parameter id="USERID">${xmlEscape(userId)}</Parameter>
		<Parameter id="className">action.set.user.SetUserMaskUserId</Parameter>
		<Parameter id="vLocation">${xmlEscape(location)}</Parameter>
		<Parameter id="vText" />
	</Parameters>
</Root>`

  const result = await postUznelXml(xmlPayload)
  assertUznelOk(result, "Uznel ID olinmadi")
  if (!result.errorMsg) {
    throw new Error("Uznel ID olinmadi")
  }
  return result.errorMsg
}

function histAdminIp() {
  return process.env.UZNEL_HIST_IP || "195.158.18.173"
}

function buildDupChkXml(member) {
  const userId = process.env.UZNEL_USERID || DEFAULT_USERID
  const location = process.env.UZNEL_LOCATION || DEFAULT_LOCATION
  const userNo = resolveMemberMaskId(member)
  return `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.nexacroplatform.com/platform/dataset">
	<Parameters>
		<Parameter id="USERID">${xmlEscape(userId)}</Parameter>
		<Parameter id="className">action.set.user.SetUserDupChk</Parameter>
		<Parameter id="vLocation">${xmlEscape(location)}</Parameter>
		<Parameter id="vCheckYn">Y</Parameter>
		<Parameter id="vCheckType">INSERT</Parameter>
		<Parameter id="vData" />
		<Parameter id="vWorkDiv">LAS</Parameter>
		<Parameter id="HistAdminIp">${xmlEscape(histAdminIp())}</Parameter>
		<Parameter id="HistRemark">${xmlEscape(userNo)}</Parameter>
		<Parameter id="HistDispId">lon.formUserInfoDP</Parameter>
	</Parameters>
${buildUserDataset(member, "insert")}
</Root>`
}

function buildInfoRegXml(member) {
  const userId = process.env.UZNEL_USERID || DEFAULT_USERID
  const location = process.env.UZNEL_LOCATION || DEFAULT_LOCATION
  const userNo = resolveMemberMaskId(member)
  return `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.nexacroplatform.com/platform/dataset">
	<Parameters>
		<Parameter id="USERID">${xmlEscape(userId)}</Parameter>
		<Parameter id="className">action.set.user.SetUserInfoReg</Parameter>
		<Parameter id="vLocation">${xmlEscape(location)}</Parameter>
		<Parameter id="sUserId">${xmlEscape(userNo)}</Parameter>
		<Parameter id="vCardPw" />
		<Parameter id="HistAdminIp">${xmlEscape(histAdminIp())}</Parameter>
		<Parameter id="HistDispId">lon.formUserInfoDP</Parameter>
	</Parameters>
${buildUserDataset(member, "")}
</Root>`
}

function parseCol(xml, id) {
  const match = String(xml || "").match(new RegExp(`<Col id="${id}"[^>]*>([\\s\\S]*?)</Col>`, "i"))
  return match ? String(match[1] || "").trim() : ""
}

function parseUserSeqNo(xml) {
  const fromParam = parseParameter(xml, "vUserSeqNo") || parseParameter(xml, "USER_SEQ_NO") || parseParameter(xml, "SEQUENCE_NO")
  if (fromParam) return fromParam
  const fromCol = parseCol(xml, "SEQUENCE_NO") || parseCol(xml, "USER_SEQ_NO") || parseCol(xml, "SEQ_NO")
  if (fromCol) return fromCol
  const errorMsg = parseParameter(xml, "ErrorMsg")
  return /^\d{4,}$/.test(errorMsg) ? errorMsg : ""
}

function normalizePhoto(photo) {
  if (!photo) return null
  let raw = String(photo).trim()
  const comma = raw.indexOf(",")
  if (/^data:/i.test(raw) && comma >= 0) raw = raw.slice(comma + 1)
  raw = raw.replace(/\s/g, "")
  if (!raw) return null
  const buffer = Buffer.from(raw, "base64")
  if (!buffer.length) return null
  return { base64: raw, fileSize: String(buffer.length) }
}

const STUSER_MOD_COLUMNS = `		<ColumnInfo>
			<Column id="SEQUENCE_NO" type="string" size="39"  />
			<Column id="USER_ID" type="string" size="20"  />
			<Column id="USER_NO" type="string" size="20"  />
			<Column id="WEB_ID" type="string" size="20"  />
			<Column id="USER_NAME" type="string" size="200"  />
			<Column id="FAMILY_ID" type="string" size="39"  />
			<Column id="BIRTHDAY" type="string" size="8"  />
			<Column id="SEX" type="string" size="4"  />
			<Column id="TEMPLATE_CODE" type="string" size="8"  />
			<Column id="USER_POSITION" type="string" size="4"  />
			<Column id="GRADE_CODE" type="string" size="4"  />
			<Column id="STATUS_CODE" type="string" size="4"  />
			<Column id="LOAN_CHECK" type="string" size="4"  />
			<Column id="EMAIL" type="string" size="4000"  />
			<Column id="MOBILE_NO" type="string" size="4000"  />
			<Column id="TEL_NO" type="string" size="4000"  />
			<Column id="ZIP_CODE" type="string" size="4000"  />
			<Column id="ADDRS" type="string" size="4000"  />
			<Column id="LOCATION" type="string" size="12"  />
			<Column id="INSERT_DATE" type="string" size="14"  />
			<Column id="UPDATE_DATE" type="string" size="14"  />
			<Column id="PROCESS_USER_ID" type="string" size="20"  />
			<Column id="REMARK" type="string" size="4000"  />
			<Column id="RES_REG_NO" type="string" size="0"  />
			<Column id="PASSWORD" type="string" size="200"  />
			<Column id="CMPNY_CODE" type="string" size="8"  />
			<Column id="DEPT_CODE" type="string" size="8"  />
			<Column id="FULL_CODE" type="string" size="16"  />
			<Column id="SMS_CHECK" type="string" size="1"  />
			<Column id="MAIL_CHECK" type="string" size="1"  />
			<Column id="CLASS_CODE" type="string" size="4"  />
			<Column id="LIB_USE_LDATE" type="string" size="8"  />
			<Column id="LOGIN_DATE" type="string" size="14"  />
			<Column id="UN_AGREE_DATE" type="string" size="14"  />
			<Column id="UN_AGREE_FLAG" type="string" size="4"  />
			<Column id="DUPINFO" type="string" size="64"  />
			<Column id="CONN_INFO" type="string" size="200"  />
		</ColumnInfo>`

const MOD_ROW_FIELDS = [
  "SEQUENCE_NO",
  "USER_ID",
  "USER_NO",
  "USER_NAME",
  "BIRTHDAY",
  "SEX",
  "TEMPLATE_CODE",
  "USER_POSITION",
  "GRADE_CODE",
  "STATUS_CODE",
  "LOAN_CHECK",
  "TEL_NO",
  "ZIP_CODE",
  "ADDRS",
  "LOCATION",
  "INSERT_DATE",
  "UPDATE_DATE",
  "PROCESS_USER_ID",
  "CMPNY_CODE",
  "FULL_CODE",
  "SMS_CHECK",
  "MAIL_CHECK",
  "CLASS_CODE",
  "LIB_USE_LDATE",
  "UN_AGREE_FLAG",
]

function snapshotModFields(member, userSeqNo) {
  const userNo = resolveMemberMaskId(member)
  const userId = process.env.UZNEL_USERID || DEFAULT_USERID
  const location = process.env.UZNEL_LOCATION || DEFAULT_LOCATION
  const cmpny = member.CMPNY_CODE || process.env.UZNEL_CMPNY_CODE || DEFAULT_CMPNY
  return {
    SEQUENCE_NO: String(userSeqNo || member.SEQUENCE_NO || member.USER_SEQ_NO || ""),
    USER_ID: userNo,
    USER_NO: userNo,
    USER_NAME: String(member.USER_NAME || ""),
    BIRTHDAY: toYyyymmdd(member.BIRTHDAY),
    SEX: mapSex(member.SEX) || "0001",
    TEMPLATE_CODE: member.TEMPLATE_CODE || process.env.UZNEL_TEMPLATE_CODE || DEFAULT_TEMPLATE,
    USER_POSITION: mapPosition(member.USER_POSITION),
    GRADE_CODE: member.GRADE_CODE || process.env.UZNEL_GRADE_CODE || DEFAULT_GRADE,
    STATUS_CODE: member.STATUS_CODE || DEFAULT_STATUS,
    LOAN_CHECK: member.LOAN_CHECK || DEFAULT_LOAN_CHECK,
    TEL_NO: mapTelNo(member.TEL_NO),
    ZIP_CODE: String(member.ZIP_CODE || "").trim().toUpperCase(),
    ADDRS: String(member.ADDRS || ""),
    LOCATION: member.LOCATION || location,
    INSERT_DATE: toYyyymmdd(member.INSERT_DATE) || todayYyyymmdd(),
    UPDATE_DATE: todayYyyymmdd(),
    PROCESS_USER_ID: userId,
    CMPNY_CODE: cmpny,
    FULL_CODE: member.FULL_CODE || cmpny,
    SMS_CHECK: member.SMS_CHECK || "Y",
    MAIL_CHECK: member.MAIL_CHECK || "Y",
    CLASS_CODE: member.CLASS_CODE || process.env.UZNEL_CLASS_CODE || DEFAULT_CLASS,
    LIB_USE_LDATE: addYearsYyyymmdd(todayYyyymmdd(), 3),
    UN_AGREE_FLAG: member.UN_AGREE_FLAG || "9999",
  }
}

function xmlColsFromSnapshot(snapshot, indent = "\t\t\t\t") {
  return MOD_ROW_FIELDS.map((id) => `${indent}<Col id="${id}">${xmlEscape(snapshot[id] ?? "")}</Col>\n`).join("")
}

function isUznelSynced(member) {
  return Boolean(
    member?.UZNEL_SYNCED
    || String(member?.USER_SEQ_NO || "").trim()
    || String(member?.SEQUENCE_NO || "").trim(),
  )
}

function resolveStoredSeqNo(member) {
  return String(member?.USER_SEQ_NO || member?.SEQUENCE_NO || "").trim()
}

function buildInfoModXml(member, userSeqNo) {
  const userId = process.env.UZNEL_USERID || DEFAULT_USERID
  const location = process.env.UZNEL_LOCATION || DEFAULT_LOCATION
  const userNo = resolveMemberMaskId(member)
  const nextRow = snapshotModFields(member, userSeqNo)
  const orgSource = member?.UZNEL_ORG_ROW && typeof member.UZNEL_ORG_ROW === "object"
    ? { ...snapshotModFields(member, userSeqNo), ...member.UZNEL_ORG_ROW, SEQUENCE_NO: userSeqNo }
    : nextRow
  return `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.nexacroplatform.com/platform/dataset">
	<Parameters>
		<Parameter id="USERID">${xmlEscape(userId)}</Parameter>
		<Parameter id="className">action.set.user.SetUserInfoMod</Parameter>
		<Parameter id="vLocation">${xmlEscape(location)}</Parameter>
		<Parameter id="vUserSeqNo">${xmlEscape(userSeqNo)}</Parameter>
		<Parameter id="vCheckYn">N</Parameter>
		<Parameter id="vCheckType">UPDATE</Parameter>
		<Parameter id="vCardPw" />
		<Parameter id="vTargetUserId">${xmlEscape(userNo)}</Parameter>
		<Parameter id="vWorkDiv">LAS</Parameter>
		<Parameter id="HistRemark">${xmlEscape(userNo)}</Parameter>
		<Parameter id="HistAdminIp">${xmlEscape(histAdminIp())}</Parameter>
		<Parameter id="HistDispId">lon.formUserInfoDP</Parameter>
	</Parameters>
	<Dataset id="inds_stuser">
${STUSER_MOD_COLUMNS}
		<Rows>
			<Row type="update">
${xmlColsFromSnapshot(nextRow)}				<OrgRow>
${xmlColsFromSnapshot(orgSource, "\t\t\t\t\t")}				</OrgRow>
			</Row>
		</Rows>
	</Dataset>
	<Dataset id="inds_userNotice">
		<ColumnInfo />
		<Rows>
		</Rows>
	</Dataset>
</Root>`
}

function buildImageRegXml(member, userSeqNo, photo) {
  const userId = process.env.UZNEL_USERID || DEFAULT_USERID
  const location = process.env.UZNEL_LOCATION || DEFAULT_LOCATION
  const userNo = resolveMemberMaskId(member)
  return `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.nexacroplatform.com/platform/dataset">
	<Parameters>
		<Parameter id="USERID">${xmlEscape(userId)}</Parameter>
		<Parameter id="className">action.set.user.SetUserImageReg</Parameter>
		<Parameter id="vLocation">${xmlEscape(location)}</Parameter>
		<Parameter id="vUserSeqNo">${xmlEscape(userSeqNo)}</Parameter>
	</Parameters>
	<Dataset id="inds_temp">
		<ColumnInfo>
			<Column id="USER_ID" type="STRING" size="20"  />
			<Column id="PHOTO" type="BLOB" size="4000"  />
			<Column id="FILE_SIZE" type="STRING" size="15"  />
			<Column id="LOCA" type="STRING" size="12"  />
			<Column id="USER_SEQ_NO" type="STRING" size="39"  />
		</ColumnInfo>
		<Rows>
			<Row type="insert">
				<Col id="USER_ID">${xmlEscape(userNo)}</Col>
				<Col id="PHOTO">${photo.base64}</Col>
				<Col id="FILE_SIZE">${xmlEscape(photo.fileSize)}</Col>
				<Col id="LOCA">${xmlEscape(location)}</Col>
			</Row>
		</Rows>
	</Dataset>
</Root>`
}

async function syncPhoto(payload, userSeqNo) {
  const photo = normalizePhoto(payload.PHOTO)
  if (!photo) return { photoSynced: false }
  if (!userSeqNo) {
    throw new Error("Foydalanuvchi yozildi, lekin rasm uchun USER_SEQ_NO topilmadi")
  }
  await delay(SYNC_DELAY_MS)
  const imageResult = await postUznelXml(buildImageRegXml(payload, userSeqNo, photo))
  assertUznelOk(imageResult, "Uznelga rasm yozish muvaffaqiyatsiz")
  return { photoSynced: true }
}

async function registerUznelUser(member) {
  const userNo = resolveMemberMaskId(member)
  const userName = String(member?.USER_NAME || "").trim()
  if (!userName) throw new Error("USER_NAME kerak")

  const payload = {
    ...member,
    USER_NO: userNo,
    USER_ID: userNo,
    BIRTHDAY: toYyyymmdd(member?.BIRTHDAY),
    INSERT_DATE: toYyyymmdd(member?.INSERT_DATE) || todayYyyymmdd(),
  }

  const existingSeq = resolveStoredSeqNo(payload)
  if (isUznelSynced(payload) && !existingSeq) {
    throw new Error("Bu foydalanuvchi Uznelga yozilgan, lekin SEQUENCE_NO saqlanmagan")
  }
  if (existingSeq) {
    const updated = await postUznelXml(buildInfoModXml(payload, existingSeq))
    assertUznelOk(updated, "Uznelda yangilash muvaffaqiyatsiz")
    let photoSynced = false
    let photoError = null
    try {
      photoSynced = (await syncPhoto(payload, existingSeq)).photoSynced
    } catch (error) {
      photoError = error.message
    }
    return {
      USER_NO: userNo,
      USER_SEQ_NO: existingSeq,
      SEQUENCE_NO: existingSeq,
      UZNEL_SYNCED: true,
      UZNEL_ORG_ROW: snapshotModFields(payload, existingSeq),
      LIB_USE_LDATE: addYearsYyyymmdd(todayYyyymmdd(), 3),
      updated: true,
      photoSynced,
      photoError,
    }
  }

  const dup = await postUznelXml(buildDupChkXml(payload))
  assertUznelOk(dup, "Uznel dublikat tekshiruvi muvaffaqiyatsiz")

  await delay(SYNC_DELAY_MS)

  const registered = await postUznelXml(buildInfoRegXml(payload))
  assertUznelOk(registered, "Uznelga yozish muvaffaqiyatsiz")
  const userSeqNo = parseUserSeqNo(registered.xml) || parseUserSeqNo(dup.xml)
  let photoSynced = false
  let photoError = null
  try {
    photoSynced = (await syncPhoto(payload, userSeqNo)).photoSynced
  } catch (error) {
    photoError = error.message
  }

  return {
    USER_NO: userNo,
    USER_SEQ_NO: userSeqNo || "",
    SEQUENCE_NO: userSeqNo || "",
    UZNEL_SYNCED: Boolean(userSeqNo),
    UZNEL_ORG_ROW: snapshotModFields(payload, userSeqNo),
    LIB_USE_LDATE: addYearsYyyymmdd(todayYyyymmdd(), 3),
    updated: false,
    photoSynced,
    photoError,
  }
}

module.exports = {
  fetchNextUserMaskId,
  registerUznelUser,
  postUznelXml,
  buildDupChkXml,
  buildInfoRegXml,
  buildInfoModXml,
  isUznelSynced,
  toYyyymmdd,
  addYearsYyyymmdd,
  mapSex,
  mapPosition,
  mapTelNo,
  parseUserSeqNo,
  normalizePhoto,
}
