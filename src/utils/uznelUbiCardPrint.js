/**
 * Launch Uznel's official UZB member-card report through UbiViewer
 * (plugin.jsp → local UbiViewerWS), matching PrintMemberCard in
 * lon::formLabel_Photo4UserUZB.xfdl.
 */

const DEFAULT_FN_BASE = 'https://uznel.natlib.uz:444/FN/'
const DEFAULT_JRF = 'Print_UZB_CODE128.JRF'
const DEFAULT_CARD_WIDTH = '350'
const DEFAULT_CARD_HEIGHT = '200'

const SQL1_COLUMNS = [
  'NAME',
  'USER_ID',
  'BARCODE_NO',
  'PHOTO',
  'USER_NO',
  'FIRST_NAME',
  'MIDDLE_NAME',
  'LAST_NAME',
  'DATA1',
  'DATA2',
  'LIB_USE_LDATE',
]

const LAYOUT_ARG_KEYS = [
  'CARDWIDTH', 'CARDHEIGHT',
  'LOGOTOP', 'LOGOLEFT', 'LOGOWIDTH', 'LOGOHEIGHT',
  'IMGTOP', 'IMGLEFT', 'IMGWIDTH', 'IMGHEIGHT',
  'BARCODETOP', 'BARCODELEFT', 'BARCODEWIDTH', 'BARCODEHEIGHT',
  'TEXT1', 'TEXT1TOP', 'TEXT1LEFT', 'TEXT1SIZE', 'TEXT1KIND', 'TEXT1STYLE',
  'TEXT2', 'TEXT2TOP', 'TEXT2LEFT', 'TEXT2SIZE', 'TEXT2KIND', 'TEXT2STYLE',
  'TEXT3', 'TEXT3TOP', 'TEXT3LEFT', 'TEXT3SIZE', 'TEXT3KIND', 'TEXT3STYLE',
  'TEXT4', 'TEXT4TOP', 'TEXT4LEFT', 'TEXT4SIZE', 'TEXT4KIND', 'TEXT4STYLE',
  'TEXT5', 'TEXT5TOP', 'TEXT5LEFT', 'TEXT5SIZE', 'TEXT5KIND', 'TEXT5STYLE',
  'TEXT6', 'TEXT6TOP', 'TEXT6LEFT', 'TEXT6SIZE', 'TEXT6KIND', 'TEXT6STYLE',
  'TEXT7', 'TEXT7TOP', 'TEXT7LEFT', 'TEXT7SIZE', 'TEXT7KIND', 'TEXT7STYLE',
  'TEXT8', 'TEXT8TOP', 'TEXT8LEFT', 'TEXT8SIZE', 'TEXT8KIND', 'TEXT8STYLE',
  'DATA1TOP', 'DATA1LEFT', 'DATA1SIZE', 'DATA1KIND', 'DATA1STYLE',
  'DATA2TOP', 'DATA2LEFT', 'DATA2SIZE', 'DATA2KIND', 'DATA2STYLE',
  'DATA3TOP', 'DATA3LEFT', 'DATA3SIZE', 'DATA3KIND', 'DATA3STYLE',
  'DATA4TOP', 'DATA4LEFT', 'DATA4SIZE', 'DATA4KIND', 'DATA4STYLE',
  'DATA5TOP', 'DATA5LEFT', 'DATA5SIZE', 'DATA5KIND', 'DATA5STYLE',
  'DATA6TOP', 'DATA6LEFT', 'DATA6SIZE', 'DATA6KIND', 'DATA6STYLE',
  'DATA7TOP', 'DATA7LEFT', 'DATA7SIZE', 'DATA7KIND', 'DATA7STYLE',
]

function trimSlash(url) {
  return String(url || '').replace(/\/+$/, '')
}

export function deriveUznelFnBase(actionUrl) {
  const raw = String(actionUrl || '').trim()
  if (!raw) return DEFAULT_FN_BASE
  const stripped = raw.replace(/\/Manager\/action\.do(?:\?.*)?$/i, '/')
  if (stripped !== raw) return stripped.endsWith('/') ? stripped : `${stripped}/`
  try {
    const u = new URL(raw)
    const path = u.pathname.replace(/\/Manager\/.*$/i, '/').replace(/\/+$/, '/')
    return `${u.origin}${path.startsWith('/') ? path : `/${path}`}`
  } catch {
    return DEFAULT_FN_BASE
  }
}

