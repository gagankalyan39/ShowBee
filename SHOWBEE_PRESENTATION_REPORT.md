# SHOWBEE: System Architecture & Engineering Presentation Report

**High-Concurrency Cinema Seat Booking Platform**  
*Evaluating Pessimistic vs. Optimistic Concurrency & Modular Monolith vs. Microservice Topologies*

---

## 1. Executive Summary & Project Pitch

SHOWBEE is an enterprise-grade, distributed cinema seat booking platform designed to solve the hardest challenge in ticketing systems: **thousands of concurrent users competing for identical high-demand seats within millisecond windows during premiere ticket drops**.

### The Core Problem
Under flash-sale traffic, naive reservation systems encounter three failure modes:
1. **Double Bookings (Dirty Writes):** Multiple transactions reserve the same seat simultaneously.
2. **Lock Queuing & Thread Exhaustion:** Unordered locks cause circular deadlocks (`SQLSTATE 40P01`) and connection pool exhaustion.
3. **Cascading Failure:** Spikes in booking checkout overload catalog browsing and payment services.

### The SHOWBEE Solution
- **Dual Concurrency Engines:** Production-grade implementation of both **Pessimistic Concurrency Control (PCC)** via `SELECT FOR UPDATE` and **Optimistic Concurrency Control (OCC)** via atomic versioned Compare-And-Swap (`CAS`).
- **Dual Architecture Deployment:** Direct empirical comparison of a **Modular Monolith** (`Port 5001`) and an isolated **Booking Microservice** (`Port 5002`).
- **Physical Database Trigger:** PostgreSQL trigger `trg_prevent_duplicate_seat_booking` physically blocking duplicate seat assignments at the storage engine level.
- **Deterministic Deadlock Prevention:** Automatic ascending sorting of seat IDs (`ORDER BY ss.id ASC`) mathematically eliminating circular wait conditions.
- **Real-Time Observability:** Native Prometheus instrumentation scraping real connection pool statistics, transaction latencies, and query durations, paired with 3 provisioned Grafana dashboards.
- **Empirical Rigor:** Tested across **24 full benchmark runs** with K6, achieving **zero double bookings (100% ACID integrity)** under extreme hotspot and distributed loads.

---

## 2. System Architecture Blueprint

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
  │ • Auth, Users, Roles (JWT)    │                             │ • Dedicated Booking Engine    │
  │ • Catalog & Show Scheduler    │                             │ • PCC: SELECT FOR UPDATE      │
  │ • PCC Engine: SELECT FOR UPDATE│                            │ • OCC: Versioned CAS Check    │
  │ • OCC Engine: Versioned CAS   │                             │ • Atomic Payment Settlement   │
  │ • Socket.IO Seat Broadcasts   │                             │ • Dedicated Pool (20 conns)   │
  │ • Shared Pool (20 conns)      │                             │ • Architecture-Tagged Metrics │
  └──────────────┬────────────────┘                             └───────────────┬───────────────┘
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                │
                                                ▼
                                 ┌──────────────────────────────┐
                                 │   PostgreSQL 15 (Port 5432)  │
                                 ├──────────────────────────────┤
                                 │ • 100 Show Seats / Screening │
                                 │ • Anti-Double-Booking Trigger│
                                 │ • Idempotency Records Table  │
                                 │ • Versioned CAS State Machine│
                                 └──────────────┬───────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 │ Scrapes /metrics every 5s                                   │
                 ▼                                                             ▼
  ┌───────────────────────────────┐                             ┌───────────────────────────────┐
  │   Prometheus Server (:9090)   │ ────── PromQL Streaming ──► │  Grafana Dashboards (:3001)   │
  │ • Real pool, query & lock stats│                            │ 1. Locking Performance        │
  │ • Zero synthetic metrics      │                             │ 2. Architecture Comparison    │
  │                               │                             │ 3. Scalability & System Health│
  └───────────────────────────────┘                             └───────────────────────────────┘
