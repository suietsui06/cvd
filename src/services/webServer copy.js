/*
const express = require('express');
const path = require('path');
const config = require('../config/config');

class WebServer {
  constructor(cvdCalculator, signalDetector) {
    this.app = express();
    this.cvd = cvdCalculator;
    this.signals = signalDetector;
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
        })),
      });
    });

    // Recent signals
    this.app.get('/api/signals', (req, res) => {
      const minutes = parseInt(req.query.minutes) || 60;
      const confidence = req.query.confidence || 'MEDIUM';

      const signals = this.signals
        ? this.signals.getRecentSignals(minutes, confidence)
        : [];

      res.json({
        count: signals.length,
        signals,
      });
    });

    // Homepage
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
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