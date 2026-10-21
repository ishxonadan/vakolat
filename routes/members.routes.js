module.exports = (nazorat, vakolat) => {
  const express = require("express")
  const router = express.Router()
  const mongoose = require("mongoose") // Import mongoose to use Schema
  const { verifyToken, checkPermissions, checkAnyPermissions } = require("../src/middleware/auth.middleware")
  const {
    buildMemberSearchFilter,
    parseLimit,
    parsePage,
    parseSort,
    userNoSortKey,
  } = require("../src/utils/memberSearchFilter")
  const { positionName, readMemberCategories } = require("../src/data/member-categories.defaults")
  const { fetchNextUserMaskId, registerUznelUser, setPositionCatalog } = require("../src/services/uznel.service")

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
      ID_NUM: String,
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
  const MemberCategory = vakolat ? vakolat.model("MemberCategory") : null
  const REG_SORT_INDEX = "cache_reg_sort"
  let regIndexReady = false
  let positionCatalog = { at: 0, rows: null }

  async function memberCategories() {
    if (positionCatalog.rows && Date.now() - positionCatalog.at < 60_000) return positionCatalog.rows
    try {
      const { rows } = await readMemberCategories(MemberCategory)
      positionCatalog = { at: Date.now(), rows }
      setPositionCatalog(rows)
      return rows
    } catch (error) {
      console.error("Member categories:", error.message)
      return positionCatalog.rows
    }
  }

  async function storedPosition(value) {
    return positionName(value, await memberCategories())
  }

  const listSelect = ({ includePhoto = false } = {}) => {
    const select = { PASSWORD: 0, UZNEL_ORG_ROW: 0, ID_NUM: 0 }
    if (!includePhoto) select.PHOTO = 0
    return select
  }

  function registrationSort(dir) {
    return { REG_AT: dir, ID_NUM: dir, USER_NO: dir }
  }

  function canUseRegistrationIndex(filter) {
    if (!filter || Object.keys(filter).length === 0) return true
    return filter.USER_NO instanceof RegExp && Object.keys(filter).length === 1
  }

  async function findMembers({ filter, sort, skip, limit, includePhoto, useRegIndex }) {
    const run = (hint) => {
      let query = CacheUser.find(filter)
        .select(listSelect({ includePhoto }))
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
      if (hint) query = query.hint(hint)
      return query
    }
    if (!useRegIndex || !regIndexReady) return run(null)
    try {
      return await run(REG_SORT_INDEX)
    } catch (error) {
      const missingHint = error?.code === 2 || /hint provided does not correspond/i.test(error?.message || "")
      if (!missingHint) throw error
      return run(null)
    }
  }

  async function ensureMemberIndexes() {
    try {
      await CacheUser.collection.createIndex(
        { REG_AT: -1, ID_NUM: -1, USER_NO: -1 },
        { name: REG_SORT_INDEX },
      )
      regIndexReady = true
    } catch (error) {
      const alreadyExists = error.code === 85 || error.code === 86 || /already exists/i.test(error.message || "")
      if (alreadyExists) regIndexReady = true
      else console.error("Member sort index failed:", error.message)
    }
  }

  async function backfillIdNum() {
    const meta = nazorat.collection("cache_meta")
    const state = await meta.findOne({ _id: "id_num_backfill" })
    if (state?.done) return
    const cursor = CacheUser.find({ ID_NUM: { $exists: false } }).select("USER_NO").lean().cursor()
    let batch = []
    const flush = async () => {
      if (!batch.length) return
      await CacheUser.bulkWrite(batch, { ordered: false })
      batch = []
    }
    for await (const doc of cursor) {
      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { ID_NUM: userNoSortKey(doc.USER_NO) } },
        },
      })
      if (batch.length >= 500) {
        await flush()
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
    }
    await flush()
    await meta.updateOne(
      { _id: "id_num_backfill" },
      { $set: { done: true, at: new Date() } },
      { upsert: true },
    )
  }

  async function backfillPositionNames() {
    const meta = nazorat.collection("cache_meta")
    const state = await meta.findOne({ _id: "position_name_backfill" })
    if (state?.done) return
    const loaded = await readMemberCategories(MemberCategory)
    if (!loaded.fromDb && MemberCategory) return
    const rows = loaded.rows
    positionCatalog = { at: Date.now(), rows }
    setPositionCatalog(rows)
    const cursor = CacheUser.find({ USER_POSITION: /^\s*\d+\s*$/ }).select("USER_POSITION").lean().cursor()
    let batch = []
    let updated = 0
    const flush = async () => {
      if (!batch.length) return
      const result = await CacheUser.bulkWrite(batch, { ordered: false })
      updated += result.modifiedCount || 0
      batch = []
    }
    for await (const doc of cursor) {
      const name = positionName(doc.USER_POSITION, rows)
      const current = String(doc.USER_POSITION || "").trim()
      if (!name || name === current) continue
      batch.push({
        updateOne: {
          filter: { _id: doc._id, USER_POSITION: doc.USER_POSITION },
          update: { $set: { USER_POSITION: name } },
        },
      })
      if (batch.length >= 500) await flush()
    }
    await flush()
    await meta.updateOne(
      { _id: "position_name_backfill" },
      { $set: { done: true, updated, at: new Date() } },
      { upsert: true },
    )
    if (updated) console.log("[members] USER_POSITION names updated:", updated)
  }

  const prepareMemberList = () => {
    ensureMemberIndexes()
      .then(() => backfillIdNum())
      .then(() => backfillPositionNames())
      .catch((error) => console.error("Member list prepare failed:", error.message))
  }
  if (nazorat.readyState === 1) prepareMemberList()
  else nazorat.once("connected", prepareMemberList)

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
      await memberCategories()
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
      const useRegIndex = sortField === "INSERT_DATE" && canUseRegistrationIndex(filter)
      const sort = useRegIndex ? registrationSort(sortDir) : { [sortField]: sortDir }

      const [members, total] = await Promise.all([
        findMembers({ filter, sort, skip, limit, includePhoto: false, useRegIndex }),
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
      const filter = buildMemberSearchFilter(req.body, undefined, await memberCategories())
      const sort = parseSort(req.body)
      const includePhoto = req.body?.includePhoto === true || req.body?.includePhoto === "true"
      const sortField = req.body?.sortField || "INSERT_DATE"
      const sortDir = sort[sortField] || -1
      const useRegSort = sortField === "INSERT_DATE"
      const useRegIndex = useRegSort && canUseRegistrationIndex(filter)
      const listSort = useRegSort ? registrationSort(sortDir) : sort

      const [members, total] = await Promise.all([
        findMembers({ filter, sort: listSort, skip, limit, includePhoto, useRegIndex }),
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
      updateData.ID_NUM = userNoSortKey(updateData.USER_NO || userNo)
      if (updateData.USER_POSITION != null) {
        updateData.USER_POSITION = await storedPosition(updateData.USER_POSITION)
      }

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
      delete body.ID_NUM
      if (body.USER_POSITION != null) body.USER_POSITION = await storedPosition(body.USER_POSITION)
      const newMember = new CacheUser({
        ...body,
        REG_AT: Date.now(),
        ID_NUM: userNoSortKey(body.USER_NO),
      })
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
