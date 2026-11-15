# SHOWBEE — Real-Time Performance Observatory & Grafana Dashboard Guide

## Executive Overview

**SHOWBEE** is a production-grade, high-concurrency cinema seat booking platform engineered to empirically evaluate distributed systems trade-offs. The platform enables direct head-to-head benchmarking between:
1. **Concurrency Control Mechanisms**: **Pessimistic Locking** (`SELECT ... FOR UPDATE` with deterministic row sorting) vs **Optimistic Locking** (atomic Compare-And-Swap version checking via `UPDATE ... WHERE version = $v`).
2. **Architectural Paradigms**: **Modular Monolith** (Port 5001, in-process function invocation) vs **Booking Microservice** (Port 5002, isolated service boundary with network RPC).

This guide documents the telemetry pipeline, Prometheus metrics dictionary, mathematical PromQL query definitions, and operational procedures for demonstrating and validating system performance in real-time.

---

## 1. Audit & Root Cause Analysis Summary

| Issue Observed in Previous Dashboard | Root Cause | Files Involved | Applied Engineering Fix |
|---|---|---|---|
| **Booking Success Rate displays 0%** | `bookingCreations.labels('confirmed', ...)` was never incremented in payment confirmation routes; live test only hit seat-holding without executing the booking/payment transaction funnel. | `backend/src/routes/payments.ts`<br>`booking-service/src/routes/payments.ts`<br>`load-test/k6/live-demo-load.js` | Instrumented `bookingCreations.labels('confirmed', ...)`, added `bookingAttempts` and `bookingSuccess` counters, and updated K6 script to complete the full reservation $\to$ booking $\to$ payment lifecycle upon successful hold. |
| **Payment Success Rate displays "No data"** | K6 live load test only sent seat hold requests; payment endpoints were never invoked during automated tests. | `load-test/k6/live-demo-load.js`<br>`load-test/k6/helpers.js` | Updated `live-demo-load.js` to dispatch payment requests upon successful seat holds, generating live `showbee_payment_attempts_total` and `showbee_payment_success_total` telemetry. |
| **Microservice Latency displays 0 ms / Inconsistent** | Internal Prometheus scrapes (`/metrics` and `/health`) were observed by Express middleware into latency histograms. With zero user traffic, scrape latency (~0.5ms) was mistakenly rendered as application latency. | `backend/src/middleware/metrics.ts`<br>`booking-service/src/middleware/metrics.ts` | Filtered out `/metrics` and `/health` requests from `httpRequestDuration` and `httpRequests` observations. Empty traffic now cleanly yields "No data" rather than fake 0ms. |
| **Optimistic Graph Unavailable / Empty** | Batch test runners hardcoded `LOCK_MODE=PESSIMISTIC`, routing 100% of traffic to pessimistic codepaths. | `load-test/start-live-demo.bat`<br>`load-test/start-live-demo-microservice.bat`<br>`load-test/k6/live-demo-load.js` | Introduced `HEAD_TO_HEAD` concurrency mode splitting traffic 50% Pessimistic / 50% Optimistic CAS across virtual users. Created dedicated `start-live-demo-optimistic.bat`. |
| **Database Metrics Incomplete** | Maximum pool size gauge (`dbPoolMax`) was unexported; pool utilization percentage could not be determined. | `backend/src/metrics.ts`<br>`booking-service/src/metrics.ts`<br>`backend/src/db/index.ts`<br>`booking-service/src/db/index.ts` | Exported `showbee_db_pool_max_connections` (20) and connected live pool counters (`dbPoolActive`, `dbPoolIdle`, `dbPoolWaiting`). |
| **No Virtual Users (VU) Graph** | Grafana panels queried non-existent `k6_vus` Prometheus metric instead of application-level telemetry. | `backend/src/metrics.ts`<br>`booking-service/src/metrics.ts`<br>`load-test/k6/live-demo-load.js` | Instrumented `showbee_active_virtual_users` and `showbee_target_virtual_users` gauges fed via `X-K6-VU` HTTP headers and background telemetry sync. |

---

## 2. Master Dashboard Structure: 8 Real-Time Sections

