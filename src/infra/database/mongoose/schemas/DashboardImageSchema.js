const mongoose = require('mongoose');

const DashboardImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DashboardImage', DashboardImageSchema);
