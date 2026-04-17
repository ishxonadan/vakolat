const ALL_PERMISSIONS = [
  { name: "view_dissertations", description: "Dissertatsiyalar ro'yxatini ko'rish" },
  { name: "add_dissertation", description: "Yangi dissertatsiya qo'shish" },
  { name: "edit_dissertation", description: "Dissertatsiyani tahrirlash" },
  { name: "delete_dissertation", description: "Dissertatsiyani yashirish / o'chirish" },
  { name: "download_dissertation", description: "Dissertatsiya to'liq matnini yuklab olish" },
  { name: "manage_diss_languages", description: "Tillarni boshqarish (qo'shish, tahrirlash, o'chirish)" },
  { name: "manage_diss_levels", description: "Akademik darajalarni boshqarish" },
  { name: "manage_diss_fields", description: "Soha kodlarini boshqarish" },
  { name: "manage_diss_categories", description: "Kategoriyalarni (razdel) boshqarish" },
  { name: "manage_ip_access", description: "To'liq matnga IP ruxsatlarni boshqarish" },
  { name: "view_statistics", description: "Statistika va tashriflarni ko'rish" },
  { name: "view_members", description: "A'zo bo'lganlar ro'yxatini ko'rish" },
  { name: "manage_users", description: "Foydalanuvchilar (xodimlar) boshqaruvi" },
  { name: "view_tickets", description: "Bir martalik chiptalar ro'yxatini ko'rish" },
  { name: "create_tickets", description: "Bir martalik chiptalar yaratish" },
  { name: "payment_topup_user", description: "Foydalanuvchi balansini qo'lda to'ldirish" },
  { name: "payment_withdraw_user", description: "Foydalanuvchi balansidan qo'lda mablag' yechish" },
  { name: "payment_list_accounts", description: "Foydalanuvchi balanslari ro'yxati va qidiruv" },
  { name: "payment_read_account", description: "Bitta foydalanuvchi balansini ko'rish (ID bo'yicha)" },
  { name: "payment_view_transactions", description: "Pullik to'lovlar tarixi (tranzaksiyalar)" },
  { name: "payment_view_payment_statistics", description: "Pullik xizmatlar statistikasi sahifasini ko'rish" },
  { name: "payment_view_overview_stats", description: "Pullik umumiy statistikasi (jami balanslar, xarajatlar)" },
  { name: "payment_manage_services", description: "Pullik xizmatlar ro'yxatini boshqarish (CRUD)" },
  { name: "payment_manage_departments", description: "Zallarni boshqarish (CRUD)" },
  { name: "payment_manage_user_departments", description: "Xodim-zal biriktirishlari (legacy API)" },
  { name: "payment_provide_service", description: "Pullik xizmat ko'rsatish (balansdan yechish)" },
  { name: "payment_cancel_provided_service", description: "Ko'rsatilgan pullik xizmatni bekor qilish (refund)" },
  { name: "system_manage", description: "Tizim boshqaruvi (umumiy sozlamalar)" },
  { name: "manage_permissions", description: "Huquqlar va huquq guruhlarini boshqarish" },
]

async function seedPermissionsAndGroups({ Permission, PermissionGroup }) {
  for (const perm of ALL_PERMISSIONS) {
    const exists = await Permission.findOne({ name: perm.name })
    if (!exists) {
      await Permission.create({ ...perm, isActive: true })
      console.log("Seeded permission:", perm.name)
    }
  }

  const allPerms = await Permission.find({ isActive: true }).lean()
  const permMap = {}
  for (const p of allPerms) permMap[p.name] = p._id

  const ids = (names) => names.filter((n) => permMap[n]).map((n) => permMap[n])

  const defaultGroups = [
    {
      name: "Admin",
      description: "Barcha huquqlarga ega administrator",
      permissions: ids(ALL_PERMISSIONS.map((p) => p.name)),
    },
    {
      name: "Dissertatsiya mutaxassisi",
      description: "Dissertatsiyalarni ko'rish, qo'shish va tahrirlash",
      permissions: ids(["view_dissertations", "add_dissertation", "edit_dissertation", "download_dissertation", "view_statistics"]),
    },
    {
      name: "Kuzatuvchi",
      description: "Faqat ko'rish huquqlari",
      permissions: ids(["view_dissertations", "view_statistics", "view_members"]),
    },
  ]

  for (const group of defaultGroups) {
    const exists = await PermissionGroup.findOne({ name: group.name })
    if (!exists) {
      await PermissionGroup.create({ ...group, isActive: true })
      console.log("Seeded permission group:", group.name)
    }
  }
}

module.exports = {
  ALL_PERMISSIONS,
  seedPermissionsAndGroups,
}
