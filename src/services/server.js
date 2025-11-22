// ============================================
// CVD TRADING MONITOR - WebSocket Server
// Real-time Trade Stream Support
// ============================================

const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const http = require('http');
const CVDCalculator = require('./CVDCalculator');

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3000;
const SYMBOL = 'BTCUSDT';

// ============================================
// INITIALIZATION
// ============================================

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server });

// CVD Calculator instance
const cvd = new CVDCalculator();

// ============================================
// EXPRESS ROUTES
// ============================================

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Routes
app.get('/api/state', (req, res) => {
  const state = cvd.getCurrentState();
  res.json(state);
});

app.get('/api/cvd/:timeframe', (req, res) => {
  const { timeframe } = req.params;
  const { limit = 100, aggregate = false } = req.query;
  
  const candles = cvd.getCandles(timeframe, parseInt(limit), aggregate === 'true');
  
  res.json({
    timeframe,
    count: candles.length,
    aggregated: aggregate === 'true',
    data: candles
  });
});

app.get('/api/analysis/:timeframe', (req, res) => {
  const { timeframe } = req.params;
  const analysis = cvd.getAnalysis(timeframe);
  
  res.json({
    success: true,
    analysis
  });
});

// ============================================
// WEBSOCKET CONNECTION HANDLING
// ============================================

wsServer.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`✅ Client connected: ${clientId}`);
  
  // Send initial state
  const initialState = cvd.getCurrentState();
  ws.send(JSON.stringify({
    type: 'initialState',
    data: initialState
  }));
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`🔌 Client disconnected: ${clientId}`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error [${clientId}]:`, error.message);
  });
});

// ============================================
// CVD CALCULATOR EVENT HANDLERS
// ============================================

// ✅ NEW: Handle trade ticks (every trade)
cvd.on('tradeTick', (data) => {
  // Broadcast to all connected clients
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'tradeTick',
        data: data
      }));
    }
  });
  
  // Log every 100 trades to avoid console spam
  if (cvd.trades.length % 100 === 0) {
    console.log(`📤 Broadcast tradeTick: CVD=${data.cvd.toFixed(0)}, Price=$${data.price.toFixed(2)}`);
  }
});

// Handle CVD updates
cvd.on('cvdUpdate', (data) => {
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'cvdUpdate',
        data: data
      }));
    }
  });
});

// Handle candle closed
cvd.on('candleClosed', (data) => {
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'candleClosed',
        data: data
      }));
    }
  });
});

// ============================================
// BINANCE WEBSOCKET CONNECTION
// ============================================

const BinanceWebSocket = require('ws');

function connectBinanceWebSocket() {
  const wsUrl = `wss://stream.binance.com:9443/ws/${SYMBOL.toLowerCase()}@aggTrade`;
  
  console.log(`🔌 Connecting to Binance WebSocket: ${wsUrl}`);
  
  const binanceWs = new BinanceWebSocket(wsUrl);
  
  binanceWs.on('open', () => {
    console.log('✅ Binance WebSocket connected');
  });
  
  binanceWs.on('message', async (data) => {
    try {
      const trade = JSON.parse(data);
      
      // Convert Binance aggTrade to our format
      const tradeData = {
        id: trade.a,
        price: parseFloat(trade.p),
        quantity: parseFloat(trade.q),
        isSell: trade.m,  // true = buyer is maker (sell from buyer's perspective)
        timestamp: trade.T
      };
      
      // Process trade through CVD calculator
      await cvd.processTrade(tradeData);
      
    } catch (error) {
      console.error('❌ Error processing Binance trade:', error.message);
    }
  });
  
  binanceWs.on('error', (error) => {
    console.error('❌ Binance WebSocket error:', error.message);
  });
  
  binanceWs.on('close', () => {
    console.log('🔌 Binance WebSocket closed. Reconnecting in 5 seconds...');
    setTimeout(connectBinanceWebSocket, 5000);
  });
  
  return binanceWs;
}

// ============================================
// SERVER STARTUP
// ============================================

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 CVD Trading Monitor - WebSocket Server');
  console.log('='.repeat(80));
  console.log(`📡 WebSocket Server: ws://localhost:${PORT}`);
  console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
  console.log(`📈 Symbol: ${SYMBOL}`);
  console.log('='.repeat(80) + '\n');
  
  // Connect to Binance
  connectBinanceWebSocket();
  
  // Status printer every 30 seconds
  setInterval(() => {
    const state = cvd.getCurrentState();
    const wsClients = wsServer.clients.size;
    
    console.log('\n' + '='.repeat(80));
    console.log(`⏰ Status Update - ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(80));
    console.log(`💲 Price: $${state.currentPrice?.toFixed(2) || 'N/A'}`);
    console.log(`📊 CVD: ${state.cvdTotal.toFixed(0)}`);
    console.log(`📈 Trades: ${state.tradesCount}`);
    console.log(`👥 WebSocket Clients: ${wsClients}`);
    console.log(`📦 Current Candle:`);
    if (state.currentCandle) {
      console.log(`   Volume: ${state.currentCandle.volume?.toFixed(4)}`);
      console.log(`   Buy: ${state.currentCandle.buyVolume?.toFixed(4)}`);
      console.log(`   Sell: ${state.currentCandle.sellVolume?.toFixed(4)}`);
    }
    console.log('='.repeat(80) + '\n');
  }, 30000);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Close WebSocket server
  wsServer.close(() => {
    console.log('✅ WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
});

module.exports = { app, server, wsServer, cvd };
