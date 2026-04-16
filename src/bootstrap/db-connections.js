const mongoose = require("mongoose")

function createDbConnections() {
  const vakolat = mongoose.createConnection(process.env.DB_CURRENT, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  vakolat.on("connected", () => console.log("Connected to vakolat"))

  const yoqlama = mongoose.createConnection(process.env.DB_DISS, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  yoqlama.on("connected", () => console.log("Connected to dissertation"))

  const nazorat = mongoose.createConnection(process.env.DB_NAZORAT, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  nazorat.on("connected", () => console.log("Connected to nazorat"))

  return { vakolat, yoqlama, nazorat }
}

module.exports = {
  createDbConnections,
}
