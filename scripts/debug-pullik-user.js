require("dotenv").config()
const mongoose = require("mongoose")

const OLD_PULLIK_DB = process.env.DB_PULLIK || "mongodb://localhost/pullik"

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

async function run() {
  const userNo = String(process.argv[2] || "").trim()
  if (!userNo) throw new Error("Usage: node scripts/debug-pullik-user.js AAA#########")

  const oldDb = await mongoose.createConnection(OLD_PULLIK_DB).asPromise()
  const collections = await oldDb.db.listCollections().toArray()
  const names = new Set(collections.map((c) => c.name))
  const pickCollection = (candidates) => candidates.find((name) => names.has(name))

  const colReaders = pickCollection(["dbo_ent_ReaderAccount", "ReaderAccount", "readers"])
  const colTopups = pickCollection(["topups", "TopUps", "dbo_ent_TopUp", "dbo_doc_UpAccount"])
  const colMovements = pickCollection(["movements", "Movements", "dbo_ent_Movement", "dbo_acm_AccountMovement"])

  const readerDocs = colReaders
    ? await oldDb.db.collection(colReaders).find({}, { projection: { ID: 1, ReaderID: 1 } }).toArray()
    : []
  const ids = readerDocs
    .filter((r) => normalizeReaderId(r.ReaderID) === userNo)
    .map((r) => String(r.ID))

  const topupDocs = colTopups
    ? await oldDb.db
        .collection(colTopups)
        .find({
          $or: [
            { Account: { $in: ids } },
            { Reader: { $in: ids } },
            { ReaderAccount: { $in: ids } },
            { ReaderID: userNo },
            { readerId: userNo },
            { USER_NO: userNo },
          ],
        })
        .limit(50)
        .toArray()
    : []

  const movementDocs = colMovements
    ? await oldDb.db
        .collection(colMovements)
        .find({
          $or: [
            { Reader: { $in: ids } },
            { Account: { $in: ids } },
            { ReaderID: userNo },
            { readerId: userNo },
            { USER_NO: userNo },
          ],
        })
        .limit(100)
        .toArray()
    : []

  const movementDirectionSummary = movementDocs.map((d) => ({
    Direction: getFirst(d, ["Direction", "direction"], null),
    Type: getFirst(d, ["Type", "type"], null),
    ActionType: getFirst(d, ["ActionType", "actionType"], null),
    Amount: getFirst(d, ["Amount", "amount", "Sum", "sum"], null),
  }))

  console.log(
    JSON.stringify(
      {
        userNo,
        collections: { colReaders, colTopups, colMovements },
        matchedReaderIds: ids.slice(0, 20),
        topupCountSampled: topupDocs.length,
        movementCountSampled: movementDocs.length,
        movementDirectionSummary,
      },
      null,
      2,
    ),
  )

  await oldDb.close()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
