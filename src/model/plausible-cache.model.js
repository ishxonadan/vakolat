const mongoose = require("mongoose")

const plausibleCacheSchema = new mongoose.Schema({
  siteId: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  metrics: {
    visitCount: { type: Number, default: 0 },
    pageVisits: { type: Number, default: 0 },
    interactiveServiceUsage: { type: Number, default: 0 },
    personalAccountCount: { type: Number, default: 0 },
    electronicResourceCount: { type: Number, default: 0 },
    newsViewCount: { type: Number, default: 0 },
    electronicResourceUsage: { type: Number, default: 0 },
    error: { type: String }, // Store any API errors
  },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
})

// Create compound index for efficient queries
plausibleCacheSchema.index({ siteId: 1, month: 1, year: 1 }, { unique: true })

module.exports = {
  plausibleCacheSchema,
}