function splitUserName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    first: parts[0] || '',
    middle: parts[1] || '',
    last: parts.slice(2).join(' '),
  }
}

function formatExpiry(yyyymmdd) {
  const raw = String(yyyymmdd || '').trim()
  if (!/^\d{8}$/.test(raw)) return String(yyyymmdd || '').trim()
  return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`
}

function buildArgs(layout = {}) {
  const values = {
    CARDWIDTH: layout.cardWidth || DEFAULT_CARD_WIDTH,
    CARDHEIGHT: layout.cardHeight || DEFAULT_CARD_HEIGHT,
  }
  let out = ''
  for (const key of LAYOUT_ARG_KEYS) {
    const value = values[key] != null ? values[key] : (layout[key] ?? '')
    out += `${key}#${value}#`
  }
  return out
}

/**
 * Encode sql1 dataset the same way Uznel makeDsData / nexacro.wrapQuote does.
 */
export function encodeUznelCardDataset(row) {
  let encoded = ''
  for (const col of SQL1_COLUMNS) {
    const value = row[col]
    if (value === undefined || value === null || value === '') {
      encoded += ' ^t'
    } else {
      encoded += `${value}^t`
    }
  }
  encoded += '^n'
  return JSON.stringify(encoded)
}

function buildPhotoUrl(fnBase, sequenceNo) {
  const seq = String(sequenceNo || '').trim()
  if (!seq) return ''
  const base = trimSlash(fnBase)
  return `${base}/Manager/action.do?className=action.lnk.LnkUserPhotoQry&USERID=${encodeURIComponent(seq)}&partSend=Y`
}

export function buildUznelCardPayload(member, config = {}) {
  const fnBase = deriveUznelFnBase(config.fnBase || config.actionUrl || DEFAULT_FN_BASE)
  const jrf = config.jrf || DEFAULT_JRF
  const userNo = String(member?.USER_NO || member?.userNo || '').trim()
  const userName = String(member?.USER_NAME || member?.userName || '').trim()
  const cardNo = String(member?.CARD_NO || member?.cardNo || userNo).trim()
  const sequenceNo = String(
    member?.USER_SEQ_NO || member?.SEQUENCE_NO || member?.sequenceNo || '',
  ).trim()
  const position = String(member?.USER_POSITION || member?.position || '').trim()
  const kafedra = String(member?.kafedra ?? member?.DATA2 ?? '').trim()
  const expiry = formatExpiry(member?.LIB_USE_LDATE || member?.expiryYyyymmdd || '')
  const names = splitUserName(userName)

  const row = {
    NAME: userName,
    USER_ID: cardNo,
    BARCODE_NO: cardNo,
    PHOTO: buildPhotoUrl(fnBase, sequenceNo),
    USER_NO: userNo,
    FIRST_NAME: names.first,
    MIDDLE_NAME: names.middle,
    LAST_NAME: names.last,
    DATA1: position,
    DATA2: kafedra,
    LIB_USE_LDATE: expiry,
  }

  return {
    pluginUrl: `${trimSlash(fnBase)}/link/ubireport/plugin/plugin.jsp`,
    jrf,
    args: buildArgs(config.layout),
    ds: encodeUznelCardDataset(row),
    row,
  }
}

/**
 * Open Uznel plugin.jsp in a popup and POST jrf/args/ds (same as refreshUbiReport).
 * @returns {boolean} true if a window was opened
 */
export function openUznelUbiCardPrint(member, config = {}) {
  const payload = buildUznelCardPayload(member, config)
  if (!payload.row.USER_NO) return false

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return false

  const doc = printWindow.document
  doc.open()
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ID-karta</title></head><body>
<form id="ubi_form" method="post" action="${payload.pluginUrl}">
  <input type="hidden" name="jrf" />
  <input type="hidden" name="args" />
  <input type="hidden" name="ds" />
</form>
<p style="font-family:Arial,sans-serif;padding:16px">UbiViewer ochilmoqda…</p>
</body></html>`)
  doc.close()

  const form = doc.getElementById('ubi_form')
  form.elements.namedItem('jrf').value = payload.jrf
  form.elements.namedItem('args').value = payload.args
  form.elements.namedItem('ds').value = payload.ds
  form.submit()
  return true
}