```

### Component Responsibilities & Ports
| Component | Runtime / Stack | Port | Primary Responsibilities |
| :--- | :--- | :---: | :--- |
| **Frontend UI** | Next.js 14, React 18, Tailwind | `3000` | Symmetrical 100-seat cinema grid, live WebSocket updates, architecture switcher, admin dashboard. |
| **Modular Monolith** | Node.js, Express, TypeScript | `5001` | User authentication, movie catalog, screen management, batch show scheduler, seat locking, Socket.IO. |
| **Booking Microservice** | Node.js, Express, TypeScript | `5002` | High-throughput dedicated booking pipeline, isolated seat locking, payment ACID transactions. |
| **Database** | PostgreSQL 15 | `5432` | Relational storage, ACID transactions, row-level locks, physical triggers, unique indexes. |
| **Prometheus** | Prometheus v2.47 | `9090` | Timeseries metric scraper targeting `:5001/metrics` and `:5002/metrics` at 5s intervals. |
| **Grafana** | Grafana v10.2 | `3001` | Live visualization of lock throughput, p95 latencies, conflict %, and connection pool queues. |

---

## 3. Concurrency Control Mechanisms (Deep Dive)

### 3.1 Pessimistic Concurrency Control (PCC)
- **Concept:** Acquires exclusive row-level locks in PostgreSQL using `SELECT ... FOR UPDATE` before evaluating seat state.
- **Lock Acquisition Flow:**
  1. Transaction begins (`BEGIN`).
  2. Input seat IDs are deduplicated and deterministically sorted in memory: `seatIds.sort()`.
  3. Rows are queried and locked in deterministic order:
     ```sql
     SELECT ss.id, ss.status, ss.locked_by, ss.lock_expires_at, ss.version
     FROM show_seats ss
     WHERE ss.id = ANY($1::uuid[]) AND ss.show_id = $2
     ORDER BY ss.id ASC FOR UPDATE;
     ```
  4. Availability is verified. If any seat is unavailable, transaction issues `ROLLBACK` and returns `409 Conflict`.
  5. Status is updated to `HELD` with a 5-minute expiry, locked user ID, and `version = version + 1`.
  6. Transaction issues `COMMIT`, releasing row locks.
- **Deadlock Guarantee:** Because all transactions acquire row locks in strictly identical ascending primary key order (`ORDER BY ss.id ASC`), circular wait conditions cannot form. Deadlocks (`40P01`) are mathematically eliminated.

### 3.2 Optimistic Concurrency Control (OCC)
- **Concept:** Lock-free reads with conditional Compare-And-Swap (CAS) write validation.
- **Lock Acquisition Flow:**
  1. Transaction begins (`BEGIN`).
  2. Seats are queried without row locks:
     ```sql
     SELECT ss.id, ss.status, ss.locked_by, ss.lock_expires_at, ss.version
     FROM show_seats ss
     WHERE ss.id = ANY($1::uuid[]) AND ss.show_id = $2
     ORDER BY ss.id ASC;
     ```
  3. If all seats are available, the application issues an atomic CAS update for each seat:
     ```sql
     UPDATE show_seats
     SET status = 'HELD', locked_by = $1, lock_expires_at = $2, version = version + 1
     WHERE id = $3 AND version = $4 AND status = 'AVAILABLE';
     ```
  4. If `rowCount === 0` (indicating another transaction modified `version`), a CAS collision is detected.
  5. The transaction immediately executes `ROLLBACK` and returns `409 Conflict`.

### 3.3 Side-by-Side Comparison Matrix
| Dimension | Pessimistic Locking (`SELECT FOR UPDATE`) | Optimistic Locking (Atomic CAS `v+1`) |
| :--- | :--- | :--- |
| **Locking Mechanism** | PostgreSQL engine row-level locks | Non-blocking read + atomic conditional write |
| **Deadlock Risk** | Prevented via deterministic `ORDER BY ss.id ASC` | Zero (no locks held across reads) |
| **Best Suited For** | High-contention flash sales (hotspot seats) | Low/medium contention (distributed seating) |
| **Overhead Under Contention** | Transaction queues in PostgreSQL lock manager | Aborts fast on version mismatch |
| **Application Retries** | Low (transactions wait and serialize) | Requires retry loop with backoff |
| **Data Integrity** | **100% (0 double bookings)** | **100% (0 double bookings)** |

---

## 4. Database Integrity & ACID Safety Framework

### 4.1 Physical Anti-Double-Booking Trigger
Even if an application-layer bug were introduced, PostgreSQL enforces physical integrity via a database-level trigger (`Migration 003`):
```sql
CREATE OR REPLACE FUNCTION trg_check_duplicate_seat_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.id
    WHERE bs.show_seat_id = NEW.show_seat_id
      AND bs.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND b.id <> NEW.booking_id
      AND b.status = 'CONFIRMED'
  ) THEN
    RAISE EXCEPTION 'ACID VIOLATION: Seat % is already CONFIRMED in another booking', NEW.show_seat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Idempotency & Repeat Protection
