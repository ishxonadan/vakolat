const fs = require("fs")
const multer = require("multer")
const path = require("path")
const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const { createProxyMiddleware } = require("http-proxy-middleware")
const app = express()

app.set("trust proxy", true)

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    callback(null, true)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))
app.use(express.json())

const { v4: uuidv4 } = require("uuid")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { verifyToken, checkUserLevel, checkPermissions } = require("./src/middleware/auth.middleware")
require("dotenv").config()

const JWT_SECRET = process.env.JWT_SECRET

const vakolat = mongoose.createConnection(process.env.DB_CURRENT, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
vakolat.on("connected", () => console.log("Connected to vakolat"))

const yoqlama = mongoose.createConnection(process.env.DB_DISS, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
yoqlama.on("connected", () => console.log("Connected to dissertation"))

const nazorat = mongoose.createConnection(process.env.DB_NAZORAT, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
nazorat.on("connected", () => console.log("Connected to nazorat"))

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const permissionGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  position: { type: String },
  level: { type: String, required: true, default: "expert" },
  language: { type: String, required: true, default: "uz" },
  permissionGroup: { type: mongoose.Schema.Types.ObjectId, ref: "PermissionGroup" },
  isActive: { type: Boolean, default: true },
})

const contestantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  libraryConfig: {
    locationCode: { type: String },
    locationName: { type: String },
    region: { type: String },
    apiEndpoint: { type: String },
    isActive: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
  lastEdited: { type: Date, default: Date.now },
})

const autoRatingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Websites", required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  metrics: {
    visitCount: { type: Number, default: 0 },
    pageVisits: { type: Number, default: 0 },
    interactiveServiceUsage: { type: Number, default: 0 },
    personalAccountCount: { type: Number, default: 0 },
    electronicResourceCount: { type: Number, default: 0 },
    newsViewCount: { type: Number, default: 0 },
    electronicResourceUsage: { type: Number, default: 0 },
  },
  totalScore: { type: Number, default: 0 },
  source: { type: String, enum: ["manual", "plausible", "comprehensive"], default: "manual" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const documentSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true },
    is_deleted: { type: Number, default: 0 },
    owner_id: { type: Number, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    code: { type: String, required: true },
    udk_bbk: { type: String },
    place: { type: String },
    collective: { type: String },
    devision: { type: String, default: "" },
    year: { type: String },
    approved_date: { type: Date },
    language: { type: String, default: "uz" },
    additional: { type: String },
    soha_kodi: { type: String },
    ilmiy_rahbar: { type: String },
    annotation: { type: String, default: "" },
    ashyo: { type: String },
    srn: { type: String },
    mtt: { type: String },
    volume: { type: String },
    filename: { type: String },
    size: { type: Number, default: 0 },
    category_id: { type: Number, required: true },
    added_date: { type: Date, default: Date.now },
    modified_date: { type: Date },
    level: { type: String, required: true },
  },
  { timestamps: true },
)

const razdelSchema = new mongoose.Schema(
  {
    name: String,
    razdel_id: Number,
  },
  { collection: 'razdel' }
)

const levelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mark: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
})

const languageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  aliases: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
})

const fieldSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'fields' })

const libraryUserSchema = new mongoose.Schema(
  {
    passport: { type: String, required: true, unique: true },
    fullname: { type: String, required: true },
    ticketId: { type: String, required: true, unique: true },
    globalTicketNumber: { type: Number, required: true, unique: true },
    ticketHistory: [
      {
        date: { type: Date, required: true },
        dailyOrderNumber: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true },
    passport: { type: String, required: true },
    fullname: { type: String, required: true },
    date: { type: Date, required: true },
    dailyOrderNumber: { type: Number, required: true },
    globalTicketNumber: { type: Number, required: true },
    isUpdate: { type: Boolean, default: false },
    nameChanged: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

const Documents = yoqlama.model("Document", documentSchema)
const Categories = yoqlama.model("Razdel", razdelSchema)
const Levels = yoqlama.model("Level", levelSchema)
const Languages = yoqlama.model("Language", languageSchema)
const Fields = yoqlama.model("Field", fieldSchema)
const LibraryUsers = nazorat.model("LibraryUser", libraryUserSchema)
const Tickets = nazorat.model("Ticket", ticketSchema)

const ratingModel = require("./src/model/rating.model")
const userRatingModel = require("./src/model/user-rating.model")
const surveyVoteModel = require("./src/model/survey-vote.model")
const plausibleCacheModel = require("./src/model/plausible-cache.model")

const Permission = vakolat.model("Permission", permissionSchema)
const PermissionGroup = vakolat.model("PermissionGroup", permissionGroupSchema)
const Contestant = vakolat.model("Websites", contestantSchema)
const User = vakolat.model("User", userSchema)
const RatingAssignment = vakolat.model("RatingAssignment", ratingModel.ratingAssignmentSchema)
const WebsiteRating = vakolat.model("WebsiteRating", ratingModel.websiteRatingSchema)
const AutoRating = vakolat.model("AutoRating", autoRatingSchema)
const UserRating = vakolat.model("UserRating", userRatingModel.userRatingSchema)
const SurveyVote = vakolat.model("SurveyVote", surveyVoteModel.surveyVoteSchema)
const PlausibleCache = vakolat.model("PlausibleCache", plausibleCacheModel.plausibleCacheSchema)

app.locals.User = User
app.locals.Permission = Permission
app.locals.PermissionGroup = PermissionGroup

const uploadsDir = path.resolve(process.cwd(), "uploads")
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const randomValue = Math.random().toString(36).substring(2, 7)
    cb(null, `${timestamp}_${randomValue}.pdf`)
  },
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) !== ".pdf") {
      return cb(new Error("Only .pdf files are allowed"))
    }
    cb(null, true)
  },
})

