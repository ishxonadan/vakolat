const mongoose = require("mongoose")

const surveyVoteSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  responses: {
    usability: { type: Number, min: 1, max: 5, required: true },
    design: { type: Number, min: 1, max: 5, required: true },
    search: { type: Number, min: 1, max: 5, required: true },
  },
  timestamp: { type: Date, default: Date.now },
  fingerprint: { type: String, required: true }, // Browser fingerprint for rate limiting
  ipAddress: { type: String }, // Keep for analytics but don't use for rate limiting
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
})

// Add indexes for better query performance
surveyVoteSchema.index({ domain: 1, createdAt: -1 })
surveyVoteSchema.index({ fingerprint: 1, domain: 1, createdAt: -1 }) // For anti-cheat queries
surveyVoteSchema.index({ fingerprint: 1, createdAt: -1 }) // For daily limits

module.exports = {
  surveyVoteSchema,
}