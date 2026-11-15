import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from '../helpers.js';

// Distributed booking: each VU books a DIFFERENT seat to minimize contention
// seatIndex = (__VU - 1) % availableSeats.length

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 500 },
    { duration: '3m',  target: 500 },
    { duration: '30s', target: 1000 },
    { duration: '3m',  target: 1000 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_failed: ['rate<0.2'],
    http_req_duration: ['p(95)<4000', 'p(50)<1500'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('../tokens.json')); } catch (e) { tokens = []; }

const distRequests  = new Counter('distributed_booking_requests');
const distSuccesses = new Counter('distributed_booking_successes');
const distFailures  = new Counter('distributed_booking_failures');
const distDuration  = new Trend('distributed_booking_duration_ms', true);
const distThroughput = new Rate('distributed_booking_success_rate');

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

  console.log(`[distributed-booking] showId=${showId} availableSeats=${availableSeats.length}`);
  return { showId, availableSeats: availableSeats.map(s => s.show_seat_id) };
}

export default function (data) {
  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  if (!vuToken || !data.showId || data.availableSeats.length === 0) { sleep(1); return; }

  // Each VU gets a unique seat slot to minimize contention
  const seatIndex = (__VU - 1) % data.availableSeats.length;
  const seatId = data.availableSeats[seatIndex];

  distRequests.add(1);
  const start = Date.now();
  const res = holdSeats(TARGET_URL, vuToken, data.showId, [seatId], LOCK_MODE);
  const elapsed = Date.now() - start;
  distDuration.add(elapsed);

  const success = res.status === 200;
  distThroughput.add(success);

  if (success) {
    distSuccesses.add(1);
    check(res, { 'distributed hold success': r => r.status === 200 });
  } else {
    distFailures.add(1);
    check(res, { 'distributed hold error': r => r.status === 409 || r.status === 400 || r.status === 503 });
  }

  sleep(0.2);
}

export function handleSummary(data) {
  const req   = data.metrics.distributed_booking_requests  ? data.metrics.distributed_booking_requests.values.count   : 0;
  const succ  = data.metrics.distributed_booking_successes ? data.metrics.distributed_booking_successes.values.count  : 0;
  const p50   = data.metrics.distributed_booking_duration_ms ? data.metrics.distributed_booking_duration_ms.values['p(50)'] : 0;
  const p95   = data.metrics.distributed_booking_duration_ms ? data.metrics.distributed_booking_duration_ms.values['p(95)'] : 0;
  const fail  = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  console.log('=== DISTRIBUTED BOOKING SUMMARY ===');
  console.log(`Requests   : ${req}`);
  console.log(`Successes  : ${succ}`);
  console.log(`Error rate : ${(fail * 100).toFixed(2)}%`);
  console.log(`p50        : ${p50 ? p50.toFixed(0) : 'N/A'} ms`);
  console.log(`p95        : ${p95 ? p95.toFixed(0) : 'N/A'} ms`);
  console.log('===================================');
  return {};
}
