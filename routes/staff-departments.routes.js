const express = require("express")
const mongoose = require("mongoose")
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")
const { DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME } = require("./staff-departments.constants")

module.exports = (vakolat) => {
  const router = express.Router()
  const StaffDepartment = vakolat.model("StaffDepartment")
  const User = vakolat.model("User")

  /** Ro‘yxat: faol bo‘limlar (dropdown); admin ?includeInactive=true */
  router.get("/", verifyToken, async (req, res) => {
    try {
      const includeInactive = String(req.query.includeInactive || "") === "true"
      const q = includeInactive ? {} : { isActive: true }
      const rows = await StaffDepartment.find(q).sort({ name: 1 }).lean()
      res.json(rows)
    } catch (e) {
      console.error("staff-departments list:", e)
      res.status(500).json({ error: "Bo‘limlar yuklanmadi" })
    }
  })

  router.post("/", checkUserLevel("admin"), async (req, res) => {
    try {
      const name = String(req.body.name || "").trim()
      if (!name) {
        return res.status(400).json({ error: "Bo‘lim nomi majburiy" })
      }
      const doc = await StaffDepartment.create({ name, isActive: true })
      res.status(201).json(doc)
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(400).json({ error: "Bu nom allaqachon mavjud" })
      }
      console.error("staff-departments create:", e)
      res.status(500).json({ error: "Saqlanmadi" })
    }
  })

  router.put("/:id", checkUserLevel("admin"), async (req, res) => {
    try {
      const id = req.params.id
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Noto‘g‘ri id" })
      }
      const doc = await StaffDepartment.findById(id)
      if (!doc) {
        return res.status(404).json({ error: "Topilmadi" })
      }
      if (req.body.name !== undefined) {
        const name = String(req.body.name || "").trim()
        if (!name) {
          return res.status(400).json({ error: "Bo‘lim nomi bo‘sh bo‘lmasligi kerak" })
        }
        if (doc.name === DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME && name !== DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME) {
          return res.status(400).json({
            error: `Standart «${DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME}» bo‘limining nomini o‘zgartirib bo‘lmaydi`,
          })
        }
        doc.name = name
      }
      if (req.body.isActive !== undefined) {
        doc.isActive = req.body.isActive !== false
      }
      await doc.save()
      res.json(doc)
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(400).json({ error: "Bu nom allaqachon mavjud" })
      }
      console.error("staff-departments update:", e)
      res.status(500).json({ error: "Yangilanmadi" })
    }
  })

  router.delete("/:id", checkUserLevel("admin"), async (req, res) => {
    try {
      const id = req.params.id
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Noto‘g‘ri id" })
      }
      const dept = await StaffDepartment.findById(id).select("name").lean()
      if (!dept) {
        return res.status(404).json({ error: "Topilmadi" })
      }
      if (dept.name === DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME) {
        return res.status(400).json({
          error: `Standart «${DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME}» bo‘limini o‘chirish mumkin emas`,
        })
      }
      const confirmReassign = String(req.query.confirmReassign || "") === "1"
      const n = await User.countDocuments({ staffDepartment: id, level: "expert" })
      if (n > 0 && !confirmReassign) {
        return res.status(409).json({
          error: `Bu bo‘limda ${n} ta xodim bor. O‘chirishdan oldin ularni «${DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME}» bo‘limiga o‘tkazish kerak.`,
          expertCount: n,
          needsReassignConfirm: true,
        })
      }
      if (n > 0 && confirmReassign) {
        let fallback = await StaffDepartment.findOne({
          name: DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME,
        }).select("_id")
        if (!fallback) {
          fallback = await StaffDepartment.create({
            name: DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME,
            isActive: true,
          })
        }
        if (String(fallback._id) === id) {
          return res.status(400).json({ error: "Noto‘g‘ri bo‘lim — qayta tayinlab bo‘lmadi" })
        }
        await User.updateMany(
          { staffDepartment: id, level: "expert" },
          { $set: { staffDepartment: fallback._id } },
        )
      }
      await StaffDepartment.deleteOne({ _id: id })
      res.json({ ok: true, reassignedExperts: n > 0 && confirmReassign ? n : 0 })
    } catch (e) {
      console.error("staff-departments delete:", e)
      res.status(500).json({ error: "O‘chirilmadi" })
    }
  })

  return router
}
