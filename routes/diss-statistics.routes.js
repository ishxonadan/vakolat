module.exports = (yoqlama, { Documents }) => {
  const express = require("express")
  const router = express.Router()
  const mongoose = require("mongoose")
  const { verifyToken, checkPermissions } = require("../src/middleware/auth.middleware")

  const PUBLISHED_DOC_FILTER = {
    filename: { $exists: true, $ne: "" },
    is_deleted: { $ne: 1 },
  }

  const DIRECTIONS_COUNT = 24

  const readmarkSchema = new mongoose.Schema(
    {
      id: String,
      ip: String,
      page: Number,
      isDownload: Boolean,
      preview: Boolean,
      timestamp: Date,
      category_id: Number,
      user: mongoose.Schema.Types.Mixed,
    },
    { collection: "readmarks" },
  )

  const searchHistorySchema = new mongoose.Schema(
    {
      query: String,
      count: Number,
      timestamp: Date,
    },
    { collection: "searchHistory" },
  )

  const dissUserSchema = new mongoose.Schema(
    {
      id: Number,
      username: String,
      uid: String,
      role: String,
      isDeleted: Boolean,
    },
    { collection: "users" },
  )

  const Readmark = yoqlama.model("Readmark", readmarkSchema)
  const SearchHistory = yoqlama.model("SearchHistory", searchHistorySchema)
  const DissUser = yoqlama.model("DissUser", dissUserSchema)

  const startOfDay = (value) => {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
  }
  const endOfDay = (value) => {
    const date = new Date(value)
    date.setHours(23, 59, 59, 999)
    return date
  }
  const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime())

  const resolveStatisticsDateRange = ({ from, to }) => {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const parsedFrom = from ? new Date(from) : null
    const parsedTo = to ? new Date(to) : null

    if (from && !isValidDate(parsedFrom)) {
      const error = new Error("INVALID_FROM_DATE")
      error.status = 400
      throw error
    }
    if (to && !isValidDate(parsedTo)) {
      const error = new Error("INVALID_TO_DATE")
      error.status = 400
      throw error
    }

    const rangeStart = parsedFrom ? startOfDay(parsedFrom) : yearStart
    const rangeEnd = parsedTo ? endOfDay(parsedTo) : now
    if (rangeStart > rangeEnd) {
      const error = new Error("INVALID_DATE_RANGE")
      error.status = 400
      throw error
    }

    return { rangeStart, rangeEnd }
  }

  const activityMatch = (rangeStart, rangeEnd) => ({
    timestamp: { $gte: rangeStart, $lte: rangeEnd },
  })

  router.get("/", verifyToken, checkPermissions(["view_diss_statistics"]), async (req, res) => {
    try {
      const { rangeStart, rangeEnd } = resolveStatisticsDateRange({
        from: req.query.from,
        to: req.query.to,
      })

      const activityFilter = activityMatch(rangeStart, rangeEnd)

      const [
        totalDocuments,
        activeDocuments,
        dissertatsiyaCount,
        avtoreferatCount,
        registeredUsers,
        pageViews,
        searchQueries,
        downloads,
      ] = await Promise.all([
        Documents.countDocuments(),
        Documents.countDocuments(PUBLISHED_DOC_FILTER),
        Documents.countDocuments({ ...PUBLISHED_DOC_FILTER, type: "Dissertatsiya" }),
        Documents.countDocuments({ ...PUBLISHED_DOC_FILTER, type: "Avtoreferat" }),
        DissUser.countDocuments({ isDeleted: { $ne: true } }),
        Readmark.countDocuments({
          ...activityFilter,
          isDownload: false,
          preview: false,
        }),
        SearchHistory.countDocuments(activityFilter),
        Readmark.countDocuments({
          ...activityFilter,
          isDownload: true,
        }),
      ])

      res.json({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
        summary: {
          totalDocuments,
          activeDocuments,
          dissertatsiyaCount,
          avtoreferatCount,
          registeredUsers,
          directionsCount: DIRECTIONS_COUNT,
          pageViews,
          searchQueries,
          downloads,
        },
      })
    } catch (error) {
      if (error.status === 400) {
        return res.status(400).json({ error: "Noto'g'ri sana oralig'i" })
      }
      console.error("Error loading dissertation statistics:", error)
      res.status(500).json({ error: "Statistikani yuklashda xatolik" })
    }
  })

  return router
}
