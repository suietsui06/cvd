// ============================================
// CVD TRADING MONITOR - TWO SEPARATE CHARTS
// ============================================
// ✅ EXTRACTED FROM: Original combined chart code
// ✅ REFACTORED INTO: 2 independent realtime charts

let cvdChart = null;  // ✅ Chart 1: CVD + Delta Volume
let dual_priceChart = null;  // ✅ Chart 2: Price + Volume (Buy/Sell)
let currentTimeframe = '1m';
let ws = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let analysisUpdateInterval = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing CVD Monitor - TWO SEPARATE CHARTS...');
  
  try {
    initCharts();
    setupEventListeners();
    connectWebSocket();
    startInitialDataLoad();
    console.log('✅ Initialization complete');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }
});

// ============================================
// CHART INITIALIZATION - CVD + DELTA VOLUME
// ============================================

function initCharts() {
  console.log('📊 Initializing CVD + Delta Volume chart...');

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

  // ============================================
  // MAIN CHART: CVD (LEFT Y-AXIS) + DELTA VOLUME (RIGHT Y-AXIS)
  // ============================================
  // ✅ CVD Line: Xanh dương (Blue) - Trục Y trái
  // ✅ Delta Volume Bar: Đỏ (Âm) / Xanh (Dương) - Trục Y phải

  const cvdDeltaOptions = {
    ...darkTheme,
    series: [
      {
        name: 'CVD',
        type: 'line',
        data: []
      },
      {
        name: 'Delta Volume',
        type: 'bar',
        data: []
      }
    ],
    chart: {
      ...darkTheme.chart,
      id: 'cvd-delta-realtime',
      height: 450,
      type: 'line',
      stacked: false,
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 300,
          animateGradually: {
            enabled: true,
            delay: 100
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
      width: [3, 0],
      curve: 'smooth',
      colors: ['#3b82f6']
    },
    fill: {
      opacity: [1, 0.7],
      type: ['solid', 'solid'],
      colors: ['#3b82f6', 'transparent']
    },
    colors: ['#3b82f6'],
    plotOptions: {
      bar: {
        columnWidth: '70%',
        colors: {
          ranges: [
            // ✅ Âm = Đỏ (Selling Pressure)
            { from: -1000000, to: 0, color: '#ff4444' },
            // ✅ Dương = Xanh (Buying Pressure)
            { from: 0.01, to: 1000000, color: '#00ff88' }
          ]
        }
      }
    },
    title: {
      text: 'BTC/USDT CVD (Cumulative Volume Delta) - Realtime Stream',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '16px',
        fontWeight: 600
      }
    },
    markers: {
      size: 4,
      hover: {
        size: 6
      },
      colors: ['#3b82f6'],
      strokeWidth: 2
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          hour: 'HH:mm',
          minute: 'HH:mm',
          second: 'HH:mm:ss'
        },
        style: {
          colors: '#8b9dc3'
        }
      }
    },
    // ✅ DUAL Y-AXIS: CVD (Left) & Delta Volume (Right)
    yaxis: [
      {
        // LEFT Y-AXIS: CVD ✅
        seriesName: 'CVD',
        opposite: false,
        axisTicks: {
          show: true
        },
        axisBorder: {
          show: true,
          color: '#3b82f6'
        },
        labels: {
          style: {
            colors: '#3b82f6',
            fontSize: '12px',
            fontWeight: 600
          },
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        },
        title: {
          text: 'CVD (Cumulative Volume Delta)',
          style: {
            color: '#3b82f6',
            fontSize: '13px',
            fontWeight: 600
          }
        }
      },
      {
        // RIGHT Y-AXIS: DELTA VOLUME ✅
        seriesName: 'Delta Volume',
        opposite: true,
        axisTicks: {
          show: true
        },
        axisBorder: {
          show: true,
          color: '#00ff88'
        },
        labels: {
          style: {
            colors: '#8b9dc3',
            fontSize: '12px',
            fontWeight: 600
          },
          formatter: (value) => {
            if (!value) return '0';
            return (value > 0 ? '+' : '') + value.toFixed(2);
          }
        },
        title: {
          text: 'Delta Volume (Buy - Sell)',
          style: {
            color: '#8b9dc3',
            fontSize: '13px',
            fontWeight: 600
          }
        }
      }
    ],
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '13px',
      fontWeight: 600,
      labels: {
        colors: ['#3b82f6', '#8b9dc3']
      },
      markers: {
        width: 12,
        height: 12,
        strokeWidth: 0,
        radius: 2
      },
      itemMargin: {
        horizontal: 15,
        vertical: 5
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      x: {
        format: 'dd MMM HH:mm:ss'
      },
      y: [
        {
          // CVD tooltip
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        },
        {
          // Delta Volume tooltip - Color coded
          formatter: (value) => {
            if (!value) return '0';
            return (value > 0 ? '+' : '') + value.toFixed(2);
          }
        }
      ]
    }
  };

  cvdChart = new ApexCharts(document.querySelector("#dual_priceChart"), cvdDeltaOptions);
  cvdChart.render();

  console.log('✅ CVD + Delta Volume chart initialized');

  // ============================================
  // CHART 2: PRICE (LINE) + VOLUME (STACKED BAR: BUY/SELL)
  // ============================================
  // ✅ Price Line: Xanh lá (Green)
  // ✅ Volume Stacked Bar:
  //    - Bottom: Buy Volume (Xanh / Green) #00ff88
  //    - Top: Sell Volume (Đỏ / Red) #ff4444
  // ✅ Data Labels on each segment

  const priceVolumeOptions = {
    ...darkTheme,
    series: [
      {
        name: 'Buy Volume',
        type: 'bar',
        data: []
      },
      {
        name: 'Sell Volume',
        type: 'bar',
        data: []
      }
    ],
    chart: {
      ...darkTheme.chart,
      id: 'price-volume-realtime',
      height: 450,
      type: 'bar',
      stacked: true,  // ✅ KEY: Stacked bars
      stackType: '100%',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 300,
          animateGradually: {
            enabled: true,
            delay: 100
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
      enabled: true,  // ✅ Show data on bars
      formatter: function(val) {
        if (!val) return '';
        if (Math.abs(val) >= 1000) {
          return (Math.abs(val) / 1000).toFixed(1) + 'K';
        }
        return val.toFixed(0);
      },
      style: {
        fontSize: '12px',
        fontWeight: 600,
        colors: ['#ffffff']
      },
      offsetY: 0
    },
    stroke: {
      width: 1,
      colors: ['transparent']
    },
    fill: {
      opacity: 1
    },
    colors: [
      '#00ff88',  // Buy Volume - Xanh (Green)
      '#ff4444'   // Sell Volume - Đỏ (Red)
    ],
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 8,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'all',
        dataLabels: {
          total: {
            enabled: true,
            style: {
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff'
            }
          }
        }
      }
    },
    title: {
      text: 'BTC/USDT Volume Analysis (Buy/Sell Stacked) - Realtime Stream',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '16px',
        fontWeight: 600
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          hour: 'HH:mm',
          minute: 'HH:mm',
          second: 'HH:mm:ss'
        },
        style: {
          colors: '#8b9dc3'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Volume (Buy + Sell)',
        style: {
          color: '#8b9dc3',
          fontSize: '13px',
          fontWeight: 600
        }
      },
      labels: {
        style: {
          colors: '#8b9dc3',
          fontSize: '12px',
          fontWeight: 600
        },
        formatter: (value) => {
          if (!value) return '0';
          if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
          } else if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
          }
          return value.toFixed(0);
        }
      }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '13px',
      fontWeight: 600,
      labels: {
        colors: ['#00ff88', '#ff4444']
      },
      markers: {
        width: 12,
        height: 12,
        strokeWidth: 0,
        radius: 2
      },
      itemMargin: {
        horizontal: 15,
        vertical: 5
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      x: {
        format: 'dd MMM HH:mm:ss'
      },
      y: [
        {
          // Buy Volume tooltip
          title: {
            formatter: () => 'Buy Volume'
          },
          formatter: (value) => {
            if (!value) return '0';
            if (Math.abs(value) >= 1000000) {
              return (value / 1000000).toFixed(2) + 'M';
            } else if (Math.abs(value) >= 1000) {
              return (value / 1000).toFixed(2) + 'K';
            }
            return value.toFixed(0);
          }
        },
        {
          // Sell Volume tooltip
          title: {
            formatter: () => 'Sell Volume'
          },
          formatter: (value) => {
            if (!value) return '0';
            if (Math.abs(value) >= 1000000) {
              return (value / 1000000).toFixed(2) + 'M';
            } else if (Math.abs(value) >= 1000) {
              return (value / 1000).toFixed(2) + 'K';
            }
            return value.toFixed(0);
          }
        }
      ]
    }
  };

  dual_priceChart = new ApexCharts(document.querySelector("#cvdChart"), priceVolumeOptions);
  dual_priceChart.render();

  console.log('✅ Price + Volume (Stacked) chart initialized');
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================
// ✅ EXTRACTED FROM: Original code lines 154-201

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('✅ WebSocket connected - Realtime streaming active');
    reconnectAttempts = 0;
    updateConnectionStatus(true);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
    updateConnectionStatus(false);
  };

  ws.onclose = () => {
    console.log('🔌 WebSocket disconnected');
    updateConnectionStatus(false);
    reconnectWebSocket();
  };
}

function reconnectWebSocket() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('❌ Max reconnection attempts reached');
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(1000 * reconnectAttempts, 5000);
  
  console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
  
  setTimeout(() => {
    connectWebSocket();
  }, delay);
}

// ============================================
// WEBSOCKET MESSAGE HANDLER
// ============================================
// ✅ EXTRACTED FROM: Original code lines 210-237

function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'initialState':
      console.log('📦 Received initial state:', message.data);
      updateMetricsFromState(message.data);
      break;

    case 'cvdUpdate':
      handleCVDUpdate(message.data);
      break;

    case 'candleClosed':
      handleCandleClosed(message.data);
      break;

    default:
      console.warn('Unknown message type:', message.type);
  }
}

function handleCVDUpdate(data) {
  // Update metrics instantly
  const priceElement = document.getElementById('price');
  if (priceElement) {
    priceElement.textContent = '$' + data.price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  const cvdElement = document.getElementById('cvd');
  if (cvdElement) {
    cvdElement.textContent = data.cvd.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    cvdElement.classList.remove('positive', 'negative');
    cvdElement.classList.add(data.cvd >= 0 ? 'positive' : 'negative');
  }

  const liveIndicator = document.getElementById('liveIndicator');
  if (liveIndicator) {
    liveIndicator.style.display = 'flex';
  }
}

function handleCandleClosed(data) {
  console.log(`📊 Candle closed: ${data.timeframe}`);

  if (data.timeframe === currentTimeframe) {
    const timestamp = new Date(data.candle.timestamp).getTime();

    // ✅ UPDATE CHART 1: CVD + Delta Volume
    if (cvdChart) {
      const deltaVolume = data.candle.buyVolume - data.candle.sellVolume;

      cvdChart.appendData([
        { data: [{ x: timestamp, y: data.candle.cvdClose }] },      // CVD (Line)
        { data: [{ x: timestamp, y: deltaVolume }] }                 // Delta (Bar)
      ]);
    }

    // ✅ UPDATE CHART 2: Volume Stacked (Buy + Sell)
    if (dual_priceChart) {
      dual_priceChart.appendData([
        { data: [{ x: timestamp, y: data.candle.buyVolume }] },      // Buy Volume (Green)
        { data: [{ x: timestamp, y: data.candle.sellVolume }] }      // Sell Volume (Red)
      ]);
    }

    console.log('✅ Both charts updated with new candle');
    updateVolumeBars(data.candle);
  }
}

// ============================================
// INITIAL DATA LOAD
// ============================================
// ✅ EXTRACTED FROM: Original code lines 290-360

async function startInitialDataLoad() {
  await loadInitialChartData();
  
  setInterval(async () => {
    try {
      const response = await fetch('/api/state');
      const state = await response.json();
      
      const tradesElement = document.getElementById('trades');
      if (tradesElement) {
        tradesElement.textContent = state.tradesCount.toLocaleString();
      }

      if (state.currentCandle) {
        const delta = state.currentCandle.cvdClose - state.currentCandle.cvdOpen;
        const deltaElement = document.getElementById('delta');
        
        if (deltaElement) {
          deltaElement.textContent = (delta > 0 ? '+' : '') + delta.toFixed(0);
          deltaElement.classList.remove('positive', 'negative');
          deltaElement.classList.add(delta >= 0 ? 'positive' : 'negative');
        }
      }
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }, 1000);
}

async function loadInitialChartData() {
  try {
    console.log(`📊 Loading initial data for ${currentTimeframe}...`);
    
    const useAggregation = currentTimeframe !== '1m';
    const url = `/api/cvd/${currentTimeframe}?limit=100&aggregate=${useAggregation}`;
    
    const response = await fetch(url);
    const data = await response.json();

    console.log(`📦 Response:`, {
      timeframe: data.timeframe,
      count: data.count,
      aggregated: data.aggregated
    });

    if (!data.data || data.data.length === 0) {
      console.log('⏳ No data yet, waiting...');
      showWaitingMessage();
      return;
    }

    clearWaitingMessage();

    // ✅ Prepare data for BOTH charts
    const cvdData = [];
    const deltaVolumeData = [];
    const buyVolumeData = [];
    const sellVolumeData = [];

    data.data.forEach((candle) => {
      const timestamp = new Date(candle.timestamp).getTime();
      
      if (timestamp && !isNaN(timestamp)) {
        // Chart 1: CVD + Delta Volume
        cvdData.push({ x: timestamp, y: candle.cvdClose || 0 });
        
        const deltaVolume = (candle.buyVolume || 0) - (candle.sellVolume || 0);
        deltaVolumeData.push({ x: timestamp, y: deltaVolume });
        
        // Chart 2: Volume Stacked (Buy + Sell)
        buyVolumeData.push({ x: timestamp, y: candle.buyVolume || 0 });
        sellVolumeData.push({ x: timestamp, y: candle.sellVolume || 0 });
      }
    });

    console.log(`✅ Prepared ${cvdData.length} data points`);

    // ✅ Update Chart 1: CVD + Delta Volume
    if (cvdData.length > 0 && deltaVolumeData.length > 0) {
      cvdChart.updateSeries([
        { name: 'CVD', data: cvdData },
        { name: 'Delta Volume', data: deltaVolumeData }
      ], true);

      console.log('✅ CVD + Delta Volume chart updated');
    }

    // ✅ Update Chart 2: Volume Stacked (Buy + Sell)
    if (buyVolumeData.length > 0 && sellVolumeData.length > 0) {
      dual_priceChart.updateSeries([
        { name: 'Buy Volume', data: buyVolumeData },
        { name: 'Sell Volume', data: sellVolumeData }
      ], true);

      console.log('✅ Volume Stacked chart updated');
    }

    if (data.data.length > 0) {
      updateVolumeBars(data.data[data.data.length - 1]);
    }

  } catch (error) {
    console.error('❌ Error loading initial data:', error);
    showErrorMessage(error.message);
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  const timeframeSelect = document.getElementById('timeframe');
  if (timeframeSelect) {
    timeframeSelect.addEventListener('change', (e) => {
      currentTimeframe = e.target.value;
      console.log(`📊 Timeframe changed to: ${currentTimeframe}`);
      loadInitialChartData();
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function updateMetricsFromState(state) {
  const priceElement = document.getElementById('price');
  if (priceElement && state.currentPrice > 0) {
    priceElement.textContent = '$' + state.currentPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  const cvdElement = document.getElementById('cvd');
  if (cvdElement) {
    cvdElement.textContent = state.cvdTotal.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    cvdElement.classList.remove('positive', 'negative');
    cvdElement.classList.add(state.cvdTotal >= 0 ? 'positive' : 'negative');
  }

  const tradesElement = document.getElementById('trades');
  if (tradesElement) {
    tradesElement.textContent = state.tradesCount.toLocaleString();
  }

  const symbolElement = document.getElementById('symbol');
  if (symbolElement) {
    symbolElement.textContent = state.symbol;
  }
}

function updateConnectionStatus(connected) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    if (connected) {
      statusElement.textContent = '🟢 Connected';
      statusElement.classList.add('connected');
    } else {
      statusElement.textContent = '🔴 Disconnected';
      statusElement.classList.remove('connected');
    }
  }

  const liveIndicator = document.getElementById('liveIndicator');
  if (liveIndicator) {
    liveIndicator.style.display = connected ? 'flex' : 'none';
  }
}

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

function showWaitingMessage() {
  const container = document.querySelector('#dual_priceChart');
  if (container && !container.querySelector('.waiting-message')) {
    const message = document.createElement('div');
    message.className = 'waiting-message';
    message.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 450px;
        color: #8b9dc3;
        text-align: center;
      ">
        <div style="font-size: 3em; margin-bottom: 20px;">⚡</div>
        <div style="font-size: 1.2em; margin-bottom: 10px; font-weight: 500;">
          Streaming Active
        </div>
        <div style="font-size: 0.9em;">
          Waiting for candles to form...
        </div>
      </div>
    `;
    container.appendChild(message);
  }
}

function clearWaitingMessage() {
  document.querySelectorAll('.waiting-message, .error-message').forEach(el => el.remove());
}

function showErrorMessage(errorMsg) {
  const container = document.querySelector('#dual_priceChart');
  if (container && !container.querySelector('.error-message')) {
    const message = document.createElement('div');
    message.className = 'error-message';
    message.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 450px;
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
}

// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', () => {
  if (ws) ws.close();
  if (cvdChart) cvdChart.destroy();
  if (dual_priceChart) dual_priceChart.destroy();
  if (analysisUpdateInterval) clearInterval(analysisUpdateInterval);
  console.log('🧹 Cleanup complete');
});

console.log('⚡ CVD Monitor - TWO CHARTS (CVD + STACKED VOLUME) LOADED');