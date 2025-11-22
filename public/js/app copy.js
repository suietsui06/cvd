// App State
let chart = null;
let currentTimeframe = '5m';
let updateInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  setupEventListeners();
  startUpdates();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('timeframe').addEventListener('change', (e) => {
    currentTimeframe = e.target.value;
    updateChart();
  });
}

// Initialize Chart
function initChart() {
  const ctx = document.getElementById('cvdChart').getContext('2d');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Price',
          data: [],
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          borderWidth: 2,
          yAxisID: 'y',
          tension: 0.4,
        },
        {
          label: 'CVD',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          yAxisID: 'y1',
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: '#8b9dc3',
          },
        },
        tooltip: {
          backgroundColor: '#1a1f3a',
          titleColor: '#ffffff',
          bodyColor: '#8b9dc3',
          borderColor: '#2a3f5f',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: {
            color: '#2a3f5f',
          },
          ticks: {
            color: '#8b9dc3',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: '#2a3f5f',
          },
          ticks: {
            color: '#00ff88',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#3b82f6',
          },
        },
      },
    },
  });
}

// Update Chart
async function updateChart() {
  try {
    const response = await fetch(`/api/cvd/${currentTimeframe}?limit=100`);
    const data = await response.json();

    const labels = data.data.map((d) => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });

    const prices = data.data.map((d) => d.price);
    const cvds = data.data.map((d) => d.cvd);

    chart.data.labels = labels;
    chart.data.datasets[0].data = prices;
    chart.data.datasets[1].data = cvds;
    chart.update('none'); // No animation for smoother updates
  } catch (error) {
    console.error('Error updating chart:', error);
  }
}

// Update Metrics
async function updateMetrics() {
  try {
    const response = await fetch('/api/state');
    const state = await response.json();

    document.getElementById('price').textContent = `$${state.currentPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    document.getElementById('cvd').textContent = state.cvdTotal.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const cvdElement = document.getElementById('cvd');
    cvdElement.classList.toggle('negative', state.cvdTotal < 0);

    document.getElementById('trades').textContent = state.tradesCount.toLocaleString();

    if (state.currentCandle) {
      const delta = state.currentCandle.cvdClose - state.currentCandle.cvdOpen;
      const deltaElement = document.getElementById('delta');
      deltaElement.textContent = (delta > 0 ? '+' : '') + delta.toFixed(0);
      deltaElement.classList.toggle('negative', delta < 0);
    }

    // Update status
    const statusElement = document.getElementById('status');
    statusElement.textContent = '🟢 Connected';
    statusElement.classList.add('connected');
  } catch (error) {
    console.error('Error updating metrics:', error);
    const statusElement = document.getElementById('status');
    statusElement.textContent = '🔴 Disconnected';
    statusElement.classList.remove('connected');
  }
}

// Update Signals
async function updateSignals() {
  try {
    const response = await fetch('/api/signals?minutes=60&confidence=MEDIUM');
    const data = await response.json();

    const signalsContainer = document.getElementById('signals');

    if (data.count === 0) {
      signalsContainer.innerHTML = '<p class="no-data">No signals in the last hour</p>';
      return;
    }

    signalsContainer.innerHTML = data.signals
      .slice(-10) // Last 10 signals
      .reverse()
      .map((signal) => {
        const time = new Date(signal.timestamp).toLocaleTimeString();
        const direction = signal.direction.toLowerCase();

        return `
        <div class="signal ${direction}">
          <div class="signal-info">
            <div class="signal-type">${signal.type.replace(/_/g, ' ')}</div>
            <div class="signal-description">${signal.description}</div>
            <div class="signal-meta">
              <span>${time}</span>
              <span>${signal.timeframe}</span>
              <span>$${signal.price.toLocaleString()}</span>
            </div>
          </div>
          <div class="signal-badge ${signal.confidence.toLowerCase()}">
            ${signal.confidence}
          </div>
        </div>
      `;
      })
      .join('');
  } catch (error) {
    console.error('Error updating signals:', error);
  }
}

// Start periodic updates
function startUpdates() {
  // Initial updates
  updateMetrics();
  updateChart();
  updateSignals();

  // Periodic updates
  updateInterval = setInterval(() => {
    updateMetrics();
    updateChart();
    updateSignals();
  }, 5000); // Every 5 seconds
}

// Cleanup
window.addEventListener('beforeunload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});