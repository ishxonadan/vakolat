const express = require("express")
const { verifyToken } = require("../src/middleware/auth.middleware")

module.exports = (nazoratConnection) => {
  const router = express.Router()

  const getDb = () => {
    if (!nazoratConnection.db) {
      throw new Error("Database connection not established")
    }
    return nazoratConnection.db
  }

  const calculateDuration = (keldi, ketdi) => {
    if (!keldi || !ketdi) return null

    try {
      const [keldiHours, keldiMinutes] = keldi.split(":").map(Number)
      const [ketdiHours, ketdiMinutes] = ketdi.split(":").map(Number)

      const keldiTotalMinutes = keldiHours * 60 + keldiMinutes
      const ketdiTotalMinutes = ketdiHours * 60 + ketdiMinutes

      const durationMinutes = ketdiTotalMinutes - keldiTotalMinutes
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60

      return `${hours}s ${minutes}m`
    } catch (error) {
      return null
    }
  }

  // GET all visits with pagination and filtering - LATEST FIRST
  router.get("/", verifyToken, async (req, res) => {
    try {
      // Parse query parameters with explicit logging
      console.log("\n📊 ===== NEW REQUEST =====")
      console.log("🔍 Raw query params:", req.query)

      const page = Number.parseInt(req.query.page, 10) || 1
      const limit = Number.parseInt(req.query.limit, 10) || 20
      const skip = (page - 1) * limit

      console.log(`📄 Parsed values:`)
      console.log(`   - Page: ${page} (type: ${typeof page})`)
      console.log(`   - Limit: ${limit} (type: ${typeof limit})`)
      console.log(`   - Skip: ${skip} (type: ${typeof skip})`)

      const query = {}

      // Date range filter
      if (req.query.startDate && req.query.endDate) {
        query.date = {
          $gte: req.query.startDate,
          $lte: req.query.endDate,
        }
        console.log(`📅 Date filter applied: ${req.query.startDate} to ${req.query.endDate}`)
      }

      // Search filter - case insensitive partial match
      if (req.query.search) {
        const db = getDb()
        const cacheCollection = db.collection("cache")

        // Create case-insensitive regex for partial matching
        const searchRegex = new RegExp(req.query.search, "i")
        console.log(`🔍 Search filter: "${req.query.search}" (regex: /${req.query.search}/i)`)

        // First, search in cache for matching users
        const matchingUsers = await cacheCollection
          .find({
            $or: [{ USER_NO: searchRegex }, { USER_NAME: searchRegex }],
          })
          .toArray()

        console.log(`   Found ${matchingUsers.length} matching users in cache`)

        // Get IDs of matching users
        const matchingIds = matchingUsers.map((u) => u.USER_NO)

        // Search in tashrif collection
        query.$or = [
          { id: { $in: matchingIds } }, // Match by user ID from cache
          { id: searchRegex }, // Direct ID match
          { userName: searchRegex }, // Direct userName match in tashrif
        ]

        console.log(`   Searching for IDs:`, matchingIds.slice(0, 5), matchingIds.length > 5 ? "..." : "")
      }

      console.log("🔎 MongoDB query:", JSON.stringify(query, null, 2))

      const db = getDb()
      const collection = db.collection("tashrif")
      const cacheCollection = db.collection("cache")

      // Get total count
      const total = await collection.countDocuments(query)
      console.log(`📊 Total matching documents: ${total}`)
      console.log(`📊 Total pages: ${Math.ceil(total / limit)}`)

      // Sort by date DESC, then keldi DESC (newest first)
      const sortOptions = { date: -1, keldi: -1 }
      console.log(`🔽 Sort options:`, sortOptions)
      console.log(`⏭️  Applying skip(${skip}).limit(${limit})`)

      // Fetch with pagination
      const cursor = collection.find(query).sort(sortOptions).skip(skip).limit(limit)
      const visits = await cursor.toArray()

      console.log(`✅ Retrieved ${visits.length} documents`)

      if (visits.length > 0) {
        console.log(`📍 FIRST document:`)
        console.log(`   - ID: ${visits[0].id}`)
        console.log(`   - Date: ${visits[0].date}`)
        console.log(`   - Keldi: ${visits[0].keldi}`)
        console.log(`   - _id: ${visits[0]._id}`)

        console.log(`📍 LAST document:`)
        const last = visits[visits.length - 1]
        console.log(`   - ID: ${last.id}`)
        console.log(`   - Date: ${last.date}`)
        console.log(`   - Keldi: ${last.keldi}`)
        console.log(`   - _id: ${last._id}`)
      } else {
        console.log("⚠️  No documents returned!")
      }

      console.log("===========================\n")

      // Enrich visits with user data from cache
      const enrichedVisits = await Promise.all(
        visits.map(async (visit) => {
          const userCache = await cacheCollection.findOne({ USER_NO: visit.id })

          return {
            _id: visit._id,
            id: visit.id,
            date: visit.date,
            keldi: visit.keldi,
            ketdi: visit.ketdi || null,
            duration: calculateDuration(visit.keldi, visit.ketdi),
            userName: userCache?.USER_NAME || visit.userName || "Noma'lum",
            userPosition: userCache?.USER_POSITION || visit.userPosition || "-",
            userPhoto: userCache?.PHOTO || null,
            userTel: userCache?.TEL_NO || null,
          }
        }),
      )

      const responseData = {
        visits: enrichedVisits,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }

      console.log(`📤 Sending response with ${enrichedVisits.length} enriched visits`)
      res.json(responseData)
    } catch (error) {
      console.error("❌ ERROR in visits route:", error)
      console.error("❌ Stack trace:", error.stack)
      res.status(500).json({ error: "Failed to fetch visits", details: error.message })
    }
  })

  // GET user visit history by user ID
  router.get("/user/:userId", verifyToken, async (req, res) => {
    try {
      const userId = req.params.userId
      console.log("📜 Fetching visit history for user:", userId)

      const db = getDb()
      const collection = db.collection("tashrif")
      const cacheCollection = db.collection("cache")

      // Get all visits for this user, sorted by date descending
      const visits = await collection
        .find({ id: userId })
        .sort({ date: -1, keldi: -1 })
        .limit(50) // Limit to last 50 visits
        .toArray()

      console.log("📜 Found", visits.length, "visits for user", userId)

      // Get user info from cache
      const userCache = await cacheCollection.findOne({ USER_NO: userId })

      // Enrich visits with user data
      const enrichedVisits = visits.map((visit) => ({
        _id: visit._id,
        id: visit.id,
        date: visit.date,
        keldi: visit.keldi,
        ketdi: visit.ketdi || null,
        duration: calculateDuration(visit.keldi, visit.ketdi),
        userName: userCache?.USER_NAME || userId,
        userPosition: userCache?.USER_POSITION || "-",
        userPhoto: userCache?.PHOTO || null,
      }))

      res.json({
        visits: enrichedVisits,
        total: visits.length,
      })
    } catch (error) {
      console.error("❌ Error fetching user history:", error)
      res.status(500).json({ error: "Failed to fetch user history", details: error.message })
    }
  })

  // GET today's statistics
  router.get("/stats/today", verifyToken, async (req, res) => {
    try {
      console.log("📊 Fetching today stats")
      const db = getDb()
      const today = new Date().toISOString().split("T")[0]
      console.log("📅 Today's date:", today)
      const collection = db.collection("tashrif")

      // Debug: Check what dates exist in the database
      const allDates = await collection.distinct("date")
      console.log("📅 Available dates in database:", allDates.slice(0, 10), `(${allDates.length} total)`)

      const todayVisits = await collection.find({ date: today }).toArray()
      console.log("📊 Found", todayVisits.length, "visits for today")
      
      if (todayVisits.length > 0) {
        console.log("📄 First visit sample:", todayVisits[0])
      }

      const uniqueIds = new Set(todayVisits.map((v) => v.id))
      const currentInside = todayVisits.filter((v) => !v.ketdi).length

      const stats = {
        total: todayVisits.length,
        unique: uniqueIds.size,
        current: currentInside,
      }

      console.log("✅ Today stats:", stats)
      res.json(stats)
    } catch (error) {
      console.error("❌ Error fetching today stats:", error)
      res.status(500).json({ error: "Failed to fetch today statistics", details: error.message })
    }
  })

  // GET this month's statistics
  router.get("/stats/month", verifyToken, async (req, res) => {
    try {
      console.log("📊 Fetching month stats")
      const db = getDb()
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const startDate = `${year}-${month}-01`
      const endDate = new Date(year, now.getMonth() + 1, 0).toISOString().split("T")[0]
      
      console.log("📅 Month date range:", { startDate, endDate })

      const collection = db.collection("tashrif")

      const monthVisits = await collection
        .find({
          date: { $gte: startDate, $lte: endDate },
        })
        .toArray()

      console.log("📊 Found", monthVisits.length, "visits for this month")

      const uniqueIds = new Set(monthVisits.map((v) => v.id))
      const daysInMonth = now.getDate()
      const average = daysInMonth > 0 ? Math.round(monthVisits.length / daysInMonth) : 0

      const stats = {
        total: monthVisits.length,
        unique: uniqueIds.size,
        average,
      }

      console.log("✅ Month stats:", stats)
      res.json(stats)
    } catch (error) {
      console.error("❌ Error fetching month stats:", error)
      res.status(500).json({ error: "Failed to fetch month statistics", details: error.message })
    }
  })

  // GET period statistics
  router.get("/stats/period", verifyToken, async (req, res) => {
    try {
      console.log("📊 Fetching period stats", req.query)
      const db = getDb()
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" })
      }

      const collection = db.collection("tashrif")

      const periodVisits = await collection
        .find({
          date: { $gte: startDate, $lte: endDate },
        })
        .toArray()

      const uniqueIds = new Set(periodVisits.map((v) => v.id))

      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      const average = days > 0 ? Math.round(periodVisits.length / days) : 0

      const stats = {
        total: periodVisits.length,
        unique: uniqueIds.size,
        days,
        average,
      }

      console.log("✅ Period stats:", stats)
      res.json(stats)
    } catch (error) {
      console.error("❌ Error fetching period stats:", error)
      res.status(500).json({ error: "Failed to fetch period statistics", details: error.message })
    }
  })

  // GET position statistics for a period
  router.get("/stats/positions", verifyToken, async (req, res) => {
    try {
      console.log("📊 Fetching position stats", req.query)
      const db = getDb()
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" })
      }

      const collection = db.collection("tashrif")
      const cacheCollection = db.collection("cache")

      const visits = await collection
        .find({
          date: { $gte: startDate, $lte: endDate },
        })
        .toArray()

      const userIds = [...new Set(visits.map((v) => v.id))]
      const positionCounts = {}

      await Promise.all(
        userIds.map(async (userId) => {
          const userCache = await cacheCollection.findOne({ USER_NO: userId })
          const position = userCache?.USER_POSITION || "Noma'lum"
          positionCounts[position] = (positionCounts[position] || 0) + 1
        }),
      )

      const positionStats = Object.entries(positionCounts)
        .map(([position, count]) => ({ position, count }))
        .sort((a, b) => b.count - a.count)

      console.log("✅ Position stats:", positionStats)
      res.json(positionStats)
    } catch (error) {
      console.error("❌ Error fetching position stats:", error)
      res.status(500).json({ error: "Failed to fetch position statistics", details: error.message })
    }
  })
 
  console.log("✅ Visits routes initialized")
  return router
}
