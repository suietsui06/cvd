/*
const config = require('./config/config');
const Database = require('./services/database');
const BinanceWebSocket = require('./services/websocket');
const CVDCalculator = require('./services/cvdCalculator');
const SignalDetector = require('./services/signalDetector');
const HealthMonitor = require('./services/healthMonitor');
const WebServer = require('./services/webServer');
const discordService = require('./services/discordService');

class Application {
  constructor() {
    this.db = Database;
    this.ws = new BinanceWebSocket();
    this.cvd = new CVDCalculator();
    this.signalDetector = null;
    this.healthMonitor = null;
    this.webServer = null;
  }

  async start() {
    console.log('🚀 Starting CVD Trading Bot...\n');

    try {
      // 1. Connect to MongoDB
      await this.db.connect();

      // 2. Load initial CVD
      await this.cvd.loadInitialCVD();

      // 3. Setup WebSocket handlers
      this.setupWebSocketHandlers();

      // 4. Connect WebSocket
      this.ws.connect();

      // 5. Start signal detector
      this.signalDetector = new SignalDetector(this.cvd);

      // 6. Start health monitor
      this.healthMonitor = new HealthMonitor(this.ws, this.cvd);
      this.healthMonitor.start();

      // 7. Start web server
      this.webServer = new WebServer(this.cvd, this.signalDetector);
      this.webServer.start();

      // 8. Setup graceful shutdown
      this.setupGracefulShutdown();

      // 9. Send startup notification
      await discordService.sendLog('success', 'CVD Bot Started', {
        symbol: config.binance.symbol,
        timeframes: ['1m', '5m', '15m', '1h'],
        alertsEnabled: true,
      });

      console.log('\n✅ All systems operational!\n');
    } catch (error) {
      console.error('❌ Failed to start application:', error);
      await discordService.sendLog('error', 'Bot Failed to Start', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  }

  setupWebSocketHandlers() {
    this.ws.on('connected', async () => {
      console.log('✅ WebSocket connected');
      await discordService.sendLog('success', 'WebSocket Connected');
    });

    this.ws.on('trade', async (trade) => {
      await this.cvd.processTrade(trade);
    });

    this.ws.on('error', async (error) => {
      console.error('❌ WebSocket error:', error);
      await discordService.sendLog('error', 'WebSocket Error', {
        message: error.message,
      });
    });

    this.ws.on('disconnected', async ({ code, reason }) => {
      console.log(`⚠️  WebSocket disconnected: ${code} - ${reason}`);
      await discordService.sendLog('warn', 'WebSocket Disconnected', {
        code,
        reason,
      });
    });

    this.ws.on('maxReconnectAttemptsReached', async () => {
      console.error('❌ Max reconnect attempts reached. Shutting down...');
      await discordService.sendLog('error', 'Max Reconnect Attempts Reached');
      this.shutdown();
    });
  }

  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n\n📡 Received ${signal}, shutting down gracefully...`);
        await this.shutdown();
      });
    });

    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught Exception:', error);
      await discordService.sendLog('error', 'Uncaught Exception', {
        message: error.message,
        stack: error.stack,
      });
      this.shutdown();
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      await discordService.sendLog('error', 'Unhandled Rejection', {
        reason: reason?.toString(),
      });
    });
  }

  async shutdown() {
    console.log('\n🛑 Shutting down...');

    try {
      // Send shutdown notification
      await discordService.sendLog('warn', 'CVD Bot Shutting Down');

      // 1. Stop WebSocket
      if (this.ws) {
        this.ws.disconnect();
      }

      // 2. Stop web server
      if (this.webServer) {
        this.webServer.stop();
      }

      // 3. Disconnect database
      await this.db.disconnect();

      console.log('✅ Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Run application
const app = new Application();
app.start();