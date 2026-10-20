module.exports = (nazorat) => {
  const express = require("express")
  const router = express.Router()
  const mongoose = require("mongoose") // Import mongoose to use Schema
  const { verifyToken, checkPermissions, checkAnyPermissions } = require("../src/middleware/auth.middleware")
  const {
    buildMemberSearchFilter,
    parseLimit,
    parsePage,
    parseSort,
  } = require("../src/utils/memberSearchFilter")
  const { fetchNextUserMaskId, registerUznelUser } = require("../src/services/uznel.service")

  const listSelect = ({ includePhoto = false } = {}) => {
    const select = { PASSWORD: 0 }
    if (!includePhoto) select.PHOTO = 0
    return select
  }

  const cacheSchema = new mongoose.Schema(
    {
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
      REG_AT: Number,
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
    },
    { collection: "cache" },
  )

  const CacheUser = nazorat.model("CacheUser", cacheSchema)

  function registrationSortPipeline(filter, dir, skip, limit, includePhoto) {
    const hide = { PASSWORD: 0, _regSort: 0, _idNum: 0 }
    if (!includePhoto) hide.PHOTO = 0
    return [
      { $match: filter },
      {
        $addFields: {
          _regSort: "$REG_AT",
          _idNum: {
            $convert: {
              input: {
                $let: {
                  vars: {
                    found: {
                      $regexFind: {
                        input: { $ifNull: ["$USER_NO", ""] },
                        regex: "\\d+",
                      },
                    },
                  },
                  in: "$$found.match",
                },
              },
              to: "long",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $sort: { _regSort: dir, _idNum: dir, USER_NO: dir } },
      { $skip: skip },
      { $limit: limit },
      { $project: hide },
    ]
  }

  router.post("/uznel-id", verifyToken, checkPermissions(["manage_members"]), async (req, res) => {
    try {
      const userNo = await fetchNextUserMaskId()
      res.json({ success: true, USER_NO: userNo })
    } catch (error) {
      console.error("Uznel ID error:", error.message)
      res.status(502).json({ error: error.message || "Uznel ID olinmadi" })
    }
  })

  router.post("/uznel-sync", verifyToken, checkPermissions(["manage_members"]), async (req, res) => {
    try {
      const body = req.body || {}
      const userNo = String(body.USER_NO || body.USER_ID || "").trim()
      const existing = userNo ? await CacheUser.findOne({ USER_NO: userNo }).lean() : null
      const member = {
        ...body,
        USER_SEQ_NO: body.USER_SEQ_NO || existing?.USER_SEQ_NO || existing?.SEQUENCE_NO,
        SEQUENCE_NO: body.SEQUENCE_NO || existing?.SEQUENCE_NO || existing?.USER_SEQ_NO,
        UZNEL_SYNCED: body.UZNEL_SYNCED || existing?.UZNEL_SYNCED,
        UZNEL_ORG_ROW: body.UZNEL_ORG_ROW || existing?.UZNEL_ORG_ROW,
      }
      delete member.REG_AT
      const result = await registerUznelUser(member)
      if (result?.USER_NO && (result.USER_SEQ_NO || result.SEQUENCE_NO)) {
        await CacheUser.findOneAndUpdate(
          { USER_NO: result.USER_NO },
          {
            $set: {
              USER_SEQ_NO: result.USER_SEQ_NO,
              SEQUENCE_NO: result.SEQUENCE_NO || result.USER_SEQ_NO,
              UZNEL_SYNCED: true,
              UZNEL_SYNCED_AT: new Date().toISOString(),
              UZNEL_ORG_ROW: result.UZNEL_ORG_ROW,
              LIB_USE_LDATE: result.LIB_USE_LDATE,
            },
          },
        )
      }
      res.json({ success: true, ...result })
    } catch (error) {
      console.error("Uznel sync error:", error.message)
      res.status(502).json({ error: error.message || "Uznelga sinxronizatsiya muvaffaqiyatsiz" })
    }
  })

  // Get all members with pagination, filtering, and sorting
  router.get("/", verifyToken, checkAnyPermissions(["view_members", "manage_members"]), async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 50
      const skip = (page - 1) * limit

      const filter = {}

      // Handle multi-field search
      if (req.query.filters) {
        try {
          const filters = JSON.parse(req.query.filters)
          if (Array.isArray(filters) && filters.length > 0) {
            filter.$and = filters.map((f) => {
              const searchRegex = new RegExp(f.value, "i")
              return { [f.field]: searchRegex }
            })
          }
        } catch (e) {
          console.error("Error parsing filters:", e)
        }
      }

      const sortDir = req.query.sortOrder === "asc" ? 1 : -1
      const sortField = req.query.sortField || "INSERT_DATE"
      const membersQuery = sortField === "INSERT_DATE"
        ? CacheUser.aggregate(registrationSortPipeline(filter, sortDir, skip, limit, true))
        : CacheUser.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean()

      const [members, total] = await Promise.all([
        membersQuery,
        CacheUser.countDocuments(filter),
      ])

      res.json({
        members,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    } catch (error) {
      console.error("Error fetching members:", error)
      res.status(500).json({ error: "Error fetching members", details: error.message })
    }
  })

  // Get single member by ID
  router.get("/:id", verifyToken, checkAnyPermissions(["view_members", "manage_members"]), async (req, res) => {
    try {
      const member = await CacheUser.findById(req.params.id)
      if (!member) {
        return res.status(404).json({ error: "Member not found" })
      }
      res.json(member)
    } catch (error) {
      console.error("Error fetching member:", error)
      res.status(500).json({ error: "Error fetching member", details: error.message })
    }
  })

  // Get statistics
  router.get("/stats/summary", verifyToken, checkAnyPermissions(["view_members", "manage_members"]), async (req, res) => {
    try {
      const total = await CacheUser.countDocuments()
      const active = await CacheUser.countDocuments({ STATUS_CODE: "0001" })
      const byPosition = await CacheUser.aggregate([
        { $group: { _id: "$USER_POSITION", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])

      res.json({
        total,
        active,
        byPosition,
      })
    } catch (error) {
      console.error("Error fetching statistics:", error)
      res.status(500).json({ error: "Error fetching statistics", details: error.message })
    }
  })

  // Search members with complex filter data in request body
  router.post("/search", verifyToken, checkAnyPermissions(["view_members", "manage_members"]), async (req, res) => {
    try {
      const page = parsePage(req.body)
      const limit = parseLimit(req.body, { max: req.body.export ? 5000 : 500 })
      const skip = (page - 1) * limit
      const filter = buildMemberSearchFilter(req.body)
      const sort = parseSort(req.body)
      const includePhoto = req.body?.includePhoto === true || req.body?.includePhoto === "true"
      const sortField = req.body?.sortField || "INSERT_DATE"
      const sortDir = sort[sortField] || -1
      const membersQuery = sortField === "INSERT_DATE"
        ? CacheUser.aggregate(registrationSortPipeline(filter, sortDir, skip, limit, includePhoto))
        : CacheUser.find(filter).select(listSelect({ includePhoto })).sort(sort).skip(skip).limit(limit).lean()

      const [members, total] = await Promise.all([
        membersQuery,
        CacheUser.countDocuments(filter),
      ])

      res.json({
        members,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    } catch (error) {
      console.error("Error fetching members:", error)
      res.status(500).json({ error: "Error fetching members", details: error.message })
    }
  })

  // Update member
  router.put("/:userNo", verifyToken, checkPermissions(["manage_members"]), async (req, res) => {
    try {
      const { userNo } = req.params
      const updateData = req.body

      // Remove fields that shouldn't be updated directly
      delete updateData._id
      delete updateData.__v
      delete updateData.REG_AT

      const result = await CacheUser.findOneAndUpdate(
        { USER_NO: userNo },
        { $set: updateData },
        { new: true, runValidators: true },
      )

      if (!result) {
        return res.status(404).json({ error: "Member not found" })
      }

      res.json({ success: true, member: result })
    } catch (error) {
      console.error("Error updating member:", error)
      res.status(500).json({ error: "Error updating member", details: error.message })
    }
  })

  // Create new member
  router.post("/", verifyToken, checkPermissions(["manage_members"]), async (req, res) => {
    try {
      const body = { ...req.body }
      delete body._id
      delete body.__v
      delete body.REG_AT
      const newMember = new CacheUser({ ...body, REG_AT: Date.now() })
      const savedMember = await newMember.save()
      res.status(201).json({ success: true, member: savedMember })
    } catch (error) {
      console.error("Error creating member:", error)
      res.status(500).json({ error: "Error creating member", details: error.message })
    }
  })

  // Get member by USER_NO
  router.get("/by-user-no/:userNo", verifyToken, checkAnyPermissions(["view_members", "manage_members"]), async (req, res) => {
    try {
      const member = await CacheUser.findOne({ USER_NO: req.params.userNo })
      if (!member) {
        return res.status(404).json({ error: "Member not found" })
      }
      res.json(member)
    } catch (error) {
      console.error("Error fetching member:", error)
      res.status(500).json({ error: "Error fetching member", details: error.message })
    }
  })

  return router
}
