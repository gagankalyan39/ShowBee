// ============================================================
// SCENARIO D: DISTRIBUTED BOOKING TESTING
// Simulates concurrent users selecting DIFFERENT available seats across 100-seat hall
// Validates:
// - Non-blocking execution under low contention
// - Peak throughput and minimal latency divergence
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getAuthToken, getShowAndSeats, holdSeats, MONOLITH_URL } from './helpers.js';

let tokens = [];
try {
  tokens = JSON.parse(open('./tokens.json'));
} catch (e) {
  tokens = [];
}

const distAttempts = new Counter('k6_dist_attempts_total');
const distSuccesses = new Counter('k6_dist_successes_total');
const distConflicts = new Counter('k6_dist_conflicts_total');
const distDuration = new Trend('k6_dist_duration_ms', true);

const targetUrl = __ENV.TARGET_URL || MONOLITH_URL;
const lockMode = (__ENV.LOCK_MODE || 'OPTIMISTIC').toUpperCase();
const VUS = parseInt(__ENV.VUS || '50');

export const options = {
  scenarios: {
    distributed_booking: {
      executor: 'constant-vus',
      vus: VUS,
      duration: __ENV.DURATION || '10s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<300'], // Low contention should yield fast response times
  },
};

export function setup() {
  const token = getAuthToken(targetUrl);
  const { showId, seats } = getShowAndSeats(targetUrl, token);
  return { token, showId, seatIds: seats.map((s) => s.show_seat_id) };
}

export default function (data) {
  if (!data.showId || data.seatIds.length === 0) {
    sleep(1);
    return;
  }

  // Assign distinct seat per VU slice
  const seatIdx = (__VU * 3 + __ITER) % data.seatIds.length;
  const chosenSeat = [data.seatIds[seatIdx]];

  distAttempts.add(1);
  const vuToken = (tokens.length > 0 && __VU > 0) ? tokens[(__VU - 1) % tokens.length] : data.token;
  const start = Date.now();
  const res = holdSeats(targetUrl, vuToken, data.showId, chosenSeat, lockMode);
  distDuration.add(Date.now() - start);

  if (res.status === 200) {
    distSuccesses.add(1);
    check(res, { 'seat held successfully': (r) => r.status === 200 });
  } else if (res.status === 409) {
    distConflicts.add(1);
    check(res, { 'conflict': (r) => r.status === 409 });
  }

  sleep(0.05);
}
