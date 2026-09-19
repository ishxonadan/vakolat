export const CUSTOM_PHONE_CODE = 'custom'

const PIN_ORDER = [
  '+998', '+7', '+992', '+993', '+996', '+994', '+995',
  '+90', '+971', '+966', '+86', '+82', '+1', '+44', '+49',
]

const PHONE_CODE_DATA = [
  ['+998', "O'zbekiston", 9],
  ['+7', "Rossiya / Qozog'iston", 10],
  ['+1', 'AQSH / Kanada', 10],
  ['+20', 'Misr', 10],
  ['+27', 'Janubiy Afrika', 9],
  ['+30', 'Gretsiya', 10],
  ['+31', 'Niderlandiya', 9],
  ['+32', 'Belgiya', 9],
  ['+33', 'Fransiya', 9],
  ['+34', 'Ispaniya', 9],
  ['+36', 'Vengriya', 9],
  ['+39', 'Italiya', 10],
  ['+40', 'Ruminiya', 9],
  ['+41', 'Shveysariya', 9],
  ['+43', 'Avstriya', 10],
  ['+44', 'Buyuk Britaniya', 10],
  ['+45', 'Daniya', 8],
  ['+46', 'Shvetsiya', 9],
  ['+47', 'Norvegiya', 8],
  ['+48', 'Polsha', 9],
  ['+49', 'Germaniya', 11],
  ['+51', 'Peru', 9],
  ['+52', 'Meksika', 10],
  ['+53', 'Kuba', 8],
  ['+54', 'Argentina', 10],
  ['+55', 'Braziliya', 11],
  ['+56', 'Chili', 9],
  ['+57', 'Kolumbiya', 10],
  ['+58', 'Venesuela', 10],
  ['+60', 'Malayziya', 9],
  ['+61', 'Avstraliya', 9],
  ['+62', 'Indoneziya', 11],
  ['+63', 'Filippin', 10],
  ['+64', 'Yangi Zelandiya', 9],
  ['+65', 'Singapur', 8],
  ['+66', 'Tailand', 9],
  ['+81', 'Yaponiya', 10],
  ['+82', 'Koreya', 10],
  ['+84', 'Vetnam', 9],
  ['+86', 'Xitoy', 11],
  ['+90', 'Turkiya', 10],
  ['+91', 'Hindiston', 10],
  ['+92', 'Pokiston', 10],
  ['+93', "Afg'oniston", 9],
  ['+94', 'Shri-Lanka', 9],
  ['+95', 'Myanma', 9],
  ['+98', 'Eron', 10],
  ['+211', 'Janubiy Sudan', 9],
  ['+212', 'Marokash', 9],
  ['+213', 'Jazoir', 9],
  ['+216', 'Tunis', 8],
  ['+218', 'Liviya', 9],
  ['+220', 'Gambiya', 7],
  ['+221', 'Senegal', 9],
  ['+222', 'Mavritaniya', 8],
  ['+223', 'Mali', 8],
  ['+224', 'Gvineya', 9],
  ['+225', "Kot-d'Ivuar", 10],
  ['+226', 'Burkina Faso', 8],
  ['+227', 'Niger', 8],
  ['+228', 'Togo', 8],
  ['+229', 'Benin', 8],
  ['+230', 'Mavrikiy', 8],
  ['+231', 'Liberiya', 8],
  ['+232', 'Syerra-Leone', 8],
  ['+233', 'Gana', 9],
  ['+234', 'Nigeriya', 10],
  ['+235', 'Chad', 8],
  ['+236', 'Markaziy Afrika', 8],
  ['+237', 'Kamerun', 9],
  ['+238', 'Kabo-Verde', 7],
  ['+239', 'San-Tome va Prinsipi', 7],
  ['+240', 'Ekvatorial Gvineya', 9],
  ['+241', 'Gabon', 8],
  ['+242', 'Kongo', 9],
  ['+243', 'Kongo DR', 9],
  ['+244', 'Angola', 9],
  ['+245', 'Gvineya-Bisau', 7],
  ['+246', 'Diego Garsiya', 7],
  ['+248', 'Seyshel orollari', 7],
  ['+249', 'Sudan', 9],
  ['+250', 'Ruanda', 9],
  ['+251', 'Efiopiya', 9],
  ['+252', 'Somali', 8],
  ['+253', 'Jibuti', 8],
  ['+254', 'Keniya', 9],
  ['+255', 'Tanzaniya', 9],
  ['+256', 'Uganda', 9],
  ['+257', 'Burundi', 8],
  ['+258', 'Mozambik', 9],
  ['+260', 'Zambiya', 9],
  ['+261', 'Madagaskar', 9],
  ['+262', 'Reyunon / Mayotta', 9],
  ['+263', 'Zimbabve', 9],
  ['+264', 'Namibiya', 9],
  ['+265', 'Malavi', 9],
  ['+266', 'Lesoto', 8],
  ['+267', 'Botsvana', 8],
  ['+268', 'Esvatini', 8],
  ['+269', 'Komor orollari', 7],
  ['+290', 'Muqaddas Yelena', 5],
  ['+291', 'Eritreya', 7],
  ['+297', 'Aruba', 7],
  ['+298', 'Farer orollari', 6],
  ['+299', 'Grenlandiya', 6],
  ['+350', 'Gibraltar', 8],
  ['+351', 'Portugaliya', 9],
  ['+352', 'Lyuksemburg', 9],
  ['+353', 'Irlandiya', 9],
  ['+354', 'Islandiya', 7],
  ['+355', 'Albaniya', 9],
  ['+356', 'Malta', 8],
  ['+357', 'Kipr', 8],
  ['+358', 'Finlyandiya', 10],
  ['+359', 'Bolgariya', 9],
  ['+370', 'Litva', 8],
  ['+371', 'Latviya', 8],
  ['+372', 'Estoniya', 8],
  ['+373', 'Moldova', 8],
  ['+374', 'Armaniston', 8],
  ['+375', 'Belarus', 9],
  ['+376', 'Andorra', 6],
  ['+377', 'Monako', 8],
  ['+378', 'San-Marino', 10],
  ['+379', 'Vatikan', 10],
  ['+380', 'Ukraina', 9],
  ['+381', 'Serbiya', 9],
  ['+382', 'Chernogoriya', 8],
  ['+383', 'Kosovo', 8],
  ['+385', 'Xorvatiya', 9],
  ['+386', 'Sloveniya', 8],
  ['+387', 'Bosniya va Gersegovina', 8],
  ['+389', 'Shimoliy Makedoniya', 8],
  ['+420', 'Chexiya', 9],
  ['+421', 'Slovakiya', 9],
  ['+423', 'Lixtenshteyn', 7],
  ['+500', 'Folklend orollari', 5],
  ['+501', 'Beliz', 7],
  ['+502', 'Gvatemala', 8],
  ['+503', 'Salvador', 8],
  ['+504', 'Gonduras', 8],
  ['+505', 'Nikaragua', 8],
  ['+506', 'Kosta-Rika', 8],
  ['+507', 'Panama', 8],
  ['+508', 'Sen-Pyer va Mikelon', 6],
  ['+509', 'Gaiti', 8],
  ['+590', 'Gvadelupa', 9],
  ['+591', 'Boliviya', 8],
  ['+592', 'Gayana', 7],
  ['+593', 'Ekvador', 9],
  ['+594', 'Fransiya Gvianasi', 9],
  ['+595', 'Paragvay', 9],
  ['+596', 'Martinika', 9],
  ['+597', 'Surinam', 7],
  ['+598', 'Urugvay', 8],
  ['+599', 'Kyurasao', 7],
  ['+670', 'Sharqiy Timor', 8],
  ['+672', 'Norfolk', 6],
  ['+673', 'Bruney', 7],
  ['+674', 'Nauru', 7],
  ['+675', 'Papua — Yangi Gvineya', 8],
  ['+676', 'Tonga', 7],
  ['+677', 'Solomon orollari', 7],
  ['+678', 'Vanuatu', 7],
  ['+679', 'Fiji', 7],
  ['+680', 'Palau', 7],
  ['+681', 'Uollis va Futuna', 6],
  ['+682', 'Kuk orollari', 5],
  ['+683', 'Niue', 4],
  ['+685', 'Samoa', 7],
  ['+686', 'Kiribati', 8],
  ['+687', 'Yangi Kaledoniya', 6],
  ['+688', 'Tuvalu', 6],
  ['+689', 'Fransiya Polineziyasi', 8],
  ['+690', 'Tokelau', 4],
  ['+691', 'Mikroneziya', 7],
  ['+692', 'Marshall orollari', 7],
  ['+850', 'Koreya XDR', 10],
  ['+852', 'Gonkong', 8],
  ['+853', 'Makao', 8],
  ['+855', 'Kambodja', 9],
  ['+856', 'Laos', 10],
  ['+880', 'Bangladesh', 10],
  ['+886', 'Tayvan', 9],
  ['+960', 'Maldiv orollari', 7],
  ['+961', 'Livan', 8],
  ['+962', 'Iordaniya', 9],
  ['+963', 'Suriya', 9],
  ['+964', 'Iroq', 10],
  ['+965', 'Quvayt', 8],
  ['+966', 'Saudiya Arabistoni', 9],
  ['+967', 'Yaman', 9],
  ['+968', 'Ummon', 8],
  ['+970', 'Falastin', 9],
  ['+971', 'BAA', 9],
  ['+972', 'Isroil', 9],
  ['+973', 'Bahrayn', 8],
  ['+974', 'Qatar', 8],
  ['+975', 'Butan', 8],
  ['+976', 'Mongoliya', 8],
  ['+977', 'Nepal', 10],
  ['+992', 'Tojikiston', 9],
  ['+993', 'Turkmaniston', 8],
  ['+994', 'Ozarbayjon', 9],
  ['+995', 'Gruziya', 9],
  ['+996', "Qirg'iziston", 9],
]

