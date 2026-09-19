module.exports = (vakolat, nazorat) => {
  const express = require("express")
  const router = express.Router()
  const mongoose = require("mongoose")
  const { verifyToken, checkPermissions } = require("../src/middleware/auth.middleware")
  const {
    buildMemberSearchFilter,
    parseLimit,
    parsePage,
    parseSort,
  } = require("../src/utils/memberSearchFilter")

  const LIST_SELECT = { PHOTO: 0, PASSWORD: 0 }

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
    PINFL: String,
    NATIONALITY: String,
    UZNEL_SYNCED: Boolean,
    UZNEL_SYNCED_AT: String,
    UZNEL_ORG_ROW: mongoose.Schema.Types.Mixed,
  }

  const OnlineRegistrant = vakolat.model(
    "OnlineRegistrant",
    new mongoose.Schema(memberFields, { collection: "online_registrants" }),
  )

  const CacheUser =
    nazorat.models.CacheUser ||
    nazorat.model("CacheUser", new mongoose.Schema(memberFields, { collection: "cache" }))

  const USER_NO_PREFIX = "RRR"
  const USER_NO_DIGITS = 6
  const USER_NO_REGEX = /^RRR\d{6}$/

  function formatUserNo(n) {
    return `${USER_NO_PREFIX}${String(n).padStart(USER_NO_DIGITS, "0")}`
  }

  function parseUserNo(userNo) {
    if (!userNo || !USER_NO_REGEX.test(userNo)) return 0
    return Number.parseInt(userNo.slice(USER_NO_PREFIX.length), 10) || 0
  }

  async function generateNextUserNo() {
    const [latestOnline, latestCache] = await Promise.all([
      OnlineRegistrant.findOne({ USER_NO: { $regex: USER_NO_REGEX } })
        .sort({ USER_NO: -1 })
        .select("USER_NO")
        .lean(),
      CacheUser.findOne({ USER_NO: { $regex: USER_NO_REGEX } })
        .sort({ USER_NO: -1 })
        .select("USER_NO")
        .lean(),
    ])

    const next =
      Math.max(parseUserNo(latestOnline?.USER_NO), parseUserNo(latestCache?.USER_NO)) + 1

    return formatUserNo(next)
  }

  function sanitizePayload(raw = {}) {
    const data = { ...raw }
    delete data._id
    delete data.__v
    delete data.secret
    // USER_NO is always server-assigned (RRR000001, …)
    delete data.USER_NO
    return data
  }

  async function applyCreateDefaults(data) {
    data.USER_NO = await generateNextUserNo()
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
    // restore USER_NO after sanitize (create/update always have it)
    cachePayload.USER_NO = data.USER_NO
    delete cachePayload._id
    await CacheUser.findOneAndUpdate(
      { USER_NO: cachePayload.USER_NO },
      { $set: cachePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  /**
   * Create online registrant and upsert into nazorat.cache.
   * Always assigns USER_NO as RRR###### and returns it on member.
   * @returns {{ member: object }}
   * @throws {{ status: number, error: string }}
   */
  async function createOnlineRegistrant(rawData) {
    const payload = sanitizePayload(rawData)

    if (!payload.USER_NAME || !String(payload.USER_NAME).trim()) {
      const err = new Error("USER_NAME is required")
      err.status = 400
      err.error = "USER_NAME is required"
      throw err
    }

    const maxAttempts = 5
    let lastError = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const data = await applyCreateDefaults({ ...payload })

        const existingOnline = await OnlineRegistrant.findOne({ USER_NO: data.USER_NO }).lean()
        if (existingOnline) {
          continue
        }

        const savedMember = await new OnlineRegistrant(data).save()
        await syncToCache(savedMember.toObject ? savedMember.toObject() : savedMember)

        return { member: savedMember }
      } catch (error) {
        lastError = error
        if (error.code === 11000) {
          continue
        }
        throw error
      }
    }

    const err = new Error(lastError?.message || "Could not allocate USER_NO")
    err.status = 409
    err.error = "Could not allocate unique USER_NO"
    throw err
  }

  router.createOnlineRegistrant = createOnlineRegistrant

  router.post("/search", verifyToken, checkPermissions(["view_members"]), async (req, res) => {
    try {
      const page = parsePage(req.body)
      const limit = parseLimit(req.body, { max: req.body.export ? 5000 : 500 })
      const skip = (page - 1) * limit
      const filter = buildMemberSearchFilter(req.body)
      const sort = parseSort(req.body)

      const [members, total] = await Promise.all([
        OnlineRegistrant.find(filter).select(LIST_SELECT).sort(sort).skip(skip).limit(limit).lean(),
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
