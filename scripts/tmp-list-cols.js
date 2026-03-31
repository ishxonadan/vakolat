require("dotenv").config();
const mongoose = require("mongoose");
(async () => {
  const conn = await mongoose.createConnection(process.env.DB_PULLIK || "mongodb://localhost/pullik").asPromise();
  const names = (await conn.db.listCollections().toArray()).map((c)=>c.name);
  console.log(names.filter((n)=>/service|xizmat|tarif|price|sum|cost|dbo_/i.test(n)).sort());
  await conn.close();
})().catch((e)=>{console.error(e); process.exit(1);});
