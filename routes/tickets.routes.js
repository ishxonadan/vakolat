const express = require("express")
const router = express.Router()
const QRCode = require("qrcode")

module.exports = (nazorat, Tickets) => {
  // Helper function to generate ticket ID
  function generateTicketId(ticketNumber) {
    return `GUL${ticketNumber.toString().padStart(10, "0")}`
  }

  // Helper function to get next ticket number
  async function getNextTicketNumber() {
    try {
      const lastTicket = await Tickets.findOne().sort({ ticketNumber: -1 })
      return lastTicket ? lastTicket.ticketNumber + 1 : 1
    } catch (error) {
      console.error("Error getting next ticket number:", error)
      return 1
    }
  }

  // GET all tickets
  router.get("/", async (req, res) => {
    try {
      const tickets = await Tickets.find().sort({ createdAt: -1 })
      res.json(tickets)
    } catch (error) {
      console.error("Error fetching tickets:", error)
      res.status(500).json({ error: error.message })
    }
  })

  // GET ticket by ID
  router.get("/:id", async (req, res) => {
    try {
      const ticket = await Tickets.findOne({ ticketId: req.params.id })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }
      res.json(ticket)
    } catch (error) {
      console.error("Error fetching ticket:", error)
      res.status(500).json({ error: error.message })
    }
  })

  // GET ticket by passport
  router.get("/passport/:passport", async (req, res) => {
    try {
      const ticket = await Tickets.findOne({ passport: req.params.passport })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }
      res.json(ticket)
    } catch (error) {
      console.error("Error fetching ticket by passport:", error)
      res.status(500).json({ error: error.message })
    }
  })

  // POST create new ticket
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
      const existingTicket = await Tickets.findOne({ passport: passport.trim() })

      if (existingTicket) {
        // Update existing ticket's date and fullname
        existingTicket.fullname = fullname.trim()
        existingTicket.date = new Date()
        existingTicket.updatedAt = new Date()
        existingTicket.updatedBy = "system"
        await existingTicket.save()

        return res.json({
          ticketId: existingTicket.ticketId,
          message: "Mavjud chipta yangilandi",
          isUpdate: true,
        })
      }

      // Create new ticket
      const ticketNumber = await getNextTicketNumber()
      const ticketId = generateTicketId(ticketNumber)

      const newTicket = new Tickets({
        ticketId,
        fullname: fullname.trim(),
        passport: passport.trim(),
        date: new Date(),
        ticketNumber,
        createdBy: "system",
      })

      await newTicket.save()

      res.status(201).json({
        ticketId: newTicket.ticketId,
        message: "Chipta muvaffaqiyatli yaratildi",
        isUpdate: false,
      })
    } catch (error) {
      console.error("Error creating ticket:", error)
      res.status(500).json({ error: error.message })
    }
  })

  // PUT update ticket fullname
  router.put("/:id", async (req, res) => {
    try {
      const { fullname } = req.body

      if (!fullname) {
        return res.status(400).json({ error: "Ism talab qilinadi" })
      }

      const ticket = await Tickets.findOne({ ticketId: req.params.id })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }

      ticket.fullname = fullname.trim()
      ticket.updatedAt = new Date()
      ticket.updatedBy = "system"
      await ticket.save()

      res.json({
        message: "Ism muvaffaqiyatli yangilandi",
        ticket: ticket,
      })
    } catch (error) {
      console.error("Error updating ticket:", error)
      res.status(500).json({ error: error.message })
    }
  })

  // GET QR code for ticket
  router.get("/:id/qr", async (req, res) => {
    try {
      const ticket = await Tickets.findOne({ ticketId: req.params.id })
      if (!ticket) {
        return res.status(404).json({ error: "Chipta topilmadi" })
      }

      const qrData = ticket.ticketId // Only the ticket ID - no name/surname
      const qrCode = await QRCode.toDataURL(qrData, {
        width: 500, // Increased from 400 to 500
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
