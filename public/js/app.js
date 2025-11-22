// ============================================
// CVD TRADING MONITOR - 3 SYNCHRONIZED CHARTS
// ============================================

let cvdChart = null;
let volumeChart = null;
let priceChart = null;
let cvdDeltaChart = null;  // ✅ Chart 4: CVD & Delta Volume
let currentTimeframe = '5m';
let streamingMode = 'candle';  // ✅ NEW: 'candle' or 'realtime'
let ws = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let analysisUpdateInterval = null;

// ✅ Global Apex settings for synchronized charts
window.Apex = {
  chart: {
    sparkline: {
      enabled: false
    },
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
    },
    zoom: {
      enabled: true,
      type: 'x',
      autoScaleYaxis: true
    }
  },
  stroke: {
    curve: 'smooth'
  },
  dataLabels: {
    enabled: false
  }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing CVD Monitor - 3 SYNCHRONIZED CHARTS...');
  
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
// CHART INITIALIZATION - 3 SYNCHRONIZED CHARTS
// ============================================

function initCharts() {
  console.log('📊 Initializing 3 synchronized charts...');

  const darkTheme = {
    theme: {
      mode: 'dark',
      palette: 'palette1'
    },
    chart: {
      background: 'transparent',
      foreColor: '#8b9dc3'
    },
    grid: {
      borderColor: '#2a3f5f',
      strokeDashArray: 3
    }
  };

  const CHART_HEIGHT = 400;
  const Y_AXIS_MIN_WIDTH = 60;
  const SYNC_GROUP = 'cvd-monitor';

  // ✅ CHART 1: CVD & Price (Line + Line on Dual Axis)
  const cvdPriceOptions = {
    ...darkTheme,
    series: [
      {
        name: 'CVD',
        type: 'line',
        data: []
      },
      {
        name: 'Price',
        type: 'line',
        data: []
      }
    ],
    chart: {
      ...darkTheme.chart,
      id: 'cvd-price-chart',
      group: SYNC_GROUP,
      height: CHART_HEIGHT,
      type: 'line',
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
      }
    },
    stroke: {
      width: [3, 3],
      curve: 'smooth',
      colors: ['#3b82f6', '#22c55e']
    },
    colors: ['#3b82f6', '#22c55e'],
    title: {
      text: '💎 CVD & Price (Dual Axis)',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '14px',
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
        // LEFT: CVD
        seriesName: 'CVD',
        opposite: false,
        axisBorder: {
          show: true,
          color: '#3b82f6'
        },
        axisTicks: {
          show: true,
          color: '#3b82f6'
        },
        labels: {
          style: {
            colors: '#3b82f6',
            fontSize: '11px'
          },
          minWidth: Y_AXIS_MIN_WIDTH,
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        },
        title: {
          text: 'CVD',
          style: {
            color: '#3b82f6'
          }
        }
      },
      {
        // RIGHT: Price
        seriesName: 'Price',
        opposite: true,
        axisBorder: {
          show: true,
          color: '#22c55e'
        },
        axisTicks: {
          show: true,
          color: '#22c55e'
        },
        labels: {
          style: {
            colors: '#22c55e',
            fontSize: '11px'
          },
          minWidth: Y_AXIS_MIN_WIDTH,
          formatter: (value) => {
            if (!value) return '$0';
            return '$' + value.toFixed(2);
          }
        },
        title: {
          text: 'Price ($)',
          style: {
            color: '#22c55e'
          }
        }
      }
    ],
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      labels: {
        colors: ['#3b82f6', '#22c55e']
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      x: {
        format: 'dd MMM HH:mm:ss'
      }
    }
  };

  cvdChart = new ApexCharts(document.querySelector("#chart-1"), cvdPriceOptions);
  cvdChart.render();

  // ✅ CHART 2: Volume (Buy/Sell Stacked) - SIMPLE, NO DUAL AXIS
  const volumeOptions = {
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
      id: 'volume-chart',
      group: SYNC_GROUP,
      height: CHART_HEIGHT,
      type: 'bar',
      stacked: true,
      stackType: '100%'
    },
    dataLabels: {
      enabled: true,
      formatter: function(val) {
        if (!val) return '';
        return val.toFixed(0);
      },
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: ['#ffffff']
      }
    },
    stroke: {
      width: 1,
      colors: ['transparent']
    },
    colors: [
      '#00ff88',  // Buy Volume
      '#ff4444'   // Sell Volume
    ],
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'all',
        dataLabels: {
          total: {
            enabled: true,
            style: {
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff'
            }
          }
        }
      }
    },
    title: {
      text: '📊 Volume (Buy/Sell Stacked)',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '14px',
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
      labels: {
        style: {
          colors: '#8b9dc3',
          fontSize: '11px'
        },
        minWidth: Y_AXIS_MIN_WIDTH,
        formatter: (value) => {
          if (!value) return '0';
          return value.toFixed(0);
        }
      },
      title: {
        text: 'Volume',
        style: {
          color: '#8b9dc3'
        }
      }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      labels: {
        colors: ['#00ff88', '#ff4444']
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
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        },
        {
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        }
      ]
    }
  };

  volumeChart = new ApexCharts(document.querySelector("#chart-2"), volumeOptions);
  volumeChart.render();

  // ✅ CHART 3: Delta Volume + Price (Dual Axis) - FIXED
  const deltaOptions = {
    ...darkTheme,
    series: [
      {
        name: 'Delta Volume',
        type: 'bar',
        data: []
      },
      {
        name: 'Price',
        type: 'line',
        data: []
      }
    ],
    chart: {
      ...darkTheme.chart,
      id: 'delta-chart',
      group: SYNC_GROUP,
      height: CHART_HEIGHT,
      type: 'bar'
    },
    dataLabels: {
      enabled: false  // Disable to avoid conflicts
    },
    stroke: {
      width: [0, 3],
      curve: 'smooth',
      colors: ['transparent', '#22c55e']
    },
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 6,
        colors: {
          ranges: [
            { from: -1000000, to: 0, color: '#ff4444' },
            { from: 0.01, to: 1000000, color: '#00ff88' }
          ]
        }
      }
    },
    title: {
      text: '⚡ Delta Volume (Buy - Sell) + Price (Dual Axis)',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '14px',
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
    yaxis: [
      {
        // LEFT: Delta Volume (Series Index 0)
        seriesName: 'Delta Volume',
        opposite: false,
        axisBorder: {
          show: true,
          color: '#8b9dc3'
        },
        axisTicks: {
          show: true,
          color: '#8b9dc3'
        },
        labels: {
          style: {
            colors: '#8b9dc3',
            fontSize: '11px'
          },
          minWidth: Y_AXIS_MIN_WIDTH,
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        },
        title: {
          text: 'Delta',
          style: {
            color: '#8b9dc3'
          }
        }
      },
      {
        // RIGHT: Price (Series Index 1)
        seriesName: 'Price',
        opposite: true,
        axisBorder: {
          show: true,
          color: '#22c55e'
        },
        axisTicks: {
          show: true,
          color: '#22c55e'
        },
        labels: {
          style: {
            colors: '#22c55e',
            fontSize: '11px'
          },
          minWidth: Y_AXIS_MIN_WIDTH,
          formatter: (value) => {
            if (!value) return '$0';
            return '$' + value.toFixed(2);
          }
        },
        title: {
          text: 'Price ($)',
          style: {
            color: '#22c55e'
          }
        }
      }
    ],
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      labels: {
        colors: ['#ff6b6b', '#22c55e']
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
          formatter: (value) => {
            if (!value) return '0';
            return (value > 0 ? '+' : '') + value.toFixed(0);
          }
        },
        {
          formatter: (value) => {
            if (!value) return '$0.00';
            return '$' + value.toFixed(2);
          }
        }
      ]
    }
  };

  priceChart = new ApexCharts(document.querySelector("#chart-3"), deltaOptions);
  priceChart.render();

  // ✅ CHART 4: CVD & Delta Volume (Dual Axis) - CVD Line + Delta Bars
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
      id: 'cvd-delta-chart',
      group: SYNC_GROUP,
      height: CHART_HEIGHT,
      type: 'line'  // Primary type is line
    },
    stroke: {
      width: [3, 0],  // Line for CVD, no stroke for bars
      curve: 'smooth',
      colors: ['#3b82f6', 'transparent']
    },
    colors: ['#3b82f6', '#00ff88'],  // CVD blue, Delta green default
    dataLabels: {
      enabled: false
    },
    title: {
      text: '📈 CVD & Delta Volume (Dual Axis Analysis)',
      align: 'left',
      style: {
        color: '#8b9dc3',
        fontSize: '14px',
        fontWeight: 600
      }
    },
    markers: {
      size: 3,
      hover: {
        size: 5
      }
    },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 3,
        colors: {
          ranges: [
            { from: -1000000, to: 0, color: '#ff4444' },  // Red for SELL
            { from: 0.01, to: 1000000, color: '#00ff88' }  // Green for BUY
          ]
        }
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
        // LEFT: CVD (Line)
        seriesName: 'CVD',
        opposite: false,
        axisBorder: {
          show: true,
          color: '#3b82f6'
        },
        axisTicks: {
          show: true,
          color: '#3b82f6'
        },
        labels: {
          style: {
            colors: '#3b82f6',
            fontSize: '11px'
          },
          minWidth: Y_AXIS_MIN_WIDTH,
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        },
        title: {
          text: 'CVD',
          style: {
            color: '#3b82f6'
          }
        }
      },
      {
        // RIGHT: Delta Volume (Bars)
        seriesName: 'Delta Volume',
        opposite: true,
        axisBorder: {
          show: true,
          color: '#00ff88'
        },
        axisTicks: {
          show: true,
          color: '#00ff88'
        },
        labels: {
          style: {
            colors: '#8b9dc3',
            fontSize: '11px'
          },
          minWidth: Y_AXIS_MIN_WIDTH,
          formatter: (value) => {
            if (!value) return '0';
            return (value > 0 ? '+' : '') + value.toFixed(0);
          }
        },
        title: {
          text: 'Delta (Buy - Sell)',
          style: {
            color: '#8b9dc3'
          }
        }
      }
    ],
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      labels: {
        colors: ['#3b82f6', '#8b9dc3']
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
          title: {
            formatter: () => 'CVD'
          },
          formatter: (value) => {
            if (!value) return '0';
            return value.toFixed(0);
          }
        },
        {
          title: {
            formatter: () => 'Delta Volume'
          },
          formatter: (value) => {
            if (!value) return '0';
            const type = value > 0 ? '🟢 Buy' : '🔴 Sell';
            return `${type}: ${Math.abs(value).toFixed(0)}`;
          }
        }
      ]
    }
  };

  cvdDeltaChart = new ApexCharts(document.querySelector("#chart-4"), cvdDeltaOptions);
  cvdDeltaChart.render();

  console.log('✅ 4 Synchronized charts initialized');
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('✅ WebSocket connected');
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
  
  console.log(`🔄 Reconnecting in ${delay}ms...`);
  
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
      console.log('📦 Received initial state');
      updateMetricsFromState(message.data);
      break;

    case 'cvdUpdate':
      handleCVDUpdate(message.data);
      break;

    case 'candleClosed':
      handleCandleClosed(message.data);
      break;

    case 'tradeTick':
      // ✅ NEW: Real-time trade tick
      if (streamingMode === 'realtime') {
        handleRealtimeTradeTick(message.data);
      }
      break;

    default:
      console.warn('Unknown message type:', message.type);
  }
}

