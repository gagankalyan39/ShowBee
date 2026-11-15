import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { holdSeats, MONOLITH_URL } from '../helpers.js';

// Mixed traffic simulation
// 40% browse movies | 30% view show seats | 20% hold seats | 10% create booking

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 300 },
    { duration: '3m',  target: 300 },
    { duration: '30s', target: 600 },
    { duration: '3m',  target: 600 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_failed: ['rate<0.3'],
    http_req_duration: ['p(95)<5000'],
  },
};

let tokens = [];
try { tokens = JSON.parse(open('../tokens.json')); } catch (e) { tokens = []; }

const mixBrowse   = new Counter('mixed_browse_movies');
const mixSeats    = new Counter('mixed_view_seats');
const mixHold     = new Counter('mixed_hold_seats');
const mixBook     = new Counter('mixed_create_booking');
const mixDuration = new Trend('mixed_request_duration_ms', true);
const mixErrors   = new Rate('mixed_error_rate');

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

  let availableSeats = [];
  if (showId) {
    const r = http.get(`${TARGET_URL}/api/shows/${showId}/seats`, { headers });
    try {
      const sj = JSON.parse(r.body);
      availableSeats = (sj.data && sj.data.seats) ? sj.data.seats.filter(s => s.status === 'available') : [];
    } catch {}
  }

  console.log(`[mixed-traffic] showId=${showId} seats=${availableSeats.length}`);
  return { showId, availableSeats: availableSeats.map(s => s.show_seat_id) };
}

export default function (data) {
  const vuToken = tokens.length > 0 ? tokens[(__VU - 1) % tokens.length] : '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${vuToken}` };

  const roll = Math.random();
  const start = Date.now();
  let res;

  if (roll < 0.40) {
    // 40%: Browse movies
    mixBrowse.add(1);
    res = http.get(`${TARGET_URL}/api/movies`, { headers, tags: { name: 'browse_movies' } });
    check(res, { 'browse movies ok': r => r.status === 200 });

  } else if (roll < 0.70) {
    // 30%: View show seats
    mixSeats.add(1);
    if (!data.showId) { sleep(0.5); return; }
    res = http.get(`${TARGET_URL}/api/shows/${data.showId}/seats`, { headers, tags: { name: 'view_show_seats' } });
    check(res, { 'view seats ok': r => r.status === 200 });

  } else if (roll < 0.90) {
    // 20%: Hold seats
    mixHold.add(1);
    if (!vuToken || !data.showId || data.availableSeats.length === 0) { sleep(0.5); return; }
    const seatId = data.availableSeats[(__VU - 1) % data.availableSeats.length];
    res = holdSeats(TARGET_URL, vuToken, data.showId, [seatId], LOCK_MODE);
    check(res, { 'hold seat ok': r => r.status === 200 || r.status === 409 });

  } else {
    // 10%: Create booking
    mixBook.add(1);
    if (!vuToken || !data.showId || data.availableSeats.length === 0) { sleep(0.5); return; }
    const seatId = data.availableSeats[(__VU - 1) % data.availableSeats.length];
    res = http.post(`${TARGET_URL}/api/bookings`, JSON.stringify({
      show_id: data.showId,
      seat_ids: [seatId],
    }), { headers, tags: { name: 'create_booking' } });
    check(res, { 'create booking ok': r => r.status === 200 || r.status === 201 || r.status === 409 });
  }

  if (res) {
    mixDuration.add(Date.now() - start);
    mixErrors.add(res.status >= 500 ? 1 : 0);
  }

  sleep(0.3);
}

export function handleSummary(data) {
  const browse = data.metrics.mixed_browse_movies     ? data.metrics.mixed_browse_movies.values.count     : 0;
  const seats  = data.metrics.mixed_view_seats        ? data.metrics.mixed_view_seats.values.count        : 0;
  const hold   = data.metrics.mixed_hold_seats        ? data.metrics.mixed_hold_seats.values.count        : 0;
  const book   = data.metrics.mixed_create_booking    ? data.metrics.mixed_create_booking.values.count    : 0;
  const p95    = data.metrics.mixed_request_duration_ms ? data.metrics.mixed_request_duration_ms.values['p(95)'] : 0;
  const fail   = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  console.log('=== MIXED TRAFFIC SUMMARY ===');
  console.log(`Browse movies    : ${browse} (${((browse/(browse+seats+hold+book||1))*100).toFixed(1)}%)`);
  console.log(`View seats       : ${seats}`);
  console.log(`Hold seats       : ${hold}`);
  console.log(`Create bookings  : ${book}`);
  console.log(`Error rate       : ${(fail * 100).toFixed(2)}%`);
  console.log(`p95              : ${p95 ? p95.toFixed(0) : 'N/A'} ms`);
  console.log('=============================');
  return {};
}
