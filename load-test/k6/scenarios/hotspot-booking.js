import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from '../helpers.js';

// Hotspot booking: ALL VUs contest the SAME single seat
// Tracks: attempts, successes, conflicts, retries, duration

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 200 },
    { duration: '60s', target: 200 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.99'], // most will conflict — that's expected
    http_req_duration: ['p(95)<5000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('../tokens.json')); } catch (e) { tokens = []; }

const hotAttempts  = new Counter('hotspot_attempts');
const hotSuccesses = new Counter('hotspot_successes');
const hotConflicts = new Counter('hotspot_conflicts');
const hotRetries   = new Counter('hotspot_retries');
const hotDuration  = new Trend('hotspot_hold_duration_ms', true);

const TARGET_URL = __ENV.TARGET_URL || MONOLITH_URL;
const LOCK_MODE  = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();
const MAX_RETRIES = 3;

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

  // Pick a single fresh available seat
  let seatId = null;
  if (showId) {
    const r = http.get(`${TARGET_URL}/api/shows/${showId}/seats`, { headers });
    try {
      const sj = JSON.parse(r.body);
      const available = (sj.data && sj.data.seats) ? sj.data.seats.filter(s => s.status === 'available') : [];
      if (available.length > 0) seatId = available[0].show_seat_id;
    } catch {}
  }

  console.log(`[hotspot-booking] showId=${showId} hotSeatId=${seatId}`);
  return { showId, seatId };
}

export default function (data) {
  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  if (!vuToken || !data.showId || !data.seatId) { sleep(1); return; }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${vuToken}` };

  // Try to reset seat (best-effort — may 404 if endpoint not available)
  http.del(`${TARGET_URL}/api/admin/benchmark/reset-seats/${data.showId}`, null, {
    headers,
    tags: { name: 'hotspot_reset' },
  });

  hotAttempts.add(1);

  let res = null;
  let attempts = 0;
  do {
    if (attempts > 0) {
      hotRetries.add(1);
      sleep(0.1);
    }
    const start = Date.now();
    res = holdSeats(TARGET_URL, vuToken, data.showId, [data.seatId], LOCK_MODE);
    hotDuration.add(Date.now() - start);
    attempts++;
  } while (res.status === 503 && attempts < MAX_RETRIES);

  if (res.status === 200) {
    hotSuccesses.add(1);
    check(res, { 'hotspot hold success': r => r.status === 200 });
  } else if (res.status === 409) {
    hotConflicts.add(1);
    check(res, { 'hotspot conflict (expected)': r => r.status === 409 });
  } else {
    check(res, { 'hotspot other': r => r.status === 400 || r.status === 503 });
  }

  sleep(0.05);
}

export function handleSummary(data) {
  const attempts  = data.metrics.hotspot_attempts   ? data.metrics.hotspot_attempts.values.count   : 0;
  const successes = data.metrics.hotspot_successes  ? data.metrics.hotspot_successes.values.count  : 0;
  const conflicts = data.metrics.hotspot_conflicts  ? data.metrics.hotspot_conflicts.values.count  : 0;
  const retries   = data.metrics.hotspot_retries    ? data.metrics.hotspot_retries.values.count    : 0;
  const p95       = data.metrics.hotspot_hold_duration_ms ? data.metrics.hotspot_hold_duration_ms.values['p(95)'] : 0;
  console.log('=== HOTSPOT BOOKING SUMMARY ===');
  console.log(`Attempts  : ${attempts}`);
  console.log(`Successes : ${successes}`);
  console.log(`Conflicts : ${conflicts}`);
  console.log(`Retries   : ${retries}`);
  console.log(`p95 hold  : ${p95 ? p95.toFixed(0) : 'N/A'} ms`);
  console.log('===============================');
  return {};
}
