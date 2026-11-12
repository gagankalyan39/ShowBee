# 🎬 SHOWBEE — Observability & Concurrency Benchmarking Guide

## 📌 Architecture Overview

This project implements:
1. **Pessimistic Locking (`SELECT ... FOR UPDATE`) vs. Optimistic Locking (Compare-And-Set Version matching)** for cinema seat reservations.
2. **Modular Monolith (port 5001) vs. Dedicated Booking Microservice (port 5002)**.
3. **End-to-End Observability** via **Prometheus (port 9090)** and **Grafana (port 3001)** scraping both services live.

```
┌────────────────────────────────────────────────────────┐
│               Next.js 14 Frontend (:3000)              │
│       • Admin Observatory Tab • Architecture Toggle    │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       Monolith │                        │ Microservice
      (:5001)   ▼                        ▼ (:5002)
┌───────────────────────┐        ┌───────────────────────┐
│     SHOWBEE Core      │        │  Booking Microservice │
│   (Modular Monolith)  │        │   (Seats & Bookings)  │
│      /metrics         │        │       /metrics        │
└───────────┬───────────┘        └───────────┬───────────┘
            │                                │
            └───────────────┬────────────────┘
                            │
              Scrapes :5001 │ Scrapes :5002
                            ▼
            ┌───────────────────────────────┐
            │       Prometheus (:9090)      │
            └───────────────┬───────────────┘
                            ▼
            ┌───────────────────────────────┐
            │   Grafana Dashboard (:3001)   │
            │      10 Real-Time Panels      │
            └───────────────────────────────┘
```

---

## 🚀 Quick Start with Docker Compose

To start the complete stack (Postgres, Monolith, Microservice, Frontend, Prometheus, Grafana):

```bash
docker-compose up --build
```

### Services & Ports:

| Service | Port | Description |
|---|---|---|
| **Frontend** | `http://localhost:3000` | Next.js 14 Glassmorphism Cinema UI |
| **Monolith Backend** | `http://localhost:5001` | Express 5 Catalog, Shows, Auth & Monolith Booking |
| **Booking Microservice** | `http://localhost:5002` | Dedicated Booking & Seat Locking Microservice |
| **Prometheus** | `http://localhost:9090` | Scrapes `/metrics` from 5001 & 5002 every 5s |
| **Grafana** | `http://localhost:3001` | Pre-configured dashboard (`admin` / `showbee123`) |
| **PostgreSQL 15** | `localhost:5432` | 22 normalized relational tables |

---

## 📊 Live Grafana Dashboard Panels

Open **`http://localhost:3001`** (login `admin` / `showbee123`, or view as Anonymous):
- **Dashboard Name:** `SHOWBEE — Locking & Architecture Observatory`
- **UID:** `showbee-main`

### Included Panels:
1. **🔒 Seat Lock Attempts/sec**: Side-by-side rates of Pessimistic vs. Optimistic attempts.
2. **⚡ Lock Conflicts/sec**: Collisions detected in real time.
3. **⏱ Lock Duration p50/p95/p99 — Pessimistic**: Latency percentiles under PostgreSQL exclusive row locks.
4. **⏱ Lock Duration p50/p95/p99 — Optimistic**: Latency percentiles under non-blocking atomic version CAS.
5. **🏗 HTTP Latency: Monolith vs Microservice**: Comparative p50/p95 curve of both architectures.
6. **✅ Booking Success Rate**: Live transactions per second.
7. **💳 Payment Success Rate**: Confirmation ratio.
8. **🗄 DB Pool Active Connections**: Connection pool pressure comparing single vs multi-process deployments.
9. **🔁 Conflict Rate % — Pessimistic**: Contention gauge.
10. **🔁 Conflict Rate % — Optimistic**: Collision rate gauge.

---

## 🧪 Running the Concurrency Load Tester

We provide a specialized Node.js multi-threaded load generator in `load-test/concurrent-seats.js`:

```bash
# 1. Compare Pessimistic vs Optimistic Head-to-Head (200 users)
node load-test/concurrent-seats.js --users=200 --mode=HEAD_TO_HEAD

# 2. Compare Monolith vs Microservice Architecture (500 users)
node load-test/concurrent-seats.js --users=500 --architecture=both

# 3. High Hotspot Stress Test (1,000 users competing for 3 VIP seats)
node load-test/concurrent-seats.js --users=1000 --mode=PESSIMISTIC --architecture=monolith

# 4. Optimistic Microservice Stress Test (500 users)
node load-test/concurrent-seats.js --users=500 --mode=OPTIMISTIC --architecture=microservice
```

### CLI Options:
- `--users=N`: Virtual concurrent users (e.g. 50, 200, 500, 1000)
- `--mode=PESSIMISTIC|OPTIMISTIC|HEAD_TO_HEAD`: Concurrency control algorithm
- `--architecture=monolith|microservice|both`: Target process
- `--concurrency=N`: In-flight parallel workers (default: 20)
- `--monolithUrl=...`: Monolith base URL (default: `http://localhost:5001`)
- `--microserviceUrl=...`: Microservice base URL (default: `http://localhost:5002`)

---

## 🎛️ Live Frontend Architecture Toggle

Inside the **Admin Console** (`http://localhost:3000/admin`):
1. Sign in with 1-click admin: `admin@showbee.com` / `Admin@123`.
2. Notice the top banner: **Booking Architecture Mode**.
3. Toggle between:
   - **Monolith :5001**: Routes all bookings and seat holds to the monolith.
   - **Microservice :5002**: Routes all bookings and seat holds to the standalone booking microservice.
4. Click the **Grafana Observatory** tab to view embedded links and Prometheus query metrics directly within the UI!

