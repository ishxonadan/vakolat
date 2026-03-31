require("dotenv").config()
const mongoose = require("mongoose")

const CURRENT_DB = process.env.DB_CURRENT
const OLD_PULLIK_DB = process.env.DB_PULLIK || "mongodb://localhost/pullik"
const WRITE_MODE = process.argv.includes("--write")
const SHOW_COLLECTIONS = process.argv.includes("--show-collections")
const RESET_MIGRATION = process.argv.includes("--reset-migration")
const BATCH_SIZE = Math.max(Number(process.env.PULLIK_MIGRATE_BATCH_SIZE) || 2000, 100)
const CURSOR_BATCH_SIZE = Math.max(Number(process.env.PULLIK_MIGRATE_CURSOR_BATCH_SIZE) || 5000, 500)

const normalizeReaderId = (value) => {
  const raw = String(value || "").trim()
  const match = raw.match(/^aaa(\d{9})$/i)
  if (!match) return null
  return `AAA${match[1]}`
}

const getFirst = (obj, keys, fallback = null) => {
  for (const key of keys) {
    if (obj && obj[key] != null) return obj[key]
  }
  return fallback
}

const toNumber = (value, fallback = 0) => {
  if (value && typeof value === "object" && typeof value.toString === "function") {
    const parsedFromString = Number(value.toString())
    if (Number.isFinite(parsedFromString)) return parsedFromString
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const classifyMovementDirection = (doc, rawAmount) => {
  const directionRaw = getFirst(doc, ["Direction", "direction"], null)
  if (directionRaw != null && directionRaw !== "") {
    const numericDirection = Number(directionRaw)
    if (Number.isFinite(numericDirection)) {
      if (numericDirection > 0) return true
      if (numericDirection < 0) return false
      // In this legacy DB, 0 is used for outgoing/spend rows.
      if (numericDirection === 0) return false
    }
  }

  const directionText = String(
    getFirst(doc, ["Direction", "direction", "Type", "type", "ActionType", "actionType"], ""),
  ).toLowerCase()

  const outHints = ["out", "spend", "withdraw", "debit", "minus", "chiq", "expense"]
  const inHints = ["in", "top", "up", "credit", "plus", "kirim", "income"]

  if (outHints.some((hint) => directionText.includes(hint))) return false
  if (inHints.some((hint) => directionText.includes(hint))) return true

  // Fallback for legacy rows that do not have a reliable direction field:
  // signed amount often encodes in/out.
  if (rawAmount < 0) return false
  if (rawAmount > 0) return true

  return false
}

async function run() {
  if (!CURRENT_DB) {
    throw new Error("DB_CURRENT is not configured")
  }

  const current = await mongoose.createConnection(CURRENT_DB).asPromise()
  const oldDb = await mongoose.createConnection(OLD_PULLIK_DB).asPromise()

  const paymentAccountSchema = new mongoose.Schema(
    {
      userNo: { type: String, required: true, unique: true },
      balance: { type: Number, default: 0 },
      status: { type: String, default: "active" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )
  const paymentTransactionSchema = new mongoose.Schema(
    {
      userNo: String,
      type: String,
      amount: Number,
      direction: String,
      source: String,
      comment: String,
      createdAt: Date,
      updatedAt: Date,
    },
    { strict: false },
  )
  const paymentServiceSchema = new mongoose.Schema({ name: String, code: String, price: Number, isActive: Boolean }, { strict: false })
  const paymentDepartmentSchema = new mongoose.Schema({ name: String, code: String, isActive: Boolean }, { strict: false })

  const PaymentAccount = current.model("PaymentAccount", paymentAccountSchema)
  const PaymentTransaction = current.model("PaymentTransaction", paymentTransactionSchema)
  const PaymentService = current.model("PaymentService", paymentServiceSchema)
  const PaymentDepartment = current.model("PaymentDepartment", paymentDepartmentSchema)
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
  const flushBulk = async (Model, ops) => {
    if (!ops.length) return null
    const result = await Model.bulkWrite(ops, { ordered: false })
    ops.length = 0
    return result
  }
  const flushBalanceDeltas = async (deltaMap, sourceLabel) => {
    if (!WRITE_MODE || deltaMap.size === 0) return
    const ops = []
    for (const [userNo, delta] of deltaMap.entries()) {
      if (!Number.isFinite(delta) || delta === 0) continue
      ops.push({
        updateOne: {
          filter: { userNo },
          update: {
            $setOnInsert: { status: "active", meta: { migratedFrom: sourceLabel } },
            $inc: { balance: delta },
          },
          upsert: true,
        },
      })
      if (ops.length >= BATCH_SIZE) {
        await flushBulk(PaymentAccount, ops)
      }
    }
    if (ops.length) {
      await flushBulk(PaymentAccount, ops)
    }
    deltaMap.clear()
  }
  const rebuildAllAccountBalancesFromTransactions = async () => {
    const now = new Date()
    await PaymentAccount.updateMany({}, { $set: { balance: 0, status: "active", "meta.balanceCalculatedAt": now } })
    const rows = await PaymentTransaction.aggregate(buildBalanceAggregate({}))
    const ops = []
    for (const row of rows) {
      ops.push({
        updateOne: {
          filter: { userNo: row.userNo },
          update: {
            $set: {
              balance: Number(row.balance || 0),
              status: "active",
              "meta.balanceCalculatedAt": now,
            },
          },
          upsert: true,
        },
      })
      if (ops.length >= BATCH_SIZE) {
        await flushBulk(PaymentAccount, ops)
      }
    }
    if (ops.length) {
      await flushBulk(PaymentAccount, ops)
    }
  }

  const collections = await oldDb.db.listCollections().toArray()
  const names = new Set(collections.map((c) => c.name))
  const pickCollection = (candidates) => candidates.find((name) => names.has(name))

  const colReaders = pickCollection(["dbo_ent_ReaderAccount", "ReaderAccount", "readers"])
  const colTopups = pickCollection(["topups", "TopUps", "dbo_ent_TopUp", "dbo_doc_UpAccount"])
  const colServices = pickCollection(["services", "Services", "dbo_ent_Service"])
  const colServiceHistory = pickCollection(["dbo_info_ServiceHistory", "ServiceHistory", "service_history"])
  const colGiveServiceTab = pickCollection(["dbo_doc_GiveServiceTab", "GiveServiceTab", "give_service_tab"])
  const colMovements = pickCollection(["movements", "Movements", "dbo_ent_Movement", "dbo_acm_AccountMovement"])
  const colDepartments = pickCollection(["departments", "Departments", "dbo_ent_Department"])

  // Build reader lookup from legacy numeric ID -> normalized ReaderID
  let readerIdMap = new Map()
  if (colReaders) {
    const readerDocs = await oldDb.db.collection(colReaders).find({}, { projection: { ID: 1, ReaderID: 1 } }).toArray()
    readerIdMap = new Map(
      readerDocs
        .map((r) => [String(r.ID), normalizeReaderId(r.ReaderID)])
        .filter(([, normalized]) => !!normalized),
    )
  }
  let legacyServiceMap = new Map()
  if (colServices) {
    const serviceDocs = await oldDb.db.collection(colServices).find({}, { projection: { ID: 1, Name: 1, ServiceName: 1, Code: 1 } }).toArray()
    legacyServiceMap = new Map(
      serviceDocs.map((s) => [
        String(s.ID),
        {
          name: String(getFirst(s, ["Name", "name", "ServiceName"], "")).trim(),
          code: String(getFirst(s, ["Code", "code", "ServiceCode"], "")).trim(),
        },
      ]),
    )
  }
  const legacyServicePriceMap = new Map()
  if (colServiceHistory) {
    // Price is not stored in dbo_ent_Service in this legacy DB; use latest price history.
    const historyDocs = await oldDb.db
      .collection(colServiceHistory)
      .find({}, { projection: { ServiceName: 1, Price: 1, Moment: 1 } })
      .sort({ Moment: -1 })
      .toArray()
    for (const doc of historyDocs) {
      const serviceKey = String(getFirst(doc, ["ServiceName", "Service", "serviceId"], "")).trim()
      if (!serviceKey || legacyServicePriceMap.has(serviceKey)) continue
      const price = toNumber(getFirst(doc, ["Price", "price", "Amount"], 0), 0)
      if (price > 0) legacyServicePriceMap.set(serviceKey, price)
    }
  }
  if (colGiveServiceTab) {
    // Fallback: infer unit price from historical service rows (Total / ServiceCount).
    const tabDocs = await oldDb.db
      .collection(colGiveServiceTab)
      .find({}, { projection: { Service: 1, ServiceCount: 1, Total: 1 } })
      .toArray()
    for (const doc of tabDocs) {
      const serviceKey = String(getFirst(doc, ["Service", "serviceId"], "")).trim()
      if (!serviceKey || legacyServicePriceMap.has(serviceKey)) continue
      const count = toNumber(getFirst(doc, ["ServiceCount", "Count", "Quantity"], 0), 0)
      const total = toNumber(getFirst(doc, ["Total", "Sum", "Amount"], 0), 0)
      if (count > 0 && total > 0) {
        legacyServicePriceMap.set(serviceKey, total / count)
      }
    }
  }
  let legacyDepartmentMap = new Map()
  if (colDepartments) {
    const departmentDocs = await oldDb.db
      .collection(colDepartments)
      .find({}, { projection: { ID: 1, Name: 1, DepartmentName: 1, Code: 1, DepartmentCode: 1 } })
      .toArray()
    legacyDepartmentMap = new Map(
      departmentDocs.map((d) => [
        String(d.ID),
        {
          name: String(getFirst(d, ["Name", "name", "DepartmentName"], "")).trim(),
          code: String(getFirst(d, ["Code", "code", "DepartmentCode"], "")).trim(),
        },
      ]),
    )
  }

  console.log("Mode:", WRITE_MODE ? "WRITE" : "DRY-RUN")
  console.log("Tip: run with --write to persist changes")
  if (RESET_MIGRATION) {
    console.log("Reset mode: enabled (--reset-migration)")
  }
  console.log("Collections:", {
    colReaders,
    colTopups,
    colServices,
    colServiceHistory,
    colGiveServiceTab,
    colMovements,
    colDepartments,
  })
  if (SHOW_COLLECTIONS) {
    console.log("Available collections in /pullik:", Array.from(names).sort())
  }

  const stats = {
    departments: { scanned: 0, valid: 0, upserted: 0, modified: 0 },
    services: { scanned: 0, valid: 0, upserted: 0, modified: 0 },
    readers: { scanned: 0, matchedAAA: 0, upserted: 0, modified: 0 },
    topups: { scanned: 0, matchedAAA: 0, moved: 0 },
    movements: { scanned: 0, matchedAAA: 0, moved: 0, skippedInboundAsDuplicateTopup: 0 },
    normalization: { accountsUpdated: 0, transactionsUpdated: 0 },
  }

  // Normalize previously imported lowercase IDs in target DB.
  // This makes reruns idempotent and keeps all IDs canonical as AAA#########.
  if (WRITE_MODE) {
    if (RESET_MIGRATION) {
      const removed = await PaymentTransaction.deleteMany({ source: "migration" })
      console.log(`Removed existing migration transactions: ${removed.deletedCount || 0}`)
      // Rebuild once after cleanup so any stale account cache is cleared before re-import.
      await rebuildAllAccountBalancesFromTransactions()
    }

    const lowerAccounts = await PaymentAccount.find({ userNo: /^aaa\d{9}$/ }).lean()
    for (const account of lowerAccounts) {
      const normalized = normalizeReaderId(account.userNo)
      if (!normalized) continue
      if (normalized === account.userNo) continue

      const existingUpper = await PaymentAccount.findOne({ userNo: normalized }).lean()
      if (existingUpper) {
        // If uppercase already exists, keep it and remove lowercase duplicate.
        await PaymentAccount.deleteOne({ _id: account._id })
      } else {
        await PaymentAccount.updateOne({ _id: account._id }, { $set: { userNo: normalized } })
      }
      stats.normalization.accountsUpdated++
    }

    const txResult = await PaymentTransaction.updateMany(
      { userNo: /^aaa\d{9}$/ },
      [{ $set: { userNo: { $toUpper: "$userNo" } } }],
    )
    stats.normalization.transactionsUpdated = txResult.modifiedCount || 0
  }

  if (colDepartments) {
    const docs = await oldDb.db.collection(colDepartments).find({}).toArray()
    for (const doc of docs) {
      stats.departments.scanned++
      const name = String(getFirst(doc, ["name", "Name", "DepartmentName"], "")).trim()
      if (!name) continue
      stats.departments.valid++
      const payload = {
        name,
        code: String(getFirst(doc, ["code", "Code", "DepartmentCode"], "") || ""),
        isActive: getFirst(doc, ["isActive", "IsActive", "active"], true) !== false,
      }
      if (WRITE_MODE) {
        const result = await PaymentDepartment.updateOne({ name: payload.name }, { $set: payload }, { upsert: true })
        if (result.upsertedCount > 0) stats.departments.upserted += result.upsertedCount
        if (result.modifiedCount > 0) stats.departments.modified += result.modifiedCount
      }
    }
  }

  if (colServices) {
    const docs = await oldDb.db.collection(colServices).find({}).toArray()
    for (const doc of docs) {
      stats.services.scanned++
      const name = String(getFirst(doc, ["name", "Name", "ServiceName"], "")).trim()
      if (!name) continue
      stats.services.valid++
      const payload = {
        name,
        code: String(getFirst(doc, ["code", "Code", "ServiceCode"], "") || ""),
        price:
          toNumber(getFirst(doc, ["price", "Price", "Amount"], NaN), NaN) ||
          legacyServicePriceMap.get(String(getFirst(doc, ["ID", "id", "_id"], ""))) ||
          0,
        isActive: getFirst(doc, ["isActive", "IsActive", "active"], true) !== false,
      }
      if (WRITE_MODE) {
        const result = await PaymentService.updateOne({ name: payload.name }, { $set: payload }, { upsert: true })
        if (result.upsertedCount > 0) stats.services.upserted += result.upsertedCount
        if (result.modifiedCount > 0) stats.services.modified += result.modifiedCount
      }
    }
  }

  if (colReaders) {
    const docs = await oldDb.db.collection(colReaders).find({}).toArray()
    for (const doc of docs) {
      stats.readers.scanned++
      const userNo = normalizeReaderId(getFirst(doc, ["ReaderID", "readerId", "USER_NO"], ""))
      if (!userNo) continue
      stats.readers.matchedAAA++
      const balance = toNumber(getFirst(doc, ["Balance", "balance", "Amount", "amount"], 0), 0)
      if (WRITE_MODE) {
        const result = await PaymentAccount.updateOne(
          { userNo },
          { $set: { userNo, status: "active", meta: { migratedFrom: colReaders } }, $max: { balance } },
          { upsert: true },
        )
        if (result.upsertedCount > 0) stats.readers.upserted += result.upsertedCount
        if (result.modifiedCount > 0) stats.readers.modified += result.modifiedCount
      }
    }
  }

  if (colTopups) {
    const txOps = []
    const balanceDeltaMap = new Map()
    const cursor = oldDb.db.collection(colTopups).find({}).batchSize(CURSOR_BATCH_SIZE)
    for await (const doc of cursor) {
      stats.topups.scanned++
      const linkedReaderKey = getFirst(doc, ["Account", "Reader", "ReaderAccount", "ReaderID", "readerId", "USER_NO"], "")
      const userNoFromLink = readerIdMap.get(String(linkedReaderKey))
      const userNo = userNoFromLink || normalizeReaderId(linkedReaderKey)
      if (!userNo) continue
      stats.topups.matchedAAA++
      const amount = toNumber(getFirst(doc, ["InSum", "Amount", "amount", "Sum", "sum"], 0), 0)
      if (amount <= 0) continue
      const createdAt = new Date(getFirst(doc, ["CreatedAt", "createdAt", "Date", "date", "Moment", "moment"], Date.now()))
      if (WRITE_MODE) {
        txOps.push({
          insertOne: {
            document: {
              userNo,
              type: "top_up",
              amount,
              direction: "in",
              source: "migration",
              comment: "(mig) Hisob to'ldirildi",
              legacyAccountId: getFirst(doc, ["Account", "Reader", "ReaderAccount"], null),
              legacyDepartmentId: getFirst(doc, ["Department"], null),
              legacyCouponNumber: getFirst(doc, ["CouponNumber"], null),
              createdAt,
              updatedAt: createdAt,
            },
          },
        })
        balanceDeltaMap.set(userNo, (balanceDeltaMap.get(userNo) || 0) + amount)
        if (txOps.length >= BATCH_SIZE) {
          await flushBulk(PaymentTransaction, txOps)
        }
        if (balanceDeltaMap.size >= BATCH_SIZE) {
          await flushBalanceDeltas(balanceDeltaMap, colTopups)
        }
      }
      stats.topups.moved++
    }
    if (WRITE_MODE) {
      await flushBulk(PaymentTransaction, txOps)
      await flushBalanceDeltas(balanceDeltaMap, colTopups)
    }
  }

  if (colMovements) {
    const txOps = []
    const balanceDeltaMap = new Map()
    const cursor = oldDb.db.collection(colMovements).find({}).batchSize(CURSOR_BATCH_SIZE)
    for await (const doc of cursor) {
      stats.movements.scanned++
      const linkedReaderKey = getFirst(doc, ["Reader", "Account", "ReaderID", "readerId", "USER_NO"], "")
      const userNoFromLink = readerIdMap.get(String(linkedReaderKey))
      const userNo = userNoFromLink || normalizeReaderId(linkedReaderKey)
      if (!userNo) continue
      stats.movements.matchedAAA++
      const rawAmount = toNumber(getFirst(doc, ["Amount", "amount", "Sum", "sum"], 0), 0)
      const amount = Math.abs(rawAmount)
      if (amount <= 0) continue
      const isIn = classifyMovementDirection(doc, rawAmount)
      // In many legacy schemas, inbound rows in movements are top-ups that are
      // already present in a dedicated topups collection. Importing both would
      // double-count user balances.
      if (isIn && colTopups) {
        stats.movements.skippedInboundAsDuplicateTopup++
        continue
      }
      const createdAt = new Date(getFirst(doc, ["CreatedAt", "createdAt", "Date", "date", "Moment", "moment"], Date.now()))
      if (WRITE_MODE) {
        const legacyServiceId = getFirst(doc, ["Service"], null)
        const legacyDepartmentId = getFirst(doc, ["Department"], null)
        const legacyRegistrator = getFirst(doc, ["Registrator"], null)
        const legacyRegistratorType = getFirst(doc, ["Registrator_Type"], null)
        const legacyServiceMeta = legacyServiceMap.get(String(legacyServiceId || ""))
        const legacyDepartmentMeta = legacyDepartmentMap.get(String(legacyDepartmentId || ""))
        const serviceLabel = legacyServiceMeta?.name
          ? `${legacyServiceMeta.name}${legacyServiceMeta.code ? ` (${legacyServiceMeta.code})` : ""}`
          : null
        const departmentLabel = legacyDepartmentMeta?.name
          ? `${legacyDepartmentMeta.name}${legacyDepartmentMeta.code ? ` (${legacyDepartmentMeta.code})` : ""}`
          : null
        const contextBits = []
        if (serviceLabel) contextBits.push(`xizmat: ${serviceLabel}`)
        if (departmentLabel) contextBits.push(`bo'lim: ${departmentLabel}`)
        const movementComment = isIn
          ? "(mig) Kirim operatsiyasi"
          : contextBits.length
            ? `(mig) Xizmat uchun yechish (${contextBits.join(", ")})`
            : "(mig) Xarajat/yechish operatsiyasi"
        txOps.push({
          insertOne: {
            document: {
              userNo,
              type: isIn ? "top_up" : "spend",
              amount,
              direction: isIn ? "in" : "out",
              source: "migration",
              comment: movementComment,
              legacyServiceId,
              legacyDepartmentId,
              legacyRegistrator,
              legacyRegistratorType,
              createdAt,
              updatedAt: createdAt,
            },
          },
        })
        balanceDeltaMap.set(userNo, (balanceDeltaMap.get(userNo) || 0) + (isIn ? amount : -amount))
        if (txOps.length >= BATCH_SIZE) {
          await flushBulk(PaymentTransaction, txOps)
        }
        if (balanceDeltaMap.size >= BATCH_SIZE) {
          await flushBalanceDeltas(balanceDeltaMap, colMovements)
        }
      }
      stats.movements.moved++
    }
    if (WRITE_MODE) {
      await flushBulk(PaymentTransaction, txOps)
      await flushBalanceDeltas(balanceDeltaMap, colMovements)
    }
  }

  console.log("Migration report:")
  console.table({
    departments: stats.departments,
    services: stats.services,
    readers: stats.readers,
    topups: stats.topups,
    movements: stats.movements,
    normalization: stats.normalization,
  })
  if (!WRITE_MODE) {
    console.log("No rows were written (dry-run). Re-run with --write to move data.")
  } else {
    // Always recompute from transaction ledger so account cache is consistent and
    // unaffected by partial runs or retries.
    await rebuildAllAccountBalancesFromTransactions()
    console.log("Rebuilt account balances from transactions")
  }
  await current.close()
  await oldDb.close()
}

run()
  .then(() => {
    console.log("Migration done")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
