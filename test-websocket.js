const WebSocket = require('ws');

console.log('🔌 Testing WebSocket connection...');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server!');
  
  // Send ping
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', message.type);
  
  if (message.type === 'initialState') {
    console.log('📊 Initial State:', {
      cvdTotal: message.data.cvdTotal,
      tradesCount: message.data.tradesCount,
      currentPrice: message.data.currentPrice
    });
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Auto close after 5 seconds
setTimeout(() => {
  console.log('⏰ Test complete, closing...');
  ws.close();
}, 5000);