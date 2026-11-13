// ============================================================
// Prometheus Metrics Registry (Monolith)
// High-fidelity telemetry without synthetic heartbeat injection
// ============================================================
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// Collect standard OS & Node.js runtime metrics (CPU, Memory, Event Loop, GC)
collectDefaultMetrics({ register, prefix: 'showbee_runtime_' });

const CURRENT_ARCH = process.env.ARCHITECTURE_LABEL || 'monolith';

// ── Seat Locking Metrics ─────────────────────────────────────
export const seatLockAttempts = new Counter({
  name: 'showbee_seat_lock_attempts_total',
  help: 'Total seat lock attempts',
  labelNames: ['mode', 'architecture'],
  registers: [register],
});

export const seatLockConflicts = new Counter({
  name: 'showbee_seat_lock_conflicts_total',
  help: 'Total seat lock conflicts (rejected attempts)',
  labelNames: ['mode', 'architecture'],
  registers: [register],
});

export const seatLockSuccess = new Counter({
  name: 'showbee_seat_lock_success_total',
  help: 'Total successful seat holds',
  labelNames: ['mode', 'architecture'],
  registers: [register],
});

// Standard naming alias matching system requirements
export const seatLockSuccesses = new Counter({
  name: 'showbee_seat_lock_successes_total',
  help: 'Total successful seat holds (alias)',
  labelNames: ['mode', 'architecture'],
  registers: [register],
});

export const seatLockDuration = new Histogram({
  name: 'showbee_seat_lock_duration_seconds',
  help: 'Seat lock operation duration in seconds',
  labelNames: ['mode', 'architecture'],
  buckets: [0.001, 0.003, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// ── Booking Metrics ──────────────────────────────────────────
export const bookingRequests = new Counter({
  name: 'showbee_booking_requests_total',
  help: 'Total booking API requests received',
  labelNames: ['status', 'architecture'],
  registers: [register],
});

export const bookingFailures = new Counter({
  name: 'showbee_booking_failures_total',
  help: 'Total failed booking requests',
  labelNames: ['reason', 'architecture'],
  registers: [register],
});

export const bookingRetries = new Counter({
  name: 'showbee_booking_retries_total',
  help: 'Total booking retry attempts under optimistic concurrency conflicts',
  labelNames: ['mode', 'architecture'],
  registers: [register],
});

export const bookingCreations = new Counter({
  name: 'showbee_booking_creations_total',
  help: 'Total booking creation attempts',
  labelNames: ['status', 'architecture'],
  registers: [register],
});

export const paymentOutcomes = new Counter({
  name: 'showbee_payment_outcomes_total',
  help: 'Payment outcomes',
  labelNames: ['status', 'method', 'architecture'],
  registers: [register],
});

// ── Database Metrics ─────────────────────────────────────────
export const dbPoolActive = new Gauge({
  name: 'showbee_db_pool_active_connections',
  help: 'Active PostgreSQL pool connections currently in use',
  labelNames: ['architecture'],
  registers: [register],
});

export const dbPoolIdle = new Gauge({
  name: 'showbee_db_pool_idle_connections',
  help: 'Idle PostgreSQL pool connections ready for use',
  labelNames: ['architecture'],
  registers: [register],
});

export const dbPoolWaiting = new Gauge({
  name: 'showbee_db_pool_waiting_count',
  help: 'Queries waiting for a free PostgreSQL pool connection',
  labelNames: ['architecture'],
  registers: [register],
});

export const dbConnAcquisitionDuration = new Histogram({
  name: 'showbee_db_connection_acquisition_duration_seconds',
  help: 'Time spent waiting to acquire a connection from the pool in seconds',
  labelNames: ['architecture'],
  buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbTransactionDuration = new Histogram({
  name: 'showbee_db_transaction_duration_seconds',
  help: 'Database transaction duration from BEGIN to COMMIT/ROLLBACK',
  labelNames: ['architecture', 'outcome'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});

export const dbDeadlocks = new Counter({
  name: 'showbee_db_deadlocks_total',
  help: 'Total database deadlocks detected (PostgreSQL error 40P01)',
  labelNames: ['architecture'],
  registers: [register],
});

export const dbTransactionRollbacks = new Counter({
  name: 'showbee_db_transaction_rollbacks_total',
  help: 'Total database transactions rolled back',
  labelNames: ['architecture'],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: 'showbee_db_query_duration_seconds',
  help: 'PostgreSQL individual query execution time in seconds',
  labelNames: ['architecture'],
  buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// ── HTTP Metrics ─────────────────────────────────────────────
export const httpRequests = new Counter({
  name: 'showbee_http_requests_total',
  help: 'Total HTTP requests processed',
  labelNames: ['method', 'route', 'status_code', 'architecture'],
  registers: [register],
});

export const httpErrors = new Counter({
  name: 'showbee_http_errors_total',
  help: 'Total HTTP error responses (status >= 400)',
  labelNames: ['method', 'route', 'status_code', 'architecture'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'showbee_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code', 'architecture'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// ── Benchmark Simulation Metrics ─────────────────────────────
export const benchmarkRuns = new Counter({
  name: 'showbee_benchmark_runs_total',
  help: 'Total benchmark simulation runs executed',
  labelNames: ['mode'],
  registers: [register],
});

export const benchmarkUsers = new Counter({
  name: 'showbee_benchmark_virtual_users_total',
  help: 'Total virtual users across all benchmark runs',
  labelNames: ['mode'],
  registers: [register],
});

// Helper for dual recording of success
export function recordSeatLockSuccess(mode: string, arch: string) {
  seatLockSuccess.labels(mode, arch).inc();
  seatLockSuccesses.labels(mode, arch).inc();
}

// ── INITIALIZE TIME-SERIES WITH ZERO ─────────────────────────
['pessimistic', 'optimistic'].forEach((m) => {
  seatLockAttempts.labels(m, CURRENT_ARCH).inc(0);
  seatLockConflicts.labels(m, CURRENT_ARCH).inc(0);
  seatLockSuccess.labels(m, CURRENT_ARCH).inc(0);
  seatLockSuccesses.labels(m, CURRENT_ARCH).inc(0);
});

['pending', 'confirmed', 'failed'].forEach((s) => {
  bookingCreations.labels(s, CURRENT_ARCH).inc(0);
  bookingRequests.labels(s, CURRENT_ARCH).inc(0);
});

dbPoolActive.labels(CURRENT_ARCH).set(0);
dbPoolIdle.labels(CURRENT_ARCH).set(0);
dbPoolWaiting.labels(CURRENT_ARCH).set(0);
dbDeadlocks.labels(CURRENT_ARCH).inc(0);
dbTransactionRollbacks.labels(CURRENT_ARCH).inc(0);
