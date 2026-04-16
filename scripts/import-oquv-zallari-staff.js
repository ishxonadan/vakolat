require("dotenv").config()
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const DB_URI = process.env.DB_CURRENT

if (!DB_URI) {
  console.error("DB_CURRENT env topilmadi")
  process.exit(1)
}

const staffRows = [
  { fullName: "Abdukadirova Shoira", position: "Bosh mutaxassis" },
  { fullName: "Normuratova Feruza", position: "Bosh mutaxassis" },
  { fullName: "Saidova Shahnoza", position: "Bosh mutaxassis" },
  { fullName: "Akamova Iltifot", position: "Yetakchi mutaxassis" },
  { fullName: "Uktamova Shahlo", position: "Yetakchi mutaxassis" },
  { fullName: "Isayeva Shohista", position: "Yetakchi mutaxassis" },
  { fullName: "Qosimova Noila", position: "Yetakchi mutaxassis" },
  { fullName: "Raimberdiyeva Durdona", position: "Yetakchi mutaxassis" },
  { fullName: "Sattarova Nigor", position: "Yetakchi mutaxassis" },
  { fullName: "Faxriddinova Rahima", position: "Yetakchi mutaxassis" },
  { fullName: "Fayzullayeva Hilola", position: "I-toifali mutaxassis" },
  { fullName: "Xalilova Gulru", position: "I-toifali mutaxassis" },
  { fullName: "Bahodirova Mushtariy", position: "I-toifali mutaxassis" },
  { fullName: "Saidirasulova Munisa", position: "I-toifali mutaxassis" },
  { fullName: "Rasulova Nigora", position: "II-toifali mutaxassis" },
  { fullName: "Arziyeva Iroda", position: "II-toifali mutaxassis" },
  { fullName: "Bafoyeva Zikrullo", position: "II-toifali mutaxassis" },
  { fullName: "Raximova Sarvinoz", position: "II-toifali mutaxassis" },
]

const cleanName = (v) =>
  String(v || "")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim()

const normalizeForMatch = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[ʻ’'`´-]/g, "")
    .replace(/\s+/g, "")
    .trim()

const sanitizeLoginPart = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[ʻ’'`´]/g, "")
    .replace(/[^a-z0-9]/g, "")

const splitFullName = (fullName) => {
  const cleaned = cleanName(fullName)
  const parts = cleaned.split(" ").filter(Boolean)
  if (parts.length < 2) {
    return { firstname: cleaned, lastname: "" }
  }
  const lastname = parts[0]
  const firstname = parts.slice(1).join(" ")
  return { firstname, lastname }
}

async function run() {
  const conn = await mongoose.createConnection(DB_URI).asPromise()
  try {
    const User = conn.model(
      "User",
      new mongoose.Schema(
        {
          nickname: { type: String, required: true, unique: true },
          password: { type: String, required: true },
          firstname: { type: String, required: true },
          lastname: { type: String, required: true },
          position: { type: String, default: "" },
          level: { type: String, required: true, default: "expert" },
          language: { type: String, required: true, default: "uz" },
          permissionGroup: { type: mongoose.Schema.Types.ObjectId, ref: "PermissionGroup", default: null },
          permissionGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "PermissionGroup" }],
          staffDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "StaffDepartment", default: null },
          staffPosition: { type: mongoose.Schema.Types.ObjectId, ref: "StaffPosition", default: null },
          isActive: { type: Boolean, default: true },
        },
        { collection: "users", timestamps: true },
      ),
    )
    const StaffDepartment = conn.model(
      "StaffDepartment",
      new mongoose.Schema({ name: String, isActive: Boolean }, { collection: "staffdepartments" }),
    )
    const StaffPosition = conn.model(
      "StaffPosition",
      new mongoose.Schema({ name: String, isActive: Boolean, sortOrder: Number }, { collection: "staffpositions" }),
    )
    const PermissionGroup = conn.model(
      "PermissionGroup",
      new mongoose.Schema({ name: String, isActive: Boolean }, { collection: "permissiongroups" }),
    )

    const dept = await StaffDepartment.findOne().lean()
    const allDepts = await StaffDepartment.find().lean()
    const targetDept = allDepts.find((d) => normalizeForMatch(d.name) === normalizeForMatch("O'quv zallari"))
    if (!targetDept) {
      console.error("Bo'lim topilmadi: O'quv zallari")
      process.exit(1)
    }
    void dept

    const allGroups = await PermissionGroup.find().lean()
    const targetGroup = allGroups.find(
      (g) =>
        normalizeForMatch(g.name) === normalizeForMatch("O'quv zallari") ||
        normalizeForMatch(g.name) === normalizeForMatch("Zallar"),
    )
    if (!targetGroup) {
      console.error("Huquq guruhi topilmadi: O'quv zallari")
      process.exit(1)
    }

    const positions = await StaffPosition.find().lean()
    const posByNorm = new Map()
    for (const p of positions) {
      posByNorm.set(normalizeForMatch(p.name), p)
    }

    const targetPositionMap = new Map()
    for (const row of staffRows) {
      const pos = posByNorm.get(normalizeForMatch(row.position))
      if (!pos) {
        console.error(`Lavozim topilmadi: ${row.position}`)
        process.exit(1)
      }
      targetPositionMap.set(row.position, pos)
    }

    const existingNicknames = new Set(
      (await User.find({}, "nickname").lean()).map((u) => String(u.nickname || "").toLowerCase()),
    )
    const hashedPassword = await bcrypt.hash("simsim", 10)

    let created = 0
    let skipped = 0
    const createdRows = []
    const skippedRows = []

    for (const row of staffRows) {
      const { firstname, lastname } = splitFullName(row.fullName)
      const existsByName = await User.findOne({ level: "expert", firstname, lastname }).lean()
      if (existsByName) {
        skipped++
        skippedRows.push(`${firstname} ${lastname} (already exists by name)`)
        continue
      }

      const baseLogin = `${sanitizeLoginPart(firstname)}.${sanitizeLoginPart(lastname)}`.replace(/^\.+|\.+$/g, "")
      let login = baseLogin || `${sanitizeLoginPart(firstname)}${sanitizeLoginPart(lastname)}`
      if (!login) {
        skipped++
        skippedRows.push(`${row.fullName} (invalid login)`)
        continue
      }
      let counter = 1
      while (existingNicknames.has(login.toLowerCase())) {
        counter += 1
        login = `${baseLogin}${counter}`
      }

      const posDoc = targetPositionMap.get(row.position)
      await User.create({
        nickname: login,
        password: hashedPassword,
        firstname,
        lastname,
        position: posDoc.name,
        level: "expert",
        language: "uz",
        permissionGroups: [targetGroup._id],
        permissionGroup: targetGroup._id,
        staffDepartment: targetDept._id,
        staffPosition: posDoc._id,
        isActive: true,
      })
      existingNicknames.add(login.toLowerCase())
      created++
      createdRows.push(`${firstname} ${lastname} -> ${login}`)
    }

    console.log("=== IMPORT RESULT ===")
    console.log("Created:", created)
    console.log("Skipped:", skipped)
    if (createdRows.length) {
      console.log("Created users:")
      createdRows.forEach((line) => console.log(" -", line))
    }
    if (skippedRows.length) {
      console.log("Skipped users:")
      skippedRows.forEach((line) => console.log(" -", line))
    }
  } finally {
    await conn.close()
  }
}

run().catch((e) => {
  console.error("Import failed:", e)
  process.exit(1)
})
