const mongoose = require('mongoose');

const candleSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true,
  },
  timeframe: {
    type: String,
    required: true,
    enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  buyVolume: Number,
  sellVolume: Number,
  cvdOpen: Number,
  cvdClose: Number,
  cvdDelta: Number,
}, {
  timestamps: true,
  collection: 'candles',
});

// Compound unique index
candleSchema.index({ symbol: 1, timeframe: 1, timestamp: 1 }, { unique: true });

// TTL index
candleSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Candle', candleSchema);