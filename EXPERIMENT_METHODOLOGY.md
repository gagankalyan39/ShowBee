# SHOWBEE — Empirical Research Experiment Methodology

---

## 1. Primary Research Question & Hypothesis

### Primary Research Question
> *"Do the theoretical architectural advantages of Modular Monolith and Microservices manifest in measurable throughput, response latency, database connection utilization, fault containment, and operational characteristics in high-concurrency cinema booking workloads under varying contention conditions while strictly enforcing zero double bookings?"*

### Primary Research Hypothesis ($H_1$)
> *"Based on established architectural characteristics, the Modular Monolith provides lower request latency and lower communication overhead due to in-process execution, whereas the Booking Microservice provides superior fault isolation and independent resource scaling at the cost of network RPC serialization overhead, with database-level locking strategy (Pessimistic vs Optimistic) being the primary determinant of transaction throughput under high contention."*

### Null Hypothesis ($H_0$)
> *"Architectural style (Modular Monolith vs Microservices) and concurrency locking mechanism (Pessimistic vs Optimistic) demonstrate no statistically significant difference in transaction throughput, tail latency (p95), error rate, or resource utilization under increasing concurrent booking load."*

---

## 2. Supporting Hypotheses Matrix

| Hypothesis | Proposition | Validation Metric | Evaluation Criteria |
|---|---|---|---|
| **$H_1$** | In-process execution in the Modular Monolith yields lower p95 latency than inter-service HTTP communication in Microservices. | HTTP Request Duration p95 | Monolith p95 $\le$ Microservice p95 by $\ge 3\text{ms}$. |
| **$H_2$** | Pessimistic Locking (`SELECT FOR UPDATE`) outperforms Optimistic Locking (`CAS`) under high hotspot contention by eliminating rollback storms. | Throughput (RPS) under Hotspot Contention | PCC Throughput $>$ OCC Throughput when $>50\text{ VUs}$ target identical seats. |
| **$H_3$** | Optimistic Locking achieves higher peak throughput and lower average latency under distributed low-contention workloads due to lock-free reads. | Throughput (RPS) under Distributed Workload | OCC Throughput $\ge$ PCC Throughput when requests are dispersed. |
| **$H_4$** | A failure within the Booking Microservice leaves unrelated Monolith catalog queries operational, whereas Monolith process failure halts all domains. | System Availability & Error Rate | Fault isolation test confirms independent uptime. |
| **$H_5$** | PostgreSQL connection pool saturation creates queue delays that degrade tail latency exponentially rather than linearly. | Connection Wait Queue vs p99 Latency | Correlation coefficient $r > 0.85$ between pool waiting count and p99. |
| **$H_6$** | Strict ACID invariants (0 double bookings) can be maintained across all architectures and locking modes without loss of correctness. | Double Booking Violations Counter | Strict invariant: $\text{Violations} = 0$ across all 24 experiment runs. |

---

## 3. Experimental Variables

### 3.1. Independent Variables
1. **Architectural Style**:
   - Level 1: Modular Monolith (Port 5001)
   - Level 2: Booking Microservice (Port 5002)
2. **Concurrency Control Strategy**:
   - Level 1: Pessimistic Concurrency Control (PCC - `SELECT FOR UPDATE`)
   - Level 2: Optimistic Concurrency Control (OCC - Version-based atomic CAS)
3. **Contention Workload Pattern**:
   - Level 1: Hotspot Contention (High contention on identical seats)
   - Level 2: Distributed Booking (Low contention dispersed across 100 available seats)
4. **Workload Scale (Virtual Users)**:
   - Escalating levels: $2 \to 10 \to 50 \to 100 \to 1,000\text{ VUs}$

### 3.2. Dependent Variables
- **System Throughput**: Total HTTP requests per second (req/s) and confirmed bookings per second.
- **Response Latency**: Measured at p50 (median), p95, and p99 percentiles in milliseconds (ms).
- **Conflict Rate**: Percentage of reservation attempts rejected due to concurrent acquisition (HTTP 409).
- **Error Rate**: Percentage of HTTP 5xx failures.
- **Resource Utilization**: Node.js process CPU user time (%) and Heap memory consumption (MB).
- **Database Metrics**: Active connections, idle connections, waiting queries, transaction rollbacks, and deadlocks.
- **Data Integrity**: Total count of duplicate confirmed bookings for the same seat (strictly 0).

### 3.3. Controlled Variables
- Database instance: PostgreSQL 15 on dedicated local port 5432.
- Maximum connection pool limit: exactly 20 connections per service.
- Screening inventory: identical 100-seat screening layout per experiment.
- Hardware environment: identical physical host machine throughout all benchmark repetitions.
- Network condition: localhost loopback interface to eliminate variable internet latency.
- Seat hold expiration TTL: exactly 5 minutes (300 seconds).

---

## 4. 24-Run Experimental Matrix Design

The full experimental matrix consists of $2 \times 2 \times 2 = 8$ core configurations, each executed across 3 independent repetitions ($N = 24$ total runs):

```
+-------------------------------------------------------------------------------------------------+
| Config ID | Architecture       | Concurrency Locking | Workload Type | Repetitions | Total Runs |
+-----------+--------------------+---------------------+---------------+-------------+------------+
| EXP-001A  | Modular Monolith   | Optimistic (OCC)    | Hotspot       | Rep 1, 2, 3 | 3 runs     |
| EXP-001B  | Modular Monolith   | Optimistic (OCC)    | Distributed   | Rep 1, 2, 3 | 3 runs     |
| EXP-002A  | Modular Monolith   | Pessimistic (PCC)   | Hotspot       | Rep 1, 2, 3 | 3 runs     |
| EXP-002B  | Modular Monolith   | Pessimistic (PCC)   | Distributed   | Rep 1, 2, 3 | 3 runs     |
| EXP-003A  | Microservice       | Optimistic (OCC)    | Hotspot       | Rep 1, 2, 3 | 3 runs     |
| EXP-003B  | Microservice       | Optimistic (OCC)    | Distributed   | Rep 1, 2, 3 | 3 runs     |
| EXP-004A  | Microservice       | Pessimistic (PCC)   | Hotspot       | Rep 1, 2, 3 | 3 runs     |
| EXP-004B  | Microservice       | Pessimistic (PCC)   | Distributed   | Rep 1, 2, 3 | 3 runs     |
+-----------+--------------------+---------------------+---------------+-------------+------------+
| Total Runs Across Experimental Matrix                                        | 24 runs    |
+-------------------------------------------------------------------------------------------------+
```

---

## 5. Execution Pipeline & Output Protocol

1. **Pre-Test State Reset**:
   The test show seats are cleaned to status `AVAILABLE`, `version = 1`, and `locked_by = NULL` before each run.
2. **K6 Test Invocation**:
   `backend/src/scripts/runExperiments4Config.ts` spawns k6 instances with explicit environment flags:
   - `TARGET_URL`: points to `:5001` or `:5002`
   - `LOCK_MODE`: points to `PESSIMISTIC` or `OPTIMISTIC`
   - `TARGET_SHOW_ID`: points to the benchmark screening
3. **Data Recording**:
   Raw summaries are stored in `experiments/results/` partitioned into CSV and JSON logs.
4. **Statistical Aggregation**:
   Mean, standard deviation ($\sigma$), and percentiles are computed across the 3 repetitions for each cell in the matrix.
