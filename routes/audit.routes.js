const express = require("express")
const router = express.Router()
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

module.exports = (vakolat) => {
  const AuditLog = vakolat.model("AuditLog")
  const User = vakolat.model("User")

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

  // GET per-user statistics (dissertations, registrations, one-day tickets, etc.)
  router.get("/audit-stats", requireRais, async (req, res) => {
    try {
      const { userId } = req.query

      const match = {}
      if (userId) {
        match.user = userId
      }

      const logs = await AuditLog.find(match).populate("user", "nickname firstname lastname level").lean()

      const byUser = new Map()

      for (const log of logs) {
        const uid = String(log.user?._id || log.user)
        if (!byUser.has(uid)) {
          byUser.set(uid, {
            userId: uid,
            user: log.user || null,
            // Dissertations
            addCount: 0,
            editCount: 0,
            disableCount: 0,
            enableCount: 0,
            totalDissertationActions: 0,
            // Users (registration / vakillar)
            registerUserCount: 0,
            editExpertCount: 0,
            totalUserActions: 0,
            // One-day tickets
            addTicketCount: 0,
            viewTicketCount: 0,
            totalTicketActions: 0,
          })
        }
        const entry = byUser.get(uid)
        switch (log.action) {
          case "add_dissertation":
            entry.addCount++
            entry.totalDissertationActions++
            break
          case "edit_dissertation":
            entry.editCount++
            entry.totalDissertationActions++
            break
          case "disable_dissertation":
            entry.disableCount++
            entry.totalDissertationActions++
            break
          case "enable_dissertation":
            entry.enableCount++
            entry.totalDissertationActions++
            break
          case "register_user":
            entry.registerUserCount++
            entry.totalUserActions++
            break
          case "edit_expert":
            entry.editExpertCount++
            entry.totalUserActions++
            break
          case "add_ticket":
            entry.addTicketCount++
            entry.totalTicketActions++
            break
          case "view_tickets":
            entry.viewTicketCount++
            entry.totalTicketActions++
            break
          default:
            break
        }
      }

      const items = Array.from(byUser.values())

      res.json({ items })
    } catch (error) {
      console.error("Error fetching audit stats:", error)
      res.status(500).json({ error: "Audit statistikalarini olishda xatolik" })
    }
  })

  return router
}

