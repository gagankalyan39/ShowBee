import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from '../helpers.js';

// Sustained load: constant 200 VUs for 20 minutes
// Purpose: detect memory leaks and performance degradation over time

export const options = {
  vus: 200,
  duration: '20m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000', 'p(50)<800', 'p(99)<4000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('../tokens.json')); } catch (e) { tokens = []; }

const bookingRate    = new Rate('sustained_booking_success_rate');
const bookingCount   = new Counter('sustained_booking_count');
const bookingErrors  = new Counter('sustained_booking_errors');
const bookingP50     = new Trend('sustained_p50_duration_ms', true);
const bookingP95     = new Trend('sustained_p95_duration_ms', true);

const TARGET_URL = __ENV.TARGET_URL || MONOLITH_URL;
const LOCK_MODE  = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();

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

  let availableSeats = [];
  if (showId) {
    const r = http.get(`${TARGET_URL}/api/shows/${showId}/seats`, { headers });
    try {
      const sj = JSON.parse(r.body);
      availableSeats = (sj.data && sj.data.seats) ? sj.data.seats.filter(s => s.status === 'available') : [];
    } catch {}
  }

  console.log(`[sustained-load] 200 VUs × 20min | showId=${showId} seats=${availableSeats.length}`);
  console.log('[sustained-load] Thresholds: p(95)<2000ms, http_req_failed<5%');
  return { showId, availableSeats: availableSeats.map(s => s.show_seat_id) };
}

export default function (data) {
  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  if (!vuToken || !data.showId || data.availableSeats.length === 0) { sleep(1); return; }

  const seatIndex = (__VU - 1) % data.availableSeats.length;
  const seatId = data.availableSeats[seatIndex];

  bookingCount.add(1);
  const start = Date.now();
  const res = holdSeats(TARGET_URL, vuToken, data.showId, [seatId], LOCK_MODE);
  const elapsed = Date.now() - start;

  // Track both metrics on every request for time-series degradation detection
  bookingP50.add(elapsed);
  bookingP95.add(elapsed);

  const success = res.status === 200;
  bookingRate.add(success);

  if (success) {
    check(res, { 'sustained hold success': r => r.status === 200 });
  } else {
    bookingErrors.add(1);
    check(res, { 'sustained hold error': r => r.status === 409 || r.status === 400 || r.status === 503 });
  }

  // Periodic degradation warning (VU 1 only, every 100 iterations)
  if (__VU === 1 && __ITER % 100 === 0) {
    const mins = ((__ITER * 1.0) / 60).toFixed(1);
    console.log(`[sustained] iter=${__ITER} (~${mins}min) lastDuration=${elapsed}ms status=${res.status}`);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const count  = data.metrics.sustained_booking_count  ? data.metrics.sustained_booking_count.values.count  : 0;
  const errors = data.metrics.sustained_booking_errors ? data.metrics.sustained_booking_errors.values.count : 0;
  const fail   = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const p50    = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(50)']  : 0;
  const p95    = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)']  : 0;
  const p99    = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)']  : 0;
  console.log('=== SUSTAINED LOAD SUMMARY (200 VUs × 20min) ===');
  console.log(`Total bookings : ${count}`);
  console.log(`Errors         : ${errors}`);
  console.log(`Error rate     : ${(fail * 100).toFixed(2)}%`);
  console.log(`p50 duration   : ${p50 ? p50.toFixed(0) : 'N/A'} ms`);
  console.log(`p95 duration   : ${p95 ? p95.toFixed(0) : 'N/A'} ms`);
  console.log(`p99 duration   : ${p99 ? p99.toFixed(0) : 'N/A'} ms`);
  console.log('=================================================');
  return {};
}
