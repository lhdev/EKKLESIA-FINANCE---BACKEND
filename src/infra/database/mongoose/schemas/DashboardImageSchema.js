const mongoose = require('mongoose');

const DashboardImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storageId: { type: String, trim: true },
    resourceType: { type: String, trim: true, default: 'image' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DashboardImage', DashboardImageSchema);
