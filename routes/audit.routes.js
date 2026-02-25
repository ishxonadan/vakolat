const express = require("express")
const router = express.Router()
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

module.exports = (vakolat) => {
  const AuditLog = vakolat.model("AuditLog")

  const requireRais = [verifyToken, checkUserLevel("rais")]

  // GET audit logs (superuser only), optionally filtered by userId
  router.get("/audit-logs", requireRais, async (req, res) => {
    try {
      const { userId, page = 1, limit = 50 } = req.query
      const pageNum = Math.max(parseInt(page, 10) || 1, 1)
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)

      const filter = {}
      if (userId) {
        filter.user = userId
      }

      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .populate("user", "nickname firstname lastname level")
          .lean(),
        AuditLog.countDocuments(filter),
      ])

      res.json({
        items,
        total,
        page: pageNum,
        limit: limitNum,
      })
    } catch (error) {
      console.error("Error fetching audit logs:", error)
      res.status(500).json({ error: "Audit loglarini olishda xatolik" })
    }
  })

  return router
}

