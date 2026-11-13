import http from 'k6/http';
import { check } from 'k6';

export const MONOLITH_URL = __ENV.MONOLITH_URL || 'http://localhost:5001';
export const MICROSERVICE_URL = __ENV.MICROSERVICE_URL || 'http://localhost:5002';
export const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@showbee.com';
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Admin@123';

/**
 * Log in as admin and return JWT bearer token
 */
export function getAuthToken(baseUrl = MONOLITH_URL) {
  const loginUrl = `${MONOLITH_URL}/api/auth/login`;
  const payload = JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  const res = http.post(loginUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'auth login status 200': (r) => r.status === 200,
    'token acquired': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.data && !!body.data.token;
      } catch {
        return false;
      }
    },
  });

  try {
    const json = JSON.parse(res.body);
    return json.data.token;
  } catch {
    return '';
  }
}

/**
 * Fetch an active screening ID and available seats
 */
export function getShowAndSeats(baseUrl = MONOLITH_URL, token = '') {
  let showId = __ENV.TARGET_SHOW_ID || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!showId) {
    // Candidate shows endpoint on monolith
    const showsUrl = `${MONOLITH_URL}/api/shows/admin/all?limit=10`;
    const res = http.get(showsUrl, { headers });
    try {
      const json = JSON.parse(res.body);
      if (json.data && json.data.length > 0) {
        showId = json.data[0].id;
      }
    } catch {}
  }

  if (!showId) {
    // Fallback benchmark show
    const fallback = http.get(`${MONOLITH_URL}/api/admin/benchmark/shows`, { headers });
    try {
      const fbJson = JSON.parse(fallback.body);
      if (fbJson.data && fbJson.data.length > 0) {
        showId = fbJson.data[0].id;
      }
    } catch {}
  }

  // Fetch seat map
  const seatsUrl = `${baseUrl}/api/shows/${showId}/seats`;
  const seatsRes = http.get(seatsUrl, { headers });
  let seats = [];
  try {
    const sJson = JSON.parse(seatsRes.body);
    if (sJson.data && sJson.data.seats) {
      seats = sJson.data.seats;
    }
  } catch {}

  return { showId, seats };
}

/**
 * Hold seats via POST /api/shows/:id/seats/hold
 */
export function holdSeats(baseUrl, token, showId, seatIds, lockMode = 'PESSIMISTIC') {
  const url = `${baseUrl}/api/shows/${showId}/seats/hold`;
  const payload = JSON.stringify({ seatIds, lockMode });
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  return http.post(url, payload, { headers });
}

/**
 * Create booking via POST /api/bookings
 */
export function createBooking(baseUrl, token, showId, seatIds, idempotencyKey = '') {
  const url = `${baseUrl}/api/bookings`;
  const payload = JSON.stringify({ showId, seatIds, idempotencyKey });
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };

  return http.post(url, payload, { headers });
}

/**
 * Complete payment via POST /api/payments
 */
export function confirmPayment(baseUrl, token, bookingId, method = 'UPI', simulateResult = 'SUCCESS') {
  const url = `${baseUrl}/api/payments`;
  const payload = JSON.stringify({ bookingId, method, simulateResult });
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  return http.post(url, payload, { headers });
}
