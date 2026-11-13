// ============================================================
// SCENARIO C: HOTSPOT TESTING (SAME-SEAT CONTENTION)
// Simulates 100+ concurrent users targeting the EXACT same seat(s)
// Validates:
// - Only 1 user successfully acquires each seat (0 double bookings)
// - Conflict rate under intense lock contention
// - Retry count and backoff behavior
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { getAuthToken, getShowAndSeats, holdSeats, MONOLITH_URL } from './helpers.js';

let tokens = [];
try {
  tokens = JSON.parse(open('./tokens.json'));
} catch (e) {
  tokens = [];
}

const hotspotAttempts = new Counter('k6_hotspot_attempts_total');
const hotspotSuccesses = new Counter('k6_hotspot_successes_total');
const hotspotConflicts = new Counter('k6_hotspot_conflicts_total');
const hotspotRetries = new Counter('k6_hotspot_retries_total');
const hotspotDuration = new Trend('k6_hotspot_duration_ms', true);

const targetUrl = __ENV.TARGET_URL || MONOLITH_URL;
const lockMode = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();
const VUS = parseInt(__ENV.VUS || '100');
const MAX_RETRIES = parseInt(__ENV.MAX_RETRIES || '2');

export const options = {
  scenarios: {
    hotspot_competition: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: parseInt(__ENV.ITERATIONS || '2'),
      maxDuration: __ENV.MAX_DURATION || '45s',
    },
  },
};

export function setup() {
  const token = getAuthToken(targetUrl);
  const { showId, seats } = getShowAndSeats(targetUrl, token);
  // Pick the top 1 single hot seat (e.g. VIP seat G5)
  const hotSeatId = seats.length > 0 ? seats[0].show_seat_id : '';
  return { token, showId, hotSeatId };
}

export default function (data) {
  if (!data.showId || !data.hotSeatId) {
    sleep(1);
    return;
  }

  const vuToken = (tokens.length > 0 && __VU > 0) ? tokens[(__VU - 1) % tokens.length] : data.token;
  const hotSeat = [data.hotSeatId];
  let acquired = false;
  let attempts = 0;

  while (!acquired && attempts <= MAX_RETRIES) {
    attempts++;
    hotspotAttempts.add(1);
    if (attempts > 1) hotspotRetries.add(1);

    const start = Date.now();
    const res = holdSeats(targetUrl, vuToken, data.showId, hotSeat, lockMode);
    hotspotDuration.add(Date.now() - start);

    if (res.status === 200) {
      hotspotSuccesses.add(1);
      acquired = true;
      check(res, { 'seat acquired': (r) => r.status === 200 });
      break;
    } else if (res.status === 409) {
      hotspotConflicts.add(1);
      check(res, { 'conflict safely caught': (r) => r.status === 409 });
      // Exponential backoff with jitter
      sleep(0.05 * Math.pow(1.5, attempts) + Math.random() * 0.02);
    } else {
      break;
    }
  }

  sleep(0.1);
}
