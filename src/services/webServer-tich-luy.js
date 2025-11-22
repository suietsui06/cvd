const express = require('express');
const path = require('path');
const config = require('../config/config');

class WebServer {
  constructor(cvdCalculator) {
    this.app = express();
    this.cvd = cvdCalculator;
    this.server = null;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../public')));
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        features: config.features,
      });
    });

    // Current state
    this.app.get('/api/state', (req, res) => {
      res.json(this.cvd.getCurrentState());
    });

    // CVD data for chart
    this.app.get('/api/cvd/:timeframe', (req, res) => {
      const { timeframe } = req.params;
      const limit = parseInt(req.query.limit) || 100;

      const candles = this.cvd.getCandles(timeframe, limit);

      res.json({
        timeframe,
        count: candles.length,
        data: candles.map((c) => ({
          timestamp: c.timestamp,
          price: c.close,
          cvd: c.cvdClose,
          delta: c.cvdDelta,
          volume: c.volume,
          buyVolume: c.buyVolume,
          sellVolume: c.sellVolume,
        })),
      });
    });

    // Trades (recent)
    this.app.get('/api/trades', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const trades = this.cvd.trades.slice(-limit);

      res.json({
        count: trades.length,
        trades,
      });
    });

    // Homepage
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    

      this.app.get('/api/debug', (req, res) => {

    const state = this.cvd.getCurrentState();
       res.json({
      status: 'ok',
      cvd: {
        total: state.cvdTotal,
        tradesCount: state.tradesCount,
      },
      candles: {
        '1m': this.cvd.candles['1m']?.length || 0,
        '5m': this.cvd.candles['5m']?.length || 0,
        '15m': this.cvd.candles['15m']?.length || 0,
        '1h': this.cvd.candles['1h']?.length || 0,
      },
      currentCandle: state.currentCandle ? {
        timestamp: state.currentCandle.timestamp,
        price: state.currentCandle.close,
        volume: state.currentCandle.volume,
      } : null,
    });

      });
  }

  start() {
    this.server = this.app.listen(config.app.port, () => {
      console.log(`🌐 Web server running on http://localhost:${config.app.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('🌐 Web server stopped');
      });
    }
  }
}

module.exports = WebServer;