const axios = require('axios');
const config = require('../config/config');

class DiscordService {
  constructor() {
    this.webhooks = config.discord.webhooks;
    this.rateLimit = {
      signals: { count: 0, resetTime: Date.now() + 60000 },
      high: { count: 0, resetTime: Date.now() + 60000 },
      medium: { count: 0, resetTime: Date.now() + 60000 },
      logs: { count: 0, resetTime: Date.now() + 60000 },
    };
    this.queue = [];
    this.processing = false;
  }

  /**
   * Send message to Discord webhook
   */
  async sendWebhook(webhookUrl, payload, retries = 0) {
    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return { success: true, response: response.data };
    } catch (error) {
      console.error('Discord webhook error:', error.response?.data || error.message);

      // Retry logic
      if (retries < config.discord.retryAttempts) {
        console.log(`Retrying... (${retries + 1}/${config.discord.retryAttempts})`);
        await this.sleep(config.discord.retryDelay * (retries + 1));
        return this.sendWebhook(webhookUrl, payload, retries + 1);
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(channel) {
    const now = Date.now();
    const limit = this.rateLimit[channel];

    if (!limit) return true;

    // Reset if time passed
    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + 60000;
    }

    // Check limit
    if (limit.count >= config.discord.rateLimitPerMinute) {
      console.warn(`⚠️  Discord rate limit reached for ${channel}`);
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Send signal alert
   */
  async sendSignalAlert(signal) {
    const channel = this.getChannelForSignal(signal);
    const webhookUrl = this.webhooks[channel];

    if (!webhookUrl) {
      console.warn(`No webhook configured for channel: ${channel}`);
      return;
    }

    if (!this.checkRateLimit(channel)) {
      // Add to queue
      this.queue.push({ type: 'signal', data: signal, channel });
      return;
    }

    const embed = this.createSignalEmbed(signal);
    const payload = {
      username: 'CVD Trading Bot',
      avatar_url: 'https://i.imgur.com/your-bot-avatar.png', // Optional
      embeds: [embed],
    };

    const result = await this.sendWebhook(webhookUrl, payload);

    if (result.success) {
      console.log(`✅ Signal alert sent to Discord (${channel})`);
    } else {
      console.error(`❌ Failed to send signal alert: ${result.error}`);
    }

    return result;
  }

  /**
   * Create rich embed for signal
   */
  createSignalEmbed(signal) {
    const colors = {
      HIGH: 0x00ff88,    // Green
      MEDIUM: 0xffaa00,  // Orange
      LOW: 0x8b9dc3,     // Gray
    };

    const emojis = {
      BULLISH_DIVERGENCE: '🟢',
      BEARISH_DIVERGENCE: '🔴',
      VOLUME_SPIKE: '⚡',
      TREND_CHANGE: '🔄',
      STRONG_MOMENTUM: '🚀',
      BUY_SELL_IMBALANCE: '⚖️',
    };

    const directionEmoji = signal.direction === 'LONG' ? '📈' : '📉';
    const emoji = emojis[signal.type] || '📊';

    // Calculate suggested SL and TP (simple example)
    const slDistance = signal.price * 0.015; // 1.5%
    const tpDistance = signal.price * 0.03;  // 3%
    
    const suggestedSL = signal.direction === 'LONG' 
      ? signal.price - slDistance 
      : signal.price + slDistance;
    
    const suggestedTP = signal.direction === 'LONG'
      ? signal.price + tpDistance
      : signal.price - tpDistance;

    const embed = {
      title: `${emoji} ${signal.type.replace(/_/g, ' ')}`,
      description: signal.description,
      color: colors[signal.confidence] || 0x8b9dc3,
      fields: [
        {
          name: '📊 Symbol',
          value: signal.symbol,
          inline: true,
        },
        {
          name: '⏱️ Timeframe',
          value: signal.timeframe,
          inline: true,
        },
        {
          name: '⭐ Confidence',
          value: signal.confidence,
          inline: true,
        },
        {
          name: '💰 Entry Price',
          value: `$${signal.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          inline: true,
        },
        {
          name: '📊 CVD',
          value: signal.cvd.toLocaleString('en-US', { minimumFractionDigits: 0 }),
          inline: true,
        },
        {
          name: '💪 Strength',
          value: `${signal.strength.toFixed(1)}%`,
          inline: true,
        },
        {
          name: `${directionEmoji} Direction`,
          value: `**${signal.direction}**`,
          inline: false,
        },
        {
          name: '🎯 Suggested Levels',
          value: `**SL:** $${suggestedSL.toFixed(2)}\n**TP:** $${suggestedTP.toFixed(2)}`,
          inline: false,
        },
      ],
      footer: {
        text: 'Auto-detected by CVD Bot • React to track',
      },
      timestamp: new Date(signal.timestamp).toISOString(),
    };

    return embed;
  }

  /**
   * Get appropriate channel for signal
   */
  getChannelForSignal(signal) {
    if (signal.confidence === 'HIGH') {
      return 'high';
    } else if (signal.confidence === 'MEDIUM') {
      return 'medium';
    } else {
      return 'signals';
    }
  }

  /**
   * Send system log
   */
  async sendLog(level, message, data = null) {
    const webhookUrl = this.webhooks.logs;

    if (!webhookUrl) return;

    const colors = {
      error: 0xff4444,   // Red
      warn: 0xffaa00,    // Orange
      info: 0x3b82f6,    // Blue
      success: 0x00ff88, // Green
    };

    const emojis = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      success: '✅',
    };

    const embed = {
      title: `${emojis[level]} ${level.toUpperCase()}: ${message}`,
      color: colors[level] || 0x8b9dc3,
      timestamp: new Date().toISOString(),
    };

    if (data) {
      embed.description = '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }

    const payload = {
      username: 'CVD Bot - System',
      embeds: [embed],
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * Send health status
   */
  async sendHealthStatus(status) {
    const webhookUrl = this.webhooks.logs;

    if (!webhookUrl) return;

    const isHealthy = status.websocket.connected && status.database.connected;

    const embed = {
      title: isHealthy ? '✅ System Healthy' : '⚠️ System Issues',
      color: isHealthy ? 0x00ff88 : 0xffaa00,
      fields: [
        {
          name: '🔌 WebSocket',
          value: status.websocket.connected ? '✅ Connected' : '❌ Disconnected',
          inline: true,
        },
        {
          name: '💾 Database',
          value: status.database.connected ? '✅ Connected' : '❌ Disconnected',
          inline: true,
        },
        {
          name: '📊 Trades Today',
          value: status.websocket.tradesCount?.toString() || '0',
          inline: true,
        },
        {
          name: '💾 Memory Usage',
          value: `${(status.performance.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
          inline: true,
        },
        {
          name: '⏱️ Uptime',
          value: this.formatUptime(status.performance.uptime),
          inline: true,
        },
        {
          name: '🎯 Signals Today',
          value: status.discord?.alertsSent?.toString() || '0',
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: 'CVD Bot - Health Check',
      embeds: [embed],
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * Send backtest results
   */
  async sendBacktestResults(results) {
    const webhookUrl = this.webhooks.backtest;

    if (!webhookUrl) return;

    const winRate = (results.wins / results.total_signals * 100).toFixed(1);
    const isProfit = results.total_pnl > 0;

    const embed = {
      title: '📊 Backtest Results',
      color: isProfit ? 0x00ff88 : 0xff4444,
      fields: [
        {
          name: '📈 Total Signals',
          value: results.total_signals.toString(),
          inline: true,
        },
        {
          name: '✅ Wins',
          value: `${results.wins} (${winRate}%)`,
          inline: true,
        },
        {
          name: '❌ Losses',
          value: results.losses.toString(),
          inline: true,
        },
        {
          name: '💰 Total P&L',
          value: `${results.total_pnl > 0 ? '+' : ''}${results.total_pnl.toFixed(2)}%`,
          inline: true,
        },
        {
          name: '📈 Avg Win',
          value: `+${results.avg_win.toFixed(2)}%`,
          inline: true,
        },
        {
          name: '📉 Avg Loss',
          value: `${results.avg_loss.toFixed(2)}%`,
          inline: true,
        },
      ],
      footer: {
        text: `Backtest Period: ${results.period || 'N/A'}`,
      },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: 'CVD Bot - Backtest',
      embeds: [embed],
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * Send trade result update
   */
  async sendTradeResult(signal, outcome) {
    const webhookUrl = this.webhooks.signals;

    if (!webhookUrl) return;

    const isWin = outcome.pnlPercent > 0;

    const embed = {
      title: isWin ? '✅ Trade WIN' : '❌ Trade LOSS',
      color: isWin ? 0x00ff88 : 0xff4444,
      description: `Original signal: ${signal.type.replace(/_/g, ' ')}`,
      fields: [
        {
          name: 'Entry',
          value: `$${signal.price.toFixed(2)}`,
          inline: true,
        },
        {
          name: 'Exit',
          value: `$${outcome.exitPrice.toFixed(2)}`,
          inline: true,
        },
        {
          name: 'P&L',
          value: `${outcome.pnlPercent > 0 ? '+' : ''}${outcome.pnlPercent.toFixed(2)}%`,
          inline: true,
        },
        {
          name: 'Holding Period',
          value: `${outcome.holdingPeriod} minutes`,
          inline: true,
        },
        {
          name: 'Signal Time',
          value: new Date(signal.timestamp).toLocaleString(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: 'CVD Bot - Trade Results',
      embeds: [embed],
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * Helper: Format uptime
   */
  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process queued messages
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();

      if (item.type === 'signal') {
        await this.sendSignalAlert(item.data);
      }

      // Wait a bit between messages
      await this.sleep(2000);
    }

    this.processing = false;
  }
}

module.exports = new DiscordService();