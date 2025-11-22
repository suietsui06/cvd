/*
const EventEmitter = require('eventemitter3');
const config = require('../config/config');
const Trade = require('../models/Trade');
const Candle = require('../models/Candle');

class CVDCalculator extends EventEmitter {
  constructor() {
    super();
    this.symbol = config.binance.symbol.toUpperCase();
    this.cvdTotal = 0;
    this.trades = [];
    this.candles = {
      '1m': [],
      '5m': [],
      '15m': [],
      '1h': [],
    };
    this.currentCandle = null;
    this.lastCandleTime = {};
  }

  async processTrade(trade) {
    // Calculate delta
    const delta = trade.isSell ? -trade.quantity : trade.quantity;

    // Update CVD
    this.cvdTotal += delta;

    // Create trade record
    const tradeRecord = {
      ...trade,
      delta,
      cvd: this.cvdTotal,
    };

    // Store in memory
    this.trades.push(tradeRecord);

    // Limit memory
    if (this.trades.length > config.cvd.historyMax) {
      this.trades.shift();
    }

    // Save to database (async, non-blocking)
    this.saveTrade(tradeRecord).catch((err) => {
      console.error('Error saving trade:', err);
    });

    // Update candle
    this.updateCandle(tradeRecord);

    // Emit event
    this.emit('trade', tradeRecord);
    this.emit('cvdUpdate', {
      cvd: this.cvdTotal,
      delta,
      price: trade.price,
      timestamp: trade.timestamp,
    });

    return tradeRecord;
  }

  updateCandle(trade) {
    const timestamp = new Date(trade.timestamp);

    // Initialize current candle if needed
    if (!this.currentCandle) {
      this.currentCandle = {
        symbol: this.symbol,
        timestamp,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.quantity,
        buyVolume: trade.isSell ? 0 : trade.quantity,
        sellVolume: trade.isSell ? trade.quantity : 0,
        cvdOpen: this.cvdTotal - trade.delta,
        cvdClose: this.cvdTotal,
      };
    } else {
      // Update OHLC
      this.currentCandle.high = Math.max(this.currentCandle.high, trade.price);
      this.currentCandle.low = Math.min(this.currentCandle.low, trade.price);
      this.currentCandle.close = trade.price;
      this.currentCandle.volume += trade.quantity;
      this.currentCandle.cvdClose = this.cvdTotal;

      if (trade.isSell) {
        this.currentCandle.sellVolume += trade.quantity;
      } else {
        this.currentCandle.buyVolume += trade.quantity;
      }
    }

    // Check if candle should close for each timeframe
    this.checkCandleClose(timestamp);
  }

  checkCandleClose(timestamp) {
    const timeframes = ['1m', '5m', '15m', '1h'];

    timeframes.forEach((tf) => {
      const candleStart = this.getCandleStart(timestamp, tf);

      if (!this.lastCandleTime[tf]) {
        this.lastCandleTime[tf] = candleStart;
      } else if (candleStart > this.lastCandleTime[tf]) {
        // Close candle
        this.closeCandle(tf);
        this.lastCandleTime[tf] = candleStart;
      }
    });
  }

  getCandleStart(timestamp, timeframe) {
    const date = new Date(timestamp);

    switch (timeframe) {
      case '1m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
      case '5m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), Math.floor(date.getMinutes() / 5) * 5);
      case '15m':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), Math.floor(date.getMinutes() / 15) * 15);
      case '1h':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
      default:
        return date;
    }
  }

  async closeCandle(timeframe) {
    if (!this.currentCandle) return;

    const candle = {
      ...this.currentCandle,
      timeframe,
      cvdDelta: this.currentCandle.cvdClose - this.currentCandle.cvdOpen,
    };

    // Store in memory
    if (!this.candles[timeframe]) {
      this.candles[timeframe] = [];
    }
    this.candles[timeframe].push(candle);

    // Limit memory
    if (this.candles[timeframe].length > 500) {
      this.candles[timeframe].shift();
    }

    // Save to database
    this.saveCandle(candle).catch((err) => {
      console.error('Error saving candle:', err);
    });

    // Emit event
    this.emit('candleClosed', { timeframe, candle });

    // Reset current candle for 1m timeframe
    if (timeframe === '1m') {
      this.currentCandle = null;
    }
  }

  async saveTrade(trade) {
    try {
      await Trade.create(trade);
    } catch (error) {
      if (error.code !== 11000) { // Ignore duplicate key errors
        throw error;
      }
    }
  }

  async saveCandle(candle) {
    try {
      await Candle.findOneAndUpdate(
        {
          symbol: candle.symbol,
          timeframe: candle.timeframe,
          timestamp: candle.timestamp,
        },
        candle,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error saving candle:', error);
    }
  }

  getCandles(timeframe, limit = 100) {
    const candles = this.candles[timeframe] || [];
    return candles.slice(-limit);
  }

  getCurrentState() {
    return {
      symbol: this.symbol,
      cvdTotal: this.cvdTotal,
      currentPrice: this.currentCandle?.close || 0,
      tradesCount: this.trades.length,
      currentCandle: this.currentCandle,
    };
  }

  // Load initial CVD from database
  async loadInitialCVD() {
    try {
      const lastTrade = await Trade.findOne({ symbol: this.symbol })
        .sort({ timestamp: -1 })
        .limit(1);

      if (lastTrade) {
        this.cvdTotal = lastTrade.cvd;
        console.log(`✅ Loaded initial CVD: ${this.cvdTotal}`);
      }
    } catch (error) {
      console.error('Error loading initial CVD:', error);
    }
  }
}

module.exports = CVDCalculator;