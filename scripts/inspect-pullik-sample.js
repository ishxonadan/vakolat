require("dotenv").config()
const mongoose = require("mongoose")

async function run() {
  const uri = process.env.DB_PULLIK || "mongodb://localhost/pullik"
  const c = await mongoose.createConnection(uri).asPromise()
  const top = await c.db.collection("dbo_doc_UpAccount").findOne({})
  const mov = await c.db.collection("dbo_acm_AccountMovement").findOne({})
  console.log("topup keys:", top ? Object.keys(top) : [])
  console.log("movement keys:", mov ? Object.keys(mov) : [])
  console.log("topup sample:", top)
  console.log("movement sample:", mov)
  await c.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