function handleCVDUpdate(data) {
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
}

// ✅ NEW: Real-time Trade Tick Handler
function handleRealtimeTradeTick(data) {
  // Update metrics TỨC THỜI (every trade)
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

  const deltaElement = document.getElementById('delta');
  if (deltaElement && data.delta !== undefined) {
    deltaElement.textContent = (data.delta > 0 ? '+' : '') + data.delta.toFixed(0);
    deltaElement.classList.remove('positive', 'negative');
    deltaElement.classList.add(data.delta >= 0 ? 'positive' : 'negative');
  }

  // Show live indicator
  const liveIndicator = document.getElementById('liveIndicator');
  if (liveIndicator) {
    liveIndicator.style.display = 'flex';
  }

  // ✅ NEW: Update Charts Real-time!
  if (streamingMode === 'realtime') {
    updateChartsRealtime(data);
  }

  console.log(`⚡ Real-time tick: Price $${data.price.toFixed(2)}, CVD ${data.cvd.toFixed(0)}`);
}

// ✅ NEW: Update all charts in real-time
function updateChartsRealtime(data) {
  const timestamp = data.timestamp || Date.now();
  
  // Chart 1: CVD & Price
  if (cvdChart && data.cvd !== undefined && data.price !== undefined) {
    cvdChart.appendData([
      { data: [{ x: timestamp, y: data.cvd }] },      // CVD
      { data: [{ x: timestamp, y: data.price }] }     // Price
    ]);
  }

  // Chart 2: Volume (if buy/sell data provided)
  if (volumeChart && data.buyVolume !== undefined && data.sellVolume !== undefined) {
    volumeChart.appendData([
      { data: [{ x: timestamp, y: data.buyVolume }] },    // Buy
      { data: [{ x: timestamp, y: data.sellVolume }] }    // Sell
    ]);
  }

  // Chart 3: Delta & Price
  if (priceChart && data.delta !== undefined && data.price !== undefined) {
    priceChart.appendData([
      { data: [{ x: timestamp, y: data.delta }] },    // Delta
      { data: [{ x: timestamp, y: data.price }] }     // Price
    ]);
  }

  // Chart 4: CVD & Delta
  if (cvdDeltaChart && data.cvd !== undefined && data.delta !== undefined) {
    cvdDeltaChart.appendData([
      { data: [{ x: timestamp, y: data.cvd }] },      // CVD
      { data: [{ x: timestamp, y: data.delta }] }     // Delta
    ]);
  }
}