The master research evaluation dashboard is provisioned under:
- **Title**: `SHOWBEE — Architecture and Performance Evaluation Dashboard`
- **UID**: `showbee-architecture-evaluation`
- **URL**: `http://localhost:3001/d/showbee-architecture-evaluation`

### Section 1: Live Test Overview (Top Row)
- **Active VUs**: Current virtual users executing load on the target architecture.
- **Maximum VUs**: Peak concurrency achieved in the observation window.
- **HTTP Requests/sec**: Total throughput ingested across active instances.
- **Booking Success Rate (%)**: Percentage of booking attempts successfully confirmed.
- **HTTP Error Rate (%)**: Percentage of non-2xx responses.
- **Successful Bookings/sec**: Real-time velocity of confirmed seat purchases.
- **Lock Conflicts/sec**: Rejection velocity due to concurrent seat contention.
- **Average Response Time**: Mean end-to-end request latency in milliseconds.

### Section 2: Load and Scalability
- **Active VUs Over Time**: Comparison of actual active VUs against target staircase profile.
- **HTTP Requests/sec by Status Code**: Stacked timeseries partitioned into 2xx (Success), 409 (Lock Conflict), and 5xx (Server Error).
- **Throughput vs Virtual Users**: Direct scalability curve showing throughput scaling efficiency.
- **Latency Percentiles**: P50, P95, and P99 latency percentiles over time.
- **Process CPU & Memory**: Real-time Node.js process CPU user % and Heap memory consumption.

### Section 3: Locking Strategy Comparison (Pessimistic vs Optimistic)
- **Lock Attempts/sec**: Pessimistic vs Optimistic lock requests.
- **Successful Locks/sec**: Acquisition rate comparison between the two concurrency engines.
- **Lock Conflicts/sec**: Rejection rate under contention.
- **Conflict Rate Gauges**: Normalized percentage conflict gauges for both modes.
- **Lock Duration Percentiles**: P50, P95, and P99 transaction holding durations.
- **Database Lock-Wait & Deadlocks**: Connection checkout queue delay and deadlock counter (`40P01`).

### Section 4: Monolith vs Microservice Comparison
- **HTTP Throughput (RPS)**: Monolith (in-process) vs Microservice (network boundary).
- **Successful Bookings/sec**: Comparison of finalized booking transactions.
- **Response Time Percentiles**: P50, P95, P99 latency demonstrating in-process efficiency vs RPC overhead.
- **HTTP Error Rate (%)**: Service failure rate isolation.
- **Process CPU & Memory**: Resource footprint comparison between monolithic and microservice processes.
- **Database Pool Connections**: Active connections checked out vs queued queries.

### Section 5: Database Integrity
- **Zero Double-Booking Invariant**: Dedicated high-visibility ACID verification stat (`0 VIOLATIONS — PURE ACID CONSISTENT`).
- **Database Deadlocks**: Counter tracking PostgreSQL deadlocks (`SQLSTATE 40P01`).
- **Transaction Rollbacks**: Rate of aborted transactions.
- **Database Lock Waits & Queued Queries**: Live count of queries waiting for a free pool connection.
- **Connection Pool Utilization (%)**: Pool saturation relative to the 20-connection ceiling.
- **Query Execution P95 Latency**: Database query execution latency distribution.

### Section 6: Service Communication (Inter-Service RPC)
- **Internal Service Requests/sec**: Monolith-to-Microservice RPC request volume.
- **Service-to-Service Latency**: P50, P95, and P99 network RPC latency over HTTP.
- **Internal API Errors & Timeouts**: Failures and timeouts detected on inter-service hops.

### Section 7: Fault Tolerance & Resilience
- **Circuit Breaker State**: Real-time status: `0=CLOSED (HEALTHY)`, `1=HALF-OPEN (TESTING)`, `2=OPEN (TRIPPED)`.
- **Failed Dependency Calls**: Downstream microservice failure counter categorized by error type.
- **Dependency Recovery Duration**: Time required to restore healthy communication after failure.
- **Error Rate During Failure vs Normal**: Visual validation of blast radius containment.

