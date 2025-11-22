const EventEmitter = require('eventemitter3');
const config = require('../config/config');
const Signal = require('../models/Signal');
const discordService = require('./discordService');

class SignalDetector extends EventEmitter {
  constructor(cvdCalculator) {
    super();
    this.cvd = cvdCalculator;
    this.signals = [];
    this.alertCooldowns = new Map();
    
    this.config = {
      divergenceLookback: config.cvd.divergenceLookback,
      volumeSpikeThreshold: config.cvd.volumeSpikeThreshold,
      trendPeriod: config.cvd.trendPeriod,
    };

    // Start periodic signal detection
    this.startDetection();
  }

  startDetection() {
    // Check for signals every 15 seconds
    setInterval(() => {
      this.detectSignals();
    }, 15000);

    console.log('✅ Signal detector started');
  }

  async detectSignals() {
    const timeframes = ['5m', '15m', '1h'];

    for (const tf of timeframes) {
      const candles = this.cvd.getCandles(tf, 50);

      if (candles.length < 20) continue;

      const signals = this.detectAllSignals(candles, tf);

      for (const signal of signals) {
        await this.processSignal(signal);
      }
    }
  }

  detectAllSignals(candles, timeframe) {
    const signals = [];

    // 1. Divergence
    const divSignals = this.detectDivergence(candles, timeframe);
    signals.push(...divSignals);

    // 2. Volume Spike
    const volSignals = this.detectVolumeSpike(candles, timeframe);
    signals.push(...volSignals);

    // 3. Trend Change
    const trendSignals = this.detectTrendChange(candles, timeframe);
    signals.push(...trendSignals);

    return signals;
  }

  detectDivergence(candles, timeframe) {
    const signals = [];
    const lookback = this.config.divergenceLookback;

    if (candles.length < lookback * 2) return signals;

    const period1 = candles.slice(-lookback * 2, -lookback);
    const period2 = candles.slice(-lookback);

    // Find extremes
    const priceLow1 = Math.min(...period1.map((c) => c.low));
    const priceLow2 = Math.min(...period2.map((c) => c.low));
    const priceHigh1 = Math.max(...period1.map((c) => c.high));
    const priceHigh2 = Math.max(...period2.map((c) => c.high));

    const cvdLow1 = Math.min(...period1.map((c) => c.cvdClose));
    const cvdLow2 = Math.min(...period2.map((c) => c.cvdClose));
    const cvdHigh1 = Math.max(...period1.map((c) => c.cvdClose));
    const cvdHigh2 = Math.max(...period2.map((c) => c.cvdClose));

    // Bullish Divergence
    if (priceLow2 < priceLow1 && cvdLow2 > cvdLow1) {
      const strength = ((cvdLow2 - cvdLow1) / Math.abs(cvdLow1)) * 100;

      signals.push({
        type: 'BULLISH_DIVERGENCE',
        direction: 'LONG',
        strength: Math.min(strength, 100),
        confidence: strength > 5 ? 'HIGH' : 'MEDIUM',
        timeframe,
        symbol: this.cvd.symbol,
        price: candles[candles.length - 1].close,
        cvd: candles[candles.length - 1].cvdClose,
        description: `Price LL: $${priceLow2.toFixed(2)} < $${priceLow1.toFixed(2)}, CVD HL: ${cvdLow2.toFixed(0)} > ${cvdLow1.toFixed(0)}`,
        timestamp: new Date(),
      });
    }

    // Bearish Divergence
    if (priceHigh2 > priceHigh1 && cvdHigh2 < cvdHigh1) {
      const strength = ((cvdHigh1 - cvdHigh2) / Math.abs(cvdHigh1)) * 100;

      signals.push({
        type: 'BEARISH_DIVERGENCE',
        direction: 'SHORT',
        strength: Math.min(strength, 100),
        confidence: strength > 5 ? 'HIGH' : 'MEDIUM',
        timeframe,
        symbol: this.cvd.symbol,
        price: candles[candles.length - 1].close,
        cvd: candles[candles.length - 1].cvdClose,
        description: `Price HH: $${priceHigh2.toFixed(2)} > $${priceHigh1.toFixed(2)}, CVD LH: ${cvdHigh2.toFixed(0)} < ${cvdHigh1.toFixed(0)}`,
        timestamp: new Date(),
      });
    }

    return signals;
  }

