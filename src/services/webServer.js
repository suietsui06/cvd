const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const config = require('../config/config');

class WebServer {
  constructor(cvdCalculator) {
    this.app = express();
    this.cvd = cvdCalculator;
    this.server = null;
    this.wss = null;
    this.clients = new Set();

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../public')));
  }

  setupRoutes() {

    // CVD data endpoint
this.app.get('/api/cvd/:timeframe', (req, res) => {
  const { timeframe } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  const aggregate = req.query.aggregate === 'true'; // ✅ NEW

  let candles;
  
  if (aggregate && timeframe !== '1m') {
    // Use aggregation for non-1m timeframes
    candles = this.cvd.getAggregatedCandles(timeframe, limit);
    console.log(`📊 Serving ${candles.length} aggregated ${timeframe} candles`);
  } else {
    // Use stored candles
    candles = this.cvd.getCandles(timeframe, limit);
    console.log(`📊 Serving ${candles.length} stored ${timeframe} candles`);
  }

  res.json({
    timeframe,
    count: candles.length,
    aggregated: aggregate && timeframe !== '1m',
    data: candles.map((c) => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      price: c.close, // for compatibility
      volume: c.volume,
      buyVolume: c.buyVolume,
      sellVolume: c.sellVolume,
      cvd: c.cvdClose,
      cvdOpen: c.cvdOpen,
      cvdClose: c.cvdClose,
      delta: c.cvdDelta,
    })),
    meta: {
      totalTrades: this.cvd.trades.length,
      cvdTotal: this.cvd.cvdTotal,
      hasCurrentCandle: !!this.cvd.currentCandle,
    }
  });
});

// In webServer.js
this.app.get('/api/debug/aggregation/:timeframe', (req, res) => {
  const { timeframe } = req.params;
  
  const candles1m = this.cvd.candles['1m'] || [];
  const candlesStored = this.cvd.candles[timeframe] || [];
  const candlesAggregated = this.cvd.getAggregatedCandles(timeframe, 100);
  
  res.json({
    timeframe,
    base1mCount: candles1m.length,
    storedCount: candlesStored.length,
    aggregatedCount: candlesAggregated.length,
    sample: {
      stored: candlesStored.slice(-3).map(c => ({
        timestamp: c.timestamp,
        price: c.close,
        cvd: c.cvdClose,
        delta: c.cvdDelta
      })),
      aggregated: candlesAggregated.slice(-3).map(c => ({
        timestamp: c.timestamp,
        price: c.close,
        cvd: c.cvdClose,
        delta: c.cvdDelta
      }))
    }
  });
});
  // Debug endpoint
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
  // ✅ NEW: CVD Analysis endpoint
  this.app.get('/api/analysis/:timeframe', (req, res) => {
    const { timeframe } = req.params;
    
    try {
      const analysis = this.cvd.getAnalysis(timeframe);
      
      res.json({
        success: true,
        analysis,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error generating analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        websocketClients: this.clients.size,
      });
    });

    // Current state
    this.app.get('/api/state', (req, res) => {
      res.json(this.cvd.getCurrentState());
    });

    // Debug endpoint
    this.app.get('/api/debug', (req, res) => {
      const state = this.cvd.getCurrentState();
      
      res.json({
        status: 'ok',
        timestamp: new Date(),
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

    // CVD data
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
        meta: {
          totalTrades: this.cvd.trades.length,
          cvdTotal: this.cvd.cvdTotal,
          hasCurrentCandle: !!this.cvd.currentCandle,
        }
      });
    });

    // Trades
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

    this.app.get('/cvd.html', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/cvd.html'));
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        // 1. Create HTTP server
        this.server = http.createServer(this.app);

        // 2. Create WebSocket server
        console.log('🔌 Creating WebSocket server...');
        this.wss = new WebSocket.Server({ 
          server: this.server,
          path: '/',
        });

        // 3. Setup WebSocket handlers
        this.wss.on('connection', (ws, req) => {
          const clientIp = req.socket.remoteAddress;
          console.log(`✅ WebSocket client connected from ${clientIp}`);
          this.clients.add(ws);
          console.log(`   Total clients: ${this.clients.size}`);

          // Send initial state
          try {
            const state = this.cvd.getCurrentState();
            ws.send(JSON.stringify({
              type: 'initialState',
              data: state
            }));
          } catch (error) {
            console.error('Error sending initial state:', error);
          }

          // Keep-alive
          ws.isAlive = true;
          ws.on('pong', () => {
            ws.isAlive = true;
          });

          ws.on('close', () => {
            console.log(`❌ WebSocket client disconnected`);
            this.clients.delete(ws);
            console.log(`   Total clients: ${this.clients.size}`);
          });

          ws.on('error', (error) => {
            console.error('WebSocket client error:', error.message);
            this.clients.delete(ws);
          });
        });

        this.wss.on('error', (error) => {
          console.error('❌ WebSocket server error:', error);
        });

        // 4. Setup heartbeat
        const heartbeat = setInterval(() => {
          this.wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
              return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
          });
        }, 30000);

        this.wss.on('close', () => {
          clearInterval(heartbeat);
        });

        // 5. Listen to CVD events
        this.cvd.on('cvdUpdate', (data) => {
          this.broadcast({
            type: 'cvdUpdate',
            data: {
              cvd: data.cvd,
              delta: data.delta,
              price: data.price,
              timestamp: data.timestamp,
            }
          });
        });

        this.cvd.on('candleClosed', (data) => {
          this.broadcast({
            type: 'candleClosed',
            data: {
              timeframe: data.timeframe,
              candle: {
                timestamp: data.candle.timestamp,
                open: data.candle.open,
                high: data.candle.high,
                low: data.candle.low,
                close: data.candle.close,
                volume: data.candle.volume,
                buyVolume: data.candle.buyVolume,
                sellVolume: data.candle.sellVolume,
                cvdOpen: data.candle.cvdOpen,
                cvdClose: data.candle.cvdClose,
                cvdDelta: data.candle.cvdDelta,
              }
            }
          });
        });

        // 6. Start HTTP server
        this.server.listen(config.app.port, () => {
          console.log('✅ Servers started successfully!');
          console.log(`🌐 HTTP: http://localhost:${config.app.port}`);
          console.log(`🔌 WebSocket: ws://localhost:${config.app.port}`);
          console.log(`📊 Dashboard: http://localhost:${config.app.port}\n`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error('❌ Server error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Failed to start server:', error);
        reject(error);
      }
    });
  }

  broadcast(message) {
    if (this.clients.size === 0) return;

    const messageStr = JSON.stringify(message);
    let sent = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          sent++;
        } catch (error) {
          console.error('Error broadcasting:', error.message);
        }
      }
    });

    if (sent > 0 && message.type === 'candleClosed') {
      console.log(`📡 Broadcasted to ${sent} client(s)`);
    }
  }

  stop() {
    console.log('🛑 Stopping servers...');

    if (this.wss) {
      this.clients.forEach((client) => {
        client.close();
      });
      this.wss.close(() => {
        console.log('✅ WebSocket server stopped');
      });
    }

    if (this.server) {
      this.server.close(() => {
        console.log('✅ HTTP server stopped');
      });
    }
  }
}

module.exports = WebServer;