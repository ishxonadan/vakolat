const { DEFAULT_MEMBER_CATEGORIES } = require("../data/member-categories.defaults")

async function ensureMemberCategoriesSeed({ MemberCategory }) {
  const ops = DEFAULT_MEMBER_CATEGORIES.map((row, index) => ({
    updateOne: {
      filter: { code: row.code },
      update: {
        $setOnInsert: {
          code: row.code,
          name: row.name,
          isActive: true,
          sortOrder: index + 1,
        },
      },
      upsert: true,
    },
  }))
  if (!ops.length) return
  const result = await MemberCategory.bulkWrite(ops)
  const upserted = result.upsertedCount || 0
  if (upserted) {
    console.log("[seed] MemberCategory: inserted", upserted, "defaults")
  }
}

module.exports = { ensureMemberCategoriesSeed }
