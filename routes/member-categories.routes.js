const express = require("express")
const mongoose = require("mongoose")
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")
const { normalizeCategoryCode } = require("../src/data/member-categories.defaults")

module.exports = (vakolat) => {
  const router = express.Router()
  const MemberCategory = vakolat.model("MemberCategory")

  router.get("/", verifyToken, async (req, res) => {
    try {
      const includeInactive = String(req.query.includeInactive || "") === "true"
      const q = includeInactive ? {} : { isActive: true }
      const rows = await MemberCategory.find(q).sort({ sortOrder: 1, code: 1 }).lean()
      res.json(rows)
    } catch (e) {
      console.error("member-categories list:", e)
      res.status(500).json({ error: "Toifalar yuklanmadi" })
    }
  })

  router.post("/", checkUserLevel("admin"), async (req, res) => {
    try {
      const name = String(req.body.name || "").trim()
      const code = normalizeCategoryCode(req.body.code)
      if (!code || code.length !== 4) {
        return res.status(400).json({ error: "Toifa kodi 4 xonali raqam bo‘lishi kerak" })
      }
      if (!name) {
        return res.status(400).json({ error: "Toifa nomi majburiy" })
      }
      let sortOrder = req.body.sortOrder
      if (typeof sortOrder !== "number" || Number.isNaN(sortOrder)) {
        const max = await MemberCategory.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean()
        sortOrder = max?.sortOrder != null ? max.sortOrder + 1 : 1
      }
      const doc = await MemberCategory.create({ code, name, isActive: true, sortOrder })
      res.status(201).json(doc)
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(400).json({ error: "Bu kod yoki nom allaqachon mavjud" })
      }
      console.error("member-categories create:", e)
      res.status(500).json({ error: "Saqlanmadi" })
    }
  })

  router.put("/:id", checkUserLevel("admin"), async (req, res) => {
    try {
      const id = req.params.id
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Noto‘g‘ri id" })
      }
      const doc = await MemberCategory.findById(id)
      if (!doc) {
        return res.status(404).json({ error: "Topilmadi" })
      }
      if (req.body.code !== undefined) {
        const code = normalizeCategoryCode(req.body.code)
        if (!code || code.length !== 4) {
          return res.status(400).json({ error: "Toifa kodi 4 xonali raqam bo‘lishi kerak" })
        }
        doc.code = code
      }
      if (req.body.name !== undefined) {
        const name = String(req.body.name || "").trim()
        if (!name) {
          return res.status(400).json({ error: "Toifa nomi bo‘sh bo‘lmasligi kerak" })
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
        return res.status(400).json({ error: "Bu kod yoki nom allaqachon mavjud" })
      }
      console.error("member-categories update:", e)
      res.status(500).json({ error: "Yangilanmadi" })
    }
  })

  router.delete("/:id", checkUserLevel("admin"), async (req, res) => {
    try {
      const id = req.params.id
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Noto‘g‘ri id" })
      }
      const doc = await MemberCategory.findByIdAndDelete(id)
      if (!doc) {
        return res.status(404).json({ error: "Topilmadi" })
      }
      res.json({ ok: true })
    } catch (e) {
      console.error("member-categories delete:", e)
      res.status(500).json({ error: "O‘chirilmadi" })
    }
  })

  return router
}
