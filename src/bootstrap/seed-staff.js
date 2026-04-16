const { DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME } = require("../../routes/staff-departments.constants")

async function ensureDefaultStaffDepartment({ StaffDepartment }) {
  await StaffDepartment.updateOne(
    { name: DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME },
    { $setOnInsert: { name: DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME, isActive: true } },
    { upsert: true },
  )
}

async function ensureStaffPositionsSeed({ StaffPosition }) {
  const DEFAULTS = [
    "Rahbariyat",
    "Xizmat rahbari",
    "Bosh mutaxassis",
    "Yetakchi Mutaxassis",
    "I-toifali mutaxassis",
    "II-toifali mutaxassis",
  ]
  const count = await StaffPosition.countDocuments()
  if (count > 0) {
    return
  }
  await StaffPosition.insertMany(DEFAULTS.map((name, i) => ({ name, isActive: true, sortOrder: i + 1 })))
  console.log("[seed] StaffPosition: inserted", DEFAULTS.length, "defaults")
}

async function migrateStaffPositionSortOrderToOneBased({ StaffPosition }) {
  const hasZero = await StaffPosition.exists({ sortOrder: 0 })
  if (!hasZero) {
    return
  }
  const rows = await StaffPosition.find({}).sort({ sortOrder: 1, name: 1 }).select("_id").lean()
  if (!rows.length) {
    return
  }
  const ops = rows.map((r, i) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: { sortOrder: i + 1 } },
    },
  }))
  await StaffPosition.bulkWrite(ops)
  console.log("[migrate] StaffPosition sortOrder: 0-based -> 1-based,", rows.length, "rows")
}

module.exports = {
  ensureDefaultStaffDepartment,
  ensureStaffPositionsSeed,
  migrateStaffPositionSortOrderToOneBased,
}