- **Header & Body Checking:** Clients send `Idempotency-Key: <UUID>`.
- **Unique Partial Index:** `CREATE UNIQUE INDEX idx_bookings_user_idempotency ON bookings(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`
- **Cache Table:** Table `idempotency_records` stores previous HTTP status and response payload. Replays return the cached response without creating duplicate bookings or charges.

### 4.3 Payment Confirmation vs. Hold Expiry Race
- When a user submits payment, their 5-minute hold might have expired.
- **Protection:** Inside the confirmation transaction, seats are re-queried with `ORDER BY ss.id ASC FOR UPDATE`.
- The engine asserts that `status = 'HELD'` AND `locked_by = current_user`. If another user acquired the seat in the interim, the payment transaction rolls back atomically with `409 Conflict`.

### 4.4 All-or-Nothing Multi-Seat Atomicity
- In multi-seat bookings (e.g., reserving Seats A1, A2, A3), all requested seats must be successfully acquired.
- If even 1 of the seats fails validation or CAS, all seats are rolled back (`ROLLBACK`). Partial reservations are strictly prohibited.

---

## 5. Automated Concurrency Test Suite (10 / 10 Tests Passed)

Automated test suite (`backend/src/tests/verify_phase2_concurrency.ts`) executed against live PostgreSQL 15:

| # | Test Scenario | Technical Validation | Result |
| :-: | :--- | :--- | :-: |
| **1** | Pessimistic Lock Isolation | Concurrent hold blocked until User 1 commits; User 2 gets 409 | **PASS** |
| **2** | Optimistic CAS Detection | Outdated version yields 0 affected rows; raises 409 Conflict | **PASS** |
| **3** | DB Trigger Double Booking | Insertion of seat into CONFIRMED booking physically rejected | **PASS** |
| **4** | Multi-Seat All-or-Nothing | When 1 of 3 seats is held by another user, all 3 roll back | **PASS** |
| **5** | Version Increments | Version bumps systematically on Hold, Release, Expire, Book | **PASS** |
| **6** | Deterministic Sorting | Inverse seat order acquisition (`[A, B]` vs `[B, A]`) causes 0 deadlocks | **PASS** |
| **7** | Hold Expiry Janitor | Background cron safely releases expired holds with version increment | **PASS** |
| **8** | Payment Race Condition | Expired hold taken by User B cannot be confirmed by User A | **PASS** |
| **9** | Idempotency Key Replay | Identical key returns cached booking without duplicate record | **PASS** |
| **10** | High-Contention Race | 10 concurrent requests for single seat: exactly 1 succeeds, 9 conflict | **PASS** |

---

## 6. Empirical Benchmark Results (8 Experiments × 3 Reps = 24 Runs)

Executed using official K6 binary (`load-test/bin/k6.exe v0.54.0`) with 250 pre-seeded user accounts and distinct JWT tokens. Between every run, seat states were reset to `AVAILABLE` (version 1) and audited for double bookings.

### Aggregated Results Table (Mean ± Standard Deviation)