  detectVolumeSpike(candles, timeframe) {
    const signals = [];

    if (candles.length < 20) return signals;

    const recentDeltas = candles.slice(-20, -1).map((c) => Math.abs(c.cvdDelta));
    const avgDelta = recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length;

    const currentDelta = candles[candles.length - 1].cvdDelta;

    if (Math.abs(currentDelta) > avgDelta * this.config.volumeSpikeThreshold) {
      const direction = currentDelta > 0 ? 'LONG' : 'SHORT';

      signals.push({
        type: 'VOLUME_SPIKE',
        direction,
        strength: (Math.abs(currentDelta) / avgDelta) * 20,
        confidence: Math.abs(currentDelta) > avgDelta * 5 ? 'HIGH' : 'MEDIUM',
        timeframe,
        symbol: this.cvd.symbol,
        price: candles[candles.length - 1].close,
        cvd: candles[candles.length - 1].cvdClose,
        description: `${currentDelta > 0 ? 'Buy' : 'Sell'} volume spike: ${Math.abs(currentDelta).toFixed(0)} (avg: ${avgDelta.toFixed(0)})`,
        timestamp: new Date(),
      });
    }

    return signals;
  }

  detectTrendChange(candles, timeframe) {
    const signals = [];
    const period = this.config.trendPeriod;

    if (candles.length < period * 3) return signals;

    const oldPeriod = candles.slice(-period * 3, -period * 2);
    const newPeriod = candles.slice(-period);

    const oldTrend = oldPeriod[oldPeriod.length - 1].cvdClose - oldPeriod[0].cvdClose;
    const newTrend = newPeriod[newPeriod.length - 1].cvdClose - newPeriod[0].cvdClose;

    if (oldTrend > 0 && newTrend < 0) {
      signals.push({
        type: 'TREND_CHANGE',
        direction: 'SHORT',
        strength: (Math.abs(newTrend - oldTrend) / Math.abs(oldTrend)) * 50,
        confidence: 'MEDIUM',
        timeframe,
        symbol: this.cvd.symbol,
        price: candles[candles.length - 1].close,
        cvd: candles[candles.length - 1].cvdClose,
        description: 'CVD trend changed from UP to DOWN',
        timestamp: new Date(),
      });
    } else if (oldTrend < 0 && newTrend > 0) {
      signals.push({
        type: 'TREND_CHANGE',
        direction: 'LONG',
        strength: (Math.abs(newTrend - oldTrend) / Math.abs(oldTrend)) * 50,
        confidence: 'MEDIUM',
        timeframe,
        symbol: this.cvd.symbol,
        price: candles[candles.length - 1].close,
        cvd: candles[candles.length - 1].cvdClose,
        description: 'CVD trend changed from DOWN to UP',
        timestamp: new Date(),
      });
    }

    return signals;
  }

  async processSignal(signal) {
    // Check cooldown
    const cooldownKey = `${signal.type}_${signal.direction}_${signal.timeframe}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);

    if (lastAlert && Date.now() - lastAlert < config.alerts.cooldownSeconds * 1000) {
      return; // Skip, still in cooldown
    }

    // Check minimum confidence
    const minConfidence = config.alerts.minConfidence;
    const confidenceLevels = { LOW: 0, MEDIUM: 1, HIGH: 2 };

    if (confidenceLevels[signal.confidence] < confidenceLevels[minConfidence]) {
      return; // Skip, confidence too low
    }

    // Save to database
    try {
      const savedSignal = await Signal.create(signal);

      // Send Discord alert
      await discordService.sendSignalAlert(savedSignal);

      // Update cooldown
      this.alertCooldowns.set(cooldownKey, Date.now());

      // Emit event
      this.emit('signal', savedSignal);

      console.log(`🎯 Signal detected: ${signal.type} ${signal.direction} (${signal.confidence})`);
    } catch (error) {
      console.error('Error processing signal:', error);
    }
  }

  getRecentSignals(minutes = 60, minConfidence = 'MEDIUM') {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    return Signal.find({
      timestamp: { $gte: cutoff },
      confidence: { $in: this.getConfidenceLevels(minConfidence) },
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
  }

  getConfidenceLevels(minLevel) {
    const levels = {
      LOW: ['LOW', 'MEDIUM', 'HIGH'],
      MEDIUM: ['MEDIUM', 'HIGH'],
      HIGH: ['HIGH'],
    };
    return levels[minLevel] || levels.MEDIUM;
  }
}

module.exports = SignalDetector;