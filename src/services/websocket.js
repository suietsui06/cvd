const WebSocket = require('ws');
const EventEmitter = require('eventemitter3');
const config = require('../config/config');

class BinanceWebSocket extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.pingInterval = null;
    this.isConnecting = false;
  }

  connect() {
    if (this.isConnecting) {
      console.log('⏳ Already connecting...');
      return;
    }

    this.isConnecting = true;
    const url = `${config.binance.wsUrl}/${config.binance.symbol}@${config.binance.streamType}`;

    console.log(`🔌 Connecting to Binance WebSocket: ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.startPing();
      });

      this.ws.on('message', (data) => {
        try {
          const trade = JSON.parse(data.toString());
          this.handleTrade(trade);
        } catch (error) {
          console.error('❌ Error parsing trade data:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        this.emit('error', error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        this.isConnecting = false;
        this.stopPing();
        this.emit('disconnected', { code, reason });
        this.reconnect();
      });

      this.ws.on('pong', () => {
        // Connection is alive
      });

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  handleTrade(trade) {
    /*
    Binance aggTrade format:
    {
      "e": "aggTrade",
      "E": 1637123456789,  // Event time
      "s": "BTCUSDT",      // Symbol
      "a": 12345,          // Aggregate trade ID
      "p": "49245.50",     // Price
      "q": "0.5",          // Quantity
      "f": 100,            // First trade ID
      "l": 105,            // Last trade ID
      "T": 1637123456785,  // Trade time
      "m": false,          // Is buyer maker
      "M": true            // Ignore
    }
    */

    const tradeData = {
      symbol: trade.s,
      timestamp: trade.T,
      price: parseFloat(trade.p),
      quantity: parseFloat(trade.q),
      isSell: trade.m, // true = sell (buyer is maker), false = buy
      tradeId: trade.a.toString(),
    };

    this.emit('trade', tradeData);
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 30 seconds
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping...');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');
    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      symbol: config.binance.symbol,
    };
  }
}

module.exports = BinanceWebSocket;