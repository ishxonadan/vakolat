const mongoose = require('mongoose');

const userRatingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Websites', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  metrics: {
    websiteUsability: { type: Number, default: 0 }, // M1
    websiteDesign: { type: Number, default: 0 },    // M2
    searchUsability: { type: Number, default: 0 },   // M3
  },
  totalScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = {
  userRatingSchema
};
