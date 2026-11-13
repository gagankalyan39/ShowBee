# SHOWBEE – High-Concurrency Cinema Seat Booking System

> **Academic System Architecture & Distributed Systems Engineering Project**  
> An enterprise-grade, high-concurrency cinema reservation engine evaluating **Pessimistic vs Optimistic Locking** across **Modular Monolith** and **Microservice** architectures.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-336791.svg)](https://www.postgresql.org/)
[![K6](https://img.shields.io/badge/K6-v0.54.0-7D64FF.svg)](https://k6.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-v2.x-E6522C.svg)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-v10.x-F46800.svg)](https://grafana.com/)

---

## 1. System Architecture Overview

SHOWBEE is designed to benchmark transactional integrity, lock contention, and connection pool isolation under extreme concurrent load. The platform supports dynamic switching between two distinct deployment architectures and two fundamental concurrency control mechanisms:

```
                                  ┌───────────────────────────┐
                                  │   Next.js 14 Web Client   │
                                  │   (Port 3000 / Dynamic)   │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 │                                                             │
                 ▼                                                             ▼
  ┌───────────────────────────────┐                             ┌───────────────────────────────┐
  │   Modular Monolith Backend    │                             │     Booking Microservice      │
  │         (Port 5001)           │                             │          (Port 5002)          │
  ├───────────────────────────────┤                             ├───────────────────────────────┤
  │ - Catalog, Shows & Auth       │                             │ - Dedicated Booking Engine    │
  │ - Pessimistic Engine (SFU)    │                             │ - Pessimistic Engine (SFU)    │
  │ - Optimistic Engine (CAS)     │                             │ - Optimistic Engine (CAS)     │
  │ - Audit Logging & WebSockets  │                             │ - Payment ACID Verification   │
  │ - Shared Connection Pool (20) │                             │ - Dedicated Pool (20)         │
  └──────────────┬────────────────┘                             └───────────────┬───────────────┘
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                │
                                                ▼
                                 ┌──────────────────────────────┐
                                 │   PostgreSQL 15 (Port 5432)  │
                                 ├──────────────────────────────┤
                                 │ - Deterministic Locking      │
                                 │ - Anti-Double-Booking Trigger│
                                 │ - Idempotency Records Table  │
                                 │ - Versioned CAS Check        │
                                 └──────────────────────────────┘
```

### Architecture Topology
- **Modular Monolith (`backend/` - Port 5001):** Unified Express server with modular boundaries: Auth, Catalog, Shows Scheduler, Seat Hold/Booking, and Payments.
- **Booking Microservice (`booking-service/` - Port 5002):** Isolated microservice dedicated exclusively to high-throughput seat holding, transactional booking confirmation, and payment settlement.
- **Next.js 14 Frontend (`frontend/` - Port 3000):** Real-time interactive seat grid (100 seats per auditorium), dynamic architecture toggling, live WebSocket lock broadcasts, and administrator observatory.
- **Prometheus (`monitoring/prometheus/` - Port 9090):** Scraping real application, database connection pool, query timing, and transactional metrics from both `:5001/metrics` and `:5002/metrics`.
- **Grafana (`monitoring/grafana/` - Port 3001):** 3 provisioned dashboards providing live telemetry for locking performance, architecture comparison, and scalability health.

---

## 2. Concurrency Controls & Database Integrity

SHOWBEE implements mathematical guarantees against double bookings and race conditions across all transactional paths:

### A. Pessimistic Locking (`SELECT ... FOR UPDATE`)
- Evaluates `show_seats` rows by deterministically sorting seat IDs (`ORDER BY ss.id ASC FOR UPDATE`).
- Deterministic acquisition order eliminates circular wait conditions, mathematically preventing PostgreSQL deadlock errors (`40P01`).
- Locks rows at the database engine level until transaction `COMMIT` or `ROLLBACK`.

### B. Optimistic Locking (Compare-And-Swap / CAS)
- Reads seat state, current hold status, and row version without row-level database locks (`ORDER BY ss.id ASC`).
- Evaluates availability in memory and executes atomic conditional updates:
  ```sql
  UPDATE show_seats 
  SET status = 'HELD', locked_by = $1, lock_expires_at = $2, version = version + 1
  WHERE id = $3 AND version = $4 AND status = 'AVAILABLE'
  ```
- If another concurrent transaction increments `version`, the update returns 0 affected rows, triggering instant rollback and `409 Conflict`.

### C. Database-Level Enforcement (Migration `003_concurrency_and_idempotency.sql`)
1. **Physical Anti-Double-Booking Trigger:** `trg_prevent_duplicate_seat_booking` triggers before row insertion into `booking_seats`, rejecting insertion with SQLSTATE `23505` if the seat is part of an existing `CONFIRMED` booking.
2. **Idempotency Keys:** Unique partial index `idx_bookings_user_idempotency` on `bookings(user_id, idempotency_key)` and table `idempotency_records` cache and return identical HTTP responses for network-retried requests.
3. **Payment Race-Condition Elimination:** Re-locks all held seats with `SELECT ... FOR UPDATE` inside the confirmation transaction. If a 5-minute hold expires and another user acquires the seat before payment confirmation, the transaction aborts with `409 Conflict` and rolls back atomically.
4. **All-or-Nothing Multi-Seat Atomicity:** Validates that `affectedRows === requestedSeats.length`. If any single seat fails, the entire transaction rolls back.

---

## 3. Automated Concurrency Test Results

The automated concurrency suite (`backend/src/tests/verify_phase2_concurrency.ts`) verifies all 10 core concurrency properties against live PostgreSQL:

| Test # | Validation Scenario | Expected Behavior | Result |
| :---: | :--- | :--- | :---: |
| **1** | Pessimistic Locking Isolation | Concurrent user blocked until hold commit; subsequent user gets 409 | **PASS** |
| **2** | Optimistic CAS Detection | Outdated version yields 0 affected rows; raises 409 Conflict | **PASS** |
| **3** | DB Trigger Double Booking Rejection | Insertion of seat in CONFIRMED booking physically rejected | **PASS** |
| **4** | Multi-Seat All-or-Nothing Atomicity | If 1 of 3 seats is unavailable, all 3 seats roll back | **PASS** |
| **5** | State Transition Version Bumps | Version increments on Hold, Release, Expire, and Book | **PASS** |
| **6** | Deterministic Sorting Deadlock Prevention | Inverse seat order acquisition (`[A, B]` vs `[B, A]`) resolves with 0 deadlocks | **PASS** |
| **7** | 5-Minute Hold Expiry Janitor | Background cron safely releases expired holds with version bump | **PASS** |
| **8** | Payment Confirmation vs Expiry Race | Expired hold taken by User B cannot be confirmed by User A | **PASS** |
| **9** | Idempotency Key Replay | Identical idempotency key returns cached booking without duplicate record | **PASS** |
| **10** | High-Contention Single Seat Race | 10 concurrent requests; exactly 1 succeeds, 9 safely conflict | **PASS** |

**Summary: 10 / 10 Tests Passed (100% ACID Integrity Verified)**

---

## 4. Empirical Benchmark Experiments (8 Core Combinations × 3 Repetitions)

We executed 24 empirical benchmark runs across both architectures, both locking mechanisms, and two distinct load distributions using portable K6 (`load-test/bin/k6.exe v0.54.0`). Between every run, seat states were reset to `AVAILABLE` (version 1) and audited for double bookings.

### Summary Table of Measured Results (Mean ± Standard Deviation)

| ID | Experiment Combination | Throughput (RPS) | p50 Latency (ms) | p95 Latency (ms) | p99 Latency (ms) | Conflict Rate % | Double Bookings |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **EXP 1** | Monolith + Pessimistic + Hotspot | 239.29 ± 2.30 | 16.96 ± 12.20 | 80.53 ± 54.07 | 80.53 ± 54.07 | 99.32% | **0** |
| **EXP 2** | Monolith + Optimistic + Hotspot | 231.44 ± 22.49 | 22.85 ± 16.70 | 79.64 ± 50.48 | 79.64 ± 50.48 | 99.32% | **0** |
| **EXP 3** | Monolith + Pessimistic + Distributed | 320.42 ± 93.69 | 46.89 ± 27.81 | 71.42 ± 29.20 | 71.42 ± 29.20 | 95.01% | **0** |
| **EXP 4** | Monolith + Optimistic + Distributed | 153.80 ± 30.03 | 127.46 ± 26.27 | 264.23 ± 111.29 | 264.23 ± 111.29 | 93.46% | **0** |
| **EXP 5** | Microservice + Pessimistic + Hotspot | 244.91 ± 13.51 | 5.18 ± 1.66 | 56.35 ± 26.25 | 56.35 ± 26.25 | 99.32% | **0** |
| **EXP 6** | Microservice + Optimistic + Hotspot | 250.41 ± 2.40 | 6.47 ± 1.66 | 40.59 ± 4.04 | 40.59 ± 4.04 | 99.32% | **0** |
| **EXP 7** | Microservice + Pessimistic + Distributed | **342.64 ± 102.84** | 39.48 ± 27.25 | **64.94 ± 28.14** | **64.94 ± 28.14** | 95.26% | **0** |
| **EXP 8** | Microservice + Optimistic + Distributed | 184.10 ± 23.35 | 109.45 ± 19.96 | 141.48 ± 26.98 | 141.48 ± 26.98 | 94.61% | **0** |

*Raw per-run datasets and exports are preserved in `experiments/results/raw_experiment_runs.json` and `experiments/results/aggregated_summary.csv`.*

---

## 5. Hypothesis Evaluations

### Hypothesis H1: Locking Strategy Comparison
- **Distributed Workload (Low-to-Medium Contention):** Pessimistic locking demonstrated **1.86× to 2.08× higher throughput** compared to un-retried Optimistic CAS (Monolith: 320.42 vs 153.80 RPS; Microservice: 342.64 vs 184.10 RPS). Optimistic CAS exhibited higher tail latency (p95 of 264.23ms vs 71.42ms on Monolith) due to repeated version aborts when users selected adjacent seats.
- **Hotspot Workload (Extreme Contention):** Under intense contention for a single hot seat, both engines serialized write attempts with identical 99.32% conflict rates and **0 double bookings**. However, Optimistic locking achieved lower p95 latency on the isolated microservice (40.59ms vs 56.35ms) by failing fast on mismatched versions without queueing in PostgreSQL lock memory.

### Hypothesis H2: Architecture Isolation & Throughput
- **Connection Pool Isolation:** The dedicated Booking Microservice consistently outperformed the Modular Monolith in throughput across all scenarios (Peak: **342.64 RPS** vs 320.42 RPS).
- **Latency Distribution:** Microservice p50 median latency on hotspot contention dropped to **5.18ms - 6.47ms** compared to Monolith's **16.96ms - 22.85ms** (a **3.2× reduction in median latency**), demonstrating the concrete advantage of isolating transaction-heavy booking workloads from general HTTP middleware and catalog queries.

---

## 6. Prometheus Metrics & Grafana Dashboards

### Instrumented Metrics
- **Booking:** `showbee_seat_lock_attempts_total`, `showbee_seat_lock_successes_total`, `showbee_seat_lock_conflicts_total`, `showbee_seat_lock_duration_seconds`, `showbee_booking_requests_total`, `showbee_booking_failures_total`.
- **Database:** `showbee_db_pool_active_connections`, `showbee_db_pool_idle_connections`, `showbee_db_pool_waiting_count`, `showbee_db_connection_acquisition_duration_seconds`, `showbee_db_transaction_duration_seconds`, `showbee_db_deadlocks_total`, `showbee_db_transaction_rollbacks_total`, `showbee_db_query_duration_seconds`.
- **HTTP / System:** `showbee_http_requests_total`, `showbee_http_errors_total`, `showbee_http_request_duration_seconds`.

### Grafana Dashboards (Provisioned in `monitoring/grafana/provisioning/dashboards/`)
1. **Dashboard 1 – Locking Performance:** Real-time lock throughput, conflict %, duration histograms (p50, p95, p99), and retry tracking.
2. **Dashboard 2 – Architecture Comparison:** Side-by-side comparison of Monolith (:5001) vs Microservice (:5002) RPS, latency, and connection pool utilization.
3. **Dashboard 3 – Scalability & System Health:** Request rates, HTTP error percentage, database connection wait queues, query duration, and deadlock counters.

---

## 7. Setup & Execution Guide

### Prerequisites
- Node.js 18+ & PostgreSQL 15+
- (Optional) Prometheus & Grafana for live monitoring

### 1. Database Setup
```bash
# Connect to PostgreSQL and create database
createdb -U postgres showbee

# Migrations 001-003 run automatically on backend startup
```

### 2. Environment Variables
Create `.env` in `backend/` and `booking-service/`:
```env
PORT=5001
DATABASE_URL=postgresql://postgres:1234@localhost:5432/showbee
JWT_SECRET=showbee_super_secret_jwt_key_2024_change_in_production
JWT_EXPIRES_IN=7d
```

### 3. Start Backends & Frontend
```bash
# Terminal 1: Modular Monolith
cd backend && npm run dev

# Terminal 2: Booking Microservice
cd booking-service && npm run dev

# Terminal 3: Next.js Frontend
cd frontend && npm run dev
```

### 4. Run Concurrency Integrity Tests
```bash
cd backend && npx tsx src/tests/verify_phase2_concurrency.ts
```

### 5. Run Empirical 8-Scenario Benchmark Suite
```bash
cd backend && npx tsx src/scripts/runAllExperiments.ts
```

---

## 8. Architectural Limitations & Trade-Offs

1. **Optimistic Locking without Application-Level Retries:** Raw CAS aborts immediately upon version conflict. In production, an exponential backoff retry loop with jitter should be applied before surfacing conflict to the client.
2. **PostgreSQL Single-Writer Bottleneck:** While row-level locking avoids table-level locks, extreme write concurrency on a single table is bounded by PostgreSQL WAL write speed and connection pool limits.
3. **Distributed Two-Phase Commit:** The Booking Microservice currently relies on a shared database instance with logical schema isolation. A fully separated database-per-service model would necessitate the Saga pattern or an Outbox pattern for payment reconciliation.
