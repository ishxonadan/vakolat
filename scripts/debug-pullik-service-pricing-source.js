require("dotenv").config()
const mongoose = require("mongoose")

async function inspectCollection(db, name) {
  const sample = await db.collection(name).findOne({})
  console.log(`\n[${name}] keys:`, Object.keys(sample || {}))
  console.log(`[${name}] sample:`, sample)
}

async function run() {
  const uri = process.env.DB_PULLIK || "mongodb://localhost/pullik"
  const conn = await mongoose.createConnection(uri).asPromise()
  await inspectCollection(conn.db, "dbo_doc_GiveService")
  await inspectCollection(conn.db, "dbo_doc_GiveServiceTab")
  await inspectCollection(conn.db, "dbo_info_ServiceHistory")
  await inspectCollection(conn.db, "dbo_acm_AccountMovement")
  await conn.close()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