app.get("/api/admin/fix-indexes", async (req, res) => {
  try {
    console.log("🔧 FIXING DATABASE INDEXES...")

    try {
      await Tickets.collection.dropIndex("ticketId_1")
      console.log("✅ Dropped unique index ticketId_1")
    } catch (error) {
      console.log("ℹ️ Index ticketId_1 doesn't exist or already dropped")
    }

    try {
      await Tickets.collection.dropIndex({ ticketId: 1 })
      console.log("✅ Dropped ticketId index")
    } catch (error) {
      console.log("ℹ️ ticketId index doesn't exist or already dropped")
    }

    await Tickets.collection.createIndex({ passport: 1, date: 1 })
    await Tickets.collection.createIndex({ createdAt: -1 })
    await Tickets.collection.createIndex({ ticketId: 1, createdAt: -1 })

    console.log("✅ Created proper indexes")
    console.log("🎯 Database indexes fixed successfully - ticketId is now NON-UNIQUE")

    res.json({
      message: "Database indexes fixed successfully",
      details: "ticketId unique constraint removed - same user can have multiple tickets for different days",
    })
  } catch (error) {
    console.error("❌ Error fixing indexes:", error)
    res.status(500).json({ error: error.message })
  }
})

app.get("/api/admin/test-permissions", [verifyToken, checkPermissions(["manage_users"])], (req, res) => {
  res.json({ message: "You have manage_users permission!" })
})

// Seed default categories (razdel) if none exist; each doc must have razdel_id (Number) and name
const seedCatsIfEmpty = async () => {
  const count = await Categories.countDocuments()
  if (count === 0) {
    await Categories.insertMany([
      { name: "Dissertatsiya", razdel_id: 1 },
      { name: "Avtoreferat", razdel_id: 2 },
    ])
    console.log("Seeded default categories (razdel)")
  }
}

