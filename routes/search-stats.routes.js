const express = require("express")
const { verifyToken, checkPermissions } = require("../src/middleware/auth.middleware")
const PlausibleService = require("../src/services/plausible.service")

function ymd(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function resolveSearchDateRange({ period, from, to }) {
  const now = new Date()
  const year = now.getFullYear()
  if (period === "today") return "day"
  if (period === "3d") {
    const start = new Date(now)
    start.setDate(now.getDate() - 2)
    return [ymd(start), ymd(now)]
  }
  if (period === "7d") return "7d"
  if (period === "this_month") return "month"
  if (period === "year_to_date") return "year"
  if (period === "q1") return [`${year}-01-01`, `${year}-03-31`]
  if (period === "q2") return [`${year}-01-01`, `${year}-06-30`]
  if (period === "dec20") return [`${year}-01-01`, `${year}-12-20`]
  if (period === "custom") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) return null
    return from <= to ? [from, to] : [to, from]
  }
  return null
}

module.exports = () => {
  const router = express.Router()
  const plausible = new PlausibleService()

  router.get("/", verifyToken, checkPermissions(["view_statistics"]), async (req, res) => {
    try {
      const period = String(req.query.period || "7d")
      const dateRange = resolveSearchDateRange({
        period,
        from: String(req.query.from || ""),
        to: String(req.query.to || ""),
      })
      if (!dateRange) {
        return res.status(400).json({ error: "Davr noto'g'ri" })
      }
      const data = await plausible.getSearchInitiated(dateRange)
      res.json({
        period,
        visits: data.visits,
        pageviews: data.pageviews,
        from: data.from,
        to: data.to,
        page: data.page,
      })
    } catch (error) {
      console.error("search-stats:", error.message)
      res.status(502).json({ error: error.message || "Plausible so'rovi bajarilmadi" })
    }
  })

  return router
}
