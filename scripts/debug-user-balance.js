require("dotenv").config()
const mongoose = require("mongoose")

async function run() {
  const userNo = String(process.argv[2] || "").trim()
  if (!userNo) {
    throw new Error("Usage: node scripts/debug-user-balance.js AAA#########")
  }
  if (!process.env.DB_CURRENT) {
    throw new Error("DB_CURRENT is not configured")
  }

  const conn = await mongoose.createConnection(process.env.DB_CURRENT).asPromise()
  const tx = conn.collection("paymenttransactions")
  const acc = conn.collection("paymentaccounts")

  const [account, aggregateRows, byType, bySource, count] = await Promise.all([
    acc.findOne({ userNo }),
    tx
      .aggregate([
        { $match: { userNo } },
        {
          $group: {
            _id: null,
            totalIn: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$amount", 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$amount", 0] } },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    tx
      .aggregate([
        { $match: { userNo } },
        { $group: { _id: "$type", sum: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    tx
      .aggregate([
        { $match: { userNo } },
        {
          $group: {
            _id: "$source",
            totalIn: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$amount", 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$amount", 0] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    tx.countDocuments({ userNo }),
  ])

  const aggregate = aggregateRows[0] || { totalIn: 0, totalOut: 0, count: 0 }
  const computedBalance = Number(aggregate.totalIn || 0) - Number(aggregate.totalOut || 0)

  console.log(
    JSON.stringify(
      {
        userNo,
        accountBalance: account ? Number(account.balance || 0) : null,
        computedBalance,
        totalIn: Number(aggregate.totalIn || 0),
        totalOut: Number(aggregate.totalOut || 0),
        txCount: count,
        byType,
        bySource,
      },
      null,
      2,
    ),
  )

  await conn.close()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
