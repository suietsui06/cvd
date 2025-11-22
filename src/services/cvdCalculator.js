const EventEmitter = require('eventemitter3');
const config = require('../config/config');
const CVDAnalyzer = require('./cvdAnalyzer');

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
      // ✅ FIX: Track current candle for EACH timeframe
    this.currentCandles = {
      '1m': null,
      '5m': null,
      '15m': null,
      '1h': null,
    };
    this.currentCandle = null;
    this.lastCandleTime = {};

    // ✅ ADD: Analyzer instance
    this.analyzer = new CVDAnalyzer();


  }
  // ✅ NEW: Get analysis for timeframe
  getAnalysis(timeframe) {
    const candles = this.candles[timeframe] || [];
    return this.analyzer.analyze(candles, timeframe);
  }

  async processTrade(trade) {
    const delta = trade.isSell ? -trade.quantity : trade.quantity;
    this.cvdTotal += delta;

    const tradeRecord = {
      ...trade,
      delta,
      cvd: this.cvdTotal,
    };

    this.trades.push(tradeRecord);

    if (this.trades.length > config.cvd.historyMax) {
      this.trades.shift();
    }

    this.updateCandle(tradeRecord);
    // ✅ FIX: Update candles for ALL timeframes
    this.updateAllCandles(tradeRecord);

    this.emit('trade', tradeRecord);
    this.emit('cvdUpdate', {
      cvd: this.cvdTotal,
      delta,
      price: trade.price,
      timestamp: trade.timestamp,
    });

    return tradeRecord;
  }

    // ✅ NEW: Update candles for all timeframes
  updateAllCandles(trade) {
    const timestamp = new Date(trade.timestamp);
    const timeframes = ['1m', '5m', '15m', '1h'];

    timeframes.forEach((tf) => {
      this.updateCandleForTimeframe(tf, trade, timestamp);
    });
  }
    // ✅ NEW: Update candle for specific timeframe
  updateCandleForTimeframe(timeframe, trade, timestamp) {
    const candleStart = this.getCandleStart(timestamp, timeframe);

    // Check if we need to close the current candle
    if (!this.lastCandleTime[timeframe]) {
      this.lastCandleTime[timeframe] = candleStart;
    } else if (candleStart > this.lastCandleTime[timeframe]) {
      // Close the old candle
      this.closeCandleForTimeframe(timeframe);
      this.lastCandleTime[timeframe] = candleStart;
    }

    // Update or create current candle for this timeframe
    if (!this.currentCandles[timeframe]) {
      this.currentCandles[timeframe] = {
        symbol: this.symbol,
        timeframe,
        timestamp: candleStart,
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
      // Update existing candle
      this.currentCandles[timeframe].high = Math.max(
        this.currentCandles[timeframe].high,
        trade.price
      );
      this.currentCandles[timeframe].low = Math.min(
        this.currentCandles[timeframe].low,
        trade.price
      );
      this.currentCandles[timeframe].close = trade.price;
      this.currentCandles[timeframe].volume += trade.quantity;
      this.currentCandles[timeframe].cvdClose = this.cvdTotal;

      if (trade.isSell) {
        this.currentCandles[timeframe].sellVolume += trade.quantity;
      } else {
        this.currentCandles[timeframe].buyVolume += trade.quantity;
      }
    }
  }


  // ✅ NEW: Close candle for specific timeframe
  closeCandleForTimeframe(timeframe) {
    const currentCandle = this.currentCandles[timeframe];
    
    if (!currentCandle) return;

    const candle = {
      ...currentCandle,
      cvdDelta: currentCandle.cvdClose - currentCandle.cvdOpen,
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

    // Emit event
    this.emit('candleClosed', { timeframe, candle });

    console.log(
      `✅ ${timeframe} candle closed: ` +
      `Price $${candle.close.toFixed(2)}, ` +
      `CVD ${candle.cvdClose.toFixed(0)}, ` +
      `Delta ${candle.cvdDelta.toFixed(2)}`
    );

    // Reset current candle for this timeframe
    this.currentCandles[timeframe] = null;
  }

  updateCandle(trade) {
    const timestamp = new Date(trade.timestamp);

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

    this.checkCandleClose(timestamp);
  }

  checkCandleClose(timestamp) {
    const timeframes = ['1m', '5m', '15m', '1h'];

    timeframes.forEach((tf) => {
      const candleStart = this.getCandleStart(timestamp, tf);

      if (!this.lastCandleTime[tf]) {
        this.lastCandleTime[tf] = candleStart;
      } else if (candleStart > this.lastCandleTime[tf]) {
        this.closeCandle(tf);
        this.lastCandleTime[tf] = candleStart;
      }
    });
  }

   getCandleStart(timestamp, timeframe) {
    const date = new Date(timestamp);

    switch (timeframe) {
      case '1m':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
          0,
          0
        );
      case '5m':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          Math.floor(date.getMinutes() / 5) * 5,
          0,
          0
        );
      case '15m':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          Math.floor(date.getMinutes() / 15) * 15,
          0,
          0
        );
      case '1h':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          0,
          0,
          0
        );
      default:
        return date;
    }
  }

  closeCandle(timeframe) {
    if (!this.currentCandle) return;

    const candle = {
      ...this.currentCandle,
      timeframe,
      cvdDelta: this.currentCandle.cvdClose - this.currentCandle.cvdOpen,
    };

    if (!this.candles[timeframe]) {
      this.candles[timeframe] = [];
    }
    this.candles[timeframe].push(candle);

    if (this.candles[timeframe].length > 500) {
      this.candles[timeframe].shift();
    }

    this.emit('candleClosed', { timeframe, candle });

    console.log(`✅ ${timeframe} candle: Price $${candle.close.toFixed(2)}, CVD ${candle.cvdClose.toFixed(0)}, Delta ${candle.cvdDelta.toFixed(2)}`);

    if (timeframe === '1m') {
      this.currentCandle = null;
    }
  }

  // ✅ NEW: Get candles with aggregation option
  getCandles(timeframe, limit = 100, aggregate = false) {
    if (aggregate && timeframe !== '1m') {
      return this.getAggregatedCandles(timeframe, limit);
    }
    
    const candles = this.candles[timeframe] || [];
    return candles.slice(-limit);
  }

  // ✅ NEW: Aggregate candles from 1m base
  getAggregatedCandles(targetTimeframe, limit = 100) {
    const candles1m = this.candles['1m'] || [];
    
    if (candles1m.length === 0) {
      return [];
    }

    // Calculate multiplier
    const multipliers = {
      '5m': 5,
      '15m': 15,
      '1h': 60
    };

    const multiplier = multipliers[targetTimeframe];
    if (!multiplier) {
      return this.candles[targetTimeframe] || [];
    }

    // Group 1m candles
    const aggregated = [];
    
    for (let i = 0; i < candles1m.length; i += multiplier) {
      const group = candles1m.slice(i, i + multiplier);
      
      if (group.length === 0) continue;

      // Aggregate OHLCV
      const agg = {
        symbol: this.symbol,
        timeframe: targetTimeframe,
        timestamp: group[0].timestamp,
        open: group[0].open,
        high: Math.max(...group.map(c => c.high)),
        low: Math.min(...group.map(c => c.low)),
        close: group[group.length - 1].close,
        volume: group.reduce((sum, c) => sum + c.volume, 0),
        buyVolume: group.reduce((sum, c) => sum + c.buyVolume, 0),
        sellVolume: group.reduce((sum, c) => sum + c.sellVolume, 0),
        cvdOpen: group[0].cvdOpen,
        cvdClose: group[group.length - 1].cvdClose,
      };

      agg.cvdDelta = agg.cvdClose - agg.cvdOpen;

      aggregated.push(agg);
    }

    return aggregated.slice(-limit);
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
}

module.exports = CVDCalculator;