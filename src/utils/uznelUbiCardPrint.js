/**
 * Launch Uznel's official UZB member-card report through UbiViewer
 * (plugin.jsp → local UbiViewerWS), matching PrintMemberCard in
 * lon::formLabel_Photo4UserUZB.xfdl.
 */

import { toNewUzbekLatin } from '@/utils/printMemberCard'

const DEFAULT_FN_BASE = 'https://uznel.natlib.uz:444/FN/'
const DEFAULT_JRF = 'Print_UZB_CODE128.JRF'
const DEFAULT_CARD_WIDTH = '245'
const DEFAULT_CARD_HEIGHT = '154'

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
 * Positions from Print_UZB_CODE128.JRF. The data band is 245×155;
 * TEXT1–2 sit beside the logo (width 150), TEXT3–8 are the six labels,
 * and photo / barcode / expiry must stay inside that band or they are clipped.
 */
const DEFAULT_LAYOUT = {
  CARDWIDTH: DEFAULT_CARD_WIDTH,
  CARDHEIGHT: DEFAULT_CARD_HEIGHT,
  LOGOTOP: '3',
  LOGOLEFT: '3',
  LOGOWIDTH: '87',
  LOGOHEIGHT: '20',
  IMGTOP: '27',
  IMGLEFT: '168',
  IMGWIDTH: '70',
  IMGHEIGHT: '90',
  BARCODETOP: '120',
  BARCODELEFT: '4',
  BARCODEWIDTH: '150',
  BARCODEHEIGHT: '34',
  TEXT1: 'Alişer Navoiy nomidagi',
  TEXT1TOP: '2',
  TEXT1LEFT: '94',
  TEXT1SIZE: '8',
  TEXT1KIND: 'Arial',
  TEXT1STYLE: '1',
  TEXT2: 'Özbekiston Milliy kutubxonasi',
  TEXT2TOP: '12',
  TEXT2LEFT: '94',
  TEXT2SIZE: '8',
  TEXT2KIND: 'Arial',
  TEXT2STYLE: '1',
  TEXT3: 'ID-karta raqami:',
  TEXT3TOP: '30',
  TEXT3LEFT: '6',
  TEXT3SIZE: '8',
  TEXT3KIND: 'Arial',
  TEXT3STYLE: '0',
  TEXT4: 'Familyasi:',
  TEXT4TOP: '44',
  TEXT4LEFT: '6',
  TEXT4SIZE: '8',
  TEXT4KIND: 'Arial',
  TEXT4STYLE: '0',
  TEXT5: 'Ismi:',
  TEXT5TOP: '58',
  TEXT5LEFT: '6',
  TEXT5SIZE: '8',
  TEXT5KIND: 'Arial',
  TEXT5STYLE: '0',
  TEXT6: 'Şarifi:',
  TEXT6TOP: '72',
  TEXT6LEFT: '6',
  TEXT6SIZE: '8',
  TEXT6KIND: 'Arial',
  TEXT6STYLE: '0',
  TEXT7: 'Toifasi:',
  TEXT7TOP: '86',
  TEXT7LEFT: '6',
  TEXT7SIZE: '8',
  TEXT7KIND: 'Arial',
  TEXT7STYLE: '0',
  TEXT8: 'Kafedrasi:',
  TEXT8TOP: '100',
  TEXT8LEFT: '6',
  TEXT8SIZE: '8',
  TEXT8KIND: 'Arial',
  TEXT8STYLE: '0',
  DATA1TOP: '30',
  DATA1LEFT: '86',
  DATA1SIZE: '8',
  DATA1KIND: 'Arial',
  DATA1STYLE: '1',
  DATA2TOP: '44',
  DATA2LEFT: '86',
  DATA2SIZE: '8',
  DATA2KIND: 'Arial',
  DATA2STYLE: '1',
  DATA3TOP: '58',
  DATA3LEFT: '86',
  DATA3SIZE: '8',
  DATA3KIND: 'Arial',
  DATA3STYLE: '1',
  DATA4TOP: '72',
  DATA4LEFT: '86',
  DATA4SIZE: '8',
  DATA4KIND: 'Arial',
  DATA4STYLE: '1',
  DATA5TOP: '86',
  DATA5LEFT: '86',
  DATA5SIZE: '8',
  DATA5KIND: 'Arial',
  DATA5STYLE: '1',
  DATA6TOP: '100',
  DATA6LEFT: '86',
  DATA6SIZE: '8',
  DATA6KIND: 'Arial',
  DATA6STYLE: '1',
  DATA7TOP: '126',
  DATA7LEFT: '168',
  DATA7SIZE: '11',
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
  const parts = toNewUzbekLatin(fullName).trim().split(/\s+/).filter(Boolean)
  return {
    first: parts[0] || '',
    middle: parts[1] || '',
    last: parts.slice(2).join(' '),
  }
}

/**
 * The report image item loads a URL (same as Uznel's LnkUserPhotoQry value).
 * A raw base64 string is not drawn. Data URIs are only a last resort.
 */
function photoDataUri(member) {
  const raw = String(member?.PHOTO || member?.photo || member?.photoSrc || '').trim()
  if (!raw || /^https?:\/\//i.test(raw)) return ''
  if (/^data:image\//i.test(raw)) return raw.replace(/\s+/g, '')
  return `data:image/jpeg;base64,${raw.replace(/\s+/g, '')}`
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
    member?.USER_SEQ_NO
    || member?.SEQUENCE_NO
    || member?.sequenceNo
    || member?.UZNEL_ORG_ROW?.SEQUENCE_NO
    || member?.UZNEL_ORG_ROW?.USER_SEQ_NO
    || '',
  ).trim()
  const position = toNewUzbekLatin(member?.USER_POSITION || member?.position || '').trim()
  const kafedra = toNewUzbekLatin(member?.kafedra ?? member?.DATA2 ?? '').trim()
  const expiry = formatExpiry(member?.LIB_USE_LDATE || member?.expiryYyyymmdd || '')
  const names = splitUserName(userName)
  const photo = buildPhotoUrl(fnBase, sequenceNo) || member?.PHOTO_URL || photoDataUri(member)

  const row = {
    NAME: toNewUzbekLatin(userName),
    USER_ID: cardNo,
    BARCODE_NO: cardNo,
    PHOTO: photo,
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
