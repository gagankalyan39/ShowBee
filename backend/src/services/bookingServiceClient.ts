// ============================================================
// SHOWBEE: Inter-Service Communication Client & Circuit Breaker
// Measures inter-service communication overhead and fault tolerance
// ============================================================

import {
  internalServiceRequests,
  internalServiceDuration,
  internalServiceErrors,
  internalServiceTimeouts,
  circuitBreakerState,
  failedDependencyCalls,
  dependencyRecoveryDuration,
} from '../metrics';

export interface InterServiceResponse<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
  error?: string;
  durationMs: number;
  circuitBreakerTripped?: boolean;
}

const MICROSERVICE_BASE = process.env.BOOKING_MICROSERVICE_URL || 'http://localhost:5002';

// Circuit Breaker State
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT_MS = 10000;
let lastFailureTime = 0;
let circuitState: 'CLOSED' | 'HALF_OPEN' | 'OPEN' = 'CLOSED';

function updateCircuitBreakerState(state: 'CLOSED' | 'HALF_OPEN' | 'OPEN') {
  circuitState = state;
  const val = state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2;
  circuitBreakerState.labels('booking-microservice').set(val);
}

/**
 * Dispatches an HTTP call to the Booking Microservice with full metrics & circuit breaking
 */
export async function callBookingMicroservice<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any,
  timeoutMs: number = 2500
): Promise<InterServiceResponse<T>> {
  const normalizedEndpoint = endpoint.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  const start = Date.now();

  // Circuit Breaker Check
  if (circuitState === 'OPEN') {
    if (Date.now() - lastFailureTime > RECOVERY_TIMEOUT_MS) {
      updateCircuitBreakerState('HALF_OPEN');
    } else {
      failedDependencyCalls.labels('booking-microservice', 'CIRCUIT_OPEN').inc();
      return {
        success: false,
        statusCode: 503,
        error: 'Circuit Breaker OPEN: Booking Microservice is temporarily unreachable',
        durationMs: 0,
        circuitBreakerTripped: true,
      };
    }
  }

  const stopTimer = internalServiceDuration.labels('monolith', 'microservice', normalizedEndpoint).startTimer();

  try {
    const url = `${MICROSERVICE_BASE}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);
    const duration = Date.now() - start;
    stopTimer();

    internalServiceRequests.labels('monolith', 'microservice', normalizedEndpoint, String(res.status)).inc();

    if (res.ok) {
      if (circuitState === 'HALF_OPEN') {
        const recoveryTime = (Date.now() - lastFailureTime) / 1000;
        dependencyRecoveryDuration.labels('booking-microservice').set(recoveryTime);
        updateCircuitBreakerState('CLOSED');
        consecutiveFailures = 0;
      }
      const data = await res.json().catch(() => ({}));
      return { success: true, statusCode: res.status, data, durationMs: duration };
    } else {
      internalServiceErrors.labels('monolith', 'microservice', normalizedEndpoint).inc();
      consecutiveFailures++;
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        lastFailureTime = Date.now();
        updateCircuitBreakerState('OPEN');
      }
      return { success: false, statusCode: res.status, error: `HTTP ${res.status}`, durationMs: duration };
    }
  } catch (err: any) {
    stopTimer();
    const duration = Date.now() - start;
    const isTimeout = err.name === 'AbortError' || err.code === 'ETIMEDOUT';

    if (isTimeout) {
      internalServiceTimeouts.labels('monolith', 'microservice', normalizedEndpoint).inc();
      failedDependencyCalls.labels('booking-microservice', 'TIMEOUT').inc();
    } else {
      internalServiceErrors.labels('monolith', 'microservice', normalizedEndpoint).inc();
      failedDependencyCalls.labels('booking-microservice', err.code || 'NETWORK_ERROR').inc();
    }

    consecutiveFailures++;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      lastFailureTime = Date.now();
      updateCircuitBreakerState('OPEN');
    }

    return {
      success: false,
      statusCode: 504,
      error: err.message,
      durationMs: duration,
      circuitBreakerTripped: circuitState === 'OPEN',
    };
  }
}

/**
 * Runs a head-to-head communication overhead experiment:
 * Measures 50 in-process iterations vs 50 network RPC iterations to Port 5002
 */
export async function measureCommunicationOverhead(iterations = 50) {
  const inProcessDurations: number[] = [];
  const networkDurations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // 1. In-process call baseline (memory function dispatch + serialization)
    const t0 = performance.now();
    const mockPayload = JSON.stringify({ showId: 'bench-show', seatIds: ['seat-1', 'seat-2'], userId: 'user-bench' });
    JSON.parse(mockPayload);
    const inProcessMs = performance.now() - t0;
    inProcessDurations.push(inProcessMs);

    // 2. Inter-service HTTP call to Microservice (:5002)
    const netRes = await callBookingMicroservice('/health', 'GET', undefined, 1000);
    networkDurations.push(netRes.durationMs);
  }

  const computePercentiles = (arr: number[]) => {
    arr.sort((a, b) => a - b);
    return {
      min: parseFloat(arr[0].toFixed(2)),
      p50: parseFloat(arr[Math.floor(arr.length * 0.5)].toFixed(2)),
      p95: parseFloat(arr[Math.floor(arr.length * 0.95)].toFixed(2)),
      p99: parseFloat(arr[Math.floor(arr.length * 0.99)].toFixed(2)),
      avg: parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)),
    };
  };

  const inProcessStats = computePercentiles(inProcessDurations);
  const networkStats = computePercentiles(networkDurations);
  const overheadDeltaP95 = parseFloat((networkStats.p95 - inProcessStats.p95).toFixed(2));

  return {
    iterations,
    inProcess: inProcessStats,
    networkRpc: networkStats,
    overheadDeltaP95Ms: overheadDeltaP95,
    architecturalInsight: `Inter-service network communication adds ~${overheadDeltaP95}ms of latency per cross-boundary RPC call compared to in-process invocation, representing the cost of TCP transport, serialization, and network stack processing in exchange for independent elasticity and deployment fault-isolation.`,
  };
}
