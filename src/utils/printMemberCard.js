import { getLibraryLogoSvg } from '@/utils/logo'
import { generateBarcode } from '@/utils/barcode'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function splitUserName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
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

function logoSvg() {
  return getLibraryLogoSvg()
    .replace(/width="50"/, 'width="92"')
    .replace(/height="16"/, 'height="29"')
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
  const position = String(member?.position || '').trim()
  const kafedra = String(member?.kafedra ?? '').trim()
  const expiry = formatExpiry(member?.expiryYyyymmdd)
  const photoSrc = normalizePhotoSrc(member?.photoSrc)
  const barcodeSrc = generateBarcode(userNo)

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
      border: 1px solid #222;
      border-radius: 4mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #e8edf2 0%, #f4f6f8 45%, #eef1f4 100%);
      page-break-inside: avoid;
    }
    .id-card-header {
      display: flex;
      align-items: center;
      gap: 3mm;
      padding: 2.2mm 3mm 1.8mm;
      border-bottom: 1px solid #111;
    }
    .id-card-header .logo { flex-shrink: 0; line-height: 0; }
    .id-card-header .logo svg { display: block; }
    .id-card-title {
      font-size: 3.1mm;
      font-weight: 700;
      line-height: 1.25;
    }
    .id-card-body {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 22mm;
      gap: 2.5mm;
      padding: 2mm 3mm;
      border-bottom: 1px solid #111;
      min-height: 0;
    }
    .id-rows {
      display: grid;
      grid-template-columns: 28mm 1fr;
      row-gap: 0.7mm;
      column-gap: 1.5mm;
      align-content: start;
      font-size: 2.9mm;
      line-height: 1.2;
    }
    .id-label { font-weight: 400; }
    .id-value { font-weight: 700; word-break: break-word; }
    .id-photo {
      width: 22mm;
      height: 24mm;
      border: 1px solid #333;
      background: #ddd;
      overflow: hidden;
      justify-self: end;
      align-self: start;
    }
    .id-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      filter: grayscale(1);
    }
    .id-photo-empty {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.4mm;
      color: #666;
    }
    .id-card-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2mm;
      padding: 1.5mm 3mm 2mm;
    }
    .id-barcode {
      flex: 1;
      min-width: 0;
      text-align: left;
    }
    .id-barcode img {
      max-width: 48mm;
      height: 11mm;
      object-fit: contain;
      object-position: left bottom;
      display: block;
    }
    .id-expiry {
      font-size: 4.2mm;
      font-weight: 800;
      letter-spacing: 0.02em;
      white-space: nowrap;
      padding-bottom: 0.5mm;
    }
    @media print {
      body { padding: 0; min-height: auto; }
      .id-card {
        border-radius: 0;
        box-shadow: none;
      }
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
      <div class="logo">${logoSvg()}</div>
      <div class="id-card-title">Alisher Navoiy nomidagi<br/>O‘zbekiston Milliy kutubxonasi</div>
    </div>
    <div class="id-card-body">
      <div class="id-rows">
        <div class="id-label">ID-karta raqami:</div><div class="id-value">${escapeHtml(userNo)}</div>
        <div class="id-label">Familyasi:</div><div class="id-value">${escapeHtml(names.familiya)}</div>
        <div class="id-label">Ismi:</div><div class="id-value">${escapeHtml(names.ismi)}</div>
        <div class="id-label">Sharifi:</div><div class="id-value">${escapeHtml(names.sharifi)}</div>
        <div class="id-label">Toifasi:</div><div class="id-value">${escapeHtml(position)}</div>
        <div class="id-label">Kafedrasi:</div><div class="id-value">${escapeHtml(kafedra)}</div>
      </div>
      <div class="id-photo">
        ${photoSrc
          ? `<img src="${photoSrc}" alt="" />`
          : `<div class="id-photo-empty">Rasm yo'q</div>`}
      </div>
    </div>
    <div class="id-card-footer">
      <div class="id-barcode"><img src="${barcodeSrc}" alt="${escapeHtml(userNo)}" /></div>
      <div class="id-expiry">${escapeHtml(expiry)}</div>
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
