const mongoose = require('mongoose');

const systemStatusSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  status: {
    websocket: {
      connected: Boolean,
      lastTradeTime: Date,
      tradesCount: Number,
    },
    database: {
      connected: Boolean,
      lastWriteTime: Date,
    },
    discord: {
      connected: Boolean,
      lastAlertTime: Date,
      alertsSent: Number,
    },
  },
  performance: {
    memoryUsage: Number,
    cpuUsage: Number,
    uptime: Number,
  },
}, {
  timestamps: true,
  collection: 'system_status',
});

// TTL index - keep only 7 days
systemStatusSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('SystemStatus', systemStatusSchema);