import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getAuthToken, getShowAndSeats, holdSeats, createBooking, confirmPayment, MONOLITH_URL } from './helpers.js';

// Staircase: [ { vus, label } ]
const STAIRCASE = [10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000];
const RAMP_SECS = parseInt(__ENV.RAMP_SECS || '5');
const HOLD_SECS = parseInt(__ENV.HOLD_SECS || '15');
const MAX_VU_LIMIT = parseInt(__ENV.MAX_VU || '5000');

// Filter staircase by MAX_VU_LIMIT if specified
const activeStaircase = STAIRCASE.filter(v => v <= MAX_VU_LIMIT);
if (activeStaircase.length === 0) activeStaircase.push(10);

// Build k6 stages
const stages = [];
for (const vu of activeStaircase) {
  stages.push({ duration: `${RAMP_SECS}s`, target: vu });
  stages.push({ duration: `${HOLD_SECS}s`, target: vu });
}
stages.push({ duration: '5s', target: 0 }); // ramp down

export const options = {
  stages,
  thresholds: {
    http_req_failed: ['rate<0.99'], // lock conflicts return 409 and are expected
    http_req_duration: ['p(95)<8000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('./tokens.json')); } catch (e) { tokens = []; }

const bookingRequests  = new Counter('live_demo_booking_requests');
const bookingSuccesses = new Counter('live_demo_booking_successes');
const bookingFailures  = new Counter('live_demo_booking_failures');
const bookingDuration  = new Trend('live_demo_booking_duration_ms', true);

const TARGET_URL = __ENV.TARGET_URL || MONOLITH_URL;
const RAW_LOCK_MODE = (__ENV.LOCK_MODE || 'HEAD_TO_HEAD').toUpperCase();

export function setup() {
  const token = getAuthToken(TARGET_URL);
  let { showId, seats } = getShowAndSeats(TARGET_URL, token);
  
  if (!showId) {
    showId = '002683a4-b644-40d6-88df-648407405cf5'; // Fallback default show
  }

  let seatIds = (seats && seats.length > 0) ? seats.map(s => s.show_seat_id) : [];

  // If seats list empty, fetch directly
  if (seatIds.length === 0) {
    const sRes = http.get(`${TARGET_URL}/api/shows/${showId}/seats`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    try {
      const sj = JSON.parse(sRes.body);
      if (sj.data && sj.data.seats) {
        seatIds = sj.data.seats.map(s => s.show_seat_id);
      }
    } catch {}
  }

  const startTime = Date.now();
  console.log(`[setup] targetUrl=${TARGET_URL} rawLockMode=${RAW_LOCK_MODE} showId=${showId} seatsFound=${seatIds.length} startTime=${startTime}`);
  return { showId, seatIds, token, startTime };
}

let lastTelemetryTime = 0;

export default function (data) {
  const vuToken = (tokens.length > 0 && __VU > 0) ? tokens[(__VU - 1) % tokens.length] : data.token;
  if (!vuToken || !data.showId) { sleep(0.5); return; }

  // Select active lock mode: HEAD_TO_HEAD splits VUs 50/50 between PESSIMISTIC and OPTIMISTIC
  let activeLockMode = RAW_LOCK_MODE;
  if (RAW_LOCK_MODE === 'HEAD_TO_HEAD' || RAW_LOCK_MODE === 'DUAL' || RAW_LOCK_MODE === 'COMPARISON') {
    activeLockMode = (__VU % 2 === 1) ? 'PESSIMISTIC' : 'OPTIMISTIC';
  }

  // Compute active staircase level based on elapsed time (RAMP_SECS + HOLD_SECS per step)
  const stepDuration = RAMP_SECS + HOLD_SECS;
  const elapsedSec = (Date.now() - (data.startTime || Date.now())) / 1000;
  const stageIdx = Math.min(Math.floor(elapsedSec / stepDuration), activeStaircase.length - 1);
  const currentTargetVu = activeStaircase[stageIdx] || activeStaircase[0];
  const currentStage = stageIdx + 1;

  const customHeaders = {
    'X-K6-VU': String(__VU),
    'X-K6-Target-VU': String(currentTargetVu),
    'X-K6-Stage': String(currentStage),
    'X-Lock-Mode': activeLockMode,
  };

  // Broadcast stage telemetry periodically from VU 1
  if (__VU === 1 && Date.now() - lastTelemetryTime > 2000) {
    lastTelemetryTime = Date.now();
    http.post(
      `${TARGET_URL}/api/telemetry/stage`,
      JSON.stringify({ vus: __VU, targetVus: currentTargetVu, stage: currentStage }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Pick a seat from seatIds
  let seatId = null;
  if (data.seatIds && data.seatIds.length > 0) {
    const seatIdx = (__VU * 3 + __ITER) % data.seatIds.length;
    seatId = data.seatIds[seatIdx];
  }

  if (!seatId) { sleep(0.2); return; }

  bookingRequests.add(1);
  const start = Date.now();
  const res = holdSeats(TARGET_URL, vuToken, data.showId, [seatId], activeLockMode, customHeaders);
  bookingDuration.add(Date.now() - start);

  if (res.status === 200) {
    bookingSuccesses.add(1);
    check(res, { 'seat held successfully': r => r.status === 200 });

    // Complete full booking lifecycle: reservation -> booking creation -> payment confirmation
    try {
      const bRes = createBooking(TARGET_URL, vuToken, data.showId, [seatId]);
      if (bRes.status === 201) {
        const bJson = JSON.parse(bRes.body);
        const bookingId = bJson.data?.id;
        if (bookingId) {
          const methods = ['CARD', 'UPI', 'NETBANKING'];
          const method = methods[__ITER % methods.length];
          confirmPayment(TARGET_URL, vuToken, bookingId, method, 'SUCCESS');
        }
      }
    } catch (e) {}
  } else {
    bookingFailures.add(1);
    check(res, { 'expected response (conflict/ok)': r => r.status === 409 || r.status === 200 || r.status === 400 });
  }

  sleep(0.05);
}
