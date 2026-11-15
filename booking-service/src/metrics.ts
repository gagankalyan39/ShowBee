// ============================================================
// Prometheus Metrics Registry (Booking Microservice)
// High-fidelity telemetry without synthetic heartbeat injection
// ============================================================
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// Collect standard OS & Node.js runtime metrics (CPU, Memory, Event Loop, GC)
collectDefaultMetrics({ register, prefix: 'showbee_runtime_' });

const CURRENT_ARCH = (process.env.ARCHITECTURE_LABEL || 'microservice').trim();

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
export const bookingAttempts = new Counter({
  name: 'showbee_booking_attempts_total',
  help: 'Total booking transaction attempts',
  labelNames: ['architecture'],
  registers: [register],
});

export const bookingSuccess = new Counter({
  name: 'showbee_booking_success_total',
  help: 'Total successful booking creations',
  labelNames: ['architecture'],
  registers: [register],
});

export const bookingDuration = new Histogram({
  name: 'showbee_booking_duration_seconds',
  help: 'Booking transaction processing duration in seconds',
  labelNames: ['architecture'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

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

// ── Payment Metrics ──────────────────────────────────────────
export const paymentAttempts = new Counter({
  name: 'showbee_payment_attempts_total',
  help: 'Total payment attempts',
  labelNames: ['method', 'architecture'],
  registers: [register],
});

export const paymentSuccess = new Counter({
  name: 'showbee_payment_success_total',
  help: 'Total successful payments',
  labelNames: ['method', 'architecture'],
  registers: [register],
});

export const paymentFailures = new Counter({
  name: 'showbee_payment_failures_total',
  help: 'Total failed payments',
  labelNames: ['method', 'architecture'],
  registers: [register],
});

export const paymentDuration = new Histogram({
  name: 'showbee_payment_duration_seconds',
  help: 'Payment gateway transaction duration in seconds',
  labelNames: ['method', 'architecture'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

export const paymentOutcomes = new Counter({
  name: 'showbee_payment_outcomes_total',
  help: 'Payment outcomes',
  labelNames: ['status', 'method', 'architecture'],
  registers: [register],
});

// ── Database Metrics ─────────────────────────────────────────
export const dbPoolMax = new Gauge({
  name: 'showbee_db_pool_max_connections',
  help: 'Maximum configured PostgreSQL connection pool size',
  labelNames: ['architecture'],
  registers: [register],
});

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

// ── Live Load & Virtual Users Metrics ────────────────────────
export const activeVirtualUsers = new Gauge({
  name: 'showbee_active_virtual_users',
  help: 'Active virtual users currently executing load test',
  labelNames: ['architecture'],
  registers: [register],
});

export const targetVirtualUsers = new Gauge({
  name: 'showbee_target_virtual_users',
  help: 'Target virtual users for current load stage',
  labelNames: ['architecture'],
  registers: [register],
});

export const currentLoadStage = new Gauge({
  name: 'showbee_current_load_stage',
  help: 'Current active load stage in staircase',
  labelNames: ['architecture'],
  registers: [register],
});

export const doubleBookingViolations = new Counter({
  name: 'showbee_double_booking_violations_total',
  help: 'Total confirmed duplicate bookings for same seat (must always be 0)',
  labelNames: ['architecture'],
  registers: [register],
});

// ── Inter-Service Communication Metrics (Monolith <-> Microservice) ──
export const internalServiceRequests = new Counter({
  name: 'showbee_internal_service_requests_total',
  help: 'Total inter-service communication RPC requests',
  labelNames: ['source', 'target', 'endpoint', 'status'],
  registers: [register],
});

export const internalServiceDuration = new Histogram({
  name: 'showbee_internal_service_duration_seconds',
  help: 'Inter-service RPC communication latency in seconds',
  labelNames: ['source', 'target', 'endpoint'],
  buckets: [0.0005, 0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const internalServiceErrors = new Counter({
  name: 'showbee_internal_service_errors_total',
  help: 'Total inter-service RPC errors',
  labelNames: ['source', 'target', 'endpoint'],
  registers: [register],
});

export const internalServiceTimeouts = new Counter({
  name: 'showbee_internal_service_timeouts_total',
  help: 'Total inter-service RPC timeouts',
  labelNames: ['source', 'target', 'endpoint'],
  registers: [register],
});

// ── Fault Tolerance & Circuit Breaker Metrics ────────────────
export const circuitBreakerState = new Gauge({
  name: 'showbee_circuit_breaker_state',
  help: 'Circuit breaker state: 0=CLOSED (Normal), 1=HALF_OPEN (Testing), 2=OPEN (Tripped)',
  labelNames: ['service'],
  registers: [register],
});

export const failedDependencyCalls = new Counter({
  name: 'showbee_failed_dependency_calls_total',
  help: 'Total failed downstream dependency calls',
  labelNames: ['dependency', 'error_type'],
  registers: [register],
});

export const dependencyRecoveryDuration = new Gauge({
  name: 'showbee_dependency_recovery_seconds',
  help: 'Time taken to restore healthy state after dependency failure',
  labelNames: ['dependency'],
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
dbPoolMax.labels(CURRENT_ARCH).set(20);
dbDeadlocks.labels(CURRENT_ARCH).inc(0);
dbTransactionRollbacks.labels(CURRENT_ARCH).inc(0);
activeVirtualUsers.labels(CURRENT_ARCH).set(0);
targetVirtualUsers.labels(CURRENT_ARCH).set(0);
currentLoadStage.labels(CURRENT_ARCH).set(0);
doubleBookingViolations.labels(CURRENT_ARCH).inc(0);
bookingAttempts.labels(CURRENT_ARCH).inc(0);
bookingSuccess.labels(CURRENT_ARCH).inc(0);
['UPI', 'CARD', 'NETBANKING'].forEach((m) => {
  paymentAttempts.labels(m, CURRENT_ARCH).inc(0);
  paymentSuccess.labels(m, CURRENT_ARCH).inc(0);
  paymentFailures.labels(m, CURRENT_ARCH).inc(0);
});

circuitBreakerState.labels('booking-microservice').set(0);
dependencyRecoveryDuration.labels('booking-microservice').set(0);
failedDependencyCalls.labels('booking-microservice', 'ECONNREFUSED').inc(0);
internalServiceRequests.labels('monolith', 'microservice', '/api/shows/:id/seats/hold', '200').inc(0);
internalServiceErrors.labels('monolith', 'microservice', '/api/shows/:id/seats/hold').inc(0);
internalServiceTimeouts.labels('monolith', 'microservice', '/api/shows/:id/seats/hold').inc(0);
