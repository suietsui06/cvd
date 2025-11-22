require('dotenv').config();
const discordService = require('./services/discordService');

async function testDiscordAlerts() {
  console.log('🧪 Testing Discord alerts...\n');

  // Test 1: Send test signal
  const testSignal = {
    type: 'BULLISH_DIVERGENCE',
    direction: 'LONG',
    confidence: 'HIGH',
    timeframe: '5m',
    symbol: 'BTCUSDT',
    price: 49245.5,
    cvd: 125450,
    strength: 85,
    description: 'Price LL but CVD HL at support zone',
    timestamp: new Date(),
  };

  console.log('1️⃣ Sending test signal...');
  await discordService.sendSignalAlert(testSignal);

  // Test 2: Send log
  console.log('2️⃣ Sending test log...');
  await discordService.sendLog('info', 'Test Log Message', {
    test: true,
    timestamp: new Date(),
  });

  // Test 3: Send health status
  console.log('3️⃣ Sending health status...');
  await discordService.sendHealthStatus({
    websocket: { connected: true, tradesCount: 1234 },
    database: { connected: true, healthy: true },
    discord: { connected: true, alertsSent: 42 },
    performance: {
      memoryUsage: 150 * 1024 * 1024,
      uptime: 3600,
    },
  });

  console.log('\n✅ All tests complete! Check your Discord channels.');
}

testDiscordAlerts().catch(console.error);