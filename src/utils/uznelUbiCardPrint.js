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

/**
 * Default Print_UZB_CODE128.JRF layout (350×200). Uznel normally loads these
 * from registry LABEL_UZB_USER_*; without them the viewer shows only the
 * static logo/frame.
 */
const DEFAULT_LAYOUT = {
  CARDWIDTH: DEFAULT_CARD_WIDTH,
  CARDHEIGHT: DEFAULT_CARD_HEIGHT,
  LOGOTOP: '5',
  LOGOLEFT: '5',
  LOGOWIDTH: '60',
  LOGOHEIGHT: '25',
  IMGTOP: '35',
  IMGLEFT: '250',
  IMGWIDTH: '80',
  IMGHEIGHT: '90',
  BARCODETOP: '155',
  BARCODELEFT: '10',
  BARCODEWIDTH: '180',
  BARCODEHEIGHT: '35',
  TEXT1: 'ID-karta raqami:',
  TEXT1TOP: '35',
  TEXT1LEFT: '10',
  TEXT1SIZE: '9',
  TEXT1KIND: 'Arial',
  TEXT1STYLE: '0',
  TEXT2: 'Familiyasi:',
  TEXT2TOP: '50',
  TEXT2LEFT: '10',
  TEXT2SIZE: '9',
  TEXT2KIND: 'Arial',
  TEXT2STYLE: '0',
  TEXT3: 'Ismi:',
  TEXT3TOP: '65',
  TEXT3LEFT: '10',
  TEXT3SIZE: '9',
  TEXT3KIND: 'Arial',
  TEXT3STYLE: '0',
  TEXT4: 'Sharifi:',
  TEXT4TOP: '80',
  TEXT4LEFT: '10',
  TEXT4SIZE: '9',
  TEXT4KIND: 'Arial',
  TEXT4STYLE: '0',
  TEXT5: 'Toifasi:',
  TEXT5TOP: '95',
  TEXT5LEFT: '10',
  TEXT5SIZE: '9',
  TEXT5KIND: 'Arial',
  TEXT5STYLE: '0',
  TEXT6: 'Kafedrasi:',
  TEXT6TOP: '110',
  TEXT6LEFT: '10',
  TEXT6SIZE: '9',
  TEXT6KIND: 'Arial',
  TEXT6STYLE: '0',
  TEXT7: 'Alisher Navoiy nomidagi',
  TEXT7TOP: '8',
  TEXT7LEFT: '70',
  TEXT7SIZE: '10',
  TEXT7KIND: 'Arial',
  TEXT7STYLE: '1',
  TEXT8: "O'zbekiston Milliy kutubxonasi",
  TEXT8TOP: '20',
  TEXT8LEFT: '70',
  TEXT8SIZE: '10',
  TEXT8KIND: 'Arial',
  TEXT8STYLE: '1',
  DATA1TOP: '35',
  DATA1LEFT: '110',
  DATA1SIZE: '9',
  DATA1KIND: 'Arial',
  DATA1STYLE: '1',
  DATA2TOP: '50',
  DATA2LEFT: '110',
  DATA2SIZE: '9',
  DATA2KIND: 'Arial',
  DATA2STYLE: '1',
  DATA3TOP: '65',
  DATA3LEFT: '110',
  DATA3SIZE: '9',
  DATA3KIND: 'Arial',
  DATA3STYLE: '1',
  DATA4TOP: '80',
  DATA4LEFT: '110',
  DATA4SIZE: '9',
  DATA4KIND: 'Arial',
  DATA4STYLE: '1',
  DATA5TOP: '95',
  DATA5LEFT: '110',
  DATA5SIZE: '9',
  DATA5KIND: 'Arial',
  DATA5STYLE: '1',
  DATA6TOP: '110',
  DATA6LEFT: '110',
  DATA6SIZE: '9',
  DATA6KIND: 'Arial',
  DATA6STYLE: '1',
  DATA7TOP: '170',
  DATA7LEFT: '250',
  DATA7SIZE: '12',
  DATA7KIND: 'Arial',
  DATA7STYLE: '1',
}

const LAYOUT_ARG_KEYS = Object.keys(DEFAULT_LAYOUT)

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
  const merged = {
    ...DEFAULT_LAYOUT,
    ...layout,
  }
  if (layout.cardWidth != null) merged.CARDWIDTH = String(layout.cardWidth)
  if (layout.cardHeight != null) merged.CARDHEIGHT = String(layout.cardHeight)

  let out = ''
  for (const key of LAYOUT_ARG_KEYS) {
    const value = merged[key] != null ? merged[key] : ''
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
