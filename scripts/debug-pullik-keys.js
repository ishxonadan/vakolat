require("dotenv").config()
const mongoose = require("mongoose")

async function run() {
  const oldDbUri = process.env.DB_PULLIK || "mongodb://localhost/pullik"
  const conn = await mongoose.createConnection(oldDbUri).asPromise()
  const topup = await conn.collection("dbo_doc_UpAccount").findOne({})
  const movement = await conn.collection("dbo_acm_AccountMovement").findOne({})
  console.log("topup keys:", Object.keys(topup || {}))
  console.log("movement keys:", Object.keys(movement || {}))
  console.log("topup sample:", topup)
  console.log("movement sample:", movement)
  await conn.close()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
