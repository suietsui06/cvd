// ============================================
// CVD TRADING MONITOR - PURE REALTIME MODE
// ============================================

let priceChart = null;
let cvdChart = null;
let deltaChart = null;
let currentTimeframe = '5m';
let updateInterval = null;
let realtimeInterval = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing CVD Monitor - PURE REALTIME MODE...');
  console.log('⚡ No historical data - Charts will populate as trades arrive');
  
  try {
    initCharts();
    setupEventListeners();
    startUpdates();
    console.log('✅ Initialization complete');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }
});

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  const timeframeSelect = document.getElementById('timeframe');
  if (timeframeSelect) {
    timeframeSelect.addEventListener('change', (e) => {
      currentTimeframe = e.target.value;
      console.log(`📊 Timeframe changed to: ${currentTimeframe}`);
      updateAllCharts();
    });
  }
}

// ============================================
// CHART INITIALIZATION
// ============================================

function initCharts() {
  console.log('📊 Initializing charts...');

  const darkTheme = {
    theme: {
      mode: 'dark',
      palette: 'palette1'
    },
    chart: {
      background: 'transparent',
      foreColor: '#8b9dc3',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      }
    },
    grid: {
      borderColor: '#2a3f5f',
      strokeDashArray: 3
    }
  };

  // PRICE CHART
  const priceOptions = {
    ...darkTheme,
    series: [{
      name: 'Price',
      data: []
    }],
    chart: {
      ...darkTheme.chart,
      id: 'price-realtime',
      height: 350,
      type: 'line',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 500,
          animateGradually: {
            enabled: true,
            delay: 150
          }
        }
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2,
      colors: ['#00ff88']
    },
    title: {
      text: 'BTC/USDT Price - Realtime',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '14px',
        fontWeight: 500
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 5
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          hour: 'HH:mm',
          minute: 'HH:mm'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => '$' + (value || 0).toFixed(2),
        style: {
          colors: '#00ff88'
        }
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        format: 'HH:mm:ss'
      },
      y: {
        formatter: (value) => '$' + (value || 0).toFixed(2)
      }
    }
  };

  priceChart = new ApexCharts(document.querySelector("#priceChart"), priceOptions);
  priceChart.render();

  // CVD CHART
  const cvdOptions = {
    ...darkTheme,
    series: [{
      name: 'CVD',
      data: []
    }],
    chart: {
      ...darkTheme.chart,
      id: 'cvd-realtime',
      height: 350,
      type: 'area',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 500,
          animateGradually: {
            enabled: true,
            delay: 150
          }
        }
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2,
      colors: ['#3b82f6']
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.6,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      },
      colors: ['#3b82f6']
    },
    title: {
      text: 'Cumulative Volume Delta - Realtime',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '14px',
        fontWeight: 500
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 5
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          hour: 'HH:mm',
          minute: 'HH:mm'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => (value || 0).toFixed(0),
        style: {
          colors: '#3b82f6'
        }
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        format: 'HH:mm:ss'
      },
      y: {
        formatter: (value) => (value || 0).toFixed(0)
      }
    }
  };

  cvdChart = new ApexCharts(document.querySelector("#cvdChart"), cvdOptions);
  cvdChart.render();

  // DELTA CHART
  const deltaOptions = {
    ...darkTheme,
    series: [{
      name: 'Delta',
      data: []
    }],
    chart: {
      ...darkTheme.chart,
      id: 'delta-realtime',
      height: 350,
      type: 'bar',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 500
        }
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      }
    },
    plotOptions: {
      bar: {
        colors: {
          ranges: [{
            from: -1000000,
            to: 0,
            color: '#ff4444'
          }, {
            from: 0.01,
            to: 1000000,
            color: '#00ff88'
          }]
        },
        columnWidth: '80%'
      }
    },
    dataLabels: {
      enabled: false
    },
    title: {
      text: 'Buy/Sell Pressure - Realtime',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '14px',
        fontWeight: 500
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          hour: 'HH:mm',
          minute: 'HH:mm'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => (value || 0).toFixed(0)
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        format: 'HH:mm:ss'
      },
      y: {
        formatter: (value) => ((value || 0) > 0 ? '+' : '') + (value || 0).toFixed(0)
      }
    }
  };

  deltaChart = new ApexCharts(document.querySelector("#deltaChart"), deltaOptions);
  deltaChart.render();

  console.log('✅ All charts initialized');
}

