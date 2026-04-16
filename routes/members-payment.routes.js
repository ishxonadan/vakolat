const express = require("express")
const mongoose = require("mongoose")
const { verifyToken, checkPermissions, checkAnyPermissions } = require("../src/middleware/auth.middleware")

module.exports = (nazorat, vakolat) => {
  const router = express.Router()
  const SERVICE_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000
  const CUSTOM_PRICED_SERVICE_ID = "__custom_price__"
  const CUSTOM_PRICED_SERVICE_NAME = "O'zingiz narx qo'ying"

  const PaymentAccount = vakolat.model("PaymentAccount")
  const PaymentTransaction = vakolat.model("PaymentTransaction")
  const PaymentService = vakolat.model("PaymentService")
  const PaymentDepartment = vakolat.model("PaymentDepartment")
  const UserDepartment = vakolat.model("UserDepartment")
  const User = vakolat.model("User")
  const PaymentServiceProvision = vakolat.model("PaymentServiceProvision")
  const SystemSettings = vakolat.model("SystemSettings")

  const getOrCreateSystemSettings = async () => {
    let doc = await SystemSettings.findOne()
    if (!doc) {
      doc = await SystemSettings.create({ paymentRequireZalForServiceProvision: false })
    }
    return doc
  }

  const cacheSchema = new mongoose.Schema(
    {
      USER_NO: String,
      USER_NAME: String,
      USER_POSITION: String,
      TEL_NO: String,
    },
    { collection: "cache", strict: false },
  )
  const CacheUser = nazorat.model("PaymentCacheUser", cacheSchema)

  const parsePositiveAmount = (value) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed
  }
  const resolveServiceNameById = async (serviceId, session = null) => {
    if (!serviceId) return ""
    let query = PaymentService.findById(serviceId).select("name").lean()
    if (session) query = query.session(session)
    const service = await query
    return String(service?.name || "").trim()
  }
  const startOfDay = (value) => {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
  }
  const endOfDay = (value) => {
    const date = new Date(value)
    date.setHours(23, 59, 59, 999)
    return date
  }
  const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime())
  const resolveStatisticsDateRange = ({ from, to }) => {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const parsedFrom = from ? new Date(from) : null
    const parsedTo = to ? new Date(to) : null

    if (from && !isValidDate(parsedFrom)) {
      const error = new Error("INVALID_FROM_DATE")
      error.status = 400
      throw error
    }
    if (to && !isValidDate(parsedTo)) {
      const error = new Error("INVALID_TO_DATE")
      error.status = 400
      throw error
    }

    const rangeStart = parsedFrom ? startOfDay(parsedFrom) : yearStart
    const rangeEnd = parsedTo ? endOfDay(parsedTo) : now
    if (rangeStart > rangeEnd) {
      const error = new Error("INVALID_DATE_RANGE")
      error.status = 400
      throw error
    }

    return { rangeStart, rangeEnd }
  }
  const normalizeReaderId = (value) => {
    const raw = String(value || "").trim().toUpperCase()
    if (/^\d{9}$/.test(raw)) return `AAA${raw}`
    return raw
  }
  const isTransactionUnsupportedError = (error) => {
    const message = String(error?.message || "")
    return (
      error?.code === 20 ||
      error?.errorResponse?.code === 20 ||
      message.includes("Transaction numbers are only allowed on a replica set member or mongos")
    )
  }
  const runWithOptionalTransaction = async (handler) => {
    const session = await vakolat.startSession()
    try {
      try {
        let result
        await session.withTransaction(async () => {
          result = await handler(session)
        })
        return result
      } catch (error) {
        if (!isTransactionUnsupportedError(error)) throw error
        return await handler(null)
      }
    } finally {
      session.endSession()
    }
  }

  let balanceCacheInitialized = false
  let balanceCacheInitPromise = null

  const buildBalanceAggregate = (match = {}) => [
    { $match: match },
    {
      $group: {
        _id: "$userNo",
        totalIn: {
          $sum: {
            $cond: [{ $eq: ["$direction", "in"] }, "$amount", 0],
          },
        },
        totalOut: {
          $sum: {
            $cond: [{ $eq: ["$direction", "out"] }, "$amount", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        userNo: "$_id",
        balance: { $subtract: ["$totalIn", "$totalOut"] },
      },
    },
  ]

  const recalculateUserBalance = async (userNo, session = null) => {
    const rows = await PaymentTransaction.aggregate(buildBalanceAggregate({ userNo })).session(session || null)
    const calculatedBalance = rows.length > 0 ? Number(rows[0].balance || 0) : 0
    const account = await PaymentAccount.findOneAndUpdate(
      { userNo },
      {
        $set: {
          balance: calculatedBalance,
          status: "active",
          "meta.balanceCalculatedAt": new Date(),
        },
      },
      { upsert: true, new: true, session: session || undefined },
    )
    return account
  }

  const ensureBalanceCacheInitialized = async () => {
    if (balanceCacheInitialized) return
    if (balanceCacheInitPromise) {
      await balanceCacheInitPromise
      return
    }

    balanceCacheInitPromise = (async () => {
      const [hasAnyAccount, hasAnyTx] = await Promise.all([
        PaymentAccount.exists({}),
        PaymentTransaction.exists({}),
      ])

      // Fast path for normal operation:
      // - if accounts already exist, trust cached balances maintained by write endpoints
      // - if no transactions exist, nothing to bootstrap
      if (hasAnyAccount || !hasAnyTx) {
        balanceCacheInitialized = true
        balanceCacheInitPromise = null
        return
      }

      // Bootstrap path (fresh DB with transactions but no account cache yet).
      const rows = await PaymentTransaction.aggregate(buildBalanceAggregate({}))
      for (const row of rows) {
        await PaymentAccount.updateOne(
          { userNo: row.userNo },
          {
            $set: {
              balance: Number(row.balance || 0),
              status: "active",
              "meta.balanceCalculatedAt": new Date(),
            },
          },
          { upsert: true },
        )
      }
      balanceCacheInitialized = true
      balanceCacheInitPromise = null
    })().catch((error) => {
      balanceCacheInitPromise = null
      throw error
    })

    await balanceCacheInitPromise
  }

  router.get(
    "/accounts",
    verifyToken,
    checkAnyPermissions([
      "payment_list_accounts",
      "payment_topup_user",
      "payment_withdraw_user",
      "payment_view_transactions",
      "payment_view_overview_stats",
    ]),
    async (req, res) => {
      try {
        await ensureBalanceCacheInitialized()
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1)
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200)
        const skip = (page - 1) * limit
        const search = String(req.query.search || "").trim()
        const allowedSortFields = new Set(["balance", "userNo", "createdAt", "updatedAt"])
        const requestedSortField = String(req.query.sortField || "balance").trim()
        const sortField = allowedSortFields.has(requestedSortField) ? requestedSortField : "balance"
        const sortOrder = String(req.query.sortOrder || "-1") === "1" ? 1 : -1

        let userNoFilter = null
        if (search) {
          const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
          const normalizedSearch = normalizeReaderId(search)
          const normalizedRegex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
          let matchingMembers = await CacheUser.find({
            $or: [{ USER_NO: searchRegex }, { USER_NAME: searchRegex }],
          })
            .select("USER_NO")
            .limit(5000)
            .lean()

          // Fallback to a'zo bo'lganlar source shape (same cache collection) using
          // normalized user number when generic search yields nothing.
          if (!matchingMembers.length && normalizedSearch) {
            matchingMembers = await CacheUser.find({
              $or: [{ USER_NO: normalizedRegex }, { USER_ID: normalizedRegex }, { CARD_NO: normalizedRegex }],
            })
              .select("USER_NO")
              .limit(5000)
              .lean()
          }
          userNoFilter = [...new Set(matchingMembers.map((m) => m.USER_NO).filter(Boolean))]

          // Do not recalculate all matched users here (too slow for large results).
          // We only recalculate missing account-cache entries after reading current cache below.
        }

        const accountFilter = userNoFilter ? { userNo: { $in: userNoFilter } } : {}
        const [accounts, total] = await Promise.all([
          PaymentAccount.find(accountFilter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit).lean(),
          PaymentAccount.countDocuments(accountFilter),
        ])

        let normalizedAccounts = [...accounts]
        const existingSet = new Set(accounts.map((a) => a.userNo))
        if (userNoFilter && userNoFilter.length > 0) {
          const missingUserNos = userNoFilter.filter((userNo) => !existingSet.has(userNo))
          // To preserve correctness, create exact cache rows only for missing users.
          for (const userNo of missingUserNos) {
            const recalculated = await recalculateUserBalance(userNo)
            if (recalculated) {
              const row = recalculated.toObject ? recalculated.toObject() : recalculated
              normalizedAccounts.push(row)
              existingSet.add(userNo)
            }
          }
        }
        if (userNoFilter && userNoFilter.length > 0) {
          for (const userNo of userNoFilter) {
            if (!existingSet.has(userNo)) {
              normalizedAccounts.push({
                _id: `virtual_${userNo}`,
                userNo,
                balance: 0,
                status: "active",
                meta: {},
                createdAt: null,
                updatedAt: null,
              })
            }
          }
        }

        const userNos = normalizedAccounts.map((a) => a.userNo)
        const members = await CacheUser.find({ USER_NO: { $in: userNos } })
          .select("USER_NO USER_NAME USER_POSITION TEL_NO")
          .lean()
        const memberMap = new Map(members.map((m) => [m.USER_NO, m]))

        res.json({
          items: normalizedAccounts.map((a) => ({ ...a, member: memberMap.get(a.userNo) || null })),
          total: userNoFilter ? normalizedAccounts.length : total,
          page,
          limit,
        })
      } catch (error) {
        console.error("Error loading payment accounts:", error)
        res.status(500).json({ error: "Balanslarni yuklashda xatolik" })
      }
    },
  )

  router.get("/accounts/overview", verifyToken, checkPermissions(["payment_view_overview_stats"]), async (req, res) => {
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const yearStart = new Date(now.getFullYear(), 0, 1)

      const spendProjection = {
        amountNum: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } },
        // Spend logic:
        // - any OUT transaction increases spend
        // - service refunds (IN, source=service) decrease spend
        spendDelta: {
          $switch: {
            branches: [
              { case: { $eq: ["$direction", "out"] }, then: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } } },
              {
                case: {
                  $and: [{ $eq: ["$direction", "in"] }, { $eq: ["$source", "service"] }],
                },
                then: {
                  $multiply: [-1, { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } }],
                },
              },
            ],
            default: 0,
          },
        },
      }

      const [balancesRows, spendingRows, spendingMonthRows, spendingYearRows] = await Promise.all([
        PaymentAccount.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
        PaymentTransaction.aggregate([
          { $project: spendProjection },
          { $group: { _id: null, total: { $sum: "$spendDelta" } } },
        ]),
        PaymentTransaction.aggregate([
          { $match: { createdAt: { $gte: monthStart } } },
          { $project: spendProjection },
          { $group: { _id: null, total: { $sum: "$spendDelta" } } },
        ]),
        PaymentTransaction.aggregate([
          { $match: { createdAt: { $gte: yearStart } } },
          { $project: spendProjection },
          { $group: { _id: null, total: { $sum: "$spendDelta" } } },
        ]),
      ])

      res.json({
        overallMoneyInBalances: Number(balancesRows[0]?.total || 0),
        overallSpending: Math.max(0, Number(spendingRows[0]?.total || 0)),
        spendingThisMonth: Math.max(0, Number(spendingMonthRows[0]?.total || 0)),
        spendingThisYear: Math.max(0, Number(spendingYearRows[0]?.total || 0)),
      })
    } catch (error) {
      console.error("Error loading payment overview:", error)
      res.status(500).json({ error: "Umumiy statistika yuklanmadi" })
    }
  })

  router.get(
    "/accounts/:userNo",
    verifyToken,
    checkAnyPermissions([
      "payment_provide_service",
      "payment_topup_user",
      "payment_withdraw_user",
      "payment_list_accounts",
      "payment_read_account",
    ]),
    async (req, res) => {
      try {
        const userNo = String(req.params.userNo || "").trim()
        if (!userNo) {
          return res.status(400).json({ error: "userNo talab qilinadi" })
        }

        const recalculated = await recalculateUserBalance(userNo)
        const account = recalculated ? recalculated.toObject() : null
        const member = await CacheUser.findOne({ USER_NO: userNo })
          .select("USER_NO USER_NAME USER_POSITION TEL_NO")
          .lean()
        res.json({
          account: account || { userNo, balance: 0, status: "active", meta: {} },
          member: member || null,
        })
      } catch (error) {
        console.error("Error loading payment account:", error)
        res.status(500).json({ error: "Balansni yuklashda xatolik" })
      }
    },
  )

  router.post("/topup", verifyToken, checkPermissions(["payment_topup_user"]), async (req, res) => {
    try {
      const userNo = String(req.body.userNo || "").trim()
      const amount = parsePositiveAmount(req.body.amount)
      const comment = String(req.body.comment || "")
      const serviceId = req.body.serviceId || null
      const departmentId = req.body.departmentId || null

      if (!userNo || !amount) {
        return res.status(400).json({ error: "userNo va amount talab qilinadi" })
      }

      let account
      let transaction
      await runWithOptionalTransaction(async (session) => {
        const serviceName = await resolveServiceNameById(serviceId, session)
        account = await PaymentAccount.findOneAndUpdate(
          { userNo },
          { $inc: { balance: amount }, $setOnInsert: { status: "active", meta: {} } },
          { new: true, upsert: true, ...(session ? { session } : {}) },
        )

        const [created] = await PaymentTransaction.create(
          [
            {
              userNo,
              type: "top_up",
              amount,
              direction: "in",
              serviceId,
              serviceName,
              departmentId,
              source: "manual",
              comment,
              createdBy: req.user.id,
            },
          ],
          session ? { session } : {},
        )
        transaction = created
      })

      res.status(201).json({ account, transaction })
    } catch (error) {
      console.error("Error topping up balance:", error)
      res.status(500).json({ error: "Balansni to'ldirishda xatolik" })
    }
  })

  router.post("/spend", verifyToken, checkPermissions(["payment_withdraw_user"]), async (req, res) => {
    try {
      const userNo = String(req.body.userNo || "").trim()
      const amount = parsePositiveAmount(req.body.amount)
      const comment = String(req.body.comment || "")
      const serviceId = req.body.serviceId || null
      const departmentId = req.body.departmentId || null

      if (!userNo || !amount) {
        return res.status(400).json({ error: "userNo va amount talab qilinadi" })
      }

      let account
      let transaction
      await runWithOptionalTransaction(async (session) => {
        const serviceName = await resolveServiceNameById(serviceId, session)
        let accountQuery = PaymentAccount.findOne({ userNo })
        if (session) accountQuery = accountQuery.session(session)
        account = await accountQuery
        if (!account) {
          account = await PaymentAccount.create(
            [{ userNo, balance: 0, status: "active", meta: {} }],
            session ? { session } : {},
          ).then((list) => list[0])
        }

        if ((account.balance || 0) < amount) {
          throw new Error("INSUFFICIENT_BALANCE")
        }

        account.balance = Number(account.balance || 0) - amount
        await account.save(session ? { session } : {})

        const [created] = await PaymentTransaction.create(
          [
            {
              userNo,
              type: "spend",
              amount,
              direction: "out",
              serviceId,
              serviceName,
              departmentId,
              source: "manual",
              comment,
              createdBy: req.user.id,
            },
          ],
          session ? { session } : {},
        )
        transaction = created
      })

      res.status(201).json({ account, transaction })
    } catch (error) {
      if (error.message === "INSUFFICIENT_BALANCE") {
        return res.status(400).json({ error: "Balansda yetarli mablag' yo'q" })
      }
      console.error("Error spending balance:", error)
      res.status(500).json({ error: "Balansdan yechishda xatolik" })
    }
  })

  router.get("/transactions", verifyToken, checkPermissions(["payment_view_transactions"]), async (req, res) => {
    try {
      const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1)
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200)
      const skip = (page - 1) * limit

      const filter = {}
      if (req.query.userNo) filter.userNo = String(req.query.userNo).trim()
      if (req.query.type) filter.type = String(req.query.type).trim()
      if (req.query.serviceId) filter.serviceId = req.query.serviceId
      if (req.query.departmentId) filter.departmentId = req.query.departmentId
      if (req.query.from || req.query.to) {
        filter.createdAt = {}
        if (req.query.from) filter.createdAt.$gte = new Date(req.query.from)
        if (req.query.to) filter.createdAt.$lte = new Date(req.query.to)
      }

      const [items, total] = await Promise.all([
        PaymentTransaction.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("serviceId", "name code")
          .populate("departmentId", "name code")
          .populate("createdBy", "nickname firstname lastname")
          .lean(),
        PaymentTransaction.countDocuments(filter),
      ])

      res.json({
        items: items.map((item) => ({
          ...item,
          serviceName: String(item?.serviceId?.name || item?.serviceName || "").trim(),
        })),
        total,
        page,
        limit,
      })
    } catch (error) {
      console.error("Error loading payment transactions:", error)
      res.status(500).json({ error: "Tranzaksiyalarni yuklashda xatolik" })
    }
  })

  router.get("/statistics", verifyToken, checkPermissions(["payment_view_transactions"]), async (req, res) => {
    try {
      const { rangeStart, rangeEnd } = resolveStatisticsDateRange({ from: req.query.from, to: req.query.to })
      const dateMatch = { createdAt: { $gte: rangeStart, $lte: rangeEnd } }

      const [dailyTopupsRaw, userSpendingRaw, userSpendingMonthlyRaw] = await Promise.all([
        PaymentTransaction.aggregate([
          {
            $match: {
              ...dateMatch,
              type: "top_up",
              direction: "in",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              totalAmount: { $sum: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } } },
              operationsCount: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
        ]),
        PaymentTransaction.aggregate([
          { $match: dateMatch },
          {
            $project: {
              userNo: 1,
              isSpendOperation: { $cond: [{ $eq: ["$direction", "out"] }, 1, 0] },
              spendDelta: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$direction", "out"] },
                      then: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } },
                    },
                    {
                      case: {
                        $and: [{ $eq: ["$direction", "in"] }, { $eq: ["$source", "service"] }],
                      },
                      then: {
                        $multiply: [-1, { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } }],
                      },
                    },
                  ],
                  default: 0,
                },
              },
            },
          },
          {
            $group: {
              _id: "$userNo",
              totalSpent: { $sum: "$spendDelta" },
              operationsCount: { $sum: "$isSpendOperation" },
            },
          },
          { $match: { totalSpent: { $gt: 0 } } },
          { $sort: { totalSpent: -1 } },
        ]),
        PaymentTransaction.aggregate([
          { $match: dateMatch },
          {
            $project: {
              userNo: 1,
              month: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$createdAt",
                },
              },
              isSpendOperation: { $cond: [{ $eq: ["$direction", "out"] }, 1, 0] },
              spendDelta: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$direction", "out"] },
                      then: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } },
                    },
                    {
                      case: {
                        $and: [{ $eq: ["$direction", "in"] }, { $eq: ["$source", "service"] }],
                      },
                      then: {
                        $multiply: [-1, { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } }],
                      },
                    },
                  ],
                  default: 0,
                },
              },
            },
          },
          {
            $group: {
              _id: { month: "$month", userNo: "$userNo" },
              totalSpent: { $sum: "$spendDelta" },
              operationsCount: { $sum: "$isSpendOperation" },
            },
          },
          { $match: { totalSpent: { $gt: 0 } } },
          { $sort: { "_id.month": -1, totalSpent: -1 } },
        ]),
      ])

      const monthlyUserNos = userSpendingMonthlyRaw.map((item) => item?._id?.userNo).filter(Boolean)
      const userNos = [...new Set([...userSpendingRaw.map((item) => item._id).filter(Boolean), ...monthlyUserNos])]
      const members = userNos.length
        ? await CacheUser.find({ USER_NO: { $in: userNos } }).select("USER_NO USER_NAME").lean()
        : []
      const memberMap = new Map(members.map((item) => [item.USER_NO, item.USER_NAME || ""]))

      const dailyTopups = dailyTopupsRaw.map((item) => ({
        date: item._id,
        totalAmount: Number(item.totalAmount || 0),
        operationsCount: Number(item.operationsCount || 0),
      }))
      const userSpending = userSpendingRaw.map((item) => ({
        userNo: item._id,
        userName: memberMap.get(item._id) || "",
        totalSpent: Number(item.totalSpent || 0),
        operationsCount: Number(item.operationsCount || 0),
      }))
      const userSpendingByMonthMap = new Map()
      for (const row of userSpendingMonthlyRaw) {
        const month = String(row?._id?.month || "")
        const userNo = String(row?._id?.userNo || "")
        if (!month || !userNo) continue
        if (!userSpendingByMonthMap.has(month)) {
          userSpendingByMonthMap.set(month, [])
        }
        userSpendingByMonthMap.get(month).push({
          userNo,
          userName: memberMap.get(userNo) || "",
          totalSpent: Number(row.totalSpent || 0),
          operationsCount: Number(row.operationsCount || 0),
        })
      }
      const userSpendingByMonth = [...userSpendingByMonthMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, items]) => ({
          month,
          totalSpent: items.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0),
          usersCount: items.length,
          items,
        }))
      const dailyTopupsByMonthMap = new Map()
      for (const row of dailyTopups) {
        const month = String(row?.date || "").slice(0, 7)
        if (!month) continue
        if (!dailyTopupsByMonthMap.has(month)) {
          dailyTopupsByMonthMap.set(month, [])
        }
        dailyTopupsByMonthMap.get(month).push(row)
      }
      const dailyTopupsByMonth = [...dailyTopupsByMonthMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, items]) => ({
          month,
          totalAmount: items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
          daysCount: items.length,
          items,
        }))

      const dailyTopupsTotal = dailyTopups.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
      const userSpendingTotal = userSpending.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0)

      res.json({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
        dailyTopups,
        dailyTopupsByMonth,
        userSpending,
        userSpendingByMonth,
        summary: {
          dailyTopupsTotal,
          dailyTopupsDays: dailyTopups.length,
          userSpendingTotal,
          userSpendingUsers: userSpending.length,
        },
      })
    } catch (error) {
      if (error.status === 400) {
        if (error.message === "INVALID_FROM_DATE") {
          return res.status(400).json({ error: "Boshlanish sanasi noto'g'ri" })
        }
        if (error.message === "INVALID_TO_DATE") {
          return res.status(400).json({ error: "Tugash sanasi noto'g'ri" })
        }
        if (error.message === "INVALID_DATE_RANGE") {
          return res.status(400).json({ error: "Boshlanish sanasi tugash sanasidan katta bo'lmasligi kerak" })
        }
      }
      console.error("Error loading payment statistics:", error)
      res.status(500).json({ error: "Statistikani yuklashda xatolik" })
    }
  })

  router.get(
    "/service-provisions",
    verifyToken,
    checkAnyPermissions(["payment_provide_service", "payment_view_transactions"]),
    async (req, res) => {
      try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1)
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 200)
        const skip = (page - 1) * limit
        const filter = {}
        if (req.query.userNo) filter.userNo = String(req.query.userNo).trim()
        if (req.query.status) filter.status = String(req.query.status).trim()

        const [items, total] = await Promise.all([
          PaymentServiceProvision.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("providedBy", "nickname firstname lastname")
            .populate("cancelledBy", "nickname firstname lastname")
            .populate("departmentId", "name code")
            .populate("items.serviceId", "name code")
            .lean(),
          PaymentServiceProvision.countDocuments(filter),
        ])
        res.json({ items, total, page, limit })
      } catch (error) {
        console.error("Error loading service provisions:", error)
        res.status(500).json({ error: "Xizmat ko'rsatish tarixini yuklashda xatolik" })
      }
    },
  )

  router.post(
    "/service-provisions",
    verifyToken,
    checkPermissions(["payment_provide_service"]),
    async (req, res) => {
      try {
        const userNo = String(req.body.userNo || "").trim()
        const rawItems = Array.isArray(req.body.items) ? req.body.items : []
        const comment = String(req.body.comment || "")
        let departmentId = req.body.departmentId || null
        if (!userNo || rawItems.length === 0) {
          return res.status(400).json({ error: "ID karta raqami va xizmatlar ro'yxati talab qilinadi" })
        }

        const systemFlags = await getOrCreateSystemSettings()
        if (systemFlags.paymentRequireZalForServiceProvision) {
          const depRaw = departmentId != null ? String(departmentId).trim() : ""
          if (!depRaw || !mongoose.Types.ObjectId.isValid(depRaw)) {
            return res.status(400).json({ error: "Zal tanlash majburiy" })
          }
          const dep = await PaymentDepartment.findById(depRaw).lean()
          if (!dep) {
            return res.status(400).json({ error: "Tanlangan zal topilmadi" })
          }
          departmentId = depRaw
        }

        const normalizedItems = rawItems
          .map((item) => ({
            serviceId: String(item.serviceId || "").trim(),
            quantity: Math.max(Number(item.quantity) || 0, 0),
            customPrice: parsePositiveAmount(item.customPrice),
          }))
          .filter((item) => item.serviceId && item.quantity > 0)
        if (normalizedItems.length === 0) {
          return res.status(400).json({ error: "Kamida bitta xizmat va miqdor kiriting" })
        }

        const serviceIds = normalizedItems
          .filter((item) => item.serviceId !== CUSTOM_PRICED_SERVICE_ID)
          .map((item) => item.serviceId)
        const services = await PaymentService.find({ _id: { $in: serviceIds }, isActive: true }).lean()
        const serviceMap = new Map(services.map((s) => [String(s._id), s]))

        const provisionItems = []
        let totalAmount = 0
        for (const item of normalizedItems) {
          if (item.serviceId === CUSTOM_PRICED_SERVICE_ID) {
            if (!item.customPrice) {
              return res.status(400).json({ error: "O'zingiz narx qo'yish uchun narxni kiriting" })
            }
            const totalPrice = item.customPrice * item.quantity
            totalAmount += totalPrice
            provisionItems.push({
              serviceId: null,
              serviceName: CUSTOM_PRICED_SERVICE_NAME,
              quantity: item.quantity,
              unitPrice: item.customPrice,
              totalPrice,
            })
            continue
          }

          const service = serviceMap.get(item.serviceId)
          if (!service) {
            return res.status(400).json({ error: "Tanlangan xizmatlardan biri faol emas yoki topilmadi" })
          }
          const unitPrice = Number(service.price) || 0
          const totalPrice = unitPrice * item.quantity
          totalAmount += totalPrice
          provisionItems.push({
            serviceId: service._id,
            serviceName: service.name,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
          })
        }

        if (totalAmount <= 0) {
          return res.status(400).json({ error: "Xizmatlar umumiy summasi 0 dan katta bo'lishi kerak" })
        }

        let account
        let provision
        await runWithOptionalTransaction(async (session) => {
          let accountQuery = PaymentAccount.findOne({ userNo })
          if (session) accountQuery = accountQuery.session(session)
          account = await accountQuery
          if (!account) {
            account = await PaymentAccount.create(
              [{ userNo, balance: 0, status: "active", meta: {} }],
              session ? { session } : {},
            ).then((list) => list[0])
          }

          const balance = Number(account.balance || 0)
          if (balance < totalAmount) {
            throw new Error(`INSUFFICIENT_BALANCE:${balance}:${totalAmount}`)
          }

          account.balance = balance - totalAmount
          await account.save(session ? { session } : {})

          const [createdProvision] = await PaymentServiceProvision.create(
            [
              {
                userNo,
                departmentId,
                items: provisionItems,
                totalAmount,
                comment,
                status: "active",
                providedBy: req.user.id,
              },
            ],
            session ? { session } : {},
          )
          provision = createdProvision

          const txDocs = provisionItems.map((item) => ({
            userNo,
            type: "spend",
            amount: item.totalPrice,
            direction: "out",
            serviceId: item.serviceId || null,
            serviceName: item.serviceName,
            source: "service",
            comment: `${comment || ""} [xizmat:${item.serviceName}; soni:${item.quantity}]`.trim(),
            createdBy: req.user.id,
          }))
          await PaymentTransaction.create(txDocs, session ? { session } : {})
        })

        res.status(201).json({ provision, balance: account.balance, debited: totalAmount })
      } catch (error) {
        if (String(error.message || "").startsWith("INSUFFICIENT_BALANCE:")) {
          const [, balance, required] = String(error.message).split(":")
          return res.status(400).json({
            error: "Balans yetarli emas",
            balance: Number(balance),
            required: Number(required),
          })
        }
        console.error("Error creating service provision:", error)
        res.status(500).json({ error: "Xizmat ko'rsatishda xatolik" })
      }
    },
  )

  router.post(
    "/service-provisions/:id/cancel",
    verifyToken,
    checkPermissions(["payment_cancel_provided_service"]),
    async (req, res) => {
      try {
        const reason = String(req.body.reason || "").trim()
        const provisionId = String(req.params.id || "").trim()
        if (!provisionId) {
          return res.status(400).json({ error: "Provision ID talab qilinadi" })
        }

        let updatedProvision
        let account
        await runWithOptionalTransaction(async (session) => {
          let provisionQuery = PaymentServiceProvision.findById(provisionId)
          if (session) provisionQuery = provisionQuery.session(session)
          const provision = await provisionQuery
          if (!provision) {
            throw new Error("PROVISION_NOT_FOUND")
          }
          if (provision.status === "cancelled") {
            throw new Error("PROVISION_ALREADY_CANCELLED")
          }
          if (req.user.level !== "rais") {
            const createdAtMs = new Date(provision.createdAt).getTime()
            const ageMs = Date.now() - createdAtMs
            if (Number.isFinite(createdAtMs) && ageMs > SERVICE_CANCEL_WINDOW_MS) {
              throw new Error("CANCEL_WINDOW_EXPIRED")
            }
          }

          account = await PaymentAccount.findOneAndUpdate(
            { userNo: provision.userNo },
            { $inc: { balance: Number(provision.totalAmount || 0) }, $setOnInsert: { status: "active", meta: {} } },
            { new: true, upsert: true, ...(session ? { session } : {}) },
          )

          const [refundTx] = await PaymentTransaction.create(
            [
              {
                userNo: provision.userNo,
                type: "adjustment",
                amount: Number(provision.totalAmount || 0),
                direction: "in",
                source: "service",
                comment: `Xizmat bekor qilindi${reason ? `: ${reason}` : ""}`,
                createdBy: req.user.id,
              },
            ],
            session ? { session } : {},
          )

          provision.status = "cancelled"
          provision.cancelledBy = req.user.id
          provision.cancelledReason = reason
          provision.cancelledAt = new Date()
          await provision.save(session ? { session } : {})
          updatedProvision = { ...provision.toObject(), refundTx }
        })

        res.json({ provision: updatedProvision, balance: account.balance })
      } catch (error) {
        if (error.message === "PROVISION_NOT_FOUND") {
          return res.status(404).json({ error: "Xizmat ko'rsatish yozuvi topilmadi" })
        }
        if (error.message === "PROVISION_ALREADY_CANCELLED") {
          return res.status(400).json({ error: "Bu xizmat oldin bekor qilingan" })
        }
        if (error.message === "CANCEL_WINDOW_EXPIRED") {
          return res.status(403).json({ error: "Bekor qilish muddati tugagan (24 soat)" })
        }
        console.error("Error cancelling service provision:", error)
        res.status(500).json({ error: "Xizmatni bekor qilishda xatolik" })
      }
    },
  )

  router.get(
    "/services",
    verifyToken,
    checkAnyPermissions(["payment_provide_service", "payment_manage_services"]),
    async (req, res) => {
      try {
        const items = await PaymentService.find().sort({ createdAt: -1 }).lean()
        res.json(items)
      } catch (error) {
        res.status(500).json({ error: "Xizmatlarni yuklashda xatolik" })
      }
    },
  )

  router.post("/services", verifyToken, checkPermissions(["payment_manage_services"]), async (req, res) => {
    try {
      const { name, code = "", price = 0, isActive = true } = req.body || {}
      if (!String(name || "").trim()) {
        return res.status(400).json({ error: "Xizmat nomi talab qilinadi" })
      }
      const created = await PaymentService.create({ name: String(name).trim(), code, price: Number(price) || 0, isActive })
      res.status(201).json(created)
    } catch (error) {
      res.status(500).json({ error: "Xizmat yaratishda xatolik" })
    }
  })

  router.put("/services/:id", verifyToken, checkPermissions(["payment_manage_services"]), async (req, res) => {
    try {
      const updated = await PaymentService.findByIdAndUpdate(req.params.id, req.body, { new: true })
      if (!updated) return res.status(404).json({ error: "Xizmat topilmadi" })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: "Xizmatni yangilashda xatolik" })
    }
  })

  router.delete("/services/:id", verifyToken, checkPermissions(["payment_manage_services"]), async (req, res) => {
    try {
      const deleted = await PaymentService.findByIdAndDelete(req.params.id)
      if (!deleted) return res.status(404).json({ error: "Xizmat topilmadi" })
      res.json({ message: "Xizmat o'chirildi" })
    } catch (error) {
      res.status(500).json({ error: "Xizmatni o'chirishda xatolik" })
    }
  })

  router.get(
    "/departments",
    verifyToken,
    checkAnyPermissions(["payment_provide_service", "payment_manage_departments"]),
    async (req, res) => {
      try {
        const items = await PaymentDepartment.find().sort({ createdAt: -1 }).lean()
        res.json(items)
      } catch (error) {
        res.status(500).json({ error: "Bo'limlarni yuklashda xatolik" })
      }
    },
  )

  router.post("/departments", verifyToken, checkPermissions(["payment_manage_departments"]), async (req, res) => {
    try {
      const { name, code = "", isActive = true } = req.body || {}
      if (!String(name || "").trim()) {
        return res.status(400).json({ error: "Bo'lim nomi talab qilinadi" })
      }
      const created = await PaymentDepartment.create({ name: String(name).trim(), code, isActive })
      res.status(201).json(created)
    } catch (error) {
      res.status(500).json({ error: "Bo'lim yaratishda xatolik" })
    }
  })

  router.put("/departments/:id", verifyToken, checkPermissions(["payment_manage_departments"]), async (req, res) => {
    try {
      const updated = await PaymentDepartment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      if (!updated) return res.status(404).json({ error: "Bo'lim topilmadi" })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: "Bo'limni yangilashda xatolik" })
    }
  })

  router.delete("/departments/:id", verifyToken, checkPermissions(["payment_manage_departments"]), async (req, res) => {
    try {
      const deleted = await PaymentDepartment.findByIdAndDelete(req.params.id)
      if (!deleted) return res.status(404).json({ error: "Bo'lim topilmadi" })
      await UserDepartment.deleteMany({ departmentId: req.params.id })
      res.json({ message: "Bo'lim o'chirildi" })
    } catch (error) {
      res.status(500).json({ error: "Bo'limni o'chirishda xatolik" })
    }
  })

  router.get("/user-departments", verifyToken, checkPermissions(["payment_manage_user_departments"]), async (req, res) => {
    try {
      const filter = {}
      if (req.query.expertId) filter.expertId = String(req.query.expertId).trim()

      const items = await UserDepartment.find(filter)
        .sort({ createdAt: -1 })
        .populate("departmentId", "name code isActive")
        .populate("expertId", "nickname firstname lastname position level isActive")
        .lean()

      res.json(items)
    } catch (error) {
      res.status(500).json({ error: "Xodim bo'limlarini yuklashda xatolik" })
    }
  })

  router.get("/experts", verifyToken, checkPermissions(["payment_manage_user_departments"]), async (req, res) => {
    try {
      const experts = await User.find(
        { level: "expert" },
        "nickname firstname lastname position isActive staffPosition",
      )
        .populate("staffPosition", "name _id")
        .sort({ firstname: 1, lastname: 1, nickname: 1 })
        .lean()
      res.json(experts)
    } catch (error) {
      res.status(500).json({ error: "Xodimlarni yuklashda xatolik" })
    }
  })

  router.post(
    "/user-departments",
    verifyToken,
    checkPermissions(["payment_manage_user_departments"]),
    async (req, res) => {
      try {
        const expertId = String(req.body.expertId || "").trim()
        const departmentId = String(req.body.departmentId || "").trim()
        if (!expertId || !departmentId) {
          return res.status(400).json({ error: "expertId va departmentId talab qilinadi" })
        }

        const updated = await UserDepartment.findOneAndUpdate(
          { expertId, departmentId },
          { $set: { expertId, departmentId, isActive: req.body.isActive !== false } },
          { upsert: true, new: true },
        )
          .populate("departmentId", "name code isActive")
          .populate("expertId", "nickname firstname lastname position level isActive")
        res.status(201).json(updated)
      } catch (error) {
        res.status(500).json({ error: "Biriktirishda xatolik" })
      }
    },
  )

  router.delete(
    "/user-departments",
    verifyToken,
    checkPermissions(["payment_manage_user_departments"]),
    async (req, res) => {
      try {
        const expertId = String(req.body.expertId || "").trim()
        const departmentId = String(req.body.departmentId || "").trim()
        if (!expertId || !departmentId) {
          return res.status(400).json({ error: "expertId va departmentId talab qilinadi" })
        }
        await UserDepartment.deleteOne({ expertId, departmentId })
        res.json({ message: "Bo'lim biriktirmasi o'chirildi" })
      } catch (error) {
        res.status(500).json({ error: "Biriktirmani o'chirishda xatolik" })
      }
    },
  )

  return router
}
