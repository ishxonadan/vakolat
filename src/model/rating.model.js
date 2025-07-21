const mongoose = require("mongoose")

// Schema for storing which websites are assigned to users for rating
const ratingAssignmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  websiteIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Websites",
    },
  ],
  month: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
})

// Schema for storing the actual ratings
const websiteRatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Websites",
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  // Store ratings for each category
  ratings: {
    content: [Boolean],
    reliability: [Boolean],
    usability: [Boolean],
    search: [Boolean],
    documents: [Boolean],
    news: [Boolean],
    language: [Boolean],
    onlineBooks: [Boolean],
    regionalInfo: [Boolean],
    events: [Boolean],
    design: [Boolean],
    interactive: [Boolean],
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  comments: {
    type: String,
  },
  ratedAt: {
    type: Date,
    default: Date.now,
  },
})

// Create indexes for efficient queries
ratingAssignmentSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true })
websiteRatingSchema.index({ userId: 1, websiteId: 1, month: 1, year: 1 }, { unique: true })

// Export schemas instead of models
module.exports = {
  ratingAssignmentSchema,
  websiteRatingSchema,
}

