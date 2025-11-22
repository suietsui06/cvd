require('dotenv').config();

module.exports = {
  // Application
  app: {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
  },

  // Features toggle
  features: {
    mongodb: false,        // ❌ DISABLED
    discord: false,        // ❌ DISABLED
    signalDetector: false, // ❌ DISABLED (needs MongoDB)
  },

  // Binance WebSocket
  binance: {
    wsUrl: process.env.BINANCE_WS_URL || 'wss://fstream.binance.com/ws',
    symbol: (process.env.TRADING_SYMBOL || 'btcusdt').toLowerCase(),
    streamType: process.env.STREAM_TYPE || 'aggTrade',
  },

  // CVD Settings
  cvd: {
    historyMax: parseInt(process.env.CVD_HISTORY_MAX) || 1000,
    divergenceLookback: parseInt(process.env.DIVERGENCE_LOOKBACK) || 20,
    volumeSpikeThreshold: parseFloat(process.env.VOLUME_SPIKE_THRESHOLD) || 3.0,
    trendPeriod: parseInt(process.env.CVD_TREND_PERIOD) || 10,
  },

  // Chart Settings
  chart: {
    updateInterval: parseInt(process.env.CHART_UPDATE_INTERVAL) || 5000,
    dataPoints: parseInt(process.env.CHART_DATA_POINTS) || 100,
  },
};