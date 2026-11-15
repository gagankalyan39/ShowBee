import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from './helpers.js';

// Staircase: [ { vus, label } ]
const STAIRCASE = [10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000];
const RAMP_SECS = 5;
const HOLD_SECS = 15;

// Build k6 stages
const stages = [];
let prev = 0;
for (const vu of STAIRCASE) {
  stages.push({ duration: `${RAMP_SECS}s`, target: vu });
  stages.push({ duration: `${HOLD_SECS}s`, target: vu });
  prev = vu;
}
stages.push({ duration: '5s', target: 0 }); // ramp down

export const options = {
  stages,
  thresholds: {
    http_req_failed: ['rate<0.5'],
    http_req_duration: ['p(95)<5000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('./tokens.json')); } catch (e) { tokens = []; }

const bookingRequests = new Counter('live_demo_booking_requests');
const bookingSuccesses = new Counter('live_demo_booking_successes');
const bookingFailures = new Counter('live_demo_booking_failures');
const bookingDuration = new Trend('live_demo_booking_duration_ms', true);

const TARGET_URL = __ENV.TARGET_URL || MONOLITH_URL;
const LOCK_MODE = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();

export function setup() {
  // Determine show and seats
  const headers = { 'Content-Type': 'application/json' };
  let showId = __ENV.TARGET_SHOW_ID || '';
  if (!showId) {
    const r = http.get(`${TARGET_URL}/api/shows/admin/all?limit=5`, { headers });
    try {
      const j = JSON.parse(r.body);
      if (j.data && j.data.length > 0) showId = j.data[0].id;
    } catch {}
  }
  console.log(`[setup] showId=${showId} targetUrl=${TARGET_URL} lockMode=${LOCK_MODE}`);
  return { showId };
}

export default function (data) {
  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  if (!vuToken || !data.showId) { sleep(1); return; }

  // Pick a seat index based on VU to spread load
  const seatIndex = (__VU - 1) % 100;

  // Get seats
  const seatsRes = http.get(`${TARGET_URL}/api/shows/${data.showId}/seats`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vuToken}` },
    tags: { name: 'get_seats' },
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
  bookingDuration.add(Date.now() - start);

  if (res.status === 200) {
    bookingSuccesses.add(1);
    check(res, { 'seat held successfully': r => r.status === 200 });
  } else {
    bookingFailures.add(1);
    check(res, { 'expected failure (conflict/unavailable)': r => r.status === 409 || r.status === 400 });
  }

  sleep(0.1);
}