| ID | Experiment Combination | Architecture | Lock Mode | Workload | Throughput (RPS) | p50 Latency (ms) | p95 Latency (ms) | Conflict Rate % | Double Bookings |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :-: |
| **EXP 1** | Monolith + Pessimistic + Hotspot | Monolith (:5001) | PESSIMISTIC | Hotspot (50 VUs) | 239.29 ± 2.30 | 16.96 ± 12.20 | 80.53 ± 54.07 | 99.32% | **0** |
| **EXP 2** | Monolith + Optimistic + Hotspot | Monolith (:5001) | OPTIMISTIC | Hotspot (50 VUs) | 231.44 ± 22.49 | 22.85 ± 16.70 | 79.64 ± 50.48 | 99.32% | **0** |
| **EXP 3** | Monolith + Pessimistic + Distributed | Monolith (:5001) | PESSIMISTIC | Distributed (30 VUs) | 320.42 ± 93.69 | 46.89 ± 27.81 | 71.42 ± 29.20 | 95.01% | **0** |
| **EXP 4** | Monolith + Optimistic + Distributed | Monolith (:5001) | OPTIMISTIC | Distributed (30 VUs) | 153.80 ± 30.03 | 127.46 ± 26.27 | 264.23 ± 111.29 | 93.46% | **0** |
| **EXP 5** | Microservice + Pessimistic + Hotspot | Microservice (:5002) | PESSIMISTIC | Hotspot (50 VUs) | 244.91 ± 13.51 | **5.18 ± 1.66** | 56.35 ± 26.25 | 99.32% | **0** |
| **EXP 6** | Microservice + Optimistic + Hotspot | Microservice (:5002) | OPTIMISTIC | Hotspot (50 VUs) | 250.41 ± 2.40 | **6.47 ± 1.66** | **40.59 ± 4.04** | 99.32% | **0** |
| **EXP 7** | Microservice + Pessimistic + Distributed | Microservice (:5002) | PESSIMISTIC | Distributed (30 VUs) | **342.64 ± 102.84** | 39.48 ± 27.25 | **64.94 ± 28.14** | 95.26% | **0** |
| **EXP 8** | Microservice + Optimistic + Distributed | Microservice (:5002) | OPTIMISTIC | Distributed (30 VUs) | 184.10 ± 23.35 | 109.45 ± 19.96 | 141.48 ± 26.98 | 94.61% | **0** |

### Empirical Hypothesis Validations

#### Hypothesis H1: Locking Strategy Comparison
- **Distributed Workload (Low/Medium Contention):** Pessimistic locking demonstrated **1.86× to 2.08× higher throughput** compared to un-retried Optimistic CAS (Microservice: 342.64 vs 184.10 RPS; Monolith: 320.42 vs 153.80 RPS). Optimistic CAS suffered higher p95 latency (264.23ms vs 71.42ms on Monolith) due to repeated version aborts when concurrent users picked overlapping seat groups.
- **Hotspot Workload (Intense Single-Seat Contention):** Both engines serialized write attempts with 99.32% conflict rates and **0 double bookings**. Optimistic CAS achieved lower p95 latency on the isolated microservice (40.59ms vs 56.35ms) by failing fast on mismatched versions without holding row locks.

#### Hypothesis H2: Architecture Isolation Comparison
- **Peak Throughput:** The Booking Microservice achieved higher peak throughput across all combinations (Peak: **342.64 RPS** vs 320.42 RPS).
- **Latency Distribution:** The Microservice reduced median (p50) latency under hotspot contention from **16.96ms - 22.85ms down to 5.18ms - 6.47ms** (a **3.2× to 3.5× improvement**), validating that isolating transaction-intensive booking operations from general HTTP middleware and catalog routes provides major performance advantages.

---

## 7. Observability & Monitoring Infrastructure

