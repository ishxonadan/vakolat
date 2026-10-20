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
          kafedra: row.kafedra ?? 3,
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

  const backfillOps = DEFAULT_MEMBER_CATEGORIES.map((row) => ({
    updateOne: {
      filter: {
        code: row.code,
        $or: [{ kafedra: { $exists: false } }, { kafedra: null }],
      },
      update: { $set: { kafedra: row.kafedra ?? 3 } },
    },
  }))
  const backfill = await MemberCategory.bulkWrite(backfillOps)
  const backfilled = backfill.modifiedCount || 0
  if (backfilled) {
    console.log("[seed] MemberCategory: backfilled kafedra on", backfilled, "rows")
  }

  const otherMissing = await MemberCategory.updateMany(
    { $or: [{ kafedra: { $exists: false } }, { kafedra: null }] },
    { $set: { kafedra: 3 } },
  )
  if (otherMissing.modifiedCount) {
    console.log("[seed] MemberCategory: set default kafedra on", otherMissing.modifiedCount, "custom rows")
  }
}

module.exports = { ensureMemberCategoriesSeed }
