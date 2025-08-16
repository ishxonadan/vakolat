const express = require("express")
const router = express.Router()

module.exports = (nazorat, vakolat) => {
  const Tickets = nazorat.model("Ticket")
  const LibraryUsers = nazorat.model("LibraryUser")

  // Get TV display statistics - NO AUTHENTICATION REQUIRED
  router.get("/stats", async (req, res) => {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      // Get today's visitors (unique tickets created today)
      const todayTickets = await Tickets.find({
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      })

      // Count unique visitors by passport
      const uniqueVisitors = new Set(todayTickets.map((ticket) => ticket.passport))
      const todayVisitors = uniqueVisitors.size

      // Get today's registrations (new library users created today)
      const todayRegistrations = await LibraryUsers.countDocuments({
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      })

      // Get total one-time tickets issued today
      const oneTimeTickets = todayTickets.length

      // Simulate current users in library (you can replace this with real data)
      // This could come from entry/exit system, WiFi connections, etc.
      const currentUsers = Math.floor(Math.random() * 200) + 50 // Random between 50-250

      

      res.json({
        todayVisitors,
        currentUsers,
        todayRegistrations,
        oneTimeTickets,
        lastUpdated: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error fetching TV stats:", error)
      res.status(500).json({
        error: "Ma'lumotlarni yuklashda xatolik",
        todayVisitors: 0,
        currentUsers: 0,
        todayRegistrations: 0,
        oneTimeTickets: 0,
      })
    }
  })

  return router
}