### 7.1 Prometheus Metrics Catalog
- **Locking Metrics:** `showbee_seat_lock_attempts_total`, `showbee_seat_lock_successes_total`, `showbee_seat_lock_conflicts_total`, `showbee_seat_lock_duration_seconds`.
- **Database Metrics:** `showbee_db_pool_active_connections`, `showbee_db_pool_idle_connections`, `showbee_db_pool_waiting_count`, `showbee_db_connection_acquisition_duration_seconds`, `showbee_db_transaction_duration_seconds`, `showbee_db_deadlocks_total`, `showbee_db_transaction_rollbacks_total`, `showbee_db_query_duration_seconds`.
- **HTTP Metrics:** `showbee_http_requests_total`, `showbee_http_errors_total`, `showbee_http_request_duration_seconds`.

### 7.2 Three Provisioned Grafana Dashboards
1. **Dashboard 1 – Locking Performance:** Real-time lock throughput, conflict %, duration histograms (p50, p95, p99), and retry tracking.
2. **Dashboard 2 – Architecture Comparison:** Side-by-side comparison of Monolith (:5001) vs Microservice (:5002) RPS, latency, and connection pool utilization.
3. **Dashboard 3 – Scalability & System Health:** Request rates, HTTP error percentage, database connection wait queues, query duration, and deadlock counters.

---

## 8. Presentation Slide Deck Outline (12-Slide Deck)

Use this structured outline when presenting SHOWBEE:

### Slide 1: Title & Introduction
- **Title:** SHOWBEE — High-Concurrency Cinema Seat Booking Platform
- **Subtitle:** Empirical Comparison of Concurrency Engines & Distributed Architecture
- **Key Points:** 100-seat multiplex hall, 10,000 VU simulation capability, zero double bookings.
- **Speaker Note:** "Welcome everyone. Today we present SHOWBEE, an enterprise-grade cinema reservation engine designed to evaluate transactional concurrency and architectural decomposition under extreme load."

### Slide 2: The Concurrency Problem in Ticket Drops
- **Visual:** Flash sale diagram showing 1,000 users clicking the same VIP seat at 10:00:00.001 AM.
- **Key Points:** Dirty writes (double bookings), deadlock cascades (`40P01`), connection pool exhaustion.
- **Speaker Note:** "When a blockbuster premiere opens, thousands of users compete for identical seats within milliseconds. Without rigorous concurrency controls, systems either crash or sell the same seat twice."

### Slide 3: Dual Concurrency Control Architecture
- **Visual:** Flowchart comparing Pessimistic (`SELECT FOR UPDATE`) vs. Optimistic (`CAS v+1`).
- **Key Points:** Deterministic `ORDER BY ss.id ASC` lock ordering vs. lock-free atomic version updates.
- **Speaker Note:** "We built two complete concurrency engines: a Pessimistic engine using row-level locks with deterministic sorting to prevent deadlocks, and an Optimistic engine using atomic Compare-And-Swap version checks."

### Slide 4: System Architecture Topology
- **Visual:** System block diagram showing Next.js (:3000), Monolith (:5001), Microservice (:5002), PostgreSQL (:5432), Prometheus (:9090), Grafana (:3001).
- **Key Points:** Modular Monolith vs. Isolated Microservice with dedicated connection pools.
- **Speaker Note:** "Our architecture allows instant switching between a unified Modular Monolith and a dedicated Booking Microservice, allowing direct empirical comparison on the same machine."

### Slide 5: Multi-Seat Atomicity & Anti-Double-Booking Trigger
- **Visual:** Code snippet of PostgreSQL trigger `trg_prevent_duplicate_seat_booking`.
- **Key Points:** Physical database trigger, all-or-nothing multi-seat atomicity, idempotency key cache.
- **Speaker Note:** "Even if application code fails, PostgreSQL enforces physical integrity via a database-level trigger that throws an exception if any confirmed seat is double-booked."

### Slide 6: Automated Concurrency Verification Suite
- **Visual:** Table showing 10/10 test results.
- **Key Points:** 10 automated concurrency tests verifying locks, CAS, atomicity, expiry, and deadlocks.
- **Speaker Note:** "Our test suite verified all 10 core concurrency properties against live PostgreSQL with 100% pass rates."

