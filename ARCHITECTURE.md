# SHOWBEE – System Architecture & Technical Design

## Architectural Pattern: Modular Monolith with Microservice Boundaries

The SHOWBEE platform combines the organizational simplicity of a **Modular Monolith** for content domain services with isolated **Microservice Boundaries** for high-contention transactional workflows.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND CLIENT (Next.js 14 App Router)             │
│   • Dark Cinematic Theme   • 3D Coverflow Hero   • Dynamic Seat Map     │
│   • Socket.IO Live Client  • Digital QR Pass     • 4-Member Dashboard   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST + WebSockets
┌────────────────────────────────────▼────────────────────────────────────┐
│                        SHOWBEE BACKEND APPLICATION                      │
│                                                                         │
│  ┌──────────────────────────────┐     ┌──────────────────────────────┐  │
│  │   MODULAR MONOLITH MODULES   │     │    MICROSERVICE BOUNDARIES   │  │
│  │                              │     │                              │  │
│  │  • Movies Catalog Service    │     │  • Auth & Session Engine     │  │
│  │  • Theatres & Screens        │     │  • Pessimistic Lock Engine   │  │
│  │  • Showtime Scheduler        │     │  • ACID Booking Coordinator  │  │
│  │  • Review & Rating System    │     │  • Mock Payment Gateway      │  │
│  └──────────────┬───────────────┘     └──────────────┬───────────────┘  │
│                 │                                    │                  │
│  ┌──────────────▼────────────────────────────────────▼───────────────┐  │
│  │                   EVENT & INTEGRATION SERVICES                    │  │
│  │   • Socket.IO Real-Time Engine   • 30-Second Lock Janitor Cron    │  │
│  │   • Transactional Audit Logger   • User Notification Engine       │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │ Connection Pool (pg)
┌─────────────────────────────────────▼───────────────────────────────────┐
│                          POSTGRESQL 15 DATABASE                         │
│  • users (UUID)     • movies (22 Seeded)   • shows (Timetables)         │
│  • show_seats (Row-Locked via SELECT ... FOR UPDATE)                    │
│  • bookings (ACID)  • payments (Gateway)   • audit_logs (Security)      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Deep Dive: Pessimistic Seat Locking

### The Concurrency Problem in Cinema Ticketing
When multiple users simultaneously select the same high-demand cinema seats (e.g. blockbuster opening night), standard optimistic locking or non-transactional updates lead to **race conditions** and **double-booking**.

### The SHOWBEE Solution: Row-Level Database Locks
SHOWBEE enforces concurrency safety directly at the database engine level using PostgreSQL row-level locks within strict ACID transactions:

```sql
BEGIN;

-- Step 1: Query and atomically lock the target seat rows
SELECT ss.id, ss.status, ss.locked_by, ss.lock_expires_at
FROM show_seats ss
WHERE ss.show_id = $1 AND ss.id = ANY($2)
FOR UPDATE;

-- Step 2: Validate that all requested seats are currently AVAILABLE
-- (or held by the same user whose lock hasn't expired)
IF any_seat.status != 'AVAILABLE' THEN
    ROLLBACK;
    RAISE EXCEPTION 'One or more selected seats are already locked or booked.';
END IF;

-- Step 3: Transition status to HELD with a 5-minute TTL
UPDATE show_seats
SET status = 'HELD',
    locked_by = $userId,
    lock_expires_at = NOW() + INTERVAL '5 minutes'
WHERE id = ANY($2);

COMMIT;
```

### Automatic Lock Expiry (Janitor Service)
A background cron job runs every **30 seconds**:
```sql
UPDATE show_seats
SET status = 'AVAILABLE', locked_by = NULL, lock_expires_at = NULL
WHERE status = 'HELD' AND lock_expires_at < NOW()
RETURNING id, show_id, seat_id;
```
When expired locks are released, an event is emitted through **Socket.IO** (`seats_released`) to instantly update the seat map grid on all connected clients without page refreshes.

---

## 👥 4-Member Responsibility Mapping

| Member | Domain | Key Architecture Artifacts |
|---|---|---|
| **Member 1** | Frontend & UI/UX | `frontend/src/components/*`, `frontend/src/app/*`, Tailwind tokens, Coverflow 3D Hero |
| **Member 2** | Catalog & Database | `database/migrations/*`, `database/seeds/*`, `backend/src/routes/movies.ts`, `backend/src/routes/theatres.ts` |
| **Member 3** | Booking Engine & Security | `backend/src/routes/seats.ts`, `backend/src/routes/bookings.ts`, `backend/src/routes/payments.ts`, `backend/src/routes/auth.ts` |
| **Member 4** | Admin & System Integration | `backend/src/routes/admin.ts`, `backend/src/routes/system.ts`, `backend/src/socket/*`, `backend/src/services/*` |