### Section 8: Payment and Booking Funnel
- **Booking Pipeline**: Attempts vs Confirmed Orders vs Failed Checkouts.
- **Simulated Payment Outcomes**: Payment attempts vs settlements vs declines (UPI, Card, Netbanking).
- **Payment Processing Duration**: P50, P95, P99 latency distribution of the payment settlement gateway.

---

## 3. Metrics Dictionary

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `showbee_active_virtual_users` | Gauge | `architecture` | Number of active K6 virtual users generating load. |
| `showbee_target_virtual_users` | Gauge | `architecture` | Target virtual user count for current staircase stage. |
| `showbee_http_requests_total` | Counter | `method`, `route`, `status_code`, `architecture` | Total HTTP requests processed (excludes `/metrics` and `/health`). |
| `showbee_http_errors_total` | Counter | `method`, `route`, `status_code`, `architecture` | Total HTTP error responses (status $\ge$ 400). |
| `showbee_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code`, `architecture` | Request latency in seconds across configurable buckets. |
| `showbee_seat_lock_attempts_total` | Counter | `mode` (pessimistic/optimistic), `architecture` | Total attempts to acquire a seat lock. |
| `showbee_seat_lock_conflicts_total` | Counter | `mode`, `architecture` | Seat lock rejections due to concurrent possession (HTTP 409). |
| `showbee_seat_lock_successes_total` | Counter | `mode`, `architecture` | Successful seat hold operations. |
| `showbee_seat_lock_duration_seconds` | Histogram | `mode`, `architecture` | Duration of the seat locking database transaction. |
| `showbee_booking_attempts_total` | Counter | `architecture` | Total booking creation attempts initiated. |
| `showbee_booking_success_total` | Counter | `architecture` | Total bookings successfully finalized. |
| `showbee_booking_creations_total` | Counter | `status` (pending/confirmed/failed), `architecture` | Booking orders partitioned by lifecycle status. |
| `showbee_payment_attempts_total` | Counter | `method` (UPI/CARD/NETBANKING), `architecture` | Total payment transactions initiated. |
| `showbee_payment_success_total` | Counter | `method`, `architecture` | Successfully settled payment transactions. |
| `showbee_payment_failures_total` | Counter | `method`, `architecture` | Failed or declined payment transactions. |
| `showbee_payment_duration_seconds` | Histogram | `method`, `architecture` | Payment gateway latency in seconds. |
| `showbee_db_pool_max_connections` | Gauge | `architecture` | Maximum configured PostgreSQL connection pool limit (20). |
| `showbee_db_pool_active_connections` | Gauge | `architecture` | Connections currently checked out from the pool. |
| `showbee_db_pool_idle_connections` | Gauge | `architecture` | Idle connections available in the pool. |
| `showbee_db_pool_waiting_count` | Gauge | `architecture` | Queries currently queued waiting for an available connection. |
| `showbee_db_deadlocks_total` | Counter | `architecture` | PostgreSQL deadlock events (SQLSTATE `40P01`). |
| `showbee_db_transaction_rollbacks_total` | Counter | `architecture` | Database transactions explicitly rolled back. |
| `showbee_double_booking_violations_total` | Counter | `architecture` | Invariant counter detecting duplicate seat allocations (strictly 0). |
| `showbee_internal_service_requests_total` | Counter | `source`, `target`, `endpoint`, `status` | Inter-service RPC request count. |
| `showbee_internal_service_duration_seconds`| Histogram | `source`, `target`, `endpoint` | Inter-service RPC latency histogram. |
| `showbee_circuit_breaker_state` | Gauge | `service` | Circuit breaker state: 0=CLOSED, 1=HALF_OPEN, 2=OPEN. |
| `showbee_failed_dependency_calls_total` | Counter | `dependency`, `error_type` | Failed downstream dependency calls. |
| `showbee_dependency_recovery_seconds` | Gauge | `dependency` | Recovery time to restore healthy state after an outage. |

---

## 4. PromQL Reference & Mathematical Formulations