const CUSTOM_OPTION = {
  code: CUSTOM_PHONE_CODE,
  digits: '',
  country: 'Boshqa kod',
  localLength: 12,
  label: 'Boshqa kod',
}

function toPhoneCode(entry) {
  const [code, country, localLength] = entry
  return {
    code,
    digits: code.replace(/\D/g, ''),
    country,
    localLength,
    label: `${code}  ${country}`,
  }
}

const PHONE_CODES = PHONE_CODE_DATA
  .map(toPhoneCode)
  .sort((a, b) => {
    const pinA = PIN_ORDER.indexOf(a.code)
    const pinB = PIN_ORDER.indexOf(b.code)
    if (pinA !== -1 || pinB !== -1) {
      return (pinA === -1 ? 1000 : pinA) - (pinB === -1 ? 1000 : pinB)
    }
    return a.country.localeCompare(b.country, 'uz')
  })

const CODES_BY_LENGTH = [...PHONE_CODES].sort((a, b) => b.digits.length - a.digits.length)

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

export function isCustomPhoneCode(code) {
  return code === CUSTOM_PHONE_CODE
}

export function normalizeDialCode(value) {
  const digits = digitsOnly(value).slice(0, 3)
  return digits ? `+${digits}` : '+'
}

export function phoneCodeOptions() {
  return [...PHONE_CODES, CUSTOM_OPTION]
}

