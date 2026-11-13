// ============================================================
// SCENARIO A: INCREMENTAL LOAD TEST
// Tests escalating concurrency levels: 2, 10, 50, 100, 1000, 10000 VUs
// Records throughput, latency percentiles, lock conflicts, and error thresholds
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { getAuthToken, getShowAndSeats, holdSeats, MONOLITH_URL, MICROSERVICE_URL } from './helpers.js';

// Custom Prometheus-friendly metrics
const lockAttempts = new Counter('k6_seat_lock_attempts_total');
const lockSuccesses = new Counter('k6_seat_lock_successes_total');
const lockConflicts = new Counter('k6_seat_lock_conflicts_total');
const lockErrors = new Counter('k6_seat_lock_errors_total');
const lockDuration = new Trend('k6_seat_lock_duration_ms', true);

const targetUrl = __ENV.TARGET_URL || MONOLITH_URL;
const lockMode = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();

export const options = {
  scenarios: {
    incremental_stages: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 2 },     // 2 VUs
        { duration: '10s', target: 2 },
        { duration: '5s', target: 10 },    // 10 VUs
        { duration: '15s', target: 10 },
        { duration: '10s', target: 50 },   // 50 VUs
        { duration: '15s', target: 50 },
        { duration: '10s', target: 100 },  // 100 VUs
        { duration: '20s', target: 100 },
        { duration: '15s', target: 500 },  // ramp towards 1k
        { duration: '20s', target: 1000 }, // 1,000 VUs peak
        { duration: '10s', target: 0 },    // ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1500'], // 95% of requests under 1.5s
    'k6_seat_lock_errors_total': ['count<50'],
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

  // Pick a seat based on VU iteration
  const seatIndex = (__VU + __ITER) % data.seatIds.length;
  const targetSeat = [data.seatIds[seatIndex]];

  lockAttempts.add(1);
  const start = Date.now();
  const res = holdSeats(targetUrl, data.token, data.showId, targetSeat, lockMode);
  const duration = Date.now() - start;
  lockDuration.add(duration);

  if (res.status === 200) {
    lockSuccesses.add(1);
    check(res, { 'status 200': (r) => r.status === 200 });
  } else if (res.status === 409) {
    lockConflicts.add(1);
    check(res, { 'status 409 conflict': (r) => r.status === 409 });
  } else {
    lockErrors.add(1);
    check(res, { 'unexpected error': (r) => false });
  }

  sleep(0.1);
}

