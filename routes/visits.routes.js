const express = require("express")
const { verifyToken, checkPermissions } = require("../src/middleware/auth.middleware")

module.exports = (nazoratConnection) => {
  const router = express.Router()

  const getDb = () => {
    if (!nazoratConnection.db) {
      throw new Error("Database connection not established")
    }
    return nazoratConnection.db
  }

  const CACHE_LIST_FIELDS = {
    USER_NO: 1,
    USER_NAME: 1,
    USER_POSITION: 1,
    TEL_NO: 1,
  }

  const ensureIndex = async (collection, keys, name) => {
    try {
      await collection.createIndex(keys, { name })
    } catch (error) {
      const alreadyExists = error.code === 85 || error.code === 86 || /already exists/i.test(error.message || "")
      if (!alreadyExists) {
        console.error(`❌ Visit index ${name} failed:`, error.message)
      }
    }
  }

  const ensureVisitIndexes = () => {
    try {
      const db = getDb()
      const tashrif = db.collection("tashrif")
      const cache = db.collection("cache")
      Promise.all([
        ensureIndex(tashrif, { date: -1, keldi: -1 }, "tashrif_date_keldi"),
        ensureIndex(tashrif, { id: 1, date: -1, keldi: -1 }, "tashrif_id_date_keldi"),
        ensureIndex(cache, { USER_NO: 1 }, "cache_user_no"),
      ]).then(() => console.log("✅ Visit indexes ready"))
    } catch (error) {
      console.error("❌ Visit index setup skipped:", error.message)
    }
  }

  if (nazoratConnection.readyState === 1) {
    ensureVisitIndexes()
  } else {
    nazoratConnection.once("connected", ensureVisitIndexes)
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

  const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  const readCount = (rows) => rows?.[0]?.n || 0

  const summarizeVisits = async (collection, match, { includeCurrent = false } = {}) => {
    const totalPromise = collection.countDocuments(match)
    const uniquePromise = collection
      .aggregate([{ $match: match }, { $group: { _id: "$id" } }, { $count: "n" }])
      .toArray()
    const currentPromise = includeCurrent
      ? collection.countDocuments({
          ...match,
          $or: [{ ketdi: null }, { ketdi: "" }],
        })
      : Promise.resolve(0)

    const [total, uniqueRows, current] = await Promise.all([totalPromise, uniquePromise, currentPromise])

    return {
      total,
      unique: readCount(uniqueRows),
      current,
    }
  }

  const loadUsersByIds = async (cacheCollection, ids, projection) => {
    const uniqueIds = [...new Set(ids.filter(Boolean))]
    if (!uniqueIds.length) return new Map()

    const users = await cacheCollection.find({ USER_NO: { $in: uniqueIds } }, { projection }).toArray()
    return new Map(users.map((user) => [user.USER_NO, user]))
  }

  const isoDate = (date) => date.toISOString().split("T")[0]

  const localYmd = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const resolveLocalRange = (period, from, to) => {
    const now = new Date()
    const year = now.getFullYear()
    const today = localYmd(now)
    if (period === "today") return [today, today]
    if (period === "3d") {
      const start = new Date(now)
      start.setDate(now.getDate() - 2)
      return [localYmd(start), today]
    }
    if (period === "7d") {
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      return [localYmd(start), today]
    }
    if (period === "this_month") return [localYmd(new Date(year, now.getMonth(), 1)), today]
    if (period === "year_to_date") return [`${year}-01-01`, today]
    if (period === "q1") return [`${year}-01-01`, `${year}-03-31`]
    if (period === "q2") return [`${year}-01-01`, `${year}-06-30`]
    if (period === "dec20") return [`${year}-01-01`, `${year}-12-20`]
    if (period === "custom") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) return null
      return from <= to ? [from, to] : [to, from]
    }
    return null
  }

  const clockToSeconds = (field) => ({
    $let: {
      vars: { parts: { $split: [{ $ifNull: [`$${field}`, ""] }, ":"] } },
      in: {
        $add: [
          { $multiply: [{ $convert: { input: { $arrayElemAt: ["$$parts", 0] }, to: "int", onError: 0, onNull: 0 } }, 3600] },
          { $multiply: [{ $convert: { input: { $arrayElemAt: ["$$parts", 1] }, to: "int", onError: 0, onNull: 0 } }, 60] },
          { $convert: { input: { $ifNull: [{ $arrayElemAt: ["$$parts", 2] }, "0"] }, to: "int", onError: 0, onNull: 0 } },
        ],
      },
    },
  })

  const sexGroup = (value) => {
    const raw = String(value || "").trim().toUpperCase()
    if (raw === "M" || raw === "ERKAK" || raw === "MALE" || raw === "0001") return "male"
    if (raw === "F" || raw === "AYOL" || raw === "FEMALE" || raw === "0002") return "female"
    return ""
  }

  const ageOn = (birthday, onDate) => {
    const digits = String(birthday || "").replace(/\D/g, "").slice(0, 8)
    if (!/^\d{8}$/.test(digits)) return null
    const birth = new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, Number(digits.slice(6, 8)))
    if (Number.isNaN(birth.getTime())) return null
    let age = onDate.getFullYear() - birth.getFullYear()
    const month = onDate.getMonth() - birth.getMonth()
    if (month < 0 || (month === 0 && onDate.getDate() < birth.getDate())) age -= 1
    return age
  }

  const placeRows = (rows) => rows.slice(0, 10).map((row, index) => ({
    place: index + 1,
    userNo: row.userNo,
    name: row.name,
    seconds: row.seconds,
  }))

  router.get("/member/:userNo", verifyToken, checkPermissions(["view_statistics"]), async (req, res) => {
    try {
      const db = getDb()
      const userNo = String(req.params.userNo || "").trim()
      if (!userNo) return res.status(400).json({ error: "ID kerak" })
      const user = await db.collection("cache").findOne(
        { USER_NO: userNo },
        { projection: { PASSWORD: 0, UZNEL_ORG_ROW: 0 } },
      )
      if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" })
      res.json(user)
    } catch (error) {
      console.error("visit member:", error)
      res.status(500).json({ error: "Foydalanuvchi yuklanmadi" })
    }
  })

  // GET photos for the current page only. Kept off the list payload so the table can render first.
  router.get("/photos", verifyToken, async (req, res) => {
    try {
      const ids = String(req.query.ids || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 300)

      if (!ids.length) {
        return res.json({ photos: {} })
      }

      const db = getDb()
      const users = await db
        .collection("cache")
        .find({ USER_NO: { $in: ids } }, { projection: { USER_NO: 1, PHOTO: 1 } })
        .toArray()

      const photos = {}
      for (const user of users) {
        if (user.PHOTO) photos[user.USER_NO] = user.PHOTO
      }

      res.json({ photos })
    } catch (error) {
      console.error("❌ Error fetching visit photos:", error)
      res.status(500).json({ error: "Failed to fetch photos", details: error.message })
    }
  })

  // GET all visits with pagination and filtering - LATEST FIRST
  router.get("/", verifyToken, async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page, 10) || 1
      const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 300)
      const skip = (page - 1) * limit
      const query = {}

      const db = getDb()
      const collection = db.collection("tashrif")
      const cacheCollection = db.collection("cache")

      if (req.query.startDate && req.query.endDate) {
        query.date = {
          $gte: req.query.startDate,
          $lte: req.query.endDate,
        }
      }

      if (req.query.search) {
        const searchRegex = new RegExp(escapeRegex(req.query.search), "i")

        const matchingUsers = await cacheCollection
          .find(
            {
              $or: [{ USER_NO: searchRegex }, { USER_NAME: searchRegex }],
            },
            { projection: { USER_NO: 1 } },
          )
          .limit(500)
          .toArray()

        const matchingIds = matchingUsers.map((user) => user.USER_NO)

        query.$or = [{ id: { $in: matchingIds } }, { id: searchRegex }, { userName: searchRegex }]
      }

      const hasFilter = Object.keys(query).length > 0
      const totalPromise = hasFilter ? collection.countDocuments(query) : collection.estimatedDocumentCount()

      const [total, visits] = await Promise.all([
        totalPromise,
        collection.find(query).sort({ date: -1, keldi: -1 }).skip(skip).limit(limit).toArray(),
      ])

      const usersById = await loadUsersByIds(
        cacheCollection,
        visits.map((visit) => visit.id),
        CACHE_LIST_FIELDS,
      )

      const enrichedVisits = visits.map((visit) => {
        const userCache = usersById.get(visit.id)
        return {
          _id: visit._id,
          id: visit.id,
          date: visit.date,
          keldi: visit.keldi,
          ketdi: visit.ketdi || null,
          duration: calculateDuration(visit.keldi, visit.ketdi),
          userName: userCache?.USER_NAME || visit.userName || "Noma'lum",
          userPosition: userCache?.USER_POSITION || visit.userPosition || "-",
          userTel: userCache?.TEL_NO || null,
        }
      })

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
      console.error("❌ ERROR in visits route:", error)
      res.status(500).json({ error: "Failed to fetch visits", details: error.message })
    }
  })

  // GET user visit history by user ID
  router.get("/user/:userId", verifyToken, async (req, res) => {
    try {
      const userId = req.params.userId
      const db = getDb()
      const collection = db.collection("tashrif")
      const cacheCollection = db.collection("cache")

      const [visits, userCache] = await Promise.all([
        collection.find({ id: userId }).sort({ date: -1, keldi: -1 }).limit(50).toArray(),
        cacheCollection.findOne({ USER_NO: userId }, { projection: CACHE_LIST_FIELDS }),
      ])

      const enrichedVisits = visits.map((visit) => ({
        _id: visit._id,
        id: visit.id,
        date: visit.date,
        keldi: visit.keldi,
        ketdi: visit.ketdi || null,
        duration: calculateDuration(visit.keldi, visit.ketdi),
        userName: userCache?.USER_NAME || userId,
        userPosition: userCache?.USER_POSITION || "-",
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

  router.get("/time-leaders", verifyToken, checkPermissions(["view_statistics"]), async (req, res) => {
    try {
      const db = getDb()
      const period = String(req.query.period || "7d")
      const range = resolveLocalRange(period, String(req.query.from || ""), String(req.query.to || ""))
      if (!range) return res.status(400).json({ error: "Davr noto'g'ri" })
      const [from, to] = range

      const rows = await db.collection("tashrif").aggregate([
        {
          $match: {
            date: { $gte: from, $lte: to },
            keldi: { $nin: [null, ""] },
            ketdi: { $nin: [null, ""] },
          },
        },
        {
          $addFields: {
            seconds: { $subtract: [clockToSeconds("ketdi"), clockToSeconds("keldi")] },
          },
        },
        { $match: { seconds: { $gt: 0 } } },
        { $group: { _id: "$id", seconds: { $sum: "$seconds" } } },
        {
          $lookup: {
            from: "cache",
            localField: "_id",
            foreignField: "USER_NO",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            _id: 0,
            userNo: "$user.USER_NO",
            name: "$user.USER_NAME",
            sex: "$user.SEX",
            birthday: "$user.BIRTHDAY",
            seconds: 1,
          },
        },
      ]).toArray()

      const asOf = new Date(`${to}T12:00:00`)
      const male = []
      const female = []
      const youth = []
      const youthMale = []
      const youthFemale = []
      for (const row of rows) {
        const group = sexGroup(row.sex)
        const item = {
          userNo: row.userNo,
          name: row.name || row.userNo,
          seconds: Number(row.seconds || 0),
        }
        if (group === "male") male.push(item)
        else if (group === "female") female.push(item)
        const age = ageOn(row.birthday, asOf)
        if (age != null && age >= 14 && age <= 30) {
          youth.push(item)
          if (group === "male") youthMale.push(item)
          else if (group === "female") youthFemale.push(item)
        }
      }
      for (const list of [male, female, youth, youthMale, youthFemale]) {
        list.sort((a, b) => b.seconds - a.seconds)
      }

      res.json({
        from,
        to,
        male: placeRows(male),
        female: placeRows(female),
        youth: placeRows(youth),
        youthMale: placeRows(youthMale),
        youthFemale: placeRows(youthFemale),
      })
    } catch (error) {
      console.error("time-leaders:", error)
      res.status(500).json({ error: "Vaqt statistikasi yuklanmadi" })
    }
  })

  // GET today's statistics
  router.get("/stats/today", verifyToken, async (req, res) => {
    try {
      const db = getDb()
      const today = isoDate(new Date())
      const stats = await summarizeVisits(db.collection("tashrif"), { date: today }, { includeCurrent: true })

      res.json({
        total: stats.total,
        unique: stats.unique,
        current: stats.current,
      })
    } catch (error) {
      console.error("❌ Error fetching today stats:", error)
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
      const endDate = isoDate(new Date(year, now.getMonth() + 1, 0))

      const stats = await summarizeVisits(db.collection("tashrif"), {
        date: { $gte: startDate, $lte: endDate },
      })
      const daysInMonth = now.getDate()

      res.json({
        total: stats.total,
        unique: stats.unique,
        average: daysInMonth > 0 ? Math.round(stats.total / daysInMonth) : 0,
      })
    } catch (error) {
      console.error("❌ Error fetching month stats:", error)
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

      const stats = await summarizeVisits(db.collection("tashrif"), {
        date: { $gte: startDate, $lte: endDate },
      })

      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

      res.json({
        total: stats.total,
        unique: stats.unique,
        days,
        average: days > 0 ? Math.round(stats.total / days) : 0,
      })
    } catch (error) {
      console.error("❌ Error fetching period stats:", error)
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

      const grouped = await collection
        .aggregate([
          { $match: { date: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: "$id" } },
        ])
        .toArray()

      const userIds = grouped.map((row) => row._id).filter(Boolean)
      const positionCounts = {}

      for (let offset = 0; offset < userIds.length; offset += 500) {
        const chunk = userIds.slice(offset, offset + 500)
        const users = await cacheCollection
          .find({ USER_NO: { $in: chunk } }, { projection: { USER_NO: 1, USER_POSITION: 1 } })
          .toArray()
        const usersById = new Map(users.map((user) => [user.USER_NO, user]))

        for (const id of chunk) {
          const position = usersById.get(id)?.USER_POSITION || "Noma'lum"
          positionCounts[position] = (positionCounts[position] || 0) + 1
        }
      }

      const positionStats = Object.entries(positionCounts)
        .map(([position, count]) => ({ position, count }))
        .sort((a, b) => b.count - a.count)

      res.json(positionStats)
    } catch (error) {
      console.error("❌ Error fetching position stats:", error)
      res.status(500).json({ error: "Failed to fetch position statistics", details: error.message })
    }
  })

  console.log("✅ Visits routes initialized")
  return router
}
