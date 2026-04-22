const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, trim: true, default: '' },
    title:       { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    severity:    { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
    services:    [{ type: String }],
    photo:       { type: String, default: '' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['PENDING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'],
      default: 'PENDING',
    },
    // AI Tracking fields
    lastAIUpdate: { type: Date, default: null },
    manualUpdate: { type: Boolean, default: false },
    timestamp:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);