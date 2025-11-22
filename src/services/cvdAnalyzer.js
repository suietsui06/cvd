class CVDAnalyzer {
  constructor() {
    this.decisions = {
      ENTRY_LONG: 'ENTRY_LONG',
      ENTRY_SHORT: 'ENTRY_SHORT',
      HOLD: 'HOLD',
      EXIT: 'EXIT',
      ADD_POSITION: 'ADD_POSITION',
      REDUCE_RISK: 'REDUCE_RISK',
      STAY_OUT: 'STAY_OUT'
    };
  }

  /**
   * Analyze CVD data and return trading decision
   * @param {Array} candles - Array of candles with CVD data
   * @param {string} timeframe - Current timeframe
   * @returns {Object} Analysis result
   */
  analyze(candles, timeframe) {
    if (!candles || candles.length < 10) {
      return {
        decision: this.decisions.STAY_OUT,
        trend: 'UNKNOWN',
        signal: 'Insufficient data',
        action: 'Wait for more candles',
        reason: 'Cần ít nhất 10 candles để phân tích',
        confidence: 0,
        timeframe
      };
    }

    // Get recent data
    const recent = candles.slice(-20); // Last 20 candles
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    
    // Calculate metrics
    const priceChange = this.calculatePriceChange(recent);
    const cvdChange = this.calculateCVDChange(recent);
    const divergence = this.detectDivergence(recent);
    const trend = this.detectTrend(recent);
    const strength = this.calculateStrength(recent);
    const volatility = this.calculateVolatility(recent);

    // Make decision based on analysis
    const analysis = this.makeDecision({
      priceChange,
      cvdChange,
      divergence,
      trend,
      strength,
      volatility,
      last,
      prev,
      timeframe
    });

    return analysis;
  }

  /**
   * Calculate price change percentage
   */
  calculatePriceChange(candles) {
    const first = candles[0].close;
    const last = candles[candles.length - 1].close;
    return ((last - first) / first) * 100;
  }

  /**
   * Calculate CVD change
   */
  calculateCVDChange(candles) {
    const first = candles[0].cvdClose;
    const last = candles[candles.length - 1].cvdClose;
    return last - first;
  }

  /**
   * Detect divergence (phân kỳ)
   */
  detectDivergence(candles) {
    if (candles.length < 10) return null;

    const recent = candles.slice(-10);
    
    // Find price highs/lows
    const priceHighs = [];
    const priceLows = [];
    const cvdHighs = [];
    const cvdLows = [];

    for (let i = 1; i < recent.length - 1; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];
      const next = recent[i + 1];

      // Price peak
      if (curr.high > prev.high && curr.high > next.high) {
        priceHighs.push({ index: i, value: curr.high, cvd: curr.cvdClose });
      }

      // Price trough
      if (curr.low < prev.low && curr.low < next.low) {
        priceLows.push({ index: i, value: curr.low, cvd: curr.cvdClose });
      }
    }

    // Check for bullish divergence (giá xuống, CVD lên)
    if (priceLows.length >= 2) {
      const lastTwo = priceLows.slice(-2);
      if (lastTwo[1].value < lastTwo[0].value && // Lower Low in price
          lastTwo[1].cvd > lastTwo[0].cvd) {      // Higher Low in CVD
        return {
          type: 'BULLISH',
          strength: 'STRONG',
          description: 'Giá tạo đáy thấp hơn nhưng CVD tạo đáy cao hơn'
        };
      }
    }

    // Check for bearish divergence (giá lên, CVD xuống)
    if (priceHighs.length >= 2) {
      const lastTwo = priceHighs.slice(-2);
      if (lastTwo[1].value > lastTwo[0].value && // Higher High in price
          lastTwo[1].cvd < lastTwo[0].cvd) {      // Lower High in CVD
        return {
          type: 'BEARISH',
          strength: 'STRONG',
          description: 'Giá tạo đỉnh cao hơn nhưng CVD tạo đỉnh thấp hơn'
        };
      }
    }

    return null;
  }

  /**
   * Detect trend
   */
  detectTrend(candles) {
    const priceChange = this.calculatePriceChange(candles);
    const cvdChange = this.calculateCVDChange(candles);

    // Trend thresholds
    const priceUp = priceChange > 0.2;
    const priceDown = priceChange < -0.2;
    const cvdUp = cvdChange > 0;
    const cvdDown = cvdChange < 0;

    // Strong uptrend: Both price and CVD up
    if (priceUp && cvdUp) {
      return {
        direction: 'UPTREND',
        strength: 'STRONG',
        description: 'Xu hướng TĂNG bền vững (Giá + CVD cùng tăng)'
      };
    }

    // Strong downtrend: Both price and CVD down
    if (priceDown && cvdDown) {
      return {
        direction: 'DOWNTREND',
        strength: 'STRONG',
        description: 'Xu hướng GIẢM bền vững (Giá + CVD cùng giảm)'
      };
    }

    // Weak trend: Price and CVD not aligned
    if ((priceUp && cvdDown) || (priceDown && cvdUp)) {
      return {
        direction: 'WEAK',
        strength: 'WEAK',
        description: 'Xu hướng YẾU (Giá không đồng bộ với CVD)'
      };
    }

    // Sideways with CVD accumulation
    if (Math.abs(priceChange) < 0.2 && cvdUp) {
      return {
        direction: 'ACCUMULATION',
        strength: 'MEDIUM',
        description: 'CVD tăng trong khi giá sideway → Chuẩn bị breakout TĂNG'
      };
    }

    // Sideways with CVD distribution
    if (Math.abs(priceChange) < 0.2 && cvdDown) {
      return {
        direction: 'DISTRIBUTION',
        strength: 'MEDIUM',
        description: 'CVD giảm trong khi giá sideway → Chuẩn bị breakdown GIẢM'
      };
    }

    return {
      direction: 'SIDEWAYS',
      strength: 'NEUTRAL',
      description: 'Thị trường đi ngang'
    };
  }

  /**
   * Calculate trend strength
   */
  calculateStrength(candles) {
    const deltas = candles.map(c => c.cvdDelta);
    const avgDelta = deltas.reduce((sum, d) => sum + Math.abs(d), 0) / deltas.length;
    
    if (avgDelta > 10) return 'STRONG';
    if (avgDelta > 5) return 'MEDIUM';
    return 'WEAK';
  }

  /**
   * Calculate volatility
   */
  calculateVolatility(candles) {
    const prices = candles.map(c => c.close);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = (stdDev / avg) * 100;

    if (volatility > 1) return 'HIGH';
    if (volatility > 0.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Make trading decision
   */
  makeDecision(data) {
  const {
    priceChange,
    cvdChange,
    divergence,
    trend,
    strength,
    volatility,
    last,
    prev,
    timeframe
  } = data;

  // ✅ FIX: Initialize default values
  if (!last || !prev) {
    return {
      decision: this.decisions.STAY_OUT,
      trend: 'UNKNOWN',
      signal: '⏸️ Insufficient Data',
      action: 'Chờ thêm dữ liệu',
      reason: 'Chưa đủ dữ liệu để phân tích',
      confidence: 0,
      timeframe,
      timeframeContext: this.getTimeframeContext(timeframe),
      cvdStatus: 'CVD: N/A',
      metrics: {
        priceChange: '0.00%',
        cvdChange: '0',
        currentCVD: '0',
        deltaCurrent: '0',
        strength: 'UNKNOWN',
        volatility: 'UNKNOWN'
      },
      timestamp: new Date()
    };
  }

  let decision = this.decisions.STAY_OUT;
  let signal = '';
  let action = '';
  let reason = '';
  let confidence = 0;

  // Priority 1: Divergence signals
  if (divergence) {
    if (divergence.type === 'BULLISH') {
      decision = this.decisions.ENTRY_LONG;
      signal = '🟢 Bullish Divergence';
      action = 'Chuẩn bị MUA (LONG) tại vùng hỗ trợ hoặc khi có BOS';
      reason = divergence.description + '. Tín hiệu đảo chiều TĂNG mạnh';
      confidence = 85;
    } else if (divergence.type === 'BEARISH') {
      decision = this.decisions.ENTRY_SHORT;
      signal = '🔴 Bearish Divergence';
      action = 'Chuẩn bị BÁN (SHORT) tại vùng kháng cự';
      reason = divergence.description + '. Tín hiệu đảo chiều GIẢM mạnh';
      confidence = 85;
    }
  }

  // Priority 2: Strong trend continuation
  else if (trend && trend.strength === 'STRONG') {
    if (trend.direction === 'UPTREND') {
      decision = this.decisions.HOLD;
      signal = '📈 Strong Uptrend';
      action = 'HOLD lệnh LONG, di chuyển SL lên';
      reason = trend.description + '. Phe MUA đang kiểm soát thị trường';
      confidence = 80;
    } else if (trend.direction === 'DOWNTREND') {
      decision = this.decisions.HOLD;
      signal = '📉 Strong Downtrend';
      action = 'HOLD lệnh SHORT, di chuyển SL xuống';
      reason = trend.description + '. Phe BÁN đang kiểm soát thị trường';
      confidence = 80;
    }
  }

  // Priority 3: Accumulation/Distribution
  else if (trend && trend.direction === 'ACCUMULATION') {
    decision = this.decisions.ADD_POSITION;
    signal = '💰 Accumulation Phase';
    action = 'Chuẩn bị LONG, breakout sắp xảy ra';
    reason = trend.description;
    confidence = 70;
  } else if (trend && trend.direction === 'DISTRIBUTION') {
    decision = this.decisions.ADD_POSITION;
    signal = '💸 Distribution Phase';
    action = 'Chuẩn bị SHORT, breakdown sắp xảy ra';
    reason = trend.description;
    confidence = 70;
  }

  // Priority 4: Weak trend - reduce risk
  else if (trend && trend.strength === 'WEAK') {
    decision = this.decisions.REDUCE_RISK;
    signal = '⚠️ Weak Trend';
    action = 'Giảm size hoặc chốt lời một phần';
    reason = trend.description + '. Xu hướng không rõ ràng';
    confidence = 40;
  }

  // Priority 5: Choppy market
  else if (strength === 'WEAK' && volatility === 'HIGH') {
    decision = this.decisions.STAY_OUT;
    signal = '🌪️ Choppy Market';
    action = 'NGỒI NGOÀI, không trade';
    reason = 'CVD loạn xạ, thị trường không rõ hướng. Rủi ro cao';
    confidence = 20;
  }

  // Priority 6: Low volume
  else if (last.cvdDelta && Math.abs(last.cvdDelta) < 1) {
    decision = this.decisions.STAY_OUT;
    signal = '💤 Low Volume';
    action = 'KHÔNG TRADE';
    reason = 'Volume giao dịch quá thấp, không đủ thanh khoản';
    confidence = 10;
  }

  // Default: Stay out
  else {
    decision = this.decisions.STAY_OUT;
    signal = '⏸️ Neutral';
    action = 'Chờ tín hiệu rõ ràng hơn';
    reason = 'Thị trường chưa có tín hiệu cụ thể. Đợi cơ hội tốt hơn';
    confidence = 30;
  }

  // ✅ FIX: Ensure all values are defined with fallbacks
  const cvdStatus = (last.cvdClose || 0) > 0 ? 
    `CVD: +${(last.cvdClose || 0).toFixed(0)} (Phe MUA kiểm soát)` :
    `CVD: ${(last.cvdClose || 0).toFixed(0)} (Phe BÁN kiểm soát)`;

  const timeframeContext = this.getTimeframeContext(timeframe);

  // ✅ FIX: Create metrics with safe fallbacks
  return {
    decision,
    trend: trend ? trend.direction : 'UNKNOWN',
    signal,
    action,
    reason,
    confidence,
    timeframe,
    timeframeContext,
    cvdStatus,
    metrics: {
      priceChange: (priceChange || 0).toFixed(2) + '%',
      cvdChange: (cvdChange || 0).toFixed(0),
      currentCVD: (last.cvdClose || 0).toFixed(0),
      deltaCurrent: (last.cvdDelta || 0).toFixed(2),
      strength: strength || 'UNKNOWN',
      volatility: volatility || 'UNKNOWN'
    },
    timestamp: new Date()
  };
  }

  /**
   * Get timeframe trading context
   */
  getTimeframeContext(timeframe) {
    const contexts = {
      '1m': 'Scalping - Biến động nhanh, phù hợp traders giàu kinh nghiệm',
      '5m': 'Scalping/Day Trading - CVD rõ ràng nhất, khung thời gian tối ưu',
      '15m': 'Day Trading - Xu hướng rõ ràng, ít noise',
      '1h': 'Swing Trading - Xu hướng dài hạn, ít bị whipsaw'
    };
    return contexts[timeframe] || 'Unknown timeframe';
  }
}

module.exports = CVDAnalyzer;