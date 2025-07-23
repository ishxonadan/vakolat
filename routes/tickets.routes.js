const express = require('express');
const router = express.Router();
const { Tickets } = require('../server'); // Import from your existing server.js
const QRCode = require('qrcode');

// Helper function to generate ticket ID
function generateTicketId(ticketNumber) {
  return `GUL${ticketNumber.toString().padStart(10, '0')}`;
}

// Helper function to get next ticket number
async function getNextTicketNumber() {
  const lastTicket = await Tickets.findOne().sort({ ticketNumber: -1 });
  return lastTicket ? lastTicket.ticketNumber + 1 : 1;
}

// GET all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await Tickets.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET ticket by ID
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Tickets.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'Chipta topilmadi' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new ticket
router.post('/', async (req, res) => {
  try {
    const { fullname, passport } = req.body;
    
    if (!fullname || !passport) {
      return res.status(400).json({ error: 'Ism va pasport ma\'lumotlari talab qilinadi' });
    }

    // Check if user with same passport already exists
    const existingTicket = await Tickets.findOne({ passport });
    
    if (existingTicket) {
      // Update existing ticket's date
      existingTicket.date = new Date();
      existingTicket.updatedAt = new Date();
      existingTicket.updatedBy = 'system';
      await existingTicket.save();
      
      return res.json({
        ticketId: existingTicket.ticketId,
        message: 'Mavjud chipta yangilandi',
        isUpdate: true
      });
    }

    // Create new ticket
    const ticketNumber = await getNextTicketNumber();
    const ticketId = generateTicketId(ticketNumber);
    
    const newTicket = new Tickets({
      ticketId,
      fullname,
      passport,
      date: new Date(),
      ticketNumber,
      createdBy: 'system'
    });

    await newTicket.save();
    
    res.status(201).json({
      ticketId: newTicket.ticketId,
      message: 'Chipta muvaffaqiyatli yaratildi',
      isUpdate: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET QR code for ticket
router.get('/:id/qr', async (req, res) => {
  try {
    const ticket = await Tickets.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'Chipta topilmadi' });
    }

    const qrData = `${ticket.ticketId}|${ticket.fullname}|${ticket.passport}|${ticket.date.toISOString().split('T')[0]}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    res.json({ qrCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET ticket count for passport
router.get('/count/:passport', async (req, res) => {
  try {
    const count = await Tickets.countDocuments({ passport: req.params.passport });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;