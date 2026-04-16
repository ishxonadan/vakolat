require("dotenv").config()
const mongoose = require("mongoose")

const DB_CURRENT = process.env.DB_CURRENT
const WRITE_MODE = process.argv.includes("--write")

const NEW_SERVICES = [
  { code: "1", name: "Foydalanuvchilarni ro'yxatga olish va a'zolik bileti ID karta berish (rangli tasvirda)", price: 20000 },
  { code: "2", name: "Foydalanuvchilarni ro'yxatga olish va a'zolik bileti ID karta berish (oq-qora tasvirda)", price: 12000 },
  { code: "3", name: "Foydalanuvchilarni ro'yxatga olish va a'zolik bileti ID karta berish (laminatsiyalangan)", price: 6000 },
  { code: "4", name: "Foydalanuvchilarga bir martalik bilet berish", price: 3000 },
  { code: "5", name: "Nusxa ko'chirish xizmati (Bir tomonlama A4 formatda)", price: 500 },
  { code: "6", name: "Nusxa ko'chirish xizmati (Ikki tomonlama A4 formatda)", price: 800 },
  { code: "7", name: "Nusxa ko'chirish xizmati (Bir tomonlama A3 formatda)", price: 1000 },
  { code: "8", name: "Nusxa ko'chirish xizmati (Ikki tomonlama A3 formatda)", price: 1600 },
  { code: "9", name: "Matnni chop etish (A4 format)", price: 500 },
  { code: "10", name: "Matnni chop etish (A3 format)", price: 1000 },
  { code: "11", name: "Netbuklarni vaqtinchalik foydalanishga berish", price: 1000 },
  { code: "12", name: "Kalit so'zlar va mualliflar bo'yicha kutubxona axborotini saralab berish", price: 500 },
  { code: "13", name: "To'liq matnli axborotni mavzu bo'yicha saralash", price: 500 },
  { code: "14", name: "Kutubxonaning kutubxonachilik ma'lumotlar bazasidan fleshka va diskka yozish (50 Mb)", price: 500 },
  { code: "15", name: "Kutubxonaning kutubxonachilik ma'lumotlar bazasidan fleshka va diskka yozish (50-100 Mb)", price: 1500 },
  { code: "16", name: "Kutubxonaning kutubxonachilik ma'lumotlar bazasidan fleshka va diskka yozish (100-400 Mb)", price: 3000 },
  { code: "17", name: "Kutubxonaning kutubxonachilik ma'lumotlar bazasidan fleshka va diskka yozish (400 Mb - 1000 Mb)", price: 5000 },
  { code: "18", name: "Kutubxona kataloglari va kartotekalariga doir mavzu bo'yicha bibliografik ro'yxat tuzish (25 tagacha)", price: 37500 },
  { code: "19", name: "Kutubxona kataloglari va kartotekalariga doir mavzu bo'yicha bibliografik ro'yxat tuzish (26-50 tagacha)", price: 93750 },
  { code: "20", name: "Kutubxona kataloglari va kartotekalariga doir mavzu bo'yicha bibliografik ro'yxat tuzish (50-100 tagacha)", price: 187500 },
  { code: "21", name: "Kutubxona kataloglari va kartotekalariga doir mavzu bo'yicha bibliografik ro'yxat tuzish (100 va undan ortiq)", price: 375000 },
  { code: "22", name: "Tashkilot va muassasalarga axborot-bibliografik xizmat ko'rsatish", price: 375000 },
  { code: "23", name: "Adabiyotlar tanlash va dissertatsiya diplom va ilmiy ishlarga ilova qilinadigan bibliografik ro'yxatlarni tayyorlab berish", price: 1125000 },
  { code: "24", name: "Dissertatsiya diplom va ilmiy ishlarga ilova qilinadigan bibliografik ro'yhatni tahrirlash", price: 1125000 },
  { code: "25", name: "Ekskursiya (kutubxona ishi kataloglar kartotekalar bilan tanishtirish)", price: 7000 },
  { code: "26", name: "Nashrlarga kitobning ISBN xalqaro standart raqamini berish", price: 281250 },
  { code: "27", name: "ISBN berish (bolalar va nogironligi bo'lgan shaxslar uchun)", price: 140625 },
  { code: "28", name: "ISSN xalqaro standart raqamini berish (bolalar va nogironligi bo'lgan shaxslar uchun)", price: 375000 },
  { code: "29", name: "Davriy nashrlarga ISSN xalqaro standart raqamini berish", price: 750000 },
  { code: "30", name: "Kutubxona-bibliografik klassifikatsiya (KBK) indeksini berish", price: 187500 },
  { code: "31", name: "KBK indeksini berish (bolalar va nogironligi bo'lgan shaxslar uchun)", price: 93750 },
  { code: "32", name: "Universal o'nlik klassifikatsiya (UUK) indeksini berish", price: 187500 },
  { code: "33", name: "UUK indeksini berish (bolalar va nogironligi bo'lgan shaxslar uchun)", price: 93750 },
  { code: "34", name: "Chop etiladigan kitob uchun tahrir va grif berish", price: 93750 },
  { code: "35", name: "Audio reklamalar yaratish", price: 0 },
  { code: "49", name: "Gramplastinkalarni raqamlashtirish", price: 90000 },
  { code: "50", name: "Media mahsulotlarni yozish va arxivlash", price: 40000 },
  { code: "51", name: "Tasvirlarni skanerlash va qayta ishlash (A0 format)", price: 15000 },
  { code: "55", name: "Tasvirlarni skanerlash va qayta ishlash (A4 format)", price: 1500 },
  { code: "59", name: "Matnlarni formatga o'tkazish (PDF/JPG dan DOC/DOCX ga)", price: 200 },
  { code: "60", name: "Ma'lumotlar bazasiga onlayn obuna qilish", price: 1200000 },
  { code: "61", name: "Ilmiy ishlar bazasiga onlayn obuna qilish", price: 2000000 },
]

const paymentServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: "" },
    price: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

const paymentTransactionSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentService", default: null },
    serviceName: { type: String, default: "" },
  },
  { strict: false },
)

async function run() {
  if (!DB_CURRENT) {
    throw new Error("DB_CURRENT is not configured")
  }

  const conn = await mongoose.createConnection(DB_CURRENT).asPromise()
  const PaymentService = conn.model("PaymentService", paymentServiceSchema)
  const PaymentTransaction = conn.model("PaymentTransaction", paymentTransactionSchema)

  const existingServices = await PaymentService.find({}).select("_id name code price").lean()
  const serviceNameById = new Map(existingServices.map((service) => [String(service._id), String(service.name || "").trim()]))

  const txCandidates = await PaymentTransaction.find({
    serviceId: { $ne: null },
    $or: [{ serviceName: { $exists: false } }, { serviceName: "" }],
  })
    .select("_id serviceId")
    .lean()

  const txBackfillOps = txCandidates
    .map((tx) => {
      const serviceName = serviceNameById.get(String(tx.serviceId)) || ""
      if (!serviceName) return null
      return {
        updateOne: {
          filter: { _id: tx._id },
          update: { $set: { serviceName } },
        },
      }
    })
    .filter(Boolean)

  console.log(`Mode: ${WRITE_MODE ? "WRITE" : "DRY-RUN"}`)
  console.log(`Current services: ${existingServices.length}`)
  console.log(`New services: ${NEW_SERVICES.length}`)
  console.log(`Transactions eligible for serviceName backfill: ${txBackfillOps.length}`)

  if (!WRITE_MODE) {
    await conn.close()
    return
  }

  if (txBackfillOps.length > 0) {
    await PaymentTransaction.bulkWrite(txBackfillOps, { ordered: false })
  }

  await PaymentService.deleteMany({})
  await PaymentService.insertMany(
    NEW_SERVICES.map((item) => ({
      name: item.name,
      code: item.code,
      price: Number(item.price) || 0,
      isActive: true,
    })),
  )

  const afterCount = await PaymentService.countDocuments({})
  console.log(`Services replaced successfully. New count: ${afterCount}`)

  await conn.close()
}

run()
  .then(() => {
    process.exit(0)
  })
  .catch(async (error) => {
    console.error("Import failed:", error)
    try {
      await mongoose.disconnect()
    } catch {
      // ignore
    }
    process.exit(1)
  })
