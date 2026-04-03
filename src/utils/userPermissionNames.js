const mongoose = require("mongoose")

/**
 * Barcha biriktirilgan huquq guruhi(lar)idan faol huquq nomlarining birlashmasi (takrorlarsiz).
 * Bir nechta guruhda bir xil huquq bo‘lsa — bitta marta hisoblanadi; tekshiruvda xatolik bermaydi.
 *
 * @param {object|null} user - populate qilingan user (permissionGroups[], permissionGroup)
 * @returns {string[]}
 */
function collectPermissionNamesFromPopulatedUser(user) {
  if (!user) {
    return []
  }
  const names = []

  const addGroup = (g) => {
    if (!g) {
      return
    }
    const perms = g.permissions
    if (!Array.isArray(perms)) {
      return
    }
    for (const p of perms) {
      if (p && p.isActive !== false && p.name) {
        names.push(p.name)
      }
    }
  }

  if (Array.isArray(user.permissionGroups)) {
    for (const g of user.permissionGroups) {
      addGroup(g)
    }
  }
  addGroup(user.permissionGroup)

  return [...new Set(names)]
}

/**
 * @param {unknown} input - massiv yoki bitta id
 * @returns {mongoose.Types.ObjectId[]} takrorlanmas
 */
function normalizePermissionGroupIds(input) {
  const raw = Array.isArray(input) ? input : input != null && input !== "" ? [input] : []
  const out = []
  for (const x of raw) {
    const s = String(x).trim()
    if (mongoose.Types.ObjectId.isValid(s)) {
      out.push(new mongoose.Types.ObjectId(s))
    }
  }
  const seen = new Set()
  const deduped = []
  for (const o of out) {
    const k = String(o)
    if (!seen.has(k)) {
      seen.add(k)
      deduped.push(o)
    }
  }
  return deduped
}

/**
 * API javobida: permissionGroups bo‘sh bo‘lsa, eski permissionGroup ni ko‘rsatish.
 * @param {object} expert - lean
 */
function mergeLegacyPermissionGroups(expert) {
  if (!expert || typeof expert !== "object") {
    return
  }
  const has =
    Array.isArray(expert.permissionGroups) &&
    expert.permissionGroups.length > 0
  if (!has && expert.permissionGroup) {
    expert.permissionGroups = [expert.permissionGroup]
  }
}

module.exports = {
  collectPermissionNamesFromPopulatedUser,
  normalizePermissionGroupIds,
  mergeLegacyPermissionGroups,
}
