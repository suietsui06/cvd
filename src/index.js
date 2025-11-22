const config = require('./config/config');
const BinanceWebSocket = require('./services/websocket');
const CVDCalculator = require('./services/cvdCalculator');
const WebServer = require('./services/webServer');

class Application {
  constructor() {
    this.ws = new BinanceWebSocket();
    this.cvd = new CVDCalculator();
    this.webServer = null;
  }

  async start() {
    console.log('🚀 Starting CVD Trading Bot - REALTIME STREAMING MODE\n');

    try {
      // 1. Setup WebSocket handlers
      this.setupWebSocketHandlers();

      // 2. Connect to Binance WebSocket
      this.ws.connect();

      // 3. Start web server (await to ensure it's ready)
      this.webServer = new WebServer(this.cvd);
      await this.webServer.start();

      // 4. Setup graceful shutdown
      this.setupGracefulShutdown();

      // 5. Print status
      this.startStatusPrinter();

      console.log('✅ All systems operational!\n');

    } catch (error) {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  setupWebSocketHandlers() {
    this.ws.on('connected', () => {
      console.log('✅ Connected to Binance WebSocket');
      console.log('⚡ Realtime CVD calculation started\n');
    });

    this.ws.on('trade', async (trade) => {
      await this.cvd.processTrade(trade);
    });

    this.ws.on('error', (error) => {
      console.error('❌ Binance WebSocket error:', error.message);
    });

    this.ws.on('disconnected', ({ code, reason }) => {
      console.log(`⚠️  Binance WebSocket disconnected: ${code} - ${reason}`);
    });

    this.ws.on('maxReconnectAttemptsReached', () => {
      console.error('❌ Max reconnect attempts reached');
      this.shutdown();
    });
  }

  startStatusPrinter() {
    setInterval(() => {
      const state = this.cvd.getCurrentState();
      const wsStatus = this.ws.isConnected() ? '🟢' : '🔴';

      console.log('\n' + '='.repeat(60));
      console.log(`${wsStatus} Status - ${new Date().toLocaleTimeString()}`);
      console.log('='.repeat(60));
      console.log(`Symbol: ${state.symbol}`);
      console.log(`Price: $${state.currentPrice.toFixed(2)}`);
      console.log(`CVD: ${state.cvdTotal.toFixed(0)}`);
      console.log(`Trades: ${state.tradesCount}`);
      console.log(`WebSocket Clients: ${this.webServer.clients.size}`);
      console.log(`Candles: 1m=${this.cvd.candles['1m']?.length || 0} 5m=${this.cvd.candles['5m']?.length || 0} 15m=${this.cvd.candles['15m']?.length || 0} 1h=${this.cvd.candles['1h']?.length || 0}`);
      console.log('='.repeat(60) + '\n');
    }, 30000);
  }

  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n\n📡 Received ${signal}, shutting down...`);
        await this.shutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled Rejection:', reason);
    });
  }

  async shutdown() {
    console.log('\n🛑 Shutting down gracefully...');

    try {
      if (this.ws) {
        this.ws.disconnect();
      }

      if (this.webServer) {
        this.webServer.stop();
      }

      console.log('✅ Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start application
const app = new Application();
app.start();