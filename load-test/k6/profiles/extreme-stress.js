import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from '../helpers.js';

// EXTREME STRESS TEST — USE WITH CAUTION
// Levels: 5000, 6000, 7500, 10000
// Ramp: 1 min, Hold: 2 min per level
// Pre-flight: health check before starting

const LEVELS = [5000, 6000, 7500, 10000];

const stages = [];
for (const vu of LEVELS) {
  stages.push({ duration: '1m', target: vu });
  stages.push({ duration: '2m', target: vu });
}
stages.push({ duration: '1m', target: 0 });

export const options = {
  stages,
  thresholds: {
    http_req_failed: ['rate<0.6'],
    http_req_duration: ['p(95)<15000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('../tokens.json')); } catch (e) { tokens = []; }

const stressRequests  = new Counter('extreme_stress_requests');
const stressSuccesses = new Counter('extreme_stress_successes');
const stressFailures  = new Counter('extreme_stress_failures');
const stressDuration  = new Trend('extreme_stress_duration_ms', true);

const TARGET_URL = __ENV.TARGET_URL || MONOLITH_URL;
const LOCK_MODE  = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();

// Error-rate tracker for escalation guard
let stageErrorCount = 0;
let stageRequestCount = 0;
let stageStartTime = Date.now();
let escalationStopped = false;

export function setup() {
  // ========================================
  // !!!  EXTREME STRESS TEST WARNING  !!!
  // ========================================
  console.log('');
  console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.log('!!                                               !!');
  console.log('!!   W A R N I N G  —  EXTREME STRESS TEST      !!');
  console.log('!!                                               !!');
  console.log('!!  Max VUs : 10,000                             !!');
  console.log('!!  This will push the system to its limits.     !!');
  console.log('!!  Ensure the server can handle this load.      !!');
  console.log('!!                                               !!');
  console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.log('');

  // Pre-flight safety check
  const healthRes = http.get(`${TARGET_URL}/health`);
  if (healthRes.status !== 200) {
    console.error(`[ABORT] Health check failed: status=${healthRes.status} body=${healthRes.body}`);
    // k6 does not support aborting from setup() natively; signal via return value
    return { aborted: true, showId: null };
  }
  console.log(`[pre-flight] Health check passed: status=${healthRes.status}`);

  const headers = { 'Content-Type': 'application/json' };
  let showId = __ENV.TARGET_SHOW_ID || '';
  if (!showId) {
    const r = http.get(`${TARGET_URL}/api/shows/admin/all?limit=5`, { headers });
    try {
      const j = JSON.parse(r.body);
      if (j.data && j.data.length > 0) showId = j.data[0].id;
    } catch {}
  }
  console.log(`[extreme-stress] showId=${showId} levels=${LEVELS.join(',')}`);
  return { showId, aborted: false };
}

export default function (data) {
  if (data.aborted) { sleep(1); return; }

  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  if (!vuToken || !data.showId) { sleep(1); return; }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${vuToken}` };
  const seatIndex = (__VU - 1) % 200;

  const seatsRes = http.get(`${TARGET_URL}/api/shows/${data.showId}/seats`, {
    headers,
    tags: { name: 'extreme_get_seats' },
  });

  let seatId = null;
  try {
    const sj = JSON.parse(seatsRes.body);
    const available = (sj.data && sj.data.seats) ? sj.data.seats.filter(s => s.status === 'available') : [];
    if (available.length > 0) seatId = available[seatIndex % available.length].show_seat_id;
  } catch {}

  if (!seatId) { sleep(0.5); return; }

  stressRequests.add(1);
  stageRequestCount++;
  const start = Date.now();
  const res = holdSeats(TARGET_URL, vuToken, data.showId, [seatId], LOCK_MODE);
  stressDuration.add(Date.now() - start);

  if (res.status === 200) {
    stressSuccesses.add(1);
    check(res, { 'hold success': r => r.status === 200 });
  } else {
    stressFailures.add(1);
    stageErrorCount++;
    check(res, { 'expected error': r => r.status === 409 || r.status === 400 || r.status === 503 });
  }

  // Escalation guard: if error rate > 50% sustained for ~10s, log warning
  const elapsed = (Date.now() - stageStartTime) / 1000;
  if (!escalationStopped && stageRequestCount > 50 && elapsed >= 10) {
    const errorRate = stageErrorCount / stageRequestCount;
    if (errorRate > 0.5) {
      console.warn(`[WARNING] Error rate ${(errorRate * 100).toFixed(1)}% > 50% sustained for ${elapsed.toFixed(0)}s — consider stopping escalation!`);
      escalationStopped = true; // log once per VU-lifetime (best effort)
    }
    // Reset window
    stageStartTime = Date.now();
    stageRequestCount = 0;
    stageErrorCount = 0;
    escalationStopped = false;
  }

  sleep(0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  const failed = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  console.log('=== EXTREME STRESS SUMMARY ===');
  console.log(`Error rate : ${(failed * 100).toFixed(2)}%`);
  console.log(`p95        : ${p95 ? p95.toFixed(0) : 'N/A'} ms`);
  console.log('==============================');
  return {};
}
