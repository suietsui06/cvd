const cron = require('node-cron');
const discordService = require('./discordService');
const database = require('./database');

class HealthMonitor {
  constructor(ws, cvd) {
    this.ws = ws;
    this.cvd = cvd;
    this.lastHealthCheck = null;
  }

  start() {
    // Health check every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.performHealthCheck();
    });

    // Daily summary at 9 AM
    cron.schedule('0 9 * * *', async () => {
      await this.sendDailySummary();
    });

    console.log('✅ Health monitor started');
  }

  async performHealthCheck() {
    const status = {
      websocket: {
        connected: this.ws.isConnected(),
        lastTradeTime: this.cvd.trades[this.cvd.trades.length - 1]?.timestamp,
        tradesCount: this.cvd.trades.length,
      },
      database: await database.healthCheck(),
      discord: {
        connected: true, // Assume true if we can send
        lastAlertTime: new Date(),
        alertsSent: 0, // TODO: Track this
      },
      performance: {
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
      },
    };

    this.lastHealthCheck = status;

    // Check for issues
    const hasIssues = !status.websocket.connected || !status.database.healthy;

    if (hasIssues) {
      await discordService.sendLog('warn', 'Health check detected issues', status);
    }

    // Send full status every hour
    const now = new Date();
    if (now.getMinutes() === 0) {
      await discordService.sendHealthStatus(status);
    }

    return status;
  }

  async sendDailySummary() {
    // TODO: Implement daily summary
    const Signal = require('../models/Signal');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const signals = await Signal.find({
      timestamp: { $gte: yesterday, $lt: today },
    });

    const summary = {
      date: yesterday.toDateString(),
      totalSignals: signals.length,
      high: signals.filter((s) => s.confidence === 'HIGH').length,
      medium: signals.filter((s) => s.confidence === 'MEDIUM').length,
      low: signals.filter((s) => s.confidence === 'LOW').length,
      long: signals.filter((s) => s.direction === 'LONG').length,
      short: signals.filter((s) => s.direction === 'SHORT').length,
    };

    await discordService.sendLog('info', 'Daily Summary', summary);
  }
}

module.exports = HealthMonitor;