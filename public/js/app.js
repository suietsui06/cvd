// ============================================
// CVD TRADING MONITOR - DUAL AXIS CHART
// ============================================

let combinedChart = null; // ✅ NEW: Combined Price + CVD
let deltaChart = null;
let currentTimeframe = '5m';
let ws = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let analysisUpdateInterval = null;


// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing CVD Monitor - DUAL AXIS MODE...');
  
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
// CHART INITIALIZATION - DUAL AXIS
// ============================================

function initCharts() {
  console.log('📊 Initializing dual-axis charts...');

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

  // ✅ COMBINED CHART: PRICE + CVD (DUAL AXIS)
  const combinedOptions = {
    ...darkTheme,
    series: [
      {
        name: 'Price',
        type: 'line',
        data: []
      },
      {
        name: 'CVD',
        type: 'area',
        data: []
      }
    ],
    chart: {
      ...darkTheme.chart,
      id: 'combined-realtime',
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
      width: [3, 2],
      curve: 'smooth',
      colors: ['#00ff88', '#3b82f6']
    },
    fill: {
      opacity: [1, 0.3],
      type: ['solid', 'gradient'],
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#00ff88', '#1e40af'],
        inverseColors: false,
        opacityFrom: [1, 0.6],
        opacityTo: [1, 0.1],
        stops: [0, 100]
      }
    },
    colors: ['#00ff88', '#3b82f6'],
    title: {
      text: 'BTC/USDT Price & CVD - Realtime Stream',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '16px',
        fontWeight: 600
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
          minute: 'HH:mm',
          second: 'HH:mm:ss'
        },
        style: {
          colors: '#8b9dc3'
        }
      }
    },
    yaxis: [
      {
        // LEFT Y-AXIS: CVD
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
        // RIGHT Y-AXIS: PRICE
        seriesName: 'Price',
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
            colors: '#00ff88',
            fontSize: '12px',
            fontWeight: 600
          },
          formatter: (value) => {
            if (!value) return '$0';
            return '$' + value.toFixed(2);
          }
        },
        title: {
          text: 'Price (USDT)',
          style: {
            color: '#00ff88',
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
        colors: ['#00ff88', '#3b82f6']
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
          // Price tooltip
          formatter: (value) => {
            if (!value) return '$0.00';
            return '$' + value.toFixed(2);
          }
        },
        {
          // CVD tooltip
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        }
      ]
    }
  };

  combinedChart = new ApexCharts(document.querySelector("#combinedChart"), combinedOptions);
  combinedChart.render();

  // DELTA CHART (keep separate)
  const deltaOptions = {
    ...darkTheme,
    series: [{ name: 'Delta', data: [] }],
    chart: {
      ...darkTheme.chart,
      id: 'delta-realtime',
      height: 300,
      type: 'bar',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: { speed: 300 }
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
          ranges: [
            { from: -1000000, to: 0, color: '#ff4444' },
            { from: 0.01, to: 1000000, color: '#00ff88' }
          ]
        },
        columnWidth: '80%'
      }
    },
    dataLabels: { enabled: false },
    title: {
      text: 'Buy/Sell Pressure (Delta per Candle)',
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
      labels: { formatter: (value) => (value || 0).toFixed(0) }
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'HH:mm:ss' },
      y: { formatter: (value) => ((value || 0) > 0 ? '+' : '') + (value || 0).toFixed(0) }
    }
  };

  deltaChart = new ApexCharts(document.querySelector("#deltaChart"), deltaOptions);
  deltaChart.render();

  console.log('✅ Dual-axis charts initialized');
}

// ============================================
// WEBSOCKET CONNECTION (keep same)
// ============================================

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

    // ✅ Append to combined chart (both series)
    if (combinedChart) {
      combinedChart.appendData([
        {
          data: [{ x: timestamp, y: data.candle.close }]
        },
        {
          data: [{ x: timestamp, y: data.candle.cvdClose }]
        }
      ]);
    }

    // Append to delta chart
    if (deltaChart) {
      deltaChart.appendData([{
        data: [{ x: timestamp, y: data.candle.cvdDelta }]
      }]);
    }

    console.log('✅ Charts updated with new candle');
    updateVolumeBars(data.candle);
  }
}

// ============================================
// INITIAL DATA LOAD
// ============================================

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

    // ✅ Prepare data for dual-axis chart
    const priceData = [];
    const cvdData = [];
    const deltaData = [];

    data.data.forEach((candle) => {
      const timestamp = new Date(candle.timestamp).getTime();
      
      if (timestamp && !isNaN(timestamp)) {
        priceData.push({ x: timestamp, y: candle.close || 0 });
        cvdData.push({ x: timestamp, y: candle.cvd || 0 });
        deltaData.push({ x: timestamp, y: candle.delta || 0 });
      }
    });

    console.log(`✅ Prepared ${priceData.length} data points`);

    // ✅ Update combined chart (both series)
    if (priceData.length > 0) {
      combinedChart.updateSeries([
        { name: 'Price', data: priceData },
        { name: 'CVD', data: cvdData }
      ], true);

      deltaChart.updateSeries([
        { name: 'Delta', data: deltaData }
      ], true);
      
      console.log('✅ Charts updated');
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
// HELPER FUNCTIONS (keep same)
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
  const container = document.querySelector('#combinedChart');
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
  const container = document.querySelector('#combinedChart');
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

// Start analysis updates
function startAnalysisUpdates() {
  // Initial update
  updateAnalysis();
  
  // Update every 10 seconds
  analysisUpdateInterval = setInterval(() => {
    updateAnalysis();
  }, 10000);
}

async function updateAnalysis() {
  try {
    console.log(`🔍 Fetching analysis for ${currentTimeframe}...`);
    
    const response = await fetch(`/api/analysis/${currentTimeframe}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📊 Analysis response:', data);
    
    if (data.success && data.analysis) {
      displayAnalysis(data.analysis);
    } else {
      console.warn('⚠️ Invalid analysis data:', data);
      displayAnalysis(null); // Show loading state
    }
  } catch (error) {
    console.error('❌ Error fetching analysis:', error);
    
    // Show error in UI
    const container = document.getElementById('analysisContent');
    if (container) {
      container.innerHTML = `
        <div class="analysis-loading">
          <div style="color: #ff4444; font-size: 1.2em; margin-bottom: 10px;">⚠️</div>
          <div>Lỗi khi tải phân tích</div>
          <div style="font-size: 0.85em; opacity: 0.7; margin-top: 5px;">
            ${error.message}
          </div>
        </div>
      `;
    }
  }
}

function displayAnalysis(analysis) {
  const container = document.getElementById('analysisContent');
  if (!container) return;

  // ✅ FIX: Validate analysis object
  if (!analysis || !analysis.metrics) {
    container.innerHTML = `
      <div class="analysis-loading">
        <div style="font-size: 1.2em; margin-bottom: 10px;">⏳</div>
        <div>Đang thu thập dữ liệu...</div>
        <div style="font-size: 0.85em; opacity: 0.7; margin-top: 5px;">
          Cần ít nhất 10 candles để phân tích
        </div>
      </div>
    `;
    return;
  }

  // Get decision color with fallback
  const decisionColors = {
    'ENTRY_LONG': '#00ff88',
    'ENTRY_SHORT': '#ff4444',
    'HOLD': '#3b82f6',
    'EXIT': '#ff9800',
    'ADD_POSITION': '#00d4ff',
    'REDUCE_RISK': '#ffeb3b',
    'STAY_OUT': '#8b9dc3'
  };

  const color = decisionColors[analysis.decision] || '#8b9dc3';

  // Get confidence color with fallback
  const confidence = analysis.confidence || 0;
  const confidenceColor = confidence >= 70 ? '#00ff88' :
                          confidence >= 50 ? '#ffeb3b' : '#ff4444';

  // ✅ FIX: Safe access to all properties with fallbacks
  const signal = analysis.signal || '⏸️ No Signal';
  const trend = analysis.trend || 'UNKNOWN';
  const timeframe = analysis.timeframe || 'N/A';
  const timeframeContext = analysis.timeframeContext || '';
  const cvdStatus = analysis.cvdStatus || 'CVD: N/A';
  const action = analysis.action || 'Chờ thêm dữ liệu';
  const reason = analysis.reason || 'Đang phân tích...';

  // ✅ FIX: Safe access to metrics with defaults
  const metrics = analysis.metrics || {};
  const priceChange = metrics.priceChange || '0.00%';
  const cvdChange = metrics.cvdChange || '0';
  const deltaCurrent = metrics.deltaCurrent || '0';
  const strength = metrics.strength || 'UNKNOWN';
  const volatility = metrics.volatility || 'UNKNOWN';

  container.innerHTML = `
    <div class="analysis-status">
      <div class="analysis-header">
        <div class="analysis-signal" style="color: ${color};">
          ${signal}
        </div>
        <div class="analysis-confidence" style="background: ${confidenceColor}33; color: ${confidenceColor};">
          ${confidence}% Confidence
        </div>
      </div>

      <div class="analysis-body">
        <div class="analysis-section">
          <h4>📊 Xu Hướng</h4>
          <p><strong>Trend:</strong> ${trend}</p>
          <p><strong>Timeframe:</strong> ${timeframe}</p>
          <p style="font-size: 0.85em; opacity: 0.8;">${timeframeContext}</p>
        </div>

        <div class="analysis-section">
          <h4>💎 CVD Status</h4>
          <p>${cvdStatus}</p>
          <p><strong>Delta hiện tại:</strong> ${deltaCurrent}</p>
        </div>

        <div class="analysis-section" style="grid-column: 1 / -1;">
          <h4>🎯 Hành Động Đề Xuất</h4>
          <p style="font-size: 1.05em; font-weight: 600; color: ${color};">
            ${action}
          </p>
        </div>

        <div class="analysis-section" style="grid-column: 1 / -1;">
          <h4>📝 Lý Do</h4>
          <p>${reason}</p>
        </div>
      </div>

      <div class="analysis-metrics">
        <div class="analysis-metric">
          <div class="analysis-metric-label">Price Change</div>
          <div class="analysis-metric-value" style="color: ${parseFloat(priceChange) >= 0 ? '#00ff88' : '#ff4444'};">
            ${priceChange}
          </div>
        </div>
        <div class="analysis-metric">
          <div class="analysis-metric-label">CVD Change</div>
          <div class="analysis-metric-value" style="color: ${parseFloat(cvdChange) >= 0 ? '#00ff88' : '#ff4444'};">
            ${cvdChange}
          </div>
        </div>
        <div class="analysis-metric">
          <div class="analysis-metric-label">Strength</div>
          <div class="analysis-metric-value">
            ${strength}
          </div>
        </div>
        <div class="analysis-metric">
          <div class="analysis-metric-label">Volatility</div>
          <div class="analysis-metric-value">
            ${volatility}
          </div>
        </div>
      </div>
    </div>
  `;

  // Update timestamp with fallback
  const timeElement = document.getElementById('analysisTime');
  if (timeElement) {
    const timestamp = analysis.timestamp ? new Date(analysis.timestamp) : new Date();
    timeElement.textContent = 'Updated: ' + timestamp.toLocaleTimeString();
  }
}

// Update setupEventListeners to include analysis
function setupEventListeners() {
  const timeframeSelect = document.getElementById('timeframe');
  if (timeframeSelect) {
    timeframeSelect.addEventListener('change', (e) => {
      currentTimeframe = e.target.value;
      console.log(`📊 Timeframe changed to: ${currentTimeframe}`);
      loadInitialChartData();
      updateAnalysis(); // ✅ Update analysis immediately
    });
  }
}

// Update startInitialDataLoad to include analysis
async function startInitialDataLoad() {
  await loadInitialChartData();
  startAnalysisUpdates(); // ✅ Start analysis updates
  
  // ... rest of existing code ...
}



// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', () => {
   if (ws) ws.close();
  if (combinedChart) combinedChart.destroy();
  if (deltaChart) deltaChart.destroy();
  if (analysisUpdateInterval) clearInterval(analysisUpdateInterval); // ✅ Clear interval
  console.log('🧹 Cleanup complete');
});

console.log('⚡ CVD Monitor - DUAL AXIS MODE LOADED');

startStatusPrinter = () =>{
  setInterval(() => {
    const state = this.cvd.getCurrentState();
    const wsStatus = this.ws.isConnected() ? '🟢' : '🔴';

    console.log('\n' + '='.repeat(70));
    console.log(`${wsStatus} Status Update - ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(70));
    console.log(`Symbol: ${state.symbol}`);
    console.log(`Price: $${state.currentPrice.toFixed(2)}`);
    console.log(`CVD Total: ${state.cvdTotal.toFixed(0)}`);
    console.log(`Trades Processed: ${state.tradesCount}`);
    console.log(`WebSocket: ${wsStatus} ${this.ws.isConnected() ? 'Connected' : 'Disconnected'}`);
    console.log(`WebSocket Clients: ${this.webServer.clients.size}`);
    
    // ✅ Show candle counts for all timeframes
    console.log(`\nCandles Available:`);
    console.log(`  1m:  ${this.cvd.candles['1m']?.length || 0} candles`);
    console.log(`  5m:  ${this.cvd.candles['5m']?.length || 0} candles`);
    console.log(`  15m: ${this.cvd.candles['15m']?.length || 0} candles`);
    console.log(`  1h:  ${this.cvd.candles['1h']?.length || 0} candles`);
    
    // ✅ Show current candles status
    console.log(`\nCurrent Candles Building:`);
    Object.entries(this.cvd.currentCandles).forEach(([tf, candle]) => {
      if (candle) {
        console.log(`  ${tf}: Vol ${candle.volume.toFixed(4)}, Delta ${candle.cvdDelta?.toFixed(2) || 'N/A'}`);
      } else {
        console.log(`  ${tf}: Waiting...`);
      }
    });
    
    console.log('='.repeat(70) + '\n');
  }, 30000); // Every 30 seconds
}