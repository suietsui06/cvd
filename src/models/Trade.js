const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true,
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
  quantity: {
    type: Number,
    required: true,
  },
  delta: {
    type: Number,
    required: true,
  },
  cvd: {
    type: Number,
    required: true,
  },
  isSell: {
    type: Boolean,
    required: true,
  },
  tradeId: {
    type: String,
    unique: true,
  },
}, {
  timestamps: true,
  collection: 'trades',
});

// Indexes
tradeSchema.index({ symbol: 1, timestamp: -1 });
tradeSchema.index({ timestamp: -1 });

// TTL index - auto delete after 30 days
tradeSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Trade', tradeSchema);