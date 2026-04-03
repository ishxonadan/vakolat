/** Uzbek labels for PaymentTransaction enums (API values unchanged). */
const TX_TYPE_LABELS = {
  top_up: "To'ldirish",
  spend: "Harajat",
  adjustment: "Sozlash",
  migration: "Migratsiya",
}

const TX_DIRECTION_LABELS = {
  in: "Kirim",
  out: "Chiqim",
}

export function paymentTransactionTypeLabel(type) {
  const key = String(type || "").trim()
  if (!key) return "-"
  return TX_TYPE_LABELS[key] || key
}

export function paymentTransactionDirectionLabel(direction) {
  const key = String(direction || "").trim()
  if (!key) return "-"
  return TX_DIRECTION_LABELS[key] || key
}