// ============================================
// REALTIME DATA UPDATE
// ============================================

async function updateAllCharts() {
  try {
    const response = await fetch(`/api/cvd/${currentTimeframe}?limit=100`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('⏳ Waiting for realtime data...');
      showWaitingMessage();
      return;
    }

    clearWaitingMessage();

    console.log(`📊 Updating with ${data.data.length} candles (${currentTimeframe})`);

    // Prepare data
    const priceData = [];
    const cvdData = [];
    const deltaData = [];

    data.data.forEach((candle) => {
      const timestamp = new Date(candle.timestamp).getTime();
      
      if (timestamp && !isNaN(timestamp)) {
        priceData.push({ x: timestamp, y: candle.price || 0 });
        cvdData.push({ x: timestamp, y: candle.cvd || 0 });
        deltaData.push({ x: timestamp, y: candle.delta || 0 });
      }
    });

    // Update charts (append mode)
    if (priceData.length > 0) {
      priceChart.updateSeries([{
        name: 'Price',
        data: priceData
      }], true);

      cvdChart.updateSeries([{
        name: 'CVD',
        data: cvdData
      }], true);

      deltaChart.updateSeries([{
        name: 'Delta',
        data: deltaData
      }], true);
    }

    // Update volume bars
    if (data.data.length > 0) {
      updateVolumeBars(data.data[data.data.length - 1]);
    }

    console.log('✅ Charts updated');

  } catch (error) {
    console.error('❌ Error updating charts:', error);
    showErrorMessage(error.message);
  }
}

// ============================================
// METRICS UPDATE
// ============================================

async function updateMetrics() {
  try {
    const response = await fetch('/api/state');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const state = await response.json();

    // Update price
    const priceElement = document.getElementById('price');
    if (priceElement && state.currentPrice > 0) {
      priceElement.textContent = '$' + state.currentPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    // Update CVD
    const cvdElement = document.getElementById('cvd');
    if (cvdElement) {
      cvdElement.textContent = state.cvdTotal.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      cvdElement.classList.remove('positive', 'negative');
      cvdElement.classList.add(state.cvdTotal >= 0 ? 'positive' : 'negative');
    }

    // Update trades
    const tradesElement = document.getElementById('trades');
    if (tradesElement) {
      tradesElement.textContent = state.tradesCount.toLocaleString();
    }

    // Update delta
    if (state.currentCandle) {
      const delta = state.currentCandle.cvdClose - state.currentCandle.cvdOpen;
      const deltaElement = document.getElementById('delta');
      
      if (deltaElement) {
        deltaElement.textContent = (delta > 0 ? '+' : '') + delta.toFixed(0);
        deltaElement.classList.remove('positive', 'negative');
        deltaElement.classList.add(delta >= 0 ? 'positive' : 'negative');
      }
    }

    // Update status
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = '🟢 Connected';
      statusElement.classList.add('connected');
    }

    // Update symbol
    const symbolElement = document.getElementById('symbol');
    if (symbolElement) {
      symbolElement.textContent = state.symbol;
    }

  } catch (error) {
    console.error('❌ Error updating metrics:', error);
    
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = '🔴 Disconnected';
      statusElement.classList.remove('connected');
    }
  }
}

// ============================================
// VOLUME BARS
// ============================================

