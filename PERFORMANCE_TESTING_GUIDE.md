# SHOWBEE — Performance & Load Testing Guide

## 1. Overview & Testing Philosophy

The SHOWBEE performance-testing suite is built on **Grafana k6** and is designed to empirically evaluate:
1. **Concurrency Mechanisms**: Pessimistic Locking (`SELECT FOR UPDATE`) vs Optimistic Locking (`Atomic CAS`).
2. **Architectures**: Modular Monolith (`:5001`) vs Booking Microservice (`:5002`).
3. **Contention Profiles**: Extreme Hotspot Contention (100+ users targeting the exact same seat) vs Distributed Contention (users selecting across 100 available seats in a theatre hall).

---

## 2. Test Scenarios Summary

| Scenario File | Name | Execution Model | Target Load Profile | Primary Verification Metric |
|---|---|---|---|---|
| `scenario-a-incremental.js` | **Incremental Escalation** | `ramping-vus` | 2 $\to$ 10 $\to$ 50 $\to$ 100 $\to$ 1,000 VUs | Latency growth curves and maximum sustainable throughput |
| `scenario-b-spike.js` | **Flash-Sale Spike** | `ramping-vus` | 10 $\to$ 100 $\to$ 1,000 $\to$ 10 VUs | Absorption capacity, error recovery time, and queue stability |
| `scenario-c-hotspot.js` | **Hotspot Contention** | `per-vu-iterations` | 50–100 VUs targeting Seat G5 | Lock rejection rate (HTTP 409) and 0 double-booking guarantee |
| `scenario-d-distributed.js` | **Distributed Load** | `constant-vus` | 50 VUs across all hall seats | Baseline non-blocking throughput with minimal contention |
| `live-demo-load.js` | **Head-to-Head Staircase** | Dynamic Staircase | 10 to 5,000 VUs (50% PCC / 50% OCC) | Simultaneous real-time Grafana observation of both locking modes |

---

## 3. How to Execute Tests

### 3.1. Interactive Experiment Selector
Run from the repository root:
```bat
load-test\run-experiment.bat
```
Options available:
- `[1]` EXP-001: Modular Monolith + Optimistic Locking (OCC)
- `[2]` EXP-002: Modular Monolith + Pessimistic Locking (PCC)
- `[3]` EXP-003: Booking Microservice + Optimistic Locking (OCC)
- `[4]` EXP-004: Booking Microservice + Pessimistic Locking (PCC)
- `[5]` LIVE-DEMO: Automatic 20s Staircase on Monolith
- `[6]` LIVE-DEMO: Automatic 20s Staircase on Microservice
- `[7]` RUN ALL 4 EXPERIMENTS: Automated 24-Run Matrix

### 3.2. Dedicated Live Demo Runners

#### Monolith Head-to-Head (Dual Locking)
```bat
load-test\start-live-demo.bat
```
- Targets: `http://localhost:5001`
- Mode: `HEAD_TO_HEAD` (50% Pessimistic + 50% Optimistic)
- Complete reservation $\to$ booking $\to$ payment lifecycle.

#### Microservice Head-to-Head
```bat
load-test\start-live-demo-microservice.bat
```
- Targets: `http://localhost:5002`
- Mode: `HEAD_TO_HEAD`
- Exercises the microservice boundary under live load.

#### Focused Optimistic Concurrency Test
```bat
load-test\start-live-demo-optimistic.bat
```
- Targets: `http://localhost:5001`
- Mode: `OPTIMISTIC`
- Highlights CAS version check conflicts and retry dynamics.

---

## 4. Environment Variables Configuration

| Variable | Default | Purpose |
|---|---|---|
| `TARGET_URL` | `http://localhost:5001` | Target endpoint (`:5001` for Monolith, `:5002` for Microservice). |
| `LOCK_MODE` | `HEAD_TO_HEAD` | Concurrency mode: `PESSIMISTIC`, `OPTIMISTIC`, or `HEAD_TO_HEAD`. |
| `MAX_VU` | `5000` | Maximum Virtual Users cap for staircase execution. |
| `RAMP_SECS` | `5` | Duration in seconds to ramp between staircase levels. |
| `HOLD_SECS` | `15` | Duration in seconds to hold at each staircase level. |
| `TARGET_SHOW_ID` | `002683a4-b644-40d6-88df-648407405cf5` | Target screening ID used for the benchmark. |

---

## 5. Automated Validation & Verification Tests

To run internal backend verification suites directly from the terminal:

### 1. Concurrency & ACID Integrity Test Suite
```bash
cd backend
npx tsx src/tests/verify_phase2_concurrency.ts
```
*Validates all 10 concurrency requirements including SELECT FOR UPDATE exclusivity, CAS version matching, atomic rollbacks, 5-minute hold expirations, and database triggers.*

### 2. High-Concurrency Simulation Suite (1,000 Users)
```bash
cd backend
npx tsx src/tests/run_concurrency_suite.ts
```
*Simulates 1,000 concurrent requests competing for seats, comparing Pessimistic vs Optimistic throughput and latency.*

### 3. Fault Tolerance & Resilience Suite
```bash
cd backend
npx tsx src/tests/run_fault_tolerance_suite.ts
```
*Tests downstream service failures, circuit breaker tripping, database connection pool saturation, and PostgreSQL lock-wait timeouts.*

### 4. Communication Overhead Benchmark
```bash
curl -s "http://localhost:5001/api/system/benchmark/communication-overhead?iterations=50"
```
*Calculates exact p50, p95, p99 latency delta between in-process function invocation and network RPC to Port 5002.*
