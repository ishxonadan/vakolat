const fs = require("fs")
const multer = require("multer")
const path = require("path")
const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const { createProxyMiddleware } = require("http-proxy-middleware")
const app = express()

// Enable trust proxy to get real IP addresses
app.set("trust proxy", true)

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    // Allow all origins for survey endpoints (since they'll be embedded on library websites)
    callback(null, true)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
}

// Apply CORS middleware
app.use(cors(corsOptions))

// Handle preflight requests
app.options("*", cors(corsOptions))

app.use(express.json())
const { v4: uuidv4 } = require("uuid")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { verifyToken, checkUserLevel } = require("./src/middleware/auth.middleware")
require("dotenv").config()

// JWT Secret Key - should be in environment variables in production
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

const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  position: { type: String }, // Made optional
  level: { type: String, required: true, default: "expert" },
  language: { type: String, required: true, default: "uz" },
})

// Updated contestant schema with library integration fields
const contestantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  // Library integration fields
  libraryConfig: {
    locationCode: { type: String }, // e.g., "R0050000"
    locationName: { type: String }, // e.g., "Toshkent shahar kutubxonasi"
    region: { type: String }, // e.g., "toshkent", "samarqand"
    apiEndpoint: { type: String }, // Full API URL
    isActive: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
  lastEdited: { type: Date, default: Date.now },
})

// Add this schema and model for automatic ratings
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
  source: { type: String, enum: ["manual", "plausible", "comprehensive"], default: "manual" }, // Track data source
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
    language: { type: String, default: "uzb" },
    additional: { type: String },
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

const razdelSchema = new mongoose.Schema({
  name: String,
  razdel_id: Number,
})

// NEW: Library Users Schema (Collection 1 - User info + ticket history)
const libraryUserSchema = new mongoose.Schema(
  {
    passport: { type: String, required: true, unique: true },
    fullname: { type: String, required: true },
    ticketId: { type: String, required: true, unique: true }, // IQ format - never changes
    globalTicketNumber: { type: Number, required: true, unique: true }, // Global counter
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

// NEW: Tickets Schema (Collection 2 - Individual ticket entries)
const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true }, // IQ format - NOT unique (same user, different days)
    passport: { type: String, required: true },
    fullname: { type: String, required: true },
    date: { type: Date, required: true }, // The ticket date
    dailyOrderNumber: { type: Number, required: true }, // Daily counter (resets each day)
    globalTicketNumber: { type: Number, required: true }, // Global counter (never resets)
    isUpdate: { type: Boolean, default: false }, // Track if this is an update entry
    nameChanged: { type: Boolean, default: false }, // Track if name was changed
    createdAt: { type: Date, default: Date.now }, // When this entry was created
  },
  { timestamps: true },
)

const Documents = yoqlama.model("Document", documentSchema)
const Categories = yoqlama.model("Razdel", razdelSchema)

// NEW: Create both models
const LibraryUsers = nazorat.model("LibraryUser", libraryUserSchema)
const Tickets = nazorat.model("Ticket", ticketSchema)

// Import the rating models
const ratingModel = require("./src/model/rating.model")
// Import the user rating model
const userRatingModel = require("./src/model/user-rating.model")
// Import the survey vote model
const surveyVoteModel = require("./src/model/survey-vote.model")
// Import the plausible cache model
const plausibleCacheModel = require("./src/model/plausible-cache.model")

// Create models
const Contestant = vakolat.model("Websites", contestantSchema)
const User = vakolat.model("User", userSchema)
const RatingAssignment = vakolat.model("RatingAssignment", ratingModel.ratingAssignmentSchema)
const WebsiteRating = vakolat.model("WebsiteRating", ratingModel.websiteRatingSchema)
const AutoRating = vakolat.model("AutoRating", autoRatingSchema)

// Register the UserRating model
const UserRating = vakolat.model("UserRating", userRatingModel.userRatingSchema)

// Register the SurveyVote model
const SurveyVote = vakolat.model("SurveyVote", surveyVoteModel.surveyVoteSchema)

// Register the PlausibleCache model
const PlausibleCache = vakolat.model("PlausibleCache", plausibleCacheModel.plausibleCacheSchema)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads") // Directory where files will be saved
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const randomValue = Math.random().toString(36).substring(2, 7) // Generate a 5-character random string
    cb(null, `${timestamp}_${randomValue}.pdf`)
  },
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Restrict file type to .pdf
    if (path.extname(file.originalname) !== ".pdf") {
      return cb(new Error("Only .pdf files are allowed"))
    }
    cb(null, true)
  },
})

// Add endpoint to fix database indexes
app.get("/api/admin/fix-indexes", async (req, res) => {
  try {
    console.log("Fixing database indexes...")

    // Drop the unique index on ticketId if it exists
    try {
      await Tickets.collection.dropIndex("ticketId_1")
      console.log("Dropped unique index on ticketId")
    } catch (error) {
      console.log("Index ticketId_1 doesn't exist or already dropped")
    }

    // Ensure proper indexes exist
    await Tickets.collection.createIndex({ passport: 1, date: 1 }) // For daily checks
    await Tickets.collection.createIndex({ createdAt: -1 }) // For sorting
    await Tickets.collection.createIndex({ ticketId: 1, createdAt: -1 }) // For finding latest ticket

    console.log("Database indexes fixed successfully")
    res.json({ message: "Database indexes fixed successfully" })
  } catch (error) {
    console.error("Error fixing indexes:", error)
    res.status(500).json({ error: error.message })
  }
})

app.get("/diss/cats", async (req, res) => {
  try {
    const razdelData = await Categories.find() // Fetch all documents
    res.json(razdelData) // Send the data as JSON response
  } catch (error) {
    res.status(500).json({ message: error.message }) // Handle errors
  }
})

app.post("/diss/upload", upload.single("demo[]"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded or invalid file format" })
  }

  res.status(200).json({
    message: "File uploaded successfully",
    file: req.file,
  })
})

app.get("/diss_list/:page?", async (req, res) => {
  try {
    const page = Number.parseInt(req.params.page, 10) || 1 // Default page is 1
    const limit = 30
    const skip = (page - 1) * limit

    const results = await Documents.find()
      .sort({ createdAt: -1 }) // Assuming rows should be sorted by the latest
      .skip(skip)
      .select("title uuid author code is_deleted")

    res.json({ results })
  } catch (error) {
    res.status(500).json({ error: "Error fetching research works", details: error.message })
  }
})

app.get("/diss_info/:uuid?", async (req, res) => {
  try {
    const uuid = req.params.uuid
    const result = await Documents.findOne({ uuid: uuid })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: "Error fetching research works", details: error.message })
  }
})

const folderplace = path.resolve(__dirname, "goal")
const uploadFolder = path.resolve(__dirname, "uploads")

// Add file serving route for PDF files
app.get("/diss_file/:uuid", (req, res) => {
  const uuid = req.params.uuid
  const filePath = path.join(folderplace, `${uuid}.pdf`)

  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename="${uuid}.pdf"`)
    res.sendFile(filePath)
  } else {
    res.status(404).json({ error: "File not found" })
  }
})

app.post("/diss_save/:uuid", async (req, res) => {
  try {
    const requestData = req.body
    const uuid = req.params.uuid

    const document = await Documents.findOneAndUpdate(
      { uuid },
      requestData,
      { new: true, upsert: false }, // Only update if it exists, no new document creation
    )

    if (!document) {
      return res.status(404).json({ error: `Document with UUID ${uuid} not found` })
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

app.post("/diss_save", async (req, res) => {
  try {
    const requestData = req.body
    const generatedUuid = uuidv4()
    const originalFilename = requestData.filename

    requestData.uuid = generatedUuid
    requestData.owner_id = 1
    requestData.filename = `${generatedUuid}.pdf`

    const document = new Documents(requestData)
    const saveStatus = await document.save()

    if (saveStatus) {
      const sourceFilePath = path.join(uploadFolder, originalFilename)
      const destinationFilePath = path.join(folderplace, `${generatedUuid}.pdf`)

      if (!fs.existsSync(folderplace)) {
        fs.mkdirSync(folderplace)
      }

      fs.renameSync(sourceFilePath, destinationFilePath)
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

// Import route modules AFTER models are created
const authRoutes = require("./routes/auth.routes")(vakolat, JWT_SECRET)
const expertRoutes = require("./routes/experts.routes")(vakolat, JWT_SECRET)
const contestantRoutes = require("./routes/contestants.routes")(vakolat)
const ratingRoutes = require("./routes/ratings.routes")(vakolat)
const adminRoutes = require("./routes/admin.routes")(vakolat, JWT_SECRET, PlausibleCache)
const surveyRoutes = require("./routes/survey.routes")(vakolat)

// Create tickets routes with NEW logic
const createTicketsRoutes = () => {
  const express = require("express")
  const QRCode = require("qrcode")
  const router = express.Router()

  // Helper function to generate ticket ID in IQ format
  function generateTicketId(ticketNumber) {
    return `IQ${ticketNumber.toString().padStart(10, "0")}`
  }

  // Helper function to get next global ticket number (never resets)
  async function getNextGlobalTicketNumber() {
    try {
      const lastUser = await LibraryUsers.findOne().sort({ globalTicketNumber: -1 })
      return lastUser ? lastUser.globalTicketNumber + 1 : 1
    } catch (error) {
      console.error("Error getting next global ticket number:", error)
      return 1
    }
  }

  // Helper function to get today's date string in YYYY-MM-DD format
  function getTodayDateString() {
    const today = new Date()
    // Ensure we're working with local date, not UTC
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Helper function to get date string from Date object in YYYY-MM-DD format
  function getDateString(date) {
    const d = new Date(date)
    // Ensure we're working with local date, not UTC
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Helper function to get today's ticket for a passport (if exists)
  async function getTodaysTicket(passport) {
    try {
      const todayDateString = getTodayDateString()

      console.log(`=== CHECKING TODAY'S TICKET ===`)
      console.log(`Passport: ${passport}`)
      console.log(`Today's date string: ${todayDateString}`)

      // Find all tickets for this passport
      const allTickets = await Tickets.find({ passport: passport })
      console.log(`Found ${allTickets.length} total tickets for this passport`)

      // Check each ticket's date
      for (const ticket of allTickets) {
        const ticketDateString = getDateString(ticket.date)
        console.log(
          `Ticket ${ticket._id}: date=${ticketDateString}, today=${todayDateString}, match=${ticketDateString === todayDateString}`,
        )

        if (ticketDateString === todayDateString) {
          console.log(`✅ FOUND TODAY'S TICKET:`, ticket._id)
          return ticket
        }
      }

      console.log(`❌ NO TICKET FOUND FOR TODAY`)
      return null
    } catch (error) {
      console.error("Error getting today's ticket:", error)
      return null
    }
  }

  // Helper function to get next daily order number (resets each day)
  async function getNextDailyOrderNumber() {
    try {
      const todayDateString = getTodayDateString()

      console.log(`=== GETTING DAILY ORDER NUMBER ===`)
      console.log(`Today's date string: ${todayDateString}`)

      // Find all tickets for today
      const allTickets = await Tickets.find({})
      const todayTickets = allTickets.filter((ticket) => {
        const ticketDateString = getDateString(ticket.date)
        return ticketDateString === todayDateString
      })

      console.log(`Found ${todayTickets.length} tickets for today`)

      if (todayTickets.length === 0) {
        console.log("No tickets for today, returning order number 1")
        return 1
      }

      // Get the highest daily order number for today
      const maxOrderNumber = Math.max(...todayTickets.map((t) => t.dailyOrderNumber || 0))
      const nextNumber = maxOrderNumber + 1

      console.log(`Max order number today: ${maxOrderNumber}, next will be: ${nextNumber}`)
      return nextNumber
    } catch (error) {
      console.error("Error getting next daily order number:", error)
      return 1
    }
  }

  // GET all tickets (all entries including updates) - sorted by createdAt DESC
  router.get("/", async (req, res) => {
    try {
      const tickets = await Tickets.find().sort({ createdAt: -1 })
      res.json(tickets)
    } catch (error) {
      console.error("Error fetching tickets:", error)
      res.status(500).json({ error: error.message })
    }
  })

  // GET ticket by ID (get the latest entry for this ticket ID)
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

  // GET user by passport (for auto-fill)
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

  // POST create new ticket or return existing ticket for today
  router.post("/", async (req, res) => {
    try {
      const { fullname, passport } = req.body

      if (!fullname || !passport) {
        return res.status(400).json({ error: "Ism va pasport ma'lumotlari talab qilinadi" })
      }

      // Validate passport format
      const passportRegex = /^[A-Z]{2}\d{7}$/
      if (!passportRegex.test(passport.replace(/\s/g, ""))) {
        return res.status(400).json({ error: "Pasport formati noto'g'ri" })
      }

      const cleanPassport = passport.trim()
      const cleanFullname = fullname.trim()

      console.log(`\n🎫 TICKET REQUEST for passport: ${cleanPassport}`)

      // FIRST: Check if user has ticket for TODAY
      const todaysTicket = await getTodaysTicket(cleanPassport)

      if (todaysTicket) {
        console.log(`✅ RETURNING EXISTING TICKET FOR TODAY`)
        return res.status(200).json({
          ticketId: todaysTicket.ticketId,
          message: "Bu foydalanuvchi bugun allaqachon chipta olgan. Bugungi chipta ko'rsatilmoqda.",
          isExisting: true,
          existingTicket: todaysTicket,
        })
      }

      console.log(`🆕 NO TICKET FOR TODAY - CREATING NEW ONE`)

      // Check if user exists in LibraryUsers
      let libraryUser = await LibraryUsers.findOne({ passport: cleanPassport })
      let isUpdate = false
      let nameChanged = false

      if (libraryUser) {
        // Existing user - creating ticket for new day
        console.log(`👤 EXISTING USER: ${libraryUser.ticketId}`)
        isUpdate = true
        nameChanged = libraryUser.fullname !== cleanFullname

        // Update user info if name changed
        if (nameChanged) {
          console.log(`📝 NAME CHANGED: "${libraryUser.fullname}" -> "${cleanFullname}"`)
          libraryUser.fullname = cleanFullname
          libraryUser.updatedAt = new Date()
          await libraryUser.save()
        }
      } else {
        // New user - create in LibraryUsers
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

      // Get daily order number for today
      const dailyOrderNumber = await getNextDailyOrderNumber()

      // Create today's date at start of day (00:00:00) - day specific, not 24-hour
      const today = new Date()
      const ticketDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)

      console.log(`📅 TICKET DATE (day-specific): ${getDateString(ticketDate)} 00:00:00`)
      console.log(`🔢 DAILY ORDER NUMBER: ${dailyOrderNumber}`)

      // Add to ticket history in LibraryUsers
      libraryUser.ticketHistory.push({
        date: ticketDate,
        dailyOrderNumber: dailyOrderNumber,
        createdAt: new Date(),
      })
      await libraryUser.save()

      // Create new ticket entry
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
      console.log(`✅ NEW TICKET CREATED: ${newTicketEntry._id}`)

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
      console.error("Error creating ticket:", error)
      res.status(500).json({ error: error.message })
    }
  })

  // GET QR code for ticket
  router.get("/:id/qr", async (req, res) => {
    try {
      const ticket = await Tickets.findOne({ ticketId: req.params.id }).sort({ createdAt: -1 })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }

      const qrData = ticket.ticketId // Only the ticket ID
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

  // GET ticket count for passport
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

  // DELETE ticket
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

// Register routes
app.use("/", authRoutes)
app.use("/api/experts", expertRoutes)
app.use("/api/contestants", contestantRoutes)
app.use("/api/ratings", ratingRoutes)
app.use("/api/admin", adminRoutes)
app.use("/survey", surveyRoutes)

// Register tickets routes
app.use("/api/tickets", createTicketsRoutes())

// Public ticket check API (no auth required, but secret password and payload must be provided)
app.post("/api/public/check-ticket", async (req, res) => {
  try {
    const { ticketId, secret } = req.body

    // First check: Validate that secret password is provided and correct
    if (!secret || secret !== "simsim") {
      console.log(`🚫 UNAUTHORIZED ACCESS ATTEMPT: ${req.ip} - Wrong or missing secret`)
      return res.status(401).json({
        error: "Ruxsat berilmagan",
        message: "Unauthorized access. Invalid or missing secret key.",
      })
    }

    // Second check: Validate that ticketId is provided in payload
    if (!ticketId) {
      return res.status(400).json({
        error: "Chipta ID talab qilinadi",
        message: "Ticket ID is required in request body",
      })
    }

    // Third check: Validate ticket ID format (should be IQ followed by 10 digits)
    const ticketIdRegex = /^IQ\d{10}$/
    if (!ticketIdRegex.test(ticketId)) {
      return res.status(400).json({
        error: "Chipta ID formati noto'g'ri",
        message: "Invalid ticket ID format. Expected format: IQ1234567890",
      })
    }

    console.log(`🔍 AUTHORIZED TICKET CHECK: ${ticketId} from ${req.ip}`)

    // Find the most recent ticket entry for this ID
    const ticket = await Tickets.findOne({ ticketId: ticketId }).sort({ createdAt: -1 })

    if (!ticket) {
      return res.status(404).json({
        error: "Chipta topilmadi",
        message: "Ticket not found",
        ticketId: ticketId,
      })
    }

    // Return ticket information
    const response = {
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        fullname: ticket.fullname,
        date: ticket.date,
        dailyOrderNumber: ticket.dailyOrderNumber,
        isValid: true, // You can add more validation logic here if needed
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
  // Use proxy for development
  console.log("LOCAL")
  app.use("/", createProxyMiddleware({ target: "http://localhost:7005", changeOrigin: true, ws: true }))
}

app.listen(7777, () => {
  console.log("Server is running on \x1b[34mhttp://localhost:7777\x1b[0m")
})

// Export models for use in other files
module.exports = {
  Documents,
  Categories,
  LibraryUsers,
  Tickets,
  WebsiteRating,
  AutoRating,
  UserRating,
  SurveyVote,
  PlausibleCache,
  User,
  Contestant,
}
