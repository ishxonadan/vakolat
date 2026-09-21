const DEFAULT_MEMBER_COMPANIES = require("../data/uznel-companies.json")

async function ensureMemberCompaniesSeed({ MemberCompany }) {
  const rows = Array.isArray(DEFAULT_MEMBER_COMPANIES) ? DEFAULT_MEMBER_COMPANIES : []
  const ops = rows.map((row, index) => ({
    updateOne: {
      filter: { code: String(row.code) },
      update: {
        $setOnInsert: {
          code: String(row.code),
          name: String(row.name || row.code),
          isActive: true,
          sortOrder: index + 1,
        },
      },
      upsert: true,
    },
  }))
  if (!ops.length) return
  const result = await MemberCompany.bulkWrite(ops)
  const upserted = result.upsertedCount || 0
  if (upserted) {
    console.log("[seed] MemberCompany: inserted", upserted, "defaults")
  }
}

module.exports = { ensureMemberCompaniesSeed }
