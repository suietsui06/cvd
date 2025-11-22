// Test 1: Get 1m candles (base)
fetch('/api/cvd/1m?limit=10&aggregate=false')
  .then(r => r.json())
  .then(d => {
    console.log('1m candles:', d.count);
    console.log('Aggregated:', d.aggregated);
  });

// Test 2: Get 5m aggregated from 1m
fetch('/api/cvd/5m?limit=10&aggregate=true')
  .then(r => r.json())
  .then(d => {
    console.log('5m candles:', d.count);
    console.log('Aggregated:', d.aggregated);
    console.table(d.data.slice(0, 3));
  });

// Test 3: Compare stored vs aggregated
Promise.all([
  fetch('/api/cvd/5m?limit=5&aggregate=false').then(r => r.json()),
  fetch('/api/cvd/5m?limit=5&aggregate=true').then(r => r.json())
]).then(([stored, aggregated]) => {
  console.log('Stored 5m:', stored.count);
  console.log('Aggregated 5m:', aggregated.count);
});


fetch('/api/debug/aggregation/5m')
  .then(r => r.json())
  .then(d => {
    console.log('Debug Aggregation:', d);
    console.table(d.sample.stored);
    console.table(d.sample.aggregated);
  });