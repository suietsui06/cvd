const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'BULLISH_DIVERGENCE',
      'BEARISH_DIVERGENCE',
      'VOLUME_SPIKE',
      'TREND_CHANGE',
      'STRONG_MOMENTUM',
      'BUY_SELL_IMBALANCE',
    ],
    required: true,
  },
  direction: {
    type: String,
    enum: ['LONG', 'SHORT'],
    required: true,
  },
  confidence: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    required: true,
    index: true,
  },
  timeframe: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  price: {
    type: Number,
    required: true,
  },
  cvd: {
    type: Number,
    required: true,
  },
  strength: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },

  // Tracking
  alerted: {
    type: Boolean,
    default: false,
  },
  alertedAt: {
    type: Date,
  },

  // Outcome tracking
  outcome: {
    entered: { type: Boolean, default: false },
    entryPrice: { type: Number },
    exitPrice: { type: Number },
    pnlPercent: { type: Number },
    holdingPeriod: { type: Number }, // minutes
    result: { type: String, enum: ['WIN', 'LOSS', 'PENDING'] },
  },
}, {
  timestamps: true,
  collection: 'signals',
});

// Indexes
signalSchema.index({ symbol: 1, timestamp: -1 });
signalSchema.index({ type: 1, confidence: 1 });
signalSchema.index({ timestamp: -1 });

// TTL index
signalSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Signal', signalSchema);