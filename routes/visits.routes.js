const express = require("express")
const router = express.Router()
const { verifyToken } = require("../src/middleware/auth.middleware")

module.exports = (nazoratConnection) => {
  // Helper function to get database (ensures connection is ready)
  const getDb = () => {
    if (!nazoratConnection.db) {
      throw new Error("Database connection not established")
    }
    return nazoratConnection.db
  }

  // Helper function to calculate duration
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

  // GET all visits with pagination and filtering
  router.get("/", verifyToken, async (req, res) => {
    try {
      const db = getDb()
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 20
      const skip = (page - 1) * limit

      const query = {}

      // Date range filter
      if (req.query.startDate && req.query.endDate) {
        query.date = {
          $gte: req.query.startDate,
          $lte: req.query.endDate,
        }
      }

      // Search filter
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, "i")
        query.$or = [{ id: searchRegex }, { userName: searchRegex }, { userPosition: searchRegex }]
      }

      const collection = db.collection("tashrif")
      const cacheCollection = db.collection("cache")

      const visits = await collection.find(query).sort({ date: -1, keldi: -1 }).skip(skip).limit(limit).toArray()

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

      const total = await collection.countDocuments(query)

      res.json({
        visits: enrichedVisits,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Error fetching visits:", error)
      res.status(500).json({ error: "Failed to fetch visits", details: error.message })
    }
  })

  // GET today's statistics
  router.get("/stats/today", verifyToken, async (req, res) => {
    try {
      const db = getDb()
      const today = new Date().toISOString().split("T")[0]
      const collection = db.collection("tashrif")

      const todayVisits = await collection.find({ date: today }).toArray()
      const uniqueIds = new Set(todayVisits.map((v) => v.id))
      const currentInside = todayVisits.filter((v) => !v.ketdi).length

      res.json({
        total: todayVisits.length,
        unique: uniqueIds.size,
        current: currentInside,
      })
    } catch (error) {
      console.error("Error fetching today stats:", error)
      res.status(500).json({ error: "Failed to fetch today statistics", details: error.message })
    }
  })

  // GET this month's statistics
  router.get("/stats/month", verifyToken, async (req, res) => {
    try {
      const db = getDb()
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const startDate = `${year}-${month}-01`
      const endDate = new Date(year, now.getMonth() + 1, 0).toISOString().split("T")[0]

      console.log("Fetching month stats from:", startDate, "to:", endDate)

      const collection = db.collection("tashrif")

      const monthVisits = await collection
        .find({
          date: { $gte: startDate, $lte: endDate },
        })
        .toArray()

      console.log("Month visits count:", monthVisits.length)

      const uniqueIds = new Set(monthVisits.map((v) => v.id))
      const daysInMonth = now.getDate()
      const average = daysInMonth > 0 ? Math.round(monthVisits.length / daysInMonth) : 0

      res.json({
        total: monthVisits.length,
        unique: uniqueIds.size,
        average,
      })
    } catch (error) {
      console.error("Error fetching month stats:", error)
      console.error("Error details:", error.stack)
      res.status(500).json({ error: "Failed to fetch month statistics", details: error.message })
    }
  })

  // GET period statistics
  router.get("/stats/period", verifyToken, async (req, res) => {
    try {
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

      res.json({
        total: periodVisits.length,
        unique: uniqueIds.size,
        days,
        average,
      })
    } catch (error) {
      console.error("Error fetching period stats:", error)
      res.status(500).json({ error: "Failed to fetch period statistics", details: error.message })
    }
  })

  // GET position statistics for a period
  router.get("/stats/positions", verifyToken, async (req, res) => {
    try {
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

      // Get unique user IDs
      const userIds = [...new Set(visits.map((v) => v.id))]

      // Get positions from cache
      const positionCounts = {}

      await Promise.all(
        userIds.map(async (userId) => {
          const userCache = await cacheCollection.findOne({ USER_NO: userId })
          const position = userCache?.USER_POSITION || "Noma'lum"
          positionCounts[position] = (positionCounts[position] || 0) + 1
        }),
      )

      // Convert to array and sort
      const positionStats = Object.entries(positionCounts)
        .map(([position, count]) => ({ position, count }))
        .sort((a, b) => b.count - a.count)

      res.json(positionStats)
    } catch (error) {
      console.error("Error fetching position stats:", error)
      res.status(500).json({ error: "Failed to fetch position statistics", details: error.message })
    }
  })

  return router
}
