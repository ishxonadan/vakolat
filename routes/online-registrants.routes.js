module.exports = (vakolat, nazorat) => {
  const express = require("express")
  const router = express.Router()
  const mongoose = require("mongoose")
  const { verifyToken, checkPermissions } = require("../src/middleware/auth.middleware")

  const memberFields = {
    USER_NO: String,
    ADDRS: String,
    BIRTHDAY: String,
    CARD_NO: String,
    CARD_STATUS: String,
    CARD_TYPE: String,
    CLASS_CODE: String,
    CMPNY_CODE: String,
    FILE_SIZE: String,
    FULL_CODE: String,
    GRADE_CODE: String,
    INDEM_AMT_SUM: String,
    INDEM_CNT: String,
    INSERT_DATE: String,
    LIB_USE_LDATE: String,
    LOAN_CHECK: String,
    LOAN_CNT: String,
    LOCA: String,
    LOCATION: String,
    MAIL_CHECK: String,
    OVERDUE_AMT_SUM: String,
    OVERDUE_CNT: String,
    PASSWORD: String,
    PHOTO: String,
    PROCESS_DATE: String,
    PROCESS_USER_ID: String,
    RESERVE_CNT: String,
    RN: String,
    SEQUENCE_NO: String,
    SEX: String,
    SMS_CHECK: String,
    STATUS_CODE: String,
    STATUS_NAME: String,
    TEL_NO: String,
    TEMPLATE_CODE: String,
    TEMPLATE_NAME: String,
    TYPE_NAME: String,
    UN_AGREE_FLAG: String,
    UPDATE_DATE: String,
    USER_ID: String,
    USER_NAME: String,
    USER_POSITION: String,
    USER_SEQ_NO: String,
    ZIP_CODE: String,
    cache: Boolean,
    muddat: Number,
    status: Number,
    EMAIL: String,
    PASSPORT_SERIES: String,
    PASSPORT_NUMBER: String,
  }

  const OnlineRegistrant = vakolat.model(
    "OnlineRegistrant",
    new mongoose.Schema(memberFields, { collection: "online_registrants" }),
  )

  const CacheUser =
    nazorat.models.CacheUser ||
    nazorat.model("CacheUser", new mongoose.Schema(memberFields, { collection: "cache" }))

  function generateUserNo() {
    const now = new Date()
    const pad = (n, len = 2) => String(n).padStart(len, "0")
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}` +
      `${pad(now.getMilliseconds(), 3)}`
    return `OL${stamp}`
  }

  function sanitizePayload(raw = {}) {
    const data = { ...raw }
    delete data._id
    delete data.__v
    delete data.secret
    return data
  }

  function applyCreateDefaults(data) {
    if (!data.USER_NO) {
      data.USER_NO = generateUserNo()
    }
    if (!data.INSERT_DATE) {
      data.INSERT_DATE = new Date().toISOString().split("T")[0].replace(/-/g, "")
    }
    if (!data.STATUS_CODE) {
      data.STATUS_CODE = "0001"
    }
    return data
  }

  async function syncToCache(data) {
    const cachePayload = sanitizePayload(data)
    delete cachePayload._id
    await CacheUser.findOneAndUpdate(
      { USER_NO: cachePayload.USER_NO },
      { $set: cachePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  /**
   * Create online registrant and upsert into nazorat.cache.
   * @returns {{ member: object }}
   * @throws {{ status: number, error: string }}
   */
  async function createOnlineRegistrant(rawData) {
    const data = applyCreateDefaults(sanitizePayload(rawData))

    if (!data.USER_NAME || !String(data.USER_NAME).trim()) {
      const err = new Error("USER_NAME is required")
      err.status = 400
      err.error = "USER_NAME is required"
      throw err
    }

    const existing = await OnlineRegistrant.findOne({ USER_NO: data.USER_NO }).lean()
    if (existing) {
      const err = new Error("USER_NO already exists")
      err.status = 409
      err.error = "USER_NO already exists"
      throw err
    }

    const savedMember = await new OnlineRegistrant(data).save()
    await syncToCache(savedMember.toObject ? savedMember.toObject() : savedMember)

    return { member: savedMember }
  }

  router.createOnlineRegistrant = createOnlineRegistrant

  router.post("/search", verifyToken, checkPermissions(["view_members"]), async (req, res) => {
    try {
      const page = Number.parseInt(req.body.page) || 1
      const limit = Number.parseInt(req.body.limit) || 50
      const skip = (page - 1) * limit

      const filter = {}
      if (req.body.filters && Array.isArray(req.body.filters) && req.body.filters.length > 0) {
        filter.$and = req.body.filters.map((f) => {
          const searchRegex = new RegExp(f.value, "i")
          return { [f.field]: searchRegex }
        })
      }

      let sort = { INSERT_DATE: -1 }
      if (req.body.sortField) {
        sort = { [req.body.sortField]: req.body.sortOrder === "asc" ? 1 : -1 }
      }

      const [members, total] = await Promise.all([
        OnlineRegistrant.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        OnlineRegistrant.countDocuments(filter),
      ])

      res.json({
        members,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    } catch (error) {
      console.error("Error searching online registrants:", error)
      res.status(500).json({ error: "Error searching online registrants", details: error.message })
    }
  })

  router.get("/by-user-no/:userNo", verifyToken, checkPermissions(["view_members"]), async (req, res) => {
    try {
      const member = await OnlineRegistrant.findOne({ USER_NO: req.params.userNo })
      if (!member) {
        return res.status(404).json({ error: "Online registrant not found" })
      }
      res.json(member)
    } catch (error) {
      console.error("Error fetching online registrant:", error)
      res.status(500).json({ error: "Error fetching online registrant", details: error.message })
    }
  })

  router.get("/:id", verifyToken, checkPermissions(["view_members"]), async (req, res) => {
    try {
      const member = await OnlineRegistrant.findById(req.params.id)
      if (!member) {
        return res.status(404).json({ error: "Online registrant not found" })
      }
      res.json(member)
    } catch (error) {
      console.error("Error fetching online registrant:", error)
      res.status(500).json({ error: "Error fetching online registrant", details: error.message })
    }
  })

  router.post("/", verifyToken, checkPermissions(["manage_users"]), async (req, res) => {
    try {
      const { member } = await createOnlineRegistrant(req.body)
      res.status(201).json({ success: true, member })
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.error || error.message })
      }
      console.error("Error creating online registrant:", error)
      res.status(500).json({ error: "Error creating online registrant", details: error.message })
    }
  })

  router.put("/:userNo", verifyToken, checkPermissions(["manage_users"]), async (req, res) => {
    try {
      const { userNo } = req.params
      const updateData = sanitizePayload(req.body)

      const result = await OnlineRegistrant.findOneAndUpdate(
        { USER_NO: userNo },
        { $set: updateData },
        { new: true, runValidators: true },
      )

      if (!result) {
        return res.status(404).json({ error: "Online registrant not found" })
      }

      await syncToCache({ ...result.toObject(), USER_NO: userNo })

      res.json({ success: true, member: result })
    } catch (error) {
      console.error("Error updating online registrant:", error)
      res.status(500).json({ error: "Error updating online registrant", details: error.message })
    }
  })

  return router
}
