const express = require("express")
const { verifyToken, checkPermissions } = require("../src/middleware/auth.middleware")

module.exports = (vakolat) => {
  const router = express.Router()
  const SystemSettings = vakolat.model("SystemSettings")

  const getOrCreateSettings = async () => {
    let doc = await SystemSettings.findOne()
    if (!doc) {
      doc = await SystemSettings.create({ paymentRequireZalForServiceProvision: false })
    }
    return doc
  }

  /** Har qanday tizim foydalanuvchisi (masalan xizmat ko'rsatish sahifasi uchun) */
  router.get("/settings", verifyToken, async (req, res) => {
    try {
      const doc = await getOrCreateSettings()
      res.json({
        paymentRequireZalForServiceProvision: !!doc.paymentRequireZalForServiceProvision,
      })
    } catch (error) {
      console.error("GET /api/system/settings:", error)
      res.status(500).json({ error: "Sozlamalarni olishda xatolik" })
    }
  })

  /** Faqat system_manage (rais middleware orqali ham kiradi) */
  router.put("/settings", verifyToken, checkPermissions(["system_manage"]), async (req, res) => {
    try {
      if (typeof req.body.paymentRequireZalForServiceProvision !== "boolean") {
        return res.status(400).json({
          error: "paymentRequireZalForServiceProvision (boolean) yuborilishi kerak",
        })
      }
      const doc = await getOrCreateSettings()
      doc.paymentRequireZalForServiceProvision = req.body.paymentRequireZalForServiceProvision
      await doc.save()
      res.json({
        paymentRequireZalForServiceProvision: doc.paymentRequireZalForServiceProvision,
      })
    } catch (error) {
      console.error("PUT /api/system/settings:", error)
      res.status(500).json({ error: "Sozlamalarni saqlashda xatolik" })
    }
  })

  return router
}
