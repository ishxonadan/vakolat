const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  level: { type: String },
  action: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: String },
  meta: { type: Object },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
})

module.exports = {
  auditLogSchema,
}