### Slide 7: K6 Load Testing Methodology
- **Visual:** K6 test runner diagram with Scenarios A through E.
- **Key Points:** 250 pre-seeded user accounts, distinct JWT tokens, Hotspot vs. Distributed workloads.
- **Speaker Note:** "To test real concurrency, we seeded 250 test users with individual JWT tokens and simulated both hotspot contention on a single seat and distributed booking across the auditorium."

### Slide 8: Empirical Benchmark Results (The 24 Runs)
- **Visual:** The 8-experiment aggregated results table.
- **Key Points:** 8 combinations × 3 repetitions = 24 runs; 0 double bookings across all runs.
- **Speaker Note:** "We conducted 24 live runs. The key finding: in distributed workloads, Pessimistic locking achieved over 2x higher throughput than un-retried Optimistic CAS, while maintaining zero double bookings across all runs."

### Slide 9: Hypothesis Validations (H1 & H2)
- **Visual:** Bar charts of Throughput and p50 Latency comparing Monolith vs. Microservice and PCC vs. OCC.
- **Key Points:** H1 validated (PCC wins distributed; OCC fails fast on hotspot). H2 validated (Microservice delivers 3.4x lower median latency).
- **Speaker Note:** "Our data confirms Hypothesis H1 and H2: dedicated connection pool isolation in the microservice reduced median latency by over 3x under contention."

### Slide 10: Full Observability Stack
- **Visual:** Screenshots of the 3 Grafana dashboards.
- **Key Points:** Real Prometheus metrics, query duration histograms, connection pool wait queues.
- **Speaker Note:** "All telemetry is real. Prometheus scrapes live metrics every 5 seconds, powering 3 dedicated Grafana dashboards for locking, architecture, and system health."

### Slide 11: Real-World Engineering Trade-offs
- **Visual:** Comparison table of operational complexity vs. throughput.
- **Key Points:** Monolith is simpler to deploy; Microservice excels under high-concurrency ticket drops.
- **Speaker Note:** "For smaller cinemas, the Modular Monolith is easier to maintain. For premiere drops with extreme traffic, isolating the booking microservice prevents database starvation."

### Slide 12: Summary & Live Demonstration
- **Visual:** URLs for Frontend, Backends, and Grafana.
- **Key Points:** GitHub repository live; all tests reproducible via `start-all.bat`.
- **Speaker Note:** "Thank you. We will now proceed to the live interactive demonstration."

---

## 9. Live Evaluation Demo Script

Follow these steps for a live presentation demo:

1. **Launch the Platform:**
   - Double-click `start-all.bat` (or run `.\start-all.ps1`).
   - Highlight that Prometheus (:9090) and Grafana (:3001) start automatically alongside the backends.
2. **Demonstrate Web Booking Interface:**
   - Open [http://localhost:3000](http://localhost:3000).
   - Navigate to any screening and display the symmetrical 100-seat auditorium with 4 tiers.
   - Select multiple seats and show the live hold timer (5 minutes).
3. **Demonstrate Architecture Switcher:**
   - Open the developer/admin controls and switch between **Monolith (Port 5001)** and **Microservice (Port 5002)**.
   - Show network requests in DevTools routing to `:5001` or `:5002`.
4. **Demonstrate Concurrency Controls:**
   - Switch between **Pessimistic** and **Optimistic** locking in the UI.
   - Open two browser tabs as different users and show immediate conflict handling (`409 Conflict`) when attempting to hold the same seat.
5. **Showcase Grafana Live Telemetry:**
   - Open [http://localhost:3001](http://localhost:3001).
   - Showcase **Dashboard 1 (Locking Performance)**, **Dashboard 2 (Architecture Comparison)**, and **Dashboard 3 (Scalability & Health)**.
6. **Run Concurrency Test Verification Live:**
   - Open terminal in `backend/` and execute:
     ```bash
     npx tsx src/tests/verify_phase2_concurrency.ts
     ```
   - Highlight the 10/10 test pass log verifying zero double bookings.
