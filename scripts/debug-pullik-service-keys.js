require("dotenv").config()
const mongoose = require("mongoose")

async function run() {
  const uri = process.env.DB_PULLIK || "mongodb://localhost/pullik"
  const conn = await mongoose.createConnection(uri).asPromise()
  const sample = await conn.collection("dbo_ent_Service").findOne({})
  console.log("service keys:", Object.keys(sample || {}))
  console.log("service sample:", sample)
  await conn.close()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
