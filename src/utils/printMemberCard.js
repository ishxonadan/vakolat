import { generateBarcode } from '@/utils/barcode'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const APOSTROPHE = "['\u2018\u2019\u02BB\u02BC\u0060\u02B9\u2032]"

/** Old Latin digraphs → Ç Ş Ö Ğ. */
export function toNewUzbekLatin(value) {
  return String(value ?? '')
    .replace(new RegExp(`G${APOSTROPHE}`, 'g'), 'Ğ')
    .replace(new RegExp(`g${APOSTROPHE}`, 'g'), 'ğ')
    .replace(new RegExp(`O${APOSTROPHE}`, 'g'), 'Ö')
    .replace(new RegExp(`o${APOSTROPHE}`, 'g'), 'ö')
    .replace(/SH/g, 'Ş')
    .replace(/Sh/g, 'Ş')
    .replace(/sh/g, 'ş')
    .replace(/CH/g, 'Ç')
    .replace(/Ch/g, 'Ç')
    .replace(/ch/g, 'ç')
}

function splitUserName(fullName) {
  const parts = toNewUzbekLatin(fullName).trim().split(/\s+/).filter(Boolean)
  return {
    familiya: parts[0] || '',
    ismi: parts[1] || '',
    sharifi: parts.slice(2).join(' '),
  }
}

function formatExpiry(yyyymmdd) {
  const raw = String(yyyymmdd || '').trim()
  if (!/^\d{8}$/.test(raw)) return ''
  return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`
}

function normalizePhotoSrc(photoSrc) {
  const raw = String(photoSrc || '').trim()
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw
  return `data:image/jpeg;base64,${raw}`
}

function logoUrl() {
  return new URL('/card-building-logo.png', window.location.origin).href
}

/**
 * Open a print window for the National Library member ID card.
 * @param {{
 *   userNo: string,
 *   userName: string,
 *   position: string,
 *   kafedra: string|number,
 *   photoSrc?: string,
 *   expiryYyyymmdd: string,
 * }} member
 */
export function printMemberCard(member) {
  const userNo = String(member?.userNo || '').trim()
  const names = splitUserName(member?.userName)
  const position = toNewUzbekLatin(member?.position).trim()
  const kafedra = toNewUzbekLatin(member?.kafedra).trim()
  const expiry = formatExpiry(member?.expiryYyyymmdd)
  const photoSrc = normalizePhotoSrc(member?.photoSrc)
  const barcodeSrc = generateBarcode(userNo, {
    displayValue: false,
    height: 64,
    width: 1.7,
    margin: 0,
    transparent: true,
  })

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ID-karta - ${escapeHtml(userNo)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 8px;
      color: #111;
    }
    .id-card {
      width: 86mm;
      height: 54mm;
      border-radius: 3.2mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #fff;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .id-card-header {
      display: flex;
      align-items: flex-end;
      gap: 1.9mm;
      padding: 1.9mm 2.9mm 0.6mm;
      border-bottom: 0.25mm solid #6b6b73;
    }
    .id-card-header .logo { width: 31mm; flex-shrink: 0; line-height: 0; }
    .id-card-header .logo img { display: block; width: 100%; height: auto; }
    .id-card-title {
      flex: 1;
      min-width: 0;
      font-size: 2.9mm;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.015em;
      padding-bottom: 0.3mm;
    }
    .id-card-body {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 20.2mm;
      column-gap: 1.2mm;
      padding: 1.4mm 2.9mm 1mm;
      min-height: 0;
    }
    .id-rows {
      display: grid;
      grid-template-columns: 26.6mm minmax(0, 1fr);
      grid-template-rows: repeat(6, minmax(0, 1fr));
      column-gap: 1.5mm;
      height: 100%;
      font-size: 2.85mm;
      line-height: 1.05;
    }
    .id-label, .id-value { align-self: center; min-width: 0; }
    .id-label { font-weight: 400; white-space: nowrap; }
    .id-value {
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .id-photo {
      width: 20.2mm;
      height: 100%;
      background: #fff;
      overflow: hidden;
      align-self: stretch;
    }
    .id-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 18%;
      display: block;
      filter: grayscale(1);
    }
    .id-card-footer {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-rows: auto auto;
      column-gap: 2mm;
      align-items: end;
      border-top: 0.28mm solid #111;
      padding: 0.9mm 2.9mm 1.15mm;
    }
    .id-bars {
      grid-column: 1;
      grid-row: 1;
      width: 44.7mm;
      height: auto;
      display: block;
    }
    .id-expiry {
      grid-column: 2;
      grid-row: 1;
      justify-self: end;
      align-self: end;
      font-size: 3.9mm;
      font-weight: 800;
      letter-spacing: 0.01em;
      line-height: 1;
      white-space: nowrap;
      padding-bottom: 0.1mm;
    }
    .id-barcode-text {
      grid-column: 1;
      grid-row: 2;
      width: 44.7mm;
      text-align: center;
      font-size: 2.1mm;
      font-weight: 500;
      letter-spacing: 0.04em;
      line-height: 1;
      margin-top: 0.3mm;
    }
    @media print {
      body { padding: 0; min-height: auto; background: #fff; }
      .id-card { border-radius: 0; }
      @page {
        size: 86mm 54mm;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="id-card">
    <div class="id-card-header">
      <div class="logo"><img src="${logoUrl()}" alt="" /></div>
      <div class="id-card-title">Alişer Navoiy nomidagi<br/>Özbekiston Milliy kutubxonasi</div>
    </div>
    <div class="id-card-body">
      <div class="id-rows">
        <div class="id-label">ID-karta raqami:</div><div class="id-value">${escapeHtml(userNo)}</div>
        <div class="id-label">Familyasi:</div><div class="id-value">${escapeHtml(names.familiya)}</div>
        <div class="id-label">Ismi:</div><div class="id-value">${escapeHtml(names.ismi)}</div>
        <div class="id-label">Şarifi:</div><div class="id-value">${escapeHtml(names.sharifi)}</div>
        <div class="id-label">Toifasi:</div><div class="id-value">${escapeHtml(position)}</div>
        <div class="id-label">Kafedrasi:</div><div class="id-value">${escapeHtml(kafedra)}</div>
      </div>
      <div class="id-photo">
        ${photoSrc ? `<img src="${photoSrc}" alt="" />` : ''}
      </div>
    </div>
    <div class="id-card-footer">
      <img class="id-bars" src="${barcodeSrc}" alt="" />
      <div class="id-expiry">${escapeHtml(expiry)}</div>
      <div class="id-barcode-text">${escapeHtml(userNo)}</div>
    </div>
  </div>
</body>
</html>`)

  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 500)
}

export { splitUserName, formatExpiry }
