const express = require("express")
const mongoose = require("mongoose")
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

module.exports = (vakolat) => {
  const router = express.Router()
  const StaffPosition = vakolat.model("StaffPosition")
  const User = vakolat.model("User")

  /** Ro‘yxat: faol lavozimlar (dropdown); admin ?includeInactive=true */
  router.get("/", verifyToken, async (req, res) => {
    try {
      const includeInactive = String(req.query.includeInactive || "") === "true"
      const q = includeInactive ? {} : { isActive: true }
      const rows = await StaffPosition.find(q).sort({ sortOrder: 1, name: 1 }).lean()
      res.json(rows)
    } catch (e) {
      console.error("staff-positions list:", e)
      res.status(500).json({ error: "Lavozimlar yuklanmadi" })
    }
  })

  /** Tartibni bir so‘rovda yangilash (drag-and-drop) */
  router.put("/reorder", checkUserLevel("admin"), async (req, res) => {
    try {
      const orderedIds = req.body.orderedIds
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ error: "orderedIds bo‘sh bo‘lmasligi kerak" })
      }
      const validIds = orderedIds
        .map((id) => String(id).trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
      if (validIds.length !== orderedIds.length || new Set(validIds).size !== validIds.length) {
        return res.status(400).json({ error: "orderedIds noto‘g‘ri yoki takroriy" })
      }
      const total = await StaffPosition.countDocuments({})
      if (validIds.length !== total) {
        return res.status(400).json({ error: "Barcha lavozimlar tartibda ko‘rsatilishi kerak" })
      }
      const found = await StaffPosition.countDocuments({ _id: { $in: validIds } })
      if (found !== total) {
        return res.status(400).json({ error: "Ba’zi lavozimlar topilmadi" })
      }
      const ops = validIds.map((id, i) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sortOrder: i + 1 } },
        },
      }))
      await StaffPosition.bulkWrite(ops)
      const rows = await StaffPosition.find({}).sort({ sortOrder: 1, name: 1 }).lean()
      res.json(rows)
    } catch (e) {
      console.error("staff-positions reorder:", e)
      res.status(500).json({ error: "Tartib saqlanmadi" })
    }
  })

  router.post("/", checkUserLevel("admin"), async (req, res) => {
    try {
      const name = String(req.body.name || "").trim()
      if (!name) {
        return res.status(400).json({ error: "Lavozim nomi majburiy" })
      }
      let sortOrder = req.body.sortOrder
      if (typeof sortOrder !== "number" || Number.isNaN(sortOrder)) {
        const max = await StaffPosition.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean()
        sortOrder = max?.sortOrder != null ? max.sortOrder + 1 : 1
      }
      const doc = await StaffPosition.create({ name, isActive: true, sortOrder })
      res.status(201).json(doc)
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(400).json({ error: "Bu nom allaqachon mavjud" })
      }
      console.error("staff-positions create:", e)
      res.status(500).json({ error: "Saqlanmadi" })
    }
  })

  router.put("/:id", checkUserLevel("admin"), async (req, res) => {
    try {
      const id = req.params.id
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Noto‘g‘ri id" })
      }
      const doc = await StaffPosition.findById(id)
      if (!doc) {
        return res.status(404).json({ error: "Topilmadi" })
      }
      if (req.body.name !== undefined) {
        const name = String(req.body.name || "").trim()
        if (!name) {
          return res.status(400).json({ error: "Lavozim nomi bo‘sh bo‘lmasligi kerak" })
        }
        doc.name = name
      }
      if (req.body.isActive !== undefined) {
        doc.isActive = req.body.isActive !== false
      }
      if (req.body.sortOrder !== undefined) {
        const n = Number(req.body.sortOrder)
        if (!Number.isNaN(n)) {
          doc.sortOrder = n
        }
      }
      await doc.save()
      res.json(doc)
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(400).json({ error: "Bu nom allaqachon mavjud" })
      }
      console.error("staff-positions update:", e)
      res.status(500).json({ error: "Yangilanmadi" })
    }
  })

  router.delete("/:id", checkUserLevel("admin"), async (req, res) => {
    try {
      const id = req.params.id
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Noto‘g‘ri id" })
      }
      const n = await User.countDocuments({ staffPosition: id, level: "expert" })
      if (n > 0) {
        return res.status(400).json({
          error: `Bu lavozimda ${n} ta xodim bor. Avval ularni boshqa lavozimga o‘tkazing yoki lavozimni o‘chirish o‘rniga nofaol qiling.`,
        })
      }
      await StaffPosition.deleteOne({ _id: id })
      res.json({ ok: true })
    } catch (e) {
      console.error("staff-positions delete:", e)
      res.status(500).json({ error: "O‘chirilmadi" })
    }
  })

  return router
}