function updateVolumeBars(candle) {
  const buyVol = candle.buyVolume || 0;
  const sellVol = candle.sellVolume || 0;
  const totalVol = buyVol + sellVol;

  if (totalVol === 0) return;

  const buyPercent = (buyVol / totalVol) * 100;
  const sellPercent = (sellVol / totalVol) * 100;

  const buyElement = document.getElementById('buyVolume');
  const buyPercentElement = document.getElementById('buyVolumePercent');
  const buyValueElement = document.getElementById('buyVolumeValue');

  if (buyElement) buyElement.style.width = buyPercent + '%';
  if (buyPercentElement) buyPercentElement.textContent = buyPercent.toFixed(1) + '%';
  if (buyValueElement) buyValueElement.textContent = buyVol.toFixed(4);

  const sellElement = document.getElementById('sellVolume');
  const sellPercentElement = document.getElementById('sellVolumePercent');
  const sellValueElement = document.getElementById('sellVolumeValue');

  if (sellElement) sellElement.style.width = sellPercent + '%';
  if (sellPercentElement) sellPercentElement.textContent = sellPercent.toFixed(1) + '%';
  if (sellValueElement) sellValueElement.textContent = sellVol.toFixed(4);
}

// ============================================
// UPDATE LOOPS
// ============================================

function startUpdates() {
  console.log('🔄 Starting realtime update loops...');

  updateMetrics();
  updateAllCharts();

  // Metrics: every 500ms (ultra fast)
  updateInterval = setInterval(() => {
    updateMetrics();
  }, 500);

  // Charts: every 2 seconds (smooth realtime)
  realtimeInterval = setInterval(() => {
    updateAllCharts();
  }, 2000);

  console.log('✅ Update loops started (500ms metrics, 2s charts)');
}

// ============================================
// UI HELPERS
// ============================================

function showWaitingMessage() {
  const containers = ['#priceChart', '#cvdChart', '#deltaChart'];
  
  containers.forEach(selector => {
    const container = document.querySelector(selector);
    if (container && !container.querySelector('.waiting-message')) {
      const message = document.createElement('div');
      message.className = 'waiting-message';
      message.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 350px;
          color: #8b9dc3;
          text-align: center;
        ">
          <div style="font-size: 3em; margin-bottom: 20px;">⚡</div>
          <div style="font-size: 1.2em; margin-bottom: 10px; font-weight: 500;">
            Realtime Mode Active
          </div>
          <div style="font-size: 0.9em; margin-bottom: 15px;">
            Waiting for trades from Binance WebSocket...
          </div>
          <div style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; max-width: 400px;">
            <div style="font-size: 0.85em; margin-bottom: 8px;">📊 Expected wait time:</div>
            <div style="font-size: 0.8em; opacity: 0.8;">
              • 1m: ~1 minute<br>
              • 5m: ~5 minutes<br>
              • 15m: ~15 minutes<br>
              • 1h: ~1 hour
            </div>
          </div>
          <div style="margin-top: 15px; font-size: 0.85em; opacity: 0.6;">
            Pure realtime - no historical data loaded
          </div>
        </div>
      `;
      container.appendChild(message);
    }
  });
}

function clearWaitingMessage() {
  document.querySelectorAll('.waiting-message, .error-message').forEach(el => el.remove());
}

function showErrorMessage(errorMsg) {
  const containers = ['#priceChart', '#cvdChart', '#deltaChart'];
  
  containers.forEach(selector => {
    const container = document.querySelector(selector);
    if (container && !container.querySelector('.error-message')) {
      const message = document.createElement('div');
      message.className = 'error-message';
      message.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 350px;
          color: #ff4444;
          text-align: center;
        ">
          <div style="font-size: 3em; margin-bottom: 20px;">❌</div>
          <div style="font-size: 1.2em; margin-bottom: 10px; font-weight: 500;">Error</div>
          <div style="font-size: 0.9em; max-width: 400px;">${errorMsg}</div>
        </div>
      `;
      container.appendChild(message);
    }
  });
}

// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', () => {
  if (updateInterval) clearInterval(updateInterval);
  if (realtimeInterval) clearInterval(realtimeInterval);
  
  if (priceChart) priceChart.destroy();
  if (cvdChart) cvdChart.destroy();
  if (deltaChart) deltaChart.destroy();
  
  console.log('🧹 Cleanup complete');
});

console.log('⚡ CVD Monitor - PURE REALTIME MODE LOADED');
