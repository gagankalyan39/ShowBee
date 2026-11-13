// ============================================================
// SCENARIO E: ARCHITECTURE COMPARISON (MONOLITH VS MICROSERVICE)
// Runs identical workloads against:
// - Modular Monolith on port 5001
// - Booking Microservice on port 5002
// Measures latency overhead vs resource isolation and peak RPS
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getAuthToken, getShowAndSeats, holdSeats, MONOLITH_URL, MICROSERVICE_URL } from './helpers.js';

const monolithDuration = new Trend('k6_monolith_duration_ms', true);
const microserviceDuration = new Trend('k6_microservice_duration_ms', true);
const monolithSuccess = new Counter('k6_monolith_success_total');
const microserviceSuccess = new Counter('k6_microservice_success_total');

const VUS = parseInt(__ENV.VUS || '30');
const DURATION = __ENV.DURATION || '20s';
const LOCK_MODE = (__ENV.LOCK_MODE || 'PESSIMISTIC').toUpperCase();

export const options = {
  scenarios: {
    monolith_test: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      exec: 'testMonolith',
    },
    microservice_test: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      exec: 'testMicroservice',
      startTime: DURATION, // Sequential execution under identical baseline
    },
  },
};

export function setup() {
  const token = getAuthToken(MONOLITH_URL);
  const mShow = getShowAndSeats(MONOLITH_URL, token);
  const msShow = getShowAndSeats(MICROSERVICE_URL, token);
  return {
    token,
    monolithShowId: mShow.showId,
    monolithSeats: mShow.seats.map((s) => s.show_seat_id),
    microserviceShowId: msShow.showId,
    microserviceSeats: msShow.seats.map((s) => s.show_seat_id),
  };
}

export function testMonolith(data) {
  if (!data.monolithShowId || data.monolithSeats.length === 0) return;
  const idx = (__VU + __ITER) % data.monolithSeats.length;
  const seat = [data.monolithSeats[idx]];

  const start = Date.now();
  const res = holdSeats(MONOLITH_URL, data.token, data.monolithShowId, seat, LOCK_MODE);
  monolithDuration.add(Date.now() - start);

  if (res.status === 200) monolithSuccess.add(1);
  sleep(0.05);
}

export function testMicroservice(data) {
  if (!data.microserviceShowId || data.microserviceSeats.length === 0) return;
  const idx = (__VU + __ITER) % data.microserviceSeats.length;
  const seat = [data.microserviceSeats[idx]];

  const start = Date.now();
  const res = holdSeats(MICROSERVICE_URL, data.token, data.microserviceShowId, seat, LOCK_MODE);
  microserviceDuration.add(Date.now() - start);

  if (res.status === 200) microserviceSuccess.add(1);
  sleep(0.05);
}

