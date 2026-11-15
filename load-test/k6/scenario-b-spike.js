// ============================================================
// SCENARIO B: SPIKE TESTING
// Simulates explosive traffic spikes: 10 VUs -> 100 VUs -> 1,000 VUs -> recovery
// Measures recovery time, queue depth absorption, and latency spikes
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getAuthToken, getShowAndSeats, holdSeats, MONOLITH_URL } from './helpers.js';

const spikeAttempts = new Counter('k6_spike_attempts_total');
const spikeSuccesses = new Counter('k6_spike_successes_total');
const spikeConflicts = new Counter('k6_spike_conflicts_total');
const spikeErrors = new Counter('k6_spike_errors_total');
const spikeDuration = new Trend('k6_spike_duration_ms', true);

const targetUrl = __ENV.TARGET_URL || MONOLITH_URL;
const lockMode = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();

export const options = {
  scenarios: {
    traffic_spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 10 },    // Baseline: 10 VUs
        { duration: '3s', target: 100 },    // Sudden spike: 10 -> 100 VUs
        { duration: '15s', target: 100 },   // Sustained surge
        { duration: '3s', target: 1000 },   // Extreme spike: 100 -> 1,000 VUs
        { duration: '15s', target: 1000 },  // Flash-sale peak
        { duration: '5s', target: 10 },     // Immediate drop back to baseline
        { duration: '15s', target: 10 },    // System recovery observation
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
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

  const seatIndex = (__VU * 7 + __ITER) % data.seatIds.length;
  const targetSeat = [data.seatIds[seatIndex]];

  spikeAttempts.add(1);
  const start = Date.now();
  const res = holdSeats(targetUrl, data.token, data.showId, targetSeat, lockMode, {
    'X-K6-VU': String(__VU),
    'X-K6-Target-VU': String(__VU),
    'X-K6-Stage': '1',
    'X-Lock-Mode': lockMode,
  });
  spikeDuration.add(Date.now() - start);

  if (res.status === 200) {
    spikeSuccesses.add(1);
    check(res, { 'hold acquired': (r) => r.status === 200 });
  } else if (res.status === 409) {
    spikeConflicts.add(1);
    check(res, { 'hold conflict rejected': (r) => r.status === 409 });
  } else {
    spikeErrors.add(1);
    check(res, { 'error': (r) => false });
  }

  sleep(0.05);
}