app.get("/api/diss/cats", async (req, res) => {
  try {
    await seedCatsIfEmpty()
    const razdelData = await Categories.find()
      .sort({ razdel_id: 1 })
      .lean()
    // Ensure only valid entries (name + razdel_id) for dropdown
    const list = (Array.isArray(razdelData) ? razdelData : [])
      .filter((doc) => doc.name != null && doc.razdel_id != null)
      .map((doc) => ({ name: String(doc.name), razdel_id: Number(doc.razdel_id) }))
    res.json(list)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Seed default academic degrees (levels) if none exist; ensure default levels are enabled
const defaultLevelMarks = ["nomzod", "doktor", "doktor_fan"]
const seedLevelsIfEmpty = async () => {
  const count = await Levels.countDocuments()
  if (count === 0) {
    await Levels.insertMany([
      { name: "Nomzod", mark: "nomzod", isActive: true },
      { name: "Doktor", mark: "doktor", isActive: true },
      { name: "Fan doktori", mark: "doktor_fan", isActive: true },
    ])
    console.log("Seeded default levels (nomzod, doktor, doktor_fan)")
  } else {
    await Levels.updateMany(
      { mark: { $in: defaultLevelMarks } },
      { $set: { isActive: true } }
    )
  }
}

app.get("/api/diss/levels", async (req, res) => {
  try {
    await seedLevelsIfEmpty()
    const levelData = await Levels.find({}).sort({ createdAt: 1 }).lean()
    res.json(levelData)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post("/api/diss/levels", async (req, res) => {
  try {
    const { name, mark, isActive = true } = req.body || {}
    if (!name || !mark) {
      return res.status(400).json({ message: "name va mark majburiy" })
    }
    const existing = await Levels.findOne({ mark: String(mark).trim() })
    if (existing) {
      return res.status(400).json({ message: "Bunday markali daraja mavjud" })
    }
    const doc = await Levels.create({
      name: name.trim(),
      mark: mark.trim(),
      isActive: !!isActive,
    })
    res.status(201).json(doc)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.put("/api/diss/levels/:id", async (req, res) => {
  try {
    const id = req.params.id
    const { name, mark, isActive } = req.body || {}
    const update = {}
    if (name !== undefined) update.name = name.trim()
    if (mark !== undefined) update.mark = mark.trim()
    if (isActive !== undefined) update.isActive = !!isActive
    const doc = await Levels.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return res.status(404).json({ message: "Topilmadi" })
    res.json(doc)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.delete("/api/diss/levels/:id", async (req, res) => {
  try {
    const doc = await Levels.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ message: "Topilmadi" })
    res.json({ message: "O'chirildi" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Seed default languages. Canonical codes (uz, ru, en) have long-form aliases (uzb, rus, eng). All seeded languages are enabled.
const defaultSeedLanguages = [
  { name: "O'zbekcha", code: "uz", aliases: ["uzb"], isActive: true },
  { name: "Русский", code: "ru", aliases: ["rus"], isActive: true },
  { name: "English", code: "en", aliases: ["eng"], isActive: true },
  { name: "Українська", code: "uk", aliases: ["ukr"], isActive: true },
  { name: "Қазақша", code: "kk", aliases: ["kaz"], isActive: true },
  { name: "Тоҷикӣ", code: "tg", aliases: ["tgk"], isActive: true },
  { name: "Кыргызча", code: "ky", aliases: ["kir"], isActive: true },
  { name: "Türkmençe", code: "tk", aliases: ["tuk"], isActive: true },
  { name: "Deutsch", code: "de", aliases: ["deu", "ger"], isActive: true },
  { name: "Français", code: "fr", aliases: ["fra", "fre"], isActive: true },
  { name: "Türkçe", code: "tr", aliases: ["tur"], isActive: true },
  { name: "العربية", code: "ar", aliases: ["ara"], isActive: true },
  { name: "فارسی", code: "fa", aliases: ["per", "fas"], isActive: true },
  { name: "中文", code: "zh", aliases: ["chi", "zho"], isActive: true },
  { name: "Qaraqalpaqsha", code: "kaa", aliases: [], isActive: true },
  { name: "ئۇيغۇرچە", code: "ug", aliases: ["uig", "uyghur"], isActive: true },
]
const defaultLanguageCodes = defaultSeedLanguages.map((l) => l.code)
const defaultLanguageAliases = { uz: ["uzb"], ru: ["rus"], en: ["eng"] }

const seedLanguagesIfEmpty = async () => {
  const count = await Languages.countDocuments()
  if (count === 0) {
    await Languages.insertMany(defaultSeedLanguages)
    console.log("Seeded", defaultSeedLanguages.length, "default languages")
    return
  }
  // Insert any default language that is missing (e.g. after user deleted some or all)
  for (const lang of defaultSeedLanguages) {
    const exists = await Languages.findOne({ code: lang.code })
    if (!exists) {
      await Languages.create(lang)
      console.log("Seeded missing language:", lang.code)
    }
  }
  // Migrate old codes (uzb, rus, eng) to canonical (uz, ru, en) and set aliases
  const migrations = [
    { oldCode: "uzb", newCode: "uz", aliases: ["uzb"] },
    { oldCode: "rus", newCode: "ru", aliases: ["rus"] },
    { oldCode: "eng", newCode: "en", aliases: ["eng"] },
  ]
  for (const { oldCode, newCode, aliases } of migrations) {
    const hasNew = await Languages.findOne({ code: newCode })
    if (hasNew) {
      await Languages.updateOne({ code: newCode }, { $set: { isActive: true, aliases } })
      continue
    }
    const hasOld = await Languages.findOne({ code: oldCode })
    if (hasOld) {
      await Languages.updateOne({ code: oldCode }, { $set: { code: newCode, aliases, isActive: true } })
      console.log("Migrated language code:", oldCode, "->", newCode)
    }
  }
  // Ensure all default languages are enabled
  await Languages.updateMany(
    { code: { $in: defaultLanguageCodes } },
    { $set: { isActive: true } }
  )
  // Backfill aliases for canonical codes that have a default alias list
  for (const [code, aliasList] of Object.entries(defaultLanguageAliases)) {
    const doc = await Languages.findOne({ code })
    if (doc && (!doc.aliases || doc.aliases.length === 0)) {
      await Languages.updateOne({ code }, { $set: { aliases: aliasList } })
      console.log("Backfilled aliases for language:", code)
    }
  }
}

app.get("/api/diss/languages", async (req, res) => {
  try {
    await seedLanguagesIfEmpty()
    const list = await Languages.find().sort({ createdAt: 1 }).lean()
    res.json(list)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post("/api/diss/languages", async (req, res) => {
  try {
    const { name, code, isActive = true, aliases } = req.body || {}
    if (!name || !code) {
      return res.status(400).json({ message: "name va code majburiy" })
    }
    const existing = await Languages.findOne({ code: code.trim() })
    if (existing) {
      return res.status(400).json({ message: "Bunday kodli til mavjud" })
    }
    const doc = await Languages.create({
      name: name.trim(),
      code: code.trim(),
      isActive: !!isActive,
      aliases: Array.isArray(aliases) ? aliases.map(a => String(a).trim()).filter(Boolean) : [],
    })
    res.status(201).json(doc)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.put("/api/diss/languages/:id", async (req, res) => {
  try {
    const id = req.params.id
    const { name, code, isActive, aliases } = req.body || {}
    const update = {}
    if (name !== undefined) update.name = name.trim()
    if (code !== undefined) update.code = code.trim()
    if (isActive !== undefined) update.isActive = !!isActive
    if (aliases !== undefined) update.aliases = Array.isArray(aliases) ? aliases.map(a => String(a).trim()).filter(Boolean) : []
    const doc = await Languages.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return res.status(404).json({ message: "Topilmadi" })
    res.json(doc)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.delete("/api/diss/languages/:id", async (req, res) => {
  try {
    const doc = await Languages.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ message: "Topilmadi" })
    res.json({ message: "O'chirildi" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Seed fields (soha) from content/soha.json only when DB has no data; after that all data is from DB
const seedFieldsIfEmpty = async () => {
  const count = await Fields.countDocuments()
  if (count > 0) return
  const sohaPath = path.join(__dirname, "content", "soha.json")
  if (!fs.existsSync(sohaPath)) {
    console.warn("content/soha.json not found, fields collection not seeded")
    return
  }
  const sohaList = JSON.parse(fs.readFileSync(sohaPath, "utf8"))
  if (Array.isArray(sohaList) && sohaList.length > 0) {
    await Fields.insertMany(sohaList.map(({ code, name }) => ({ code, name })))
    console.log("Seeded fields (soha) from content/soha.json:", sohaList.length, "items")
  }
}

app.get("/api/diss/fields", async (req, res) => {
  try {
    await seedFieldsIfEmpty()
    const list = await Fields.find().sort({ code: 1 }).lean()
    res.json(list)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post("/api/diss/fields", async (req, res) => {
  try {
    const { code, name } = req.body || {}
    if (!code || !name) {
      return res.status(400).json({ message: "code va name majburiy" })
    }
    const existing = await Fields.findOne({ code: String(code).trim() })
    if (existing) {
      return res.status(400).json({ message: "Bunday kodli soha mavjud" })
    }
    const doc = await Fields.create({
      code: String(code).trim(),
      name: String(name).trim()
    })
    res.status(201).json(doc)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.put("/api/diss/fields/:id", async (req, res) => {
  try {
    const id = req.params.id
    const { code, name } = req.body || {}
    const update = {}
    if (code !== undefined) update.code = String(code).trim()
    if (name !== undefined) update.name = String(name).trim()
    const doc = await Fields.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return res.status(404).json({ message: "Topilmadi" })
    res.json(doc)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.delete("/api/diss/fields/:id", async (req, res) => {
  try {
    const doc = await Fields.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ message: "Topilmadi" })
    res.json({ message: "O'chirildi" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post("/api/diss/upload", upload.single("demo[]"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded or invalid file format" })
  }

  res.status(200).json({
    message: "File uploaded successfully",
    file: req.file,
  })
})

// Escape special regex characters so search term is matched literally
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

app.get("/api/diss_list/:page?", async (req, res) => {
  try {
    const page = Number.parseInt(req.params.page, 10) || 1
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 30, 100)
    const skip = (page - 1) * limit
    const search = (req.query.search || "").trim()

    const filter = {}
    if (search) {
      const pattern = escapeRegex(search)
      const regex = { $regex: pattern, $options: "i" }
      filter.$or = [
        { code: regex },
        { title: regex },
        { author: regex },
      ]
    }

    const [results, total] = await Promise.all([
      Documents.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title uuid author code is_deleted filename")
        .lean(),
      Documents.countDocuments(filter)
    ])

    res.json({ results, total })
  } catch (error) {
    res.status(500).json({ error: "Error fetching research works", details: error.message })
  }
})

app.get("/api/diss_info/:uuid?", async (req, res) => {
  try {
    const uuid = req.params.uuid
    const result = await Documents.findOne({ uuid: uuid })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: "Error fetching research works", details: error.message })
  }
})

const folderplace = process.env.DISS_STORAGE_PATH || path.resolve(__dirname, "goal")
const backupFolder = path.resolve(__dirname, "backup")
const uploadFolder = uploadsDir

app.get("/api/diss_file/:uuid", (req, res) => {
  const uuid = req.params.uuid
  const filePath = path.join(folderplace, `${uuid}.pdf`)

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename="${uuid}.pdf"`)
    res.sendFile(filePath)
  } else {
    res.status(404).json({ error: "File not found" })
  }
})

app.post("/api/diss_save/:uuid", async (req, res) => {
  try {
    const requestData = req.body
    const uuid = req.params.uuid

    // level and type are already correctly set from frontend
    // level = academic degree (from levels collection)
    // type = document type (dissertatisya/avtoreferat)

    // Store original uploaded filename before converting to UUID-based name
    let originalUploadedFilename = null
    if (requestData.filename) {
      originalUploadedFilename = requestData.filename
      requestData.filename = `${uuid}.pdf`
    }

    // Get the existing document before updating
    const existingDocument = await Documents.findOne({ uuid })

    const document = await Documents.findOneAndUpdate({ uuid }, requestData, { new: true, upsert: false })

    if (!document) {
      return res.status(404).json({ error: `Document with UUID ${uuid} not found` })
    }

    // Handle file operations when user uploaded a new file (edit: replace existing file)
    if (originalUploadedFilename) {
      const sourceFilePath = path.join(uploadFolder, path.basename(originalUploadedFilename))
      const destinationFilePath = path.join(folderplace, `${uuid}.pdf`)

      if (!fs.existsSync(sourceFilePath)) {
        console.error(`Uploaded file not found at: ${sourceFilePath}`)
        return res.status(400).json({
          error: "Yuklangan fayl topilmadi",
          details: "Faylni qayta yuklab, Saqlash ni bosing.",
        })
      }

      // Backup the old file if it exists
      const oldFilePath = path.join(folderplace, `${uuid}.pdf`)
      if (fs.existsSync(oldFilePath)) {
        try {
          if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder, { recursive: true })
          }
          const timestamp = Date.now()
          const backupFilePath = path.join(backupFolder, `${uuid}_${timestamp}.pdf`)
          fs.copyFileSync(oldFilePath, backupFilePath)
          console.log(`Old file backed up to: ${backupFilePath}`)
        } catch (backupError) {
          console.error("Error backing up old file:", backupError)
        }
      }

      try {
        if (!fs.existsSync(folderplace)) {
          fs.mkdirSync(folderplace, { recursive: true })
        }
        fs.copyFileSync(sourceFilePath, destinationFilePath)
        console.log(`File copied to: ${destinationFilePath}`)
        if (!fs.existsSync(destinationFilePath)) {
          throw new Error(`File copy verification failed`)
        }
      } catch (error) {
        console.error("Error copying file to storage:", error)
        return res.status(500).json({ error: `Faylni saqlashda xatolik: ${error.message}` })
      }
    }

    res.json({
      ok: "Document updated successfully",
      uuid: uuid,
    })
  } catch (error) {
    console.error("Error during update operation:", error)
    res.status(500).json({ error: "Failed to update data: " + error.message })
  }
})

app.post("/api/diss_save", async (req, res) => {
  try {
    const requestData = req.body
    const generatedUuid = uuidv4()
    const originalFilename = requestData.filename

    // level and type are already correctly set from frontend
    // level = academic degree (from levels collection)
    // type = document type (dissertatisya/avtoreferat)

    requestData.uuid = generatedUuid
    requestData.owner_id = 1

    // Only set filename if a file was actually uploaded
    if (originalFilename) {
      requestData.filename = `${generatedUuid}.pdf`
    }

    const document = new Documents(requestData)
    const saveStatus = await document.save()

    // Handle file operations if there's a filename (file uploading is optional)
    if (saveStatus && originalFilename) {
      const sourceFilePath = path.join(uploadFolder, originalFilename)
      const destinationFilePath = path.join(folderplace, `${generatedUuid}.pdf`)

      try {
        if (!fs.existsSync(folderplace)) {
          fs.mkdirSync(folderplace, { recursive: true })
        }

        fs.copyFileSync(sourceFilePath, destinationFilePath)
        console.log(`File copied successfully to: ${destinationFilePath}`)

        // Verify the file was actually copied
        if (fs.existsSync(destinationFilePath)) {
          console.log(`✅ File verified at destination: ${destinationFilePath}`)
        } else {
          console.error(`❌ File copy verification failed: ${destinationFilePath}`)
        }
      } catch (error) {
        console.error("Error copying file to storage:", error)
        // Fail the save operation if file copy fails
        throw new Error(`Failed to save file: ${error.message}`)
      }
    }

    res.json({
      ok: "Document saved successfully",
      uuid: generatedUuid,
    })
  } catch (error) {
    console.error("Error during save operation:", error)
    res.status(500).json({ error: "Failed to save data: " + error.message })
  }
})

const createTicketsRoutes = () => {
  const express = require("express")
  const QRCode = require("qrcode")
  const router = express.Router()

  function generateTicketId(ticketNumber) {
    return `IQ${ticketNumber.toString().padStart(10, "0")}`
  }

  async function getNextGlobalTicketNumber() {
    try {
      const lastUser = await LibraryUsers.findOne().sort({ globalTicketNumber: -1 })
      return lastUser ? lastUser.globalTicketNumber + 1 : 1
    } catch (error) {
      console.error("Error getting next global ticket number:", error)
      return 1
    }
  }

  function normalizeToCalendarDay(date = new Date()) {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }

  function getTodayNormalized() {
    return normalizeToCalendarDay(new Date())
  }

  async function hasTicketForToday(passport) {
    try {
      const todayNormalized = getTodayNormalized()
      console.log(`🔍 Checking if ${passport} has ticket for calendar day: ${todayNormalized.toISOString()}`)

      const todaysTicket = await Tickets.findOne({
        passport: passport,
        date: todayNormalized,
      }).sort({ createdAt: -1 })

      if (todaysTicket) {
        console.log(`✅ FOUND TODAY'S TICKET: ${todaysTicket.ticketId} (date: ${todaysTicket.date.toISOString()})`)
        return todaysTicket
      }

      console.log(`❌ NO TICKET FOR TODAY (calendar day)`)
      return null
    } catch (error) {
      console.error("Error checking today's ticket:", error)
      return null
    }
  }

  async function getNextDailyOrderNumber() {
    try {
      const todayNormalized = getTodayNormalized()
      console.log(`📊 Getting daily order number for calendar day: ${todayNormalized.toISOString()}`)

      const todayTickets = await Tickets.find({
        date: todayNormalized,
      })

      console.log(`Found ${todayTickets.length} tickets for today (calendar day)`)

      if (todayTickets.length === 0) {
        console.log("No tickets for today, returning order number 1")
        return 1
      }

      const maxOrderNumber = Math.max(...todayTickets.map((t) => t.dailyOrderNumber || 0))
      const nextNumber = maxOrderNumber + 1

      console.log(`Max order number today: ${maxOrderNumber}, next will be: ${nextNumber}`)
      return nextNumber
    } catch (error) {
      console.error("Error getting next daily order number:", error)
      return 1
    }
  }

  router.get("/", async (req, res) => {
    try {
      const tickets = await Tickets.find().sort({ createdAt: -1 })
      res.json(tickets)
    } catch (error) {
      console.error("Error fetching tickets:", error)
      res.status(500).json({ error: error.message })
    }
  })

  router.get("/:id", async (req, res) => {
    try {
      const ticket = await Tickets.findOne({ ticketId: req.params.id }).sort({ createdAt: -1 })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }
      res.json(ticket)
    } catch (error) {
      console.error("Error fetching ticket:", error)
      res.status(500).json({ error: error.message })
    }
  })

  router.get("/user/:passport", async (req, res) => {
    try {
      const user = await LibraryUsers.findOne({ passport: req.params.passport })
      if (!user) {
        return res.status(404).json({ error: "Foydalanuvchi topilmadi" })
      }
      res.json(user)
    } catch (error) {
      console.error("Error fetching user:", error)
      res.status(500).json({ error: error.message })
    }
  })

  router.post("/", async (req, res) => {
    try {
      const { fullname, passport } = req.body

      if (!fullname || !passport) {
        return res.status(400).json({ error: "Ism va pasport ma'lumotlari talab qilinadi" })
      }

      const passportRegex = /^[A-Z]{2}\d{7}$/
      if (!passportRegex.test(passport.replace(/\s/g, ""))) {
        return res.status(400).json({ error: "Pasport formati noto'g'ri" })
      }

      const cleanPassport = passport.trim()
      const cleanFullname = fullname.trim()

      console.log(`\n🎫 TICKET REQUEST for passport: ${cleanPassport}`)
      console.log(`📅 Current time: ${new Date().toISOString()}`)

      const todaysTicket = await hasTicketForToday(cleanPassport)
      if (todaysTicket) {
        console.log(`🚫 USER ALREADY HAS TICKET FOR TODAY (calendar day)`)
        return res.status(200).json({
          ticketId: todaysTicket.ticketId,
          message: "Bu foydalanuvchi bugun allaqachon chipta olgan. Bugungi chipta ko'rsatilmoqda.",
          isExisting: true,
          existingTicket: todaysTicket,
        })
      }

      let libraryUser = await LibraryUsers.findOne({ passport: cleanPassport })
      let isUpdate = false
      let nameChanged = false

      if (libraryUser) {
        console.log(`👤 EXISTING USER: ${libraryUser.ticketId} (ID remains same)`)
        isUpdate = true
        nameChanged = libraryUser.fullname !== cleanFullname

        if (nameChanged) {
          console.log(`📝 NAME CHANGED: "${libraryUser.fullname}" -> "${cleanFullname}"`)
          libraryUser.fullname = cleanFullname
          libraryUser.updatedAt = new Date()
          await libraryUser.save()
        }
      } else {
        console.log(`🆕 NEW USER - CREATING`)
        const globalTicketNumber = await getNextGlobalTicketNumber()
        const ticketId = generateTicketId(globalTicketNumber)

        libraryUser = new LibraryUsers({
          passport: cleanPassport,
          fullname: cleanFullname,
          ticketId: ticketId,
          globalTicketNumber: globalTicketNumber,
          ticketHistory: [],
        })

        await libraryUser.save()
        console.log(`✅ NEW USER CREATED: ${libraryUser.ticketId}`)
      }

      const dailyOrderNumber = await getNextDailyOrderNumber()
      const ticketDate = getTodayNormalized()

      console.log(`📅 TICKET DATE (normalized): ${ticketDate.toISOString()}`)
      console.log(`🔢 DAILY ORDER NUMBER: ${dailyOrderNumber}`)
      console.log(`🎫 TICKET ID (remains same): ${libraryUser.ticketId}`)

      libraryUser.ticketHistory.push({
        date: ticketDate,
        dailyOrderNumber: dailyOrderNumber,
        createdAt: new Date(),
      })
      await libraryUser.save()

      const newTicketEntry = new Tickets({
        ticketId: libraryUser.ticketId,
        passport: cleanPassport,
        fullname: cleanFullname,
        date: ticketDate,
        dailyOrderNumber: dailyOrderNumber,
        globalTicketNumber: libraryUser.globalTicketNumber,
        isUpdate: isUpdate,
        nameChanged: nameChanged,
      })

      await newTicketEntry.save()
      console.log(`✅ NEW TICKET ENTRY CREATED: ${newTicketEntry._id}`)
      console.log(`   - Ticket date (normalized): ${newTicketEntry.date.toISOString()}`)
      console.log(`   - Created at (actual): ${newTicketEntry.createdAt.toISOString()}`)

      const message = isUpdate
        ? nameChanged
          ? "Chipta yangilandi va ism o'zgartirildi"
          : "Mavjud foydalanuvchi uchun yangi chipta yaratildi"
        : "Yangi foydalanuvchi va chipta yaratildi"

      res.status(201).json({
        ticketId: libraryUser.ticketId,
        message: message,
        isUpdate: isUpdate,
        nameChanged: nameChanged,
      })
    } catch (error) {
      console.error("❌ Error creating ticket:", error)
      res.status(500).json({ error: error.message })
    }
  })

  router.get("/:id/qr", async (req, res) => {
    try {
      const ticket = await Tickets.findOne({ ticketId: req.params.id }).sort({ createdAt: -1 })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }

      const qrData = ticket.ticketId
      const qrCode = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      res.json({ qrCode })
    } catch (error) {
      console.error("Error generating QR code:", error)
      res.status(500).json({ error: error.message })
    }
  })

  router.get("/count/:passport", async (req, res) => {
    try {
      const user = await LibraryUsers.findOne({ passport: req.params.passport })
      const count = user ? user.ticketHistory.length : 0
      res.json({ count })
    } catch (error) {
      console.error("Error getting ticket count:", error)
      res.status(500).json({ error: error.message })
    }
  })

  router.delete("/:id", async (req, res) => {
    try {
      const ticket = await Tickets.findOneAndDelete({ ticketId: req.params.id })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }
      res.json({ message: "Chipta o'chirildi" })
    } catch (error) {
      console.error("Error deleting ticket:", error)
      res.status(500).json({ error: error.message })
    }
  })

  return router
}

const authRoutes = require("./routes/auth.routes")(vakolat, JWT_SECRET)
const expertRoutes = require("./routes/experts.routes")(vakolat, JWT_SECRET)
const contestantRoutes = require("./routes/contestants.routes")(vakolat)
const ratingRoutes = require("./routes/ratings.routes")(vakolat)
const adminRoutes = require("./routes/admin.routes")(vakolat, JWT_SECRET, PlausibleCache)
const surveyRoutes = require("./routes/survey.routes")(vakolat)
const permissionsRoutes = require("./routes/permissions.routes")(Permission, PermissionGroup, User, JWT_SECRET)
const tvRoutes = require("./routes/tv.routes")(nazorat, vakolat)
const videoRoutes = require("./routes/videos.routes")()
const visitsRoutes = require("./routes/visits.routes")(nazorat)
const membersRoutes = require("./routes/members.routes")(nazorat)
const ipAccessRoutes = require("./routes/ip-access.routes")(yoqlama)

app.use("/", authRoutes)
app.use("/api/experts", expertRoutes)
app.use("/api/contestants", contestantRoutes)
app.use("/api/ratings", ratingRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/admin", permissionsRoutes)
app.use("/survey", surveyRoutes)
app.use("/api/tv", tvRoutes)
app.use("/api/videos", videoRoutes)
app.use("/api/tickets", createTicketsRoutes())
app.use("/api/visits", visitsRoutes)
app.use("/api/members", membersRoutes)
app.use("/api/ip-access", ipAccessRoutes)

app.use(
  "/rolik",
  express.static(path.join(__dirname, "public/rolik"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4")
      } else if (filePath.endsWith(".avi")) {
        res.setHeader("Content-Type", "video/x-msvideo")
      } else if (filePath.endsWith(".mov")) {
        res.setHeader("Content-Type", "video/quicktime")
      } else if (filePath.endsWith(".mkv")) {
        res.setHeader("Content-Type", "video/x-matroska")
      } else if (filePath.endsWith(".webm")) {
        res.setHeader("Content-Type", "video/webm")
      } else if (filePath.endsWith(".m4v")) {
        res.setHeader("Content-Type", "video/x-m4v")
      } else if (filePath.endsWith(".3gp")) {
        res.setHeader("Content-Type", "video/3gpp")
      } else if (filePath.endsWith(".flv")) {
        res.setHeader("Content-Type", "video/x-flv")
      }

      res.setHeader("Accept-Ranges", "bytes")
      res.setHeader("Cache-Control", "public, max-age=3600")
    },
  }),
)

app.post("/api/public/check-ticket", async (req, res) => {
  try {
    const { ticketId, secret } = req.body

    if (!secret || secret !== "simsim") {
      console.log(`🚫 UNAUTHORIZED ACCESS ATTEMPT: ${req.ip} - Wrong or missing secret`)
      return res.status(401).json({
        error: "Ruxsat berilmagan",
        message: "Unauthorized access. Invalid or missing secret key.",
      })
    }

    if (!ticketId) {
      return res.status(400).json({
        error: "Chipta ID talab qilinadi",
        message: "Ticket ID is required in request body",
      })
    }

    const ticketIdRegex = /^IQ\d{10}$/
    if (!ticketIdRegex.test(ticketId)) {
      return res.status(400).json({
        error: "Chipta ID formati noto'g'ri",
        message: "Invalid ticket ID format. Expected format: IQ1234567890",
      })
    }

    console.log(`🔍 AUTHORIZED TICKET CHECK: ${ticketId} from ${req.ip}`)

    const ticket = await Tickets.findOne({ ticketId: ticketId }).sort({ createdAt: -1 })

    if (!ticket) {
      return res.status(404).json({
        error: "Chipta topilmadi",
        message: "Ticket not found",
        ticketId: ticketId,
      })
    }

    const response = {
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        fullname: ticket.fullname,
        date: ticket.date,
        dailyOrderNumber: ticket.dailyOrderNumber,
        isValid: true,
      },
      message: "Chipta topildi",
    }

    console.log(`✅ TICKET FOUND: ${ticket.ticketId} - ${ticket.fullname} (authorized access)`)
    res.json(response)
  } catch (error) {
    console.error("Error checking ticket:", error)
    res.status(500).json({
      error: "Server xatosi",
      message: "Internal server error while checking ticket",
    })
  }
})

if (process.env.npm_lifecycle_event === "start") {
  console.log("PRODUCTION")
  const distPath = path.join(__dirname, "dist")
  app.use(express.static(distPath))

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"))
  })
} else {
  console.log("LOCAL")
  app.use("/", createProxyMiddleware({ target: "http://localhost:7005", changeOrigin: true, ws: true }))
}

app.listen(7777, () => {
  console.log("Server is running on \x1b[34mhttp://localhost:7777\x1b[0m")
})

module.exports = {
  Documents,
  Categories,
  Levels,
  LibraryUsers,
  Tickets,
  WebsiteRating,
  AutoRating,
  UserRating,
  SurveyVote,
  PlausibleCache,
  User,
  Contestant,
  Permission,
  PermissionGroup,
}
