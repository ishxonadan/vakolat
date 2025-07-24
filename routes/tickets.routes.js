const express = require("express")
const router = express.Router()
const QRCode = require("qrcode")

module.exports = (nazorat, Tickets) => {
  // Helper function to generate ticket ID
  function generateTicketId(ticketNumber) {
    return `GUL${ticketNumber.toString().padStart(10, "0")}`
  }

  // Helper function to get next global ticket number (never resets)
  async function getNextGlobalTicketNumber() {
    try {
      const lastTicket = await Tickets.findOne().sort({ ticketNumber: -1 })
      return lastTicket ? lastTicket.ticketNumber + 1 : 1
    } catch (error) {
      console.error("Error getting next global ticket number:", error)
      return 1
    }
  }

  // Helper function to get next daily order number (resets each day)
  async function getNextDailyOrderNumber() {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      console.log("Getting daily order number for date range:", startOfDay, "to", endOfDay)

      // Find all tickets created today
      const todayTickets = await Tickets.find({
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      })

      console.log("Found tickets for today:", todayTickets.length)

      // Filter tickets that have valid dailyOrderNumber and sort them
      const validTickets = todayTickets
        .filter((ticket) => {
          const hasValidNumber =
            ticket.dailyOrderNumber && !isNaN(ticket.dailyOrderNumber) && typeof ticket.dailyOrderNumber === "number"
          console.log(
            `Ticket ${ticket.ticketId}: dailyOrderNumber = ${ticket.dailyOrderNumber}, valid = ${hasValidNumber}`,
          )
          return hasValidNumber
        })
        .sort((a, b) => b.dailyOrderNumber - a.dailyOrderNumber)

      console.log("Valid tickets with dailyOrderNumber:", validTickets.length)

      if (validTickets.length === 0) {
        console.log("No valid tickets found, returning 1")
        return 1
      }

      const nextNumber = validTickets[0].dailyOrderNumber + 1
      console.log("Next daily order number will be:", nextNumber)

      return nextNumber
    } catch (error) {
      console.error("Error getting next daily order number:", error)
      return 1
    }
  }

  // GET all tickets (all entries including updates)
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

  // POST create new ticket or add new entry for existing user
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

      // Check if user with same passport already exists
      const existingTicket = await Tickets.findOne({ passport: passport.trim() }).sort({ createdAt: -1 })

      let ticketId,
        globalTicketNumber,
        isUpdate = false,
        nameChanged = false

      if (existingTicket) {
        // Reuse the same ticket ID and global number for existing user
        ticketId = existingTicket.ticketId
        globalTicketNumber = existingTicket.ticketNumber
        isUpdate = true
        nameChanged = existingTicket.fullname !== fullname.trim()
      } else {
        // Create new ticket ID for new user
        globalTicketNumber = await getNextGlobalTicketNumber()
        ticketId = generateTicketId(globalTicketNumber)
      }

      // Always get a new daily order number - ensure it's a valid number
      console.log("Getting daily order number...")
      const dailyOrderNumber = await getNextDailyOrderNumber()
      console.log("Got daily order number:", dailyOrderNumber, "type:", typeof dailyOrderNumber)

      // Additional validation to ensure dailyOrderNumber is valid
      if (
        isNaN(dailyOrderNumber) ||
        dailyOrderNumber === null ||
        dailyOrderNumber === undefined ||
        typeof dailyOrderNumber !== "number"
      ) {
        console.error("Invalid daily order number:", dailyOrderNumber, "type:", typeof dailyOrderNumber)
        return res.status(500).json({ error: "Tartib raqamini yaratishda xatolik" })
      }

      console.log("Creating ticket with dailyOrderNumber:", dailyOrderNumber)

      // Always create a NEW ticket entry (never update existing ones)
      const newTicketEntry = new Tickets({
        ticketId,
        fullname: fullname.trim(),
        passport: passport.trim(),
        date: new Date(),
        ticketNumber: globalTicketNumber,
        dailyOrderNumber: dailyOrderNumber,
        createdBy: "system",
        isUpdate: isUpdate, // Track if this is an update entry
        nameChanged: nameChanged, // Track if name was changed
      })

      await newTicketEntry.save()

      const message = isUpdate
        ? nameChanged
          ? "Chipta yangilandi va ism o'zgartirildi"
          : "Mavjud chipta yangilandi"
        : "Chipta muvaffaqiyatli yaratildi"

      res.status(201).json({
        ticketId: newTicketEntry.ticketId,
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

      const qrData = ticket.ticketId // Only the ticket ID - no name/surname
      const qrCode = await QRCode.toDataURL(qrData, {
        width: 400, // Increased from 300 to 400
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
      const count = await Tickets.countDocuments({ passport: req.params.passport })
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