export function localLengthFor(code) {
  if (!code || isCustomPhoneCode(code) || code === '+') return 12
  const known = PHONE_CODES.find((item) => item.code === code)
  if (known) return known.localLength
  return Math.max(4, 15 - digitsOnly(code).length)
}

export function formatLocalNumber(code, local) {
  const digits = digitsOnly(local).slice(0, localLengthFor(code))
  if (code === '+998') {
    const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    return parts.filter(Boolean).join(' ')
  }
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

export function parsePhoneNumber(value) {
  const raw = String(value || '').trim()
  let digits = digitsOnly(raw)
  if (!digits) {
    return { code: '+998', local: '', custom: false }
  }

  const hasPlus = raw.startsWith('+') || raw.startsWith('00')
  if (raw.startsWith('00') && digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (!hasPlus && digits.length === 9) {
    return { code: '+998', local: digits, custom: false }
  }

  for (const item of CODES_BY_LENGTH) {
    if (!digits.startsWith(item.digits)) continue
    const local = digits.slice(item.digits.length, item.digits.length + item.localLength)
    if (hasPlus) {
      return { code: item.code, local, custom: false }
    }
    if (local.length === item.localLength || (item.code === '+998' && digits.length >= 12)) {
      return { code: item.code, local, custom: false }
    }
  }

  if (hasPlus) {
    for (const len of [3, 2, 1]) {
      if (digits.length > len) {
        return {
          code: `+${digits.slice(0, len)}`,
          local: digits.slice(len, len + 12),
          custom: true,
        }
      }
    }
  }

  return { code: '+998', local: digits.slice(0, 9), custom: false }
}

export function composePhoneNumber(code, local) {
  const digits = digitsOnly(local)
  if (!digits) return ''
  if (!code || isCustomPhoneCode(code) || code === '+') return ''
  const prefix = code.startsWith('+') ? code : `+${digitsOnly(code)}`
  return `${prefix}${digits}`
}