### Safe Division with `clamp_min`
To prevent `NaN` or division-by-zero errors when traffic starts or transitions between stages:
$$\text{Rate} = \frac{\sum \text{rate}(\text{metric\_success}[1\text{m}])}{\text{clamp\_min}(\sum \text{rate}(\text{metric\_attempts}[1\text{m}]), 0.000001)}$$

### Booking Success Rate
```promql
100 * (
  sum(rate(showbee_booking_success_total{architecture=~"$architecture"}[1m])) 
  or sum(rate(showbee_booking_creations_total{status="confirmed",architecture=~"$architecture"}[1m])) 
  or sum(rate(showbee_seat_lock_successes_total{architecture=~"$architecture"}[1m]))
) / clamp_min(
  sum(rate(showbee_booking_attempts_total{architecture=~"$architecture"}[1m])) 
  or sum(rate(showbee_booking_creations_total{architecture=~"$architecture"}[1m])) 
  or sum(rate(showbee_seat_lock_attempts_total{architecture=~"$architecture"}[1m])),
  0.000001
)
```

### End-to-End P95 Latency
```promql
histogram_quantile(0.95, sum(rate(showbee_http_request_duration_seconds_bucket{architecture=~"$architecture"}[1m])) by (le)) * 1000
```

### Concurrency Conflict Rate by Mode
```promql
100 * sum(rate(showbee_seat_lock_conflicts_total{mode=~"$locking_mode",architecture=~"$architecture"}[1m])) 
/ clamp_min(sum(rate(showbee_seat_lock_attempts_total{mode=~"$locking_mode",architecture=~"$architecture"}[1m])), 0.000001)
```

---

## 5. How to Run Live Demonstrations

### Step 1: Launch the SHOWBEE Stack
Run from repository root:
```bat
start-all.bat
```
This automatically initiates:
- PostgreSQL on port 5432
- Prometheus on port 9090 (`http://localhost:9090`)
- Grafana on port 3001 (`http://localhost:3001`)
- Monolith Backend on port 5001 (`http://localhost:5001`)
- Booking Microservice on port 5002 (`http://localhost:5002`)
- Next.js Web Frontend on port 3000 (`http://localhost:3000`)

### Step 2: Open Grafana Evaluation Dashboard
Navigate to:
```
http://localhost:3001/d/showbee-architecture-evaluation
```
*(Default credentials: admin / admin)*

### Step 3: Execute Concurrency Benchmarks

| Objective | Script to Run | Description |
|---|---|---|
| **Head-to-Head Monolith Demo** | `load-test\start-live-demo.bat` | 50% Pessimistic + 50% Optimistic load ramp on Modular Monolith (:5001). Demonstrates simultaneous dual-locking curves. |
| **Head-to-Head Microservice Demo** | `load-test\start-live-demo-microservice.bat` | 50% Pessimistic + 50% Optimistic load ramp on Booking Microservice (:5002). Demonstrates service boundary behavior. |
| **Dedicated Optimistic CAS Demo** | `load-test\start-live-demo-optimistic.bat` | Pure OCC load test showing conflict rates and retries without pessimistic locking. |
| **Research Matrix (4 Experiments)** | `load-test\run-experiment.bat` | Interactive menu to launch Hotspot Contention (EXP-001 through EXP-004) or full 24-run matrix. |
| **Resilience & Fault Tolerance Suite** | `cd backend && npx tsx src/tests/run_fault_tolerance_suite.ts` | Programmatically triggers downstream failure, pool saturation, and lock timeout tests. |

---

## 6. Verification Checklist

- [x] All 8 master dashboard sections display live data during load tests.
- [x] Booking Success Rate reflects confirmed booking conversions.
- [x] Payment Success Rate displays live gateway settlement percentages with simulated tagging.
- [x] Microservice latency renders true user request latencies without probe contamination.
- [x] Optimistic and Pessimistic conflict rates update concurrently during `HEAD_TO_HEAD` tests.
- [x] Database connection pool metrics display active checkout vs max pool capacity (20).
- [x] Double booking violations strictly remain 0 under any level of concurrency.
- [x] Inter-service RPC communication latency and circuit breaker state accurately reflect live conditions.
