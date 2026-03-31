require("dotenv").config()
const mongoose = require("mongoose")

const CURRENT_DB = process.env.DB_CURRENT
const OLD_PULLIK_DB = process.env.DB_PULLIK || "mongodb://localhost/pullik"
const WRITE_MODE = process.argv.includes("--write")
const SHOW_COLLECTIONS = process.argv.includes("--show-collections")

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

  const collections = await oldDb.db.listCollections().toArray()
  const names = new Set(collections.map((c) => c.name))
  const pickCollection = (candidates) => candidates.find((name) => names.has(name))

  const colReaders = pickCollection(["dbo_ent_ReaderAccount", "ReaderAccount", "readers"])
  const colTopups = pickCollection(["topups", "TopUps", "dbo_ent_TopUp", "dbo_doc_UpAccount"])
  const colServices = pickCollection(["services", "Services", "dbo_ent_Service"])
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

  console.log("Mode:", WRITE_MODE ? "WRITE" : "DRY-RUN")
  console.log("Tip: run with --write to persist changes")
  console.log("Collections:", { colReaders, colTopups, colServices, colMovements, colDepartments })
  if (SHOW_COLLECTIONS) {
    console.log("Available collections in /pullik:", Array.from(names).sort())
  }

  const stats = {
    departments: { scanned: 0, valid: 0, upserted: 0, modified: 0 },
    services: { scanned: 0, valid: 0, upserted: 0, modified: 0 },
    readers: { scanned: 0, matchedAAA: 0, upserted: 0, modified: 0 },
    topups: { scanned: 0, matchedAAA: 0, moved: 0 },
    movements: { scanned: 0, matchedAAA: 0, moved: 0 },
    normalization: { accountsUpdated: 0, transactionsUpdated: 0 },
  }

  // Normalize previously imported lowercase IDs in target DB.
  // This makes reruns idempotent and keeps all IDs canonical as AAA#########.
  if (WRITE_MODE) {
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
        price: toNumber(getFirst(doc, ["price", "Price", "Amount"], 0), 0),
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
    const docs = await oldDb.db.collection(colTopups).find({}).toArray()
    for (const doc of docs) {
      stats.topups.scanned++
      const linkedReaderKey = getFirst(doc, ["Account", "Reader", "ReaderAccount", "ReaderID", "readerId", "USER_NO"], "")
      const userNoFromLink = readerIdMap.get(String(linkedReaderKey))
      const userNo = userNoFromLink || normalizeReaderId(linkedReaderKey)
      if (!userNo) continue
      stats.topups.matchedAAA++
      const amount = toNumber(getFirst(doc, ["InSum", "Amount", "amount", "Sum", "sum"], 0), 0)
      if (amount <= 0) continue
      const createdAt = new Date(getFirst(doc, ["CreatedAt", "createdAt", "Date", "date"], Date.now()))
      if (WRITE_MODE) {
        await PaymentTransaction.create({
          userNo,
          type: "top_up",
          amount,
          direction: "in",
          source: "migration",
          comment: "Migrated topup",
          createdAt,
          updatedAt: createdAt,
        })
        await PaymentAccount.updateOne(
          { userNo },
          { $setOnInsert: { status: "active", meta: { migratedFrom: colTopups } }, $inc: { balance: amount } },
          { upsert: true },
        )
      }
      stats.topups.moved++
    }
  }

  if (colMovements) {
    const docs = await oldDb.db.collection(colMovements).find({}).toArray()
    for (const doc of docs) {
      stats.movements.scanned++
      const linkedReaderKey = getFirst(doc, ["Reader", "Account", "ReaderID", "readerId", "USER_NO"], "")
      const userNoFromLink = readerIdMap.get(String(linkedReaderKey))
      const userNo = userNoFromLink || normalizeReaderId(linkedReaderKey)
      if (!userNo) continue
      stats.movements.matchedAAA++
      const amount = Math.abs(toNumber(getFirst(doc, ["Amount", "amount", "Sum", "sum"], 0), 0))
      if (amount <= 0) continue
      const direction = String(
        getFirst(doc, ["Direction", "direction", "Type", "type", "ActionType", "actionType"], "out"),
      ).toLowerCase()
      const isIn = direction.includes("in") || direction.includes("top")
      const createdAt = new Date(getFirst(doc, ["CreatedAt", "createdAt", "Date", "date"], Date.now()))
      if (WRITE_MODE) {
        await PaymentTransaction.create({
          userNo,
          type: isIn ? "top_up" : "spend",
          amount,
          direction: isIn ? "in" : "out",
          source: "migration",
          comment: "Migrated movement",
          createdAt,
          updatedAt: createdAt,
        })
        await PaymentAccount.updateOne(
          { userNo },
          {
            $setOnInsert: { status: "active", meta: { migratedFrom: colMovements } },
            $inc: { balance: isIn ? amount : -amount },
          },
          { upsert: true },
        )
      }
      stats.movements.moved++
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
