import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from '../helpers.js';

// Heavy research profile: realistic full booking flow
// Levels: 100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000
// Ramp: 2 min per level, hold: 3 min

const LEVELS = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000];

const stages = [];
for (const vu of LEVELS) {
  stages.push({ duration: '2m', target: vu });
  stages.push({ duration: '3m', target: vu });
}
stages.push({ duration: '1m', target: 0 });

export const options = {
  stages,
  thresholds: {
    http_req_failed: ['rate<0.3'],
    http_req_duration: ['p(95)<8000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('../tokens.json')); } catch (e) { tokens = []; }

const flowRequests   = new Counter('heavy_flow_requests');
const flowSuccesses  = new Counter('heavy_flow_successes');
const flowFailures   = new Counter('heavy_flow_failures');
const flowDuration   = new Trend('heavy_flow_duration_ms', true);
const holdDuration   = new Trend('heavy_hold_duration_ms', true);
const bookDuration   = new Trend('heavy_book_duration_ms', true);
const payDuration    = new Trend('heavy_pay_duration_ms', true);

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
  console.log(`[heavy-research] showId=${showId} levels=${LEVELS.join(',')}`);
  return { showId };
}

export default function (data) {
  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  if (!vuToken || !data.showId) { sleep(1); return; }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${vuToken}` };
  const seatIndex = (__VU - 1) % 100;
  const flowStart = Date.now();
  flowRequests.add(1);

  // Step 1: Get seats
  const seatsRes = http.get(`${TARGET_URL}/api/shows/${data.showId}/seats`, {
    headers,
    tags: { name: 'heavy_get_seats' },
  });
  check(seatsRes, { 'get seats 200': r => r.status === 200 });

  let seatId = null;
  try {
    const sj = JSON.parse(seatsRes.body);
    const available = (sj.data && sj.data.seats) ? sj.data.seats.filter(s => s.status === 'available') : [];
    if (available.length > 0) seatId = available[seatIndex % available.length].show_seat_id;
  } catch {}

  if (!seatId) { sleep(0.5); flowFailures.add(1); return; }

  // Step 2: Hold seat
  const holdStart = Date.now();
  const holdRes = holdSeats(TARGET_URL, vuToken, data.showId, [seatId], LOCK_MODE);
  holdDuration.add(Date.now() - holdStart);
  const holdOk = check(holdRes, { 'hold seat 200': r => r.status === 200 });

  if (!holdOk) { sleep(0.3); flowFailures.add(1); return; }

  let holdId = null;
  try { holdId = JSON.parse(holdRes.body).data?.hold_id || JSON.parse(holdRes.body).data?.id; } catch {}

  // Step 3: Create booking
  const bookStart = Date.now();
  const bookRes = http.post(`${TARGET_URL}/api/bookings`, JSON.stringify({
    show_id: data.showId,
    seat_ids: [seatId],
    hold_id: holdId,
  }), { headers, tags: { name: 'heavy_create_booking' } });
  bookDuration.add(Date.now() - bookStart);
  const bookOk = check(bookRes, { 'create booking 200/201': r => r.status === 200 || r.status === 201 });

  if (!bookOk) { sleep(0.3); flowFailures.add(1); return; }

  let bookingId = null;
  try { bookingId = JSON.parse(bookRes.body).data?.booking_id || JSON.parse(bookRes.body).data?.id; } catch {}

  // Step 4: Confirm payment
  if (bookingId) {
    const payStart = Date.now();
    const payRes = http.post(`${TARGET_URL}/api/bookings/${bookingId}/confirm`, JSON.stringify({
      payment_method: 'test_card',
      amount: 100,
    }), { headers, tags: { name: 'heavy_confirm_payment' } });
    payDuration.add(Date.now() - payStart);
    check(payRes, { 'confirm payment 200': r => r.status === 200 || r.status === 201 || r.status === 202 });
  }

  flowDuration.add(Date.now() - flowStart);
  flowSuccesses.add(1);
  sleep(0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  const failed = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  console.log('=== HEAVY RESEARCH PROFILE SUMMARY ===');
  console.log(`Error rate : ${(failed * 100).toFixed(2)}%`);
  console.log(`p95        : ${p95 ? p95.toFixed(0) : 'N/A'} ms`);
  console.log('=======================================');
  return {};
}
