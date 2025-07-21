const mongoose = require("mongoose")

const libraryLocationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Websites", required: true },
  locationCode: { type: String, required: true }, // e.g., "R0050000"
  locationName: { type: String, required: true }, // e.g., "Toshkent shahar kutubxonasi"
  region: { type: String, required: true }, // e.g., "toshkent", "samarqand"
  apiEndpoint: { type: String, required: true }, // Full API URL
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Create compound index for efficient queries
libraryLocationSchema.index({ organizationId: 1 }, { unique: true })

module.exports = {
  libraryLocationSchema,
}
