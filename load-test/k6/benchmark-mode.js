import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from './helpers.js';

// Long-duration benchmark: each level repeated 3 times (1m ramp + 2m hold per rep)
const LEVELS = [100, 250, 500, 750, 1000, 1500, 2000];
const RAMP_DUR = '1m';
const HOLD_DUR = '2m';
const REPS = 3;

const stages = [];
for (const level of LEVELS) {
  for (let rep = 0; rep < REPS; rep++) {
    stages.push({ duration: RAMP_DUR, target: level });
    stages.push({ duration: HOLD_DUR, target: level });
  }
}
stages.push({ duration: '30s', target: 0 }); // ramp down

export const options = {
  stages,
  thresholds: {
    http_req_failed: ['rate<0.5'],
    http_req_duration: ['p(95)<8000', 'p(50)<3000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('./tokens.json')); } catch (e) { tokens = []; }

const bookingRequests = new Counter('benchmark_booking_requests');
const bookingSuccesses = new Counter('benchmark_booking_successes');
const bookingFailures = new Counter('benchmark_booking_failures');
const bookingDuration = new Trend('benchmark_booking_duration_ms', true);

const TARGET_URL = __ENV.TARGET_URL || MONOLITH_URL;
const LOCK_MODE = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();

export function setup() {
  const headers = { 'Content-Type': 'application/json' };
  let showId = __ENV.TARGET_SHOW_ID || '';
  if (!showId) {
    const r = http.get(`${TARGET_URL}/api/shows/admin/all?limit=5`, { headers });
    try {
      const j = JSON.parse(r.body);
      if (j.data && j.data.length > 0) showId = j.data[0].id;
    } catch {}
  }
  console.log(`[benchmark-mode] showId=${showId} levels=${LEVELS.join(',')} reps=${REPS}`);
  return { showId };
}

export default function (data) {
  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  if (!vuToken || !data.showId) { sleep(1); return; }

  const seatIndex = (__VU - 1) % 100;

  const seatsRes = http.get(`${TARGET_URL}/api/shows/${data.showId}/seats`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vuToken}` },
    tags: { name: 'benchmark_get_seats' },
  });

  let seatId = null;
  try {
    const sj = JSON.parse(seatsRes.body);
    const available = (sj.data && sj.data.seats) ? sj.data.seats.filter(s => s.status === 'available') : [];
    if (available.length > 0) seatId = available[seatIndex % available.length].show_seat_id;
  } catch {}

  if (!seatId) { sleep(0.5); return; }

  bookingRequests.add(1);
  const start = Date.now();
  const res = holdSeats(TARGET_URL, vuToken, data.showId, [seatId], LOCK_MODE);
  const elapsed = Date.now() - start;
  bookingDuration.add(elapsed);

  if (res.status === 200) {
    bookingSuccesses.add(1);
    check(res, { 'hold success': r => r.status === 200 });
  } else {
    bookingFailures.add(1);
    check(res, { 'hold conflict/error': r => r.status === 409 || r.status === 400 || r.status === 503 });
  }

  // Per-stage summary log every 500 iterations (vu 1 only)
  if (__VU === 1 && __ITER % 500 === 0) {
    console.log(`[benchmark] iter=${__ITER} vu=${__VU} lastDuration=${elapsed}ms status=${res.status}`);
  }

  sleep(0.2);
}

export function handleSummary(data) {
  const req = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const failed = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const p50 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(50)'] : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  console.log('=== BENCHMARK SUMMARY ===');
  console.log(`Total requests : ${req}`);
  console.log(`Error rate     : ${(failed * 100).toFixed(2)}%`);
  console.log(`p50 duration   : ${p50 ? p50.toFixed(0) : 'N/A'} ms`);
  console.log(`p95 duration   : ${p95 ? p95.toFixed(0) : 'N/A'} ms`);
  console.log('=========================');
  return {};
}
