#!/usr/bin/env node
// ============================================================
// SHOWBEE Concurrent Load Tester
// Compares Pessimistic vs Optimistic locking under real load
// Also compares Monolith vs Microservice architecture
//
// Usage:
//   node load-test/concurrent-seats.js
//   node load-test/concurrent-seats.js --users=500 --mode=OPTIMISTIC
//   node load-test/concurrent-seats.js --architecture=microservice
// ============================================================

const http = require('http');
const https = require('https');

// ── Config ───────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v]; })
);

const TOTAL_USERS = parseInt(args.users || '200');
const LOCK_MODE = (args.mode || 'HEAD_TO_HEAD').toUpperCase(); // PESSIMISTIC | OPTIMISTIC | HEAD_TO_HEAD
const ARCHITECTURE = (args.architecture || 'both').toLowerCase(); // monolith | microservice | both
const CONCURRENCY = parseInt(args.concurrency || '20');

const MONOLITH_URL = args.monolithUrl || 'http://localhost:5001';
const MICROSERVICE_URL = args.microserviceUrl || 'http://localhost:5002';

// Admin credentials to get token
const ADMIN_EMAIL = 'admin@showbee.com';
const ADMIN_PASSWORD = 'Admin@123';

// ── HTTP Helper ──────────────────────────────────────────────
function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Auth ─────────────────────────────────────────────────────
async function getToken(baseUrl) {
  const res = await request(`${baseUrl}/api/auth/login`, { method: 'POST' }, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (!res.body?.data?.token) throw new Error(`Login failed at ${baseUrl}: ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

// ── Get first available show with seats ──────────────────────
async function getShowAndSeats(baseUrl, token) {
  // Use monolith for metadata/candidate shows if needed
  const catalogUrl = baseUrl.includes('5002') ? MONOLITH_URL : baseUrl;
  
  // Get benchmark shows from admin endpoint
  const benchRes = await request(`${catalogUrl}/api/admin/benchmark/shows`, { headers: { Authorization: `Bearer ${token}` } });
  if (!benchRes.body?.data?.[0]) throw new Error('No shows found in database');
  
  const show = benchRes.body.data[0];
  const seatsRes = await request(`${baseUrl}/api/shows/${show.id}/seats`, { headers: { Authorization: `Bearer ${token}` } });
  if (!seatsRes.body?.data?.seats) throw new Error('No seats found for show ' + show.id);
  
  const availableSeats = seatsRes.body.data.seats.filter(s => s.status === 'AVAILABLE');
  return { showId: show.id, seats: availableSeats };
}

// ── Single lock attempt ───────────────────────────────────────
async function attemptSeatHold(baseUrl, token, showId, seatIds, lockMode) {
  const start = Date.now();
  try {
    const res = await request(
      `${baseUrl}/api/shows/${showId}/seats/hold`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      { seatIds, lockMode }
    );
    return {
      success: res.body?.success === true,
      conflict: res.status === 409,
      latencyMs: Date.now() - start,
      lockMode,
    };
  } catch (err) {
    return { success: false, conflict: false, latencyMs: Date.now() - start, lockMode, error: err.message };
  }
}

// ── Run simulation ────────────────────────────────────────────
async function runSimulation(baseUrl, architectureLabel, lockMode, totalUsers) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔬 Simulation: ${architectureLabel.toUpperCase()} | ${lockMode} | ${totalUsers} users`);
  console.log(`${'='.repeat(60)}`);

  let token;
  try {
    // Auth is hosted on the monolith
    token = await getToken(MONOLITH_URL);
    console.log(`✅ Authenticated with token from ${MONOLITH_URL}`);
  } catch (err) {
    console.error(`❌ Auth failed: ${err.message}`);
    return null;
  }

  let showId, seats;
  try {
    ({ showId, seats } = await getShowAndSeats(baseUrl, token));
    console.log(`🎬 Target Show: ${showId} | Available seats: ${seats.length}`);
  } catch (err) {
    console.error(`❌ Setup failed: ${err.message}`);
    return null;
  }

  if (seats.length === 0) {
    console.warn('⚠️  No available seats — resetting via monolith admin endpoint...');
    await request(`${MONOLITH_URL}/api/admin/benchmark/reset`, 
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      { showId }
    );
    ({ showId, seats } = await getShowAndSeats(baseUrl, token));
  }

  // Pick 3 hotspot seats (all users compete for the exact same seats)
  const hotspotSeats = seats.slice(0, Math.min(3, seats.length)).map(s => s.show_seat_id);
  console.log(`🎯 Hotspot seats: ${hotspotSeats.length} seats (${totalUsers} virtual users competing concurrently)`);

  const results = [];
  const startTime = Date.now();
  let completed = 0;
  let inFlight = 0;

  await new Promise((resolve) => {
    let launched = 0;

    const launchNext = () => {
      while (launched < totalUsers && inFlight < CONCURRENCY) {
        launched++;
        inFlight++;
        attemptSeatHold(baseUrl, token, showId, hotspotSeats, lockMode)
          .then(result => {
            results.push(result);
            completed++;
            inFlight--;
            if (completed % 50 === 0 || completed === totalUsers) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              const rps = Math.round(completed / ((Date.now() - startTime) / 1000 || 0.001));
              process.stdout.write(`\r  Progress: ${completed}/${totalUsers} | ${rps} req/s | ${elapsed}s elapsed  `);
            }
            if (completed < totalUsers) {
              launchNext();
            } else if (completed === totalUsers) {
              console.log('');
              resolve();
            }
          })
          .catch(err => {
            results.push({ success: false, conflict: false, error: err.message, latencyMs: 0, lockMode });
            completed++;
            inFlight--;
            if (completed === totalUsers) resolve();
            else launchNext();
          });
      }
    };

    launchNext();
  });

  const elapsedMs = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const conflicts = results.filter(r => r.conflict).length;
  const errors = results.filter(r => !r.success && !r.conflict).length;
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const throughput = Math.round(totalUsers / ((elapsedMs / 1000) || 0.001));

  const summary = {
    architecture: architectureLabel,
    lockMode,
    totalUsers,
    successful,
    conflicts,
    errors,
    elapsedMs,
    throughputRps: throughput,
    latencies: { avg: Math.round(avg), p50, p95, p99, min: latencies[0] || 0, max: latencies[latencies.length - 1] || 0 },
  };

  console.log(`\n📊 Results:`);
  console.log(`  ✅ Successful holds : ${successful}`);
  console.log(`  ⚡ Conflicts        : ${conflicts}`);
  console.log(`  ❌ Errors           : ${errors}`);
  console.log(`  ⏱  Duration         : ${elapsedMs}ms`);
  console.log(`  🚀 Throughput       : ${throughput} req/s`);
  console.log(`  📈 Latency          : avg=${avg.toFixed(1)}ms p50=${p50}ms p95=${p95}ms p99=${p99}ms`);

  return summary;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🎬 SHOWBEE Concurrent Seat Booking Load Tester');
  console.log(`📋 Config: ${TOTAL_USERS} users | Mode: ${LOCK_MODE} | Architecture: ${ARCHITECTURE}`);
  console.log(`🔗 Monolith: ${MONOLITH_URL} | Microservice: ${MICROSERVICE_URL}\n`);

  const modes = LOCK_MODE === 'HEAD_TO_HEAD' ? ['PESSIMISTIC', 'OPTIMISTIC'] : [LOCK_MODE];
  const archs = ARCHITECTURE === 'both'
    ? [{ label: 'monolith', url: MONOLITH_URL }, { label: 'microservice', url: MICROSERVICE_URL }]
    : ARCHITECTURE === 'microservice'
    ? [{ label: 'microservice', url: MICROSERVICE_URL }]
    : [{ label: 'monolith', url: MONOLITH_URL }];

  const allResults = [];

  for (const arch of archs) {
    for (const mode of modes) {
      const result = await runSimulation(arch.url, arch.label, mode, TOTAL_USERS);
      if (result) allResults.push(result);
      // Small pause between runs
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Final comparison table
  if (allResults.length > 1) {
    console.log('\n\n' + '='.repeat(85));
    console.log('📊 FINAL BENCHMARK COMPARISON TABLE');
    console.log('='.repeat(85));
    console.log(`${'Architecture'.padEnd(16)} ${'Lock Mode'.padEnd(15)} ${'Throughput'.padEnd(14)} ${'Avg ms'.padEnd(10)} ${'p95 ms'.padEnd(10)} ${'Conflicts'.padEnd(12)} ${'Success'}`);
    console.log('-'.repeat(85));
    for (const r of allResults) {
      console.log(
        `${r.architecture.padEnd(16)} ${r.lockMode.padEnd(15)} ${String(r.throughputRps + ' rps').padEnd(14)} ${String(r.latencies.avg + 'ms').padEnd(10)} ${String(r.latencies.p95 + 'ms').padEnd(10)} ${String(r.conflicts).padEnd(12)} ${r.successful}`
      );
    }
    console.log('='.repeat(85));
    console.log('\n💡 View real-time graphs in Grafana: http://localhost:3001');
    console.log('   Default login: admin / showbee123\n');
  }
}

main().catch(err => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});

