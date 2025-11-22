/**
 * Backend Server - CVD Realtime Tracker
 * Xử lý Binance trades + CVD calculation + WebSocket streaming
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const EventEmitter = require('eventemitter3');

// ============================================
// CVD CALCULATOR CLASS
// ============================================

class CVDCalculator extends EventEmitter {
    constructor() {
        super();
        this.symbol = 'BTCUSDT';
        this.cvdTotal = 0;
        this.trades = [];
        this.candles = {
            '1m': [],
            '5m': [],
            '15m': [],
            '1h': [],
        };
        this.currentCandles = {
            '1m': null,
            '5m': null,
            '15m': null,
            '1h': null,
        };
        this.currentCandle = null;
        this.lastCandleTime = {};
    }

    async processTrade(trade) {
        const delta = trade.isSell ? -trade.quantity : trade.quantity;
        this.cvdTotal += delta;

        const tradeRecord = {
            ...trade,
            delta,
            cvd: this.cvdTotal,
        };

        this.trades.push(tradeRecord);

        if (this.trades.length > 1000) {
            this.trades.shift();
        }

        this.updateAllCandles(tradeRecord);

        // 🔴 EMIT EVENT: CVD Update
        this.emit('cvdUpdate', {
            cvd: this.cvdTotal,
            delta,
            price: trade.price,
            timestamp: trade.timestamp,
        });

        return tradeRecord;
    }

    updateAllCandles(trade) {
        const timestamp = new Date(trade.timestamp);
        const timeframes = ['1m', '5m', '15m', '1h'];

        timeframes.forEach((tf) => {
            this.updateCandleForTimeframe(tf, trade, timestamp);
        });
    }

    updateCandleForTimeframe(timeframe, trade, timestamp) {
        const candleStart = this.getCandleStart(timestamp, timeframe);

        if (!this.lastCandleTime[timeframe]) {
            this.lastCandleTime[timeframe] = candleStart;
        } else if (candleStart > this.lastCandleTime[timeframe]) {
            this.closeCandleForTimeframe(timeframe);
            this.lastCandleTime[timeframe] = candleStart;
        }

        if (!this.currentCandles[timeframe]) {
            this.currentCandles[timeframe] = {
                symbol: this.symbol,
                timeframe,
                timestamp: candleStart,
                open: trade.price,
                high: trade.price,
                low: trade.price,
                close: trade.price,
                volume: trade.quantity,
                buyVolume: trade.isSell ? 0 : trade.quantity,
                sellVolume: trade.isSell ? trade.quantity : 0,
                cvdOpen: this.cvdTotal - trade.delta,
                cvdClose: this.cvdTotal,
            };
        } else {
            this.currentCandles[timeframe].high = Math.max(
                this.currentCandles[timeframe].high,
                trade.price
            );
            this.currentCandles[timeframe].low = Math.min(
                this.currentCandles[timeframe].low,
                trade.price
            );
            this.currentCandles[timeframe].close = trade.price;
            this.currentCandles[timeframe].volume += trade.quantity;
            this.currentCandles[timeframe].cvdClose = this.cvdTotal;

            if (trade.isSell) {
                this.currentCandles[timeframe].sellVolume += trade.quantity;
            } else {
                this.currentCandles[timeframe].buyVolume += trade.quantity;
            }
        }
    }

    closeCandleForTimeframe(timeframe) {
        const currentCandle = this.currentCandles[timeframe];

        if (!currentCandle) return;

        const candle = {
            ...currentCandle,
            cvdDelta: currentCandle.cvdClose - currentCandle.cvdOpen,
        };

        if (!this.candles[timeframe]) {
            this.candles[timeframe] = [];
        }
        this.candles[timeframe].push(candle);

        if (this.candles[timeframe].length > 500) {
            this.candles[timeframe].shift();
        }

        // 🔴 EMIT EVENT: Candle Closed
        this.emit('candleClosed', { timeframe, candle });

        console.log(
            `✅ ${timeframe} candle closed: Price $${candle.close.toFixed(2)}, CVD ${candle.cvdClose.toFixed(0)}, Delta ${candle.cvdDelta.toFixed(2)}`
        );

        this.currentCandles[timeframe] = null;
    }

    getCandleStart(timestamp, timeframe) {
        const date = new Date(timestamp);

        switch (timeframe) {
            case '1m':
                return new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    date.getHours(),
                    date.getMinutes(),
                    0,
                    0
                );
            case '5m':
                return new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    date.getHours(),
                    Math.floor(date.getMinutes() / 5) * 5,
                    0,
                    0
                );
            case '15m':
                return new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    date.getHours(),
                    Math.floor(date.getMinutes() / 15) * 15,
                    0,
                    0
                );
            case '1h':
                return new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    date.getHours(),
                    0,
                    0,
                    0
                );
            default:
                return date;
        }
    }

    getCandles(timeframe, limit = 100) {
        const candles = this.candles[timeframe] || [];
        return candles.slice(-limit);
    }

    getCurrentState() {
        return {
            symbol: this.symbol,
            cvdTotal: this.cvdTotal,
            currentPrice: this.currentCandles['5m']?.close || 0,
            tradesCount: this.trades.length,
            currentCandle: this.currentCandles['5m'],
        };
    }
}

// ============================================
// BINANCE STREAM CLASS
// ============================================

class BinanceStream extends EventEmitter {
    constructor(symbol = 'BTCUSDT') {
        super();
        this.symbol = symbol.toLowerCase();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    connect() {
        const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@aggTrade`;
        console.log(`🔌 Connecting to Binance: ${wsUrl}`);

        this.ws = new (require('ws'))(wsUrl);

        this.ws.on('open', () => {
            console.log(`✅ Binance stream connected: ${this.symbol}`);
            this.reconnectAttempts = 0;
            this.emit('connected');
        });

        this.ws.on('message', (data) => {
            try {
                const trade = JSON.parse(data);
                this.processTrade(trade);
            } catch (error) {
                console.error('❌ Error parsing trade:', error);
            }
        });

        this.ws.on('error', (error) => {
            console.error(`❌ Binance stream error: ${error.message}`);
            this.emit('error', error);
        });

        this.ws.on('close', () => {
            console.log('🔌 Binance stream closed');
            this.reconnect();
        });
    }

    processTrade(rawTrade) {
        // Normalize Binance trade format
        const trade = {
            id: rawTrade.a,
            price: parseFloat(rawTrade.p),
            quantity: parseFloat(rawTrade.q),
            timestamp: rawTrade.T,
            isSell: rawTrade.m, // m=true means buyer is maker (sell from taker perspective)
            side: rawTrade.m ? 'SELL' : 'BUY'
        };

        this.emit('trade', trade);
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('error', new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * this.reconnectAttempts, 5000);
        console.log(`🔄 Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// ============================================
// EXPRESS + WEBSOCKET SERVER
// ============================================

class CVDServer {
    constructor(config = {}) {
        this.port = config.port || 5500;
        this.app = express();
        this.server = http.createServer(this.app);

        // WebSocket Server
        this.wss = new WebSocket.Server({ server: this.server });

        // CVD Calculator
        this.cvd = new CVDCalculator();

        // Binance Stream
        this.binanceStream = new BinanceStream('BTCUSDT');

        this.setupExpress();
        this.setupWebSocket();
        this.setupBinanceStream();
    }

    // ========================================
    // EXPRESS SETUP
    // ========================================
    setupExpress() {
        // Serve static files
        this.app.use(express.static(path.join(__dirname, 'public')));

        // API Routes
        this.app.get('/api/state', (req, res) => {
            res.json(this.cvd.getCurrentState());
        });

        this.app.get('/api/cvd/:timeframe', (req, res) => {
            const { timeframe } = req.params;
            const { limit = 100 } = req.query;

            const candles = this.cvd.getCandles(timeframe, parseInt(limit));

            res.json({
                timeframe,
                count: candles.length,
                data: candles
            });
        });

        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/realtime.html'));
        });

        console.log('✅ Express routes configured');
    }

    // ========================================
    // WEBSOCKET SETUP
    // ========================================
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log(`🟢 Client connected. Total: ${this.wss.clients.size}`);

            // 🔴 CRITICAL: Send initial state
            const initialState = this.cvd.getCurrentState();
            ws.send(JSON.stringify({
                type: 'initialState',
                data: initialState
            }));
            console.log('📤 Sent initial state to client');

            // ========================================
            // EVENT LISTENERS FOR THIS CLIENT
            // ========================================

            const handleCVDUpdate = (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'cvdUpdate',
                        data: data
                    }));
                }
            };

            const handleCandleClosed = (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'candleClosed',
                        data: data
                    }));
                }
            };

            // 🔴 CRITICAL: Attach event listeners
            this.cvd.on('cvdUpdate', handleCVDUpdate);
            this.cvd.on('candleClosed', handleCandleClosed);

            ws.on('close', () => {
                console.log(`🔴 Client disconnected. Remaining: ${this.wss.clients.size}`);
                this.cvd.removeListener('cvdUpdate', handleCVDUpdate);
                this.cvd.removeListener('candleClosed', handleCandleClosed);
            });

            ws.on('error', (error) => {
                console.error(`❌ WebSocket error: ${error.message}`);
                this.cvd.removeListener('cvdUpdate', handleCVDUpdate);
                this.cvd.removeListener('candleClosed', handleCandleClosed);
            });
        });

        console.log('✅ WebSocket server configured');
    }

    // ========================================
    // BINANCE STREAM SETUP
    // ========================================
    setupBinanceStream() {
        this.binanceStream.on('trade', async (trade) => {
            try {
                const result = await this.cvd.processTrade(trade);
                console.log(
                    `📊 Trade: ${trade.side} ${trade.quantity.toFixed(4)} @ $${trade.price.toFixed(2)} | CVD: ${this.cvd.cvdTotal.toFixed(0)} | Clients: ${this.wss.clients.size}`
                );
            } catch (error) {
                console.error('❌ Error processing trade:', error);
            }
        });

        this.binanceStream.on('error', (error) => {
            console.error('❌ Binance stream error:', error);
        });

        console.log('✅ Binance stream configured');
    }

    // ========================================
    // START SERVER
    // ========================================
    start() {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log('\n' + '='.repeat(70));
                console.log(`🚀 CVD Server running on http://localhost:${this.port}`);
                console.log('='.repeat(70));
                console.log('');
                console.log('📊 Realtime CVD Tracker');
                console.log(`  - WebSocket: ws://localhost:${this.port}`);
                console.log(`  - HTTP API:  http://localhost:${this.port}`);
                console.log(`  - Frontend:  http://localhost:${this.port}`);
                console.log('');
                console.log('📈 Supported Endpoints:');
                console.log('  GET /api/state                - Current CVD state');
                console.log('  GET /api/cvd/:timeframe       - Candles (1m, 5m, 15m, 1h)');
                console.log('');
                console.log('🔌 WebSocket Messages:');
                console.log('  - initialState: {type, data}');
                console.log('  - cvdUpdate: {type, data}');
                console.log('  - candleClosed: {type, data}');
                console.log('='.repeat(70) + '\n');

                // Start Binance stream
                this.binanceStream.connect();

                resolve();
            });
        });
    }

    // ========================================
    // STOP SERVER
    // ========================================
    stop() {
        return new Promise((resolve) => {
            this.binanceStream.disconnect();
            this.wss.close();
            this.server.close(() => {
                console.log('🛑 Server stopped');
                resolve();
            });
        });
    }

    // ========================================
    // STATUS PRINTER
    // ========================================
    startStatusPrinter(interval = 30000) {
        setInterval(() => {
            const state = this.cvd.getCurrentState();
            const wsStatus = this.wss.clients.size > 0 ? '🟢' : '🔴';

            console.log('\n' + '='.repeat(70));
            console.log(`${wsStatus} Status Update - ${new Date().toLocaleTimeString()}`);
            console.log('='.repeat(70));
            console.log(`Symbol:           ${state.symbol}`);
            console.log(`Current Price:    $${state.currentPrice.toFixed(2)}`);
            console.log(`CVD Total:        ${state.cvdTotal.toFixed(0)}`);
            console.log(`Trades Processed: ${state.tradesCount}`);
            console.log(`Connected Clients: ${this.wss.clients.size}`);
            console.log('');
            console.log('📊 Candles Available:');
            console.log(`  1m:  ${this.cvd.candles['1m']?.length || 0} candles`);
            console.log(`  5m:  ${this.cvd.candles['5m']?.length || 0} candles`);
            console.log(`  15m: ${this.cvd.candles['15m']?.length || 0} candles`);
            console.log(`  1h:  ${this.cvd.candles['1h']?.length || 0} candles`);
            console.log('='.repeat(70) + '\n');
        }, interval);
    }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
    try {
        const server = new CVDServer({
            port : 5500
          //  port: process.env.PORT || 3000
        });

        await server.start();
        server.startStatusPrinter(30000); // Print status every 30 seconds

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down gracefully...');
            await server.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { CVDServer, CVDCalculator, BinanceStream };