function handleCandleClosed(data) {
  console.log(`📊 Candle closed: ${data.timeframe}`);

  if (data.timeframe === currentTimeframe) {
    const timestamp = new Date(data.candle.timestamp).getTime();
    const deltaVolume = data.candle.buyVolume - data.candle.sellVolume;

    // ✅ UPDATE CHART 1: CVD & Price
    if (cvdChart) {
      cvdChart.appendData([
        { data: [{ x: timestamp, y: data.candle.cvdClose }] },
        { data: [{ x: timestamp, y: data.candle.close }] }
      ]);
    }

    // ✅ UPDATE CHART 2: Volume (Stacked) ONLY - 2 SERIES
    if (volumeChart) {
      volumeChart.appendData([
        { data: [{ x: timestamp, y: data.candle.buyVolume }] },      // Buy Volume
        { data: [{ x: timestamp, y: data.candle.sellVolume }] }      // Sell Volume
      ]);
    }

    // ✅ UPDATE CHART 3: Delta Volume + Price (Dual Axis)
    if (priceChart) {
      priceChart.appendData([
        { data: [{ x: timestamp, y: deltaVolume }] },               // Delta
        { data: [{ x: timestamp, y: data.candle.close }] }          // Price
      ]);
    }

    // ✅ UPDATE CHART 4: CVD & Delta Volume (Dual Axis)
    if (cvdDeltaChart) {
      cvdDeltaChart.appendData([
        { data: [{ x: timestamp, y: data.candle.cvdClose }] },         // CVD
        { data: [{ x: timestamp, y: deltaVolume }] }                   // Delta Volume
      ]);
    }

    console.log('✅ All 4 charts updated');
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

    const cvdData = [];
    const priceData = [];
    const buyVolumeData = [];
    const sellVolumeData = [];
    const deltaVolumeData = [];
    const priceData3 = [];
    const cvdDeltaData = [];  // ✅ Chart 4: CVD data
    const deltaChartData = [];  // ✅ Chart 4: Delta data

    data.data.forEach((candle) => {
      const timestamp = new Date(candle.timestamp).getTime();
      
      if (timestamp && !isNaN(timestamp)) {
        // Chart 1: CVD & Price
        cvdData.push({ x: timestamp, y: candle.cvdClose || 0 });
        priceData.push({ x: timestamp, y: candle.close || 0 });
        
        // Chart 2: Volume
        buyVolumeData.push({ x: timestamp, y: candle.buyVolume || 0 });
        sellVolumeData.push({ x: timestamp, y: candle.sellVolume || 0 });
        
        // Chart 3: Delta + Price
        const deltaVolume = (candle.buyVolume || 0) - (candle.sellVolume || 0);
        deltaVolumeData.push({ x: timestamp, y: deltaVolume });
        priceData3.push({ x: timestamp, y: candle.close || 0 });

        // Chart 4: CVD & Delta Volume
        cvdDeltaData.push({ x: timestamp, y: candle.cvdClose || 0 });
        deltaChartData.push({ x: timestamp, y: deltaVolume });
      }
    });

    console.log(`✅ Prepared ${cvdData.length} data points`);

    // ✅ Update Chart 1
    if (cvdData.length > 0) {
      cvdChart.updateSeries([
        { name: 'CVD', data: cvdData },
        { name: 'Price', data: priceData }
      ], true);
      console.log('✅ Chart 1 updated');
    }

    // ✅ Update Chart 2 (2 series only)
    if (buyVolumeData.length > 0) {
      volumeChart.updateSeries([
        { name: 'Buy Volume', data: buyVolumeData },
        { name: 'Sell Volume', data: sellVolumeData }
      ], true);
      console.log('✅ Chart 2 updated');
    }

    // ✅ Update Chart 3 (2 series)
    if (deltaVolumeData.length > 0) {
      priceChart.updateSeries([
        { name: 'Delta Volume', data: deltaVolumeData },
        { name: 'Price', data: priceData3 }
      ], true);
      console.log('✅ Chart 3 updated');
    }

    // ✅ Update Chart 4 (CVD & Delta Volume)
    if (cvdDeltaData.length > 0) {
      cvdDeltaChart.updateSeries([
        { name: 'CVD', data: cvdDeltaData },
        { name: 'Delta Volume', data: deltaChartData }
      ], true);
      console.log('✅ Chart 4 updated');
    }

    if (data.data.length > 0) {
      updateVolumeBars(data.data[data.data.length - 1]);
      // ✅ Start CVD analysis
      setTimeout(() => startCVDAnalysis(), 1000);
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

  // ✅ NEW: Streaming Mode Selector
  const streamingModeSelect = document.getElementById('streamingMode');
  if (streamingModeSelect) {
    streamingModeSelect.addEventListener('change', (e) => {
      streamingMode = e.target.value;
      console.log(`🎯 Streaming mode changed to: ${streamingMode}`);
      
      if (streamingMode === 'realtime') {
        console.log('⚡ Real-time Trade Stream ENABLED - Updates on every trade');
      } else {
        console.log('📊 Candle Mode ENABLED - Updates every 1 minute');
      }
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
  if (buyValueElement) buyValueElement.textContent = buyVol.toFixed(0);

  const sellElement = document.getElementById('sellVolume');
  const sellPercentElement = document.getElementById('sellVolumePercent');
  const sellValueElement = document.getElementById('sellVolumeValue');

  if (sellElement) sellElement.style.width = sellPercent + '%';
  if (sellPercentElement) sellPercentElement.textContent = sellPercent.toFixed(1) + '%';
  if (sellValueElement) sellValueElement.textContent = sellVol.toFixed(0);
}

function showWaitingMessage() {
  const container = document.querySelector('#chart-1');
  if (container && !container.querySelector('.waiting-message')) {
    const message = document.createElement('div');
    message.className = 'waiting-message';
    message.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; color: #8b9dc3; text-align: center;">
        <div style="font-size: 3em; margin-bottom: 20px;">⚡</div>
        <div style="font-size: 1.2em; margin-bottom: 10px; font-weight: 500;">Streaming Active</div>
        <div style="font-size: 0.9em;">Waiting for candles to form...</div>
      </div>
    `;
    container.appendChild(message);
  }
}

function clearWaitingMessage() {
  document.querySelectorAll('.waiting-message, .error-message').forEach(el => el.remove());
}

function showErrorMessage(errorMsg) {
  const container = document.querySelector('#chart-1');
  if (container && !container.querySelector('.error-message')) {
    const message = document.createElement('div');
    message.className = 'error-message';
    message.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; color: #ff4444; text-align: center;">
        <div style="font-size: 3em; margin-bottom: 20px;">❌</div>
        <div style="font-size: 1.2em; margin-bottom: 10px; font-weight: 500;">Error</div>
        <div style="font-size: 0.9em; max-width: 400px;">${errorMsg}</div>
      </div>
    `;
    container.appendChild(message);
  }
}

// ============================================
// CVD ANALYSIS ENGINE (Theory-Based)
// ============================================

function analyzeCVD(candles, currentPrice) {
  if (!candles || candles.length < 5) {
    return {
      decision: 'WAIT',
      signal: '⏸️ Not Enough Data',
      confidence: 0,
      action: 'Chờ dữ liệu',
      reason: 'Cần ít nhất 5 candles để phân tích'
    };
  }

  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const earlier = candles[candles.length - 5];

  // Calculate CVD values
  const cvdNow = latest.cvdClose;
  const cvdPrev = previous ? previous.cvdClose : cvdNow;
  const cvdEarlier = earlier ? earlier.cvdClose : cvdNow;

  // Calculate Price values
  const priceNow = latest.close;
  const pricePrev = previous ? previous.close : priceNow;
  const priceEarlier = earlier ? earlier.close : priceNow;

  // Detect trends
  const cvdTrending = cvdNow > cvdPrev;  // True = increasing
  const priceTrending = priceNow > pricePrev;  // True = increasing

  // Detect divergence
  const bullishDiv = !priceTrending && cvdTrending;  // Price Lower Low, CVD Higher Low
  const bearishDiv = priceTrending && !cvdTrending;  // Price Higher High, CVD Lower High

  // Check volatility
  const cvdVolatility = Math.abs(cvdNow - cvdEarlier);
  const priceVolatility = Math.abs(priceNow - priceEarlier);

  let decision = 'HOLD';
  let signal = '⏸️ Chờ tín hiệu';
  let confidence = 50;
  let action = 'Quan sát thị trường';
  let reason = 'CVD ổn định, chưa rõ tín hiệu';

  // ============================================
  // DECISION LOGIC (Theo lý thuyết của bạn)
  // ============================================

  // 1. STRONG BULLISH DIVERGENCE
  if (bullishDiv && cvdNow > 0) {
    decision = 'ENTRY_LONG';
    signal = '🟢 Bullish Divergence (Strong)';
    confidence = 85;
    action = 'Chuẩn bị LONG tại Support';
    reason = 'Price tạo Lower Low + CVD tạo Higher Low → Divergence bullish tích cực';
  }

  // 2. STRONG BEARISH DIVERGENCE
  else if (bearishDiv && cvdNow < 0) {
    decision = 'ENTRY_SHORT';
    signal = '🔴 Bearish Divergence (Strong)';
    confidence = 85;
    action = 'Chuẩn bị SHORT tại Resistance';
    reason = 'Price tạo Higher High + CVD tạo Lower High → Divergence bearish tiêu cực';
  }

  // 3. SUSTAINED UPTREND
  else if (cvdTrending && priceTrending && cvdNow > 0) {
    decision = 'HOLD_LONG';
    signal = '🟢 Xu hướng TĂNG bền vững';
    confidence = 75;
    action = 'Giữ lệnh LONG, Move SL';
    reason = 'Giá + CVD cùng tăng → Xu hướng tăng rõ ràng';
  }

  // 4. SUSTAINED DOWNTREND
  else if (!cvdTrending && !priceTrending && cvdNow < 0) {
    decision = 'HOLD_SHORT';
    signal = '🔴 Xu hướng GIẢM bền vững';
    confidence = 75;
    action = 'Giữ lệnh SHORT, Move SL';
    reason = 'Giá + CVD cùng giảm → Xu hướng giảm rõ ràng';
  }

  // 5. CVD BREAKOUT SIGNAL
  else if (cvdVolatility > priceVolatility * 1.5 && Math.abs(cvdNow) > 100) {
    if (cvdNow > 0) {
      decision = 'PREPARE_BREAKOUT_UP';
      signal = '🚀 Chuẩn bị Breakout Tăng';
      confidence = 70;
      action = 'Chờ breakout tăng - Chuẩn bị LONG';
      reason = 'CVD tăng mạnh trong khi giá sideway → Chuẩn bị breakthrough tăng';
    } else {
      decision = 'PREPARE_BREAKOUT_DOWN';
      signal = '📉 Chuẩn bị Breakdown Giảm';
      confidence = 70;
      action = 'Chờ breakdown giảm - Chuẩn bị SHORT';
      reason = 'CVD giảm mạnh trong khi giá sideway → Chuẩn bị breakthrough giảm';
    }
  }

  // 6. WEAK TREND (No sync)
  else if (cvdTrending !== priceTrending) {
    decision = 'REDUCE_RISK';
    signal = '⚠️ Xu hướng YẾU';
    confidence = 40;
    action = 'Giảm size hoặc không trade';
    reason = 'Giá không đồng bộ với CVD → Xu hướng yếu, rủi ro cao';
  }

  // 7. CHOPPY / NO CLEAR DIRECTION
  else if (Math.abs(cvdNow) < 50) {
    decision = 'STAY_OUT';
    signal = '❌ CVD Loạn xạ';
    confidence = 20;
    action = 'NGỒI NGOÀI - Không giao dịch';
    reason = 'CVD loạn xạ, không rõ hướng → Tránh giao dịch';
  }

  return {
    decision,
    signal,
    confidence,
    action,
    reason,
    cvdValue: cvdNow.toFixed(0),
    priceValue: priceNow.toFixed(2),
    cvdTrend: cvdTrending ? '↑ Tăng' : '↓ Giảm',
    priceTrend: priceTrending ? '↑ Tăng' : '↓ Giảm',
    bullishDiv: bullishDiv ? '✓ Có' : '✗ Không',
    bearishDiv: bearishDiv ? '✓ Có' : '✗ Không'
  };
}

function displayCVDAnalysis(analysis) {
  const container = document.getElementById('analysisContent');
  if (!container) return;

  const signalColors = {
    'ENTRY_LONG': '#00ff88',
    'ENTRY_SHORT': '#ff4444',
    'HOLD_LONG': '#00ff88',
    'HOLD_SHORT': '#ff4444',
    'PREPARE_BREAKOUT_UP': '#00d4ff',
    'PREPARE_BREAKOUT_DOWN': '#ffeb3b',
    'REDUCE_RISK': '#ffeb3b',
    'STAY_OUT': '#8b9dc3',
    'WAIT': '#8b9dc3'
  };

  const color = signalColors[analysis.decision] || '#8b9dc3';

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <!-- Left Column: Decision -->
      <div>
        <div style="font-size: 1.3em; font-weight: 700; color: ${color}; margin-bottom: 10px;">
          ${analysis.signal}
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
          <div style="font-size: 0.85em; color: #cbd5e1; margin-bottom: 5px;">Quyết định</div>
          <div style="font-size: 1.1em; font-weight: 600; color: ${color};">${analysis.action}</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
          <div style="font-size: 0.85em; color: #cbd5e1; margin-bottom: 5px;">Độ tin cậy</div>
          <div style="font-size: 1.2em; font-weight: 700; color: ${analysis.confidence >= 70 ? '#00ff88' : analysis.confidence >= 50 ? '#ffeb3b' : '#ff4444'};">
            ${analysis.confidence}%
          </div>
        </div>
      </div>

      <!-- Right Column: Details -->
      <div>
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
          <div style="font-size: 0.85em; color: #cbd5e1;">Lý do</div>
          <div style="font-size: 0.9em; color: #e0e0e0; margin-top: 5px; line-height: 1.5;">
            ${analysis.reason}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="background: rgba(59, 130, 246, 0.2); padding: 8px; border-radius: 6px; border-left: 3px solid #3b82f6;">
            <div style="font-size: 0.8em; color: #3b82f6;">CVD</div>
            <div style="font-size: 0.95em; font-weight: 600; color: #e0e0e0;">${analysis.cvdValue}</div>
            <div style="font-size: 0.8em; color: #8b9dc3;">${analysis.cvdTrend}</div>
          </div>
          <div style="background: rgba(34, 197, 94, 0.2); padding: 8px; border-radius: 6px; border-left: 3px solid #22c55e;">
            <div style="font-size: 0.8em; color: #22c55e;">Giá</div>
            <div style="font-size: 0.95em; font-weight: 600; color: #e0e0e0;">$${analysis.priceValue}</div>
            <div style="font-size: 0.8em; color: #8b9dc3;">${analysis.priceTrend}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signal Indicators -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
      <div style="text-align: center;">
        <div style="font-size: 0.85em; color: #8b9dc3; margin-bottom: 5px;">Divergence Bullish</div>
        <div style="font-size: 1.2em; color: ${analysis.bullishDiv === '✓ Có' ? '#00ff88' : '#8b9dc3'};">
          ${analysis.bullishDiv}
        </div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 0.85em; color: #8b9dc3; margin-bottom: 5px;">Divergence Bearish</div>
        <div style="font-size: 1.2em; color: ${analysis.bearishDiv === '✓ Có' ? '#ff4444' : '#8b9dc3'};">
          ${analysis.bearishDiv}
        </div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 0.85em; color: #8b9dc3; margin-bottom: 5px;">Cập nhật lần cuối</div>
        <div style="font-size: 0.9em; color: #cbd5e1;">
          ${new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  `;
}

function startCVDAnalysis() {
  // Initial analysis
  updateCVDAnalysis();
  
  // Update every 5 seconds
  setInterval(() => {
    updateCVDAnalysis();
  }, 5000);
}

function updateCVDAnalysis() {
  try {
    if (cvdChart && cvdChart.series && cvdChart.series.length > 0) {
      // Get current candles data
      const allData = cvdChart.getSeries()[0].data;
      if (!allData || allData.length === 0) return;

      // Build candles array from chart data
      const candles = allData.map((point, idx) => ({
        timestamp: point.x,
        cvdClose: point.y,
        close: priceChart ? (priceChart.series && priceChart.series[1] ? priceChart.series[1].data[idx]?.y : 0) : 0
      }));

      const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
      const analysis = analyzeCVD(candles, currentPrice);
      displayCVDAnalysis(analysis);
    }
  } catch (error) {
    console.error('CVD Analysis error:', error);
  }
}
// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', () => {
  if (ws) ws.close();
  if (cvdChart) cvdChart.destroy();
  if (volumeChart) volumeChart.destroy();
  if (priceChart) priceChart.destroy();
  if (cvdDeltaChart) cvdDeltaChart.destroy();  // ✅ Cleanup Chart 4
  if (analysisUpdateInterval) clearInterval(analysisUpdateInterval);
  console.log('🧹 Cleanup complete - All 4 charts destroyed');
});

console.log('⚡ CVD Monitor - 3 SYNCHRONIZED CHARTS LOADED');