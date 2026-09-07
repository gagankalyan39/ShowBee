# SHOWBEE – 4-Member Team Work Division & Contribution Matrix

**College Project:** SHOWBEE – Online Movie Ticket Booking System  
**System Architect:** **Member 3 (System Architect & Concurrency Engineering Lead)**  
**Architecture:** Modular Monolith with Microservice Boundaries & Event-Driven Real-Time Sync  
**Database:** PostgreSQL 15  
**Frontend:** Next.js 14 App Router + Tailwind CSS + Framer Motion  
**Backend:** Node.js + Express 5 + TypeScript + Socket.IO + PostgreSQL Connection Pooling  

---

## 🏛️ System Architecture Designed by Member 3

```
+----------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (Member 1)                                   |
|   Next.js 14 App Router • Tailwind CSS • Glassmorphism Cinema UI • 3D Coverflow • SVG Seat Layout  |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v  REST / WebSockets
+----------------------------------------------------------------------------------------------------+
|                                 APPLICATION & SERVICE LAYER (Node.js/Express 5)                    |
|                                                                                                    |
|  +--------------------------------------------+    +--------------------------------------------+  |
|  |       MODULAR MONOLITH (Member 2)          |    |      MICROSERVICE BOUNDARY (Member 3)      |  |
|  |  - Movie Catalog Engine                    |    |  - System Architecture Design              |  |
|  |  - Multi-City Theatres & Screens           |    |  - Row-Level Pessimistic Seat Locking      |  |
|  |  - Dynamic Showtime Scheduler              |    |  - SELECT ... FOR UPDATE ACID Transactions |  |
|  |  - Tiered Seat Pricing Matrix              |    |  - 5-Minute Lock Expiry TTL                |  |
|  |  - Relational DDL Migrations & Seeds       |    |  - 30s Automated Seat Janitor Cron Daemon  |  |
|  |  - Advance Booking Restriction Logic       |    |  - Real-Time Showtime Lifecycle Monitor    |  |
|  |                                            |    |  - Two-Phase Booking Pipeline & Mock Pay   |  |
|  +--------------------------------------------+    +--------------------------------------------+  |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  |                      OPERATIONAL MONITORING & WEBSOCKETS (Member 4)                          |  |
|  |  - Socket.IO Real-Time Seat & Notification Broadcast Engine (`user_${userId}`, `show_${showId}`) |  |
|  |  - In-App Notification Center & Anchored Top Navbar Dropdown                                 |  |
|  |  - Executive Admin Analytics Dashboard (Live Revenue, Occupancy, Bookings, Users)           |  |
|  |  - Immutable Audit Logging & System Diagnostics Table Explorer                               |  |
|  +----------------------------------------------------------------------------------------------+  |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v  node-postgres Connection Pool (ACID Safety)
+----------------------------------------------------------------------------------------------------+
|                                  DATA PERSISTENCE LAYER (PostgreSQL 15)                            |
|  22 Normalized Tables • Foreign Key Constraints • Composite Indexes • UUID Primary Keys            |
|  movies (22) • theatres (9) • screens (9 active screens, 1 per theatre) • shows (538) • show_seats (53,800) |
+----------------------------------------------------------------------------------------------------+
```

---

## 👥 Detailed Member Breakdown & Deliverables

### 🎨 Member 1: Frontend & UI/UX Engineering
**Core Focus:** Delivering the modern cinematic glassmorphic interface matching the design specification.
- **Key Responsibilities:**
  1. **Cinematic Design System:** Tailored dark violet/slate theme (`#06040a` to `#130f24`), glassmorphic panels (`backdrop-blur-md`), glowing crimson/pink accent tokens (`#e11d48`, `#f43f5e`).
  2. **Hero 3D Coverflow Carousel:** Panoramic banner featuring top trending movies (PEDDI, IRUMUDI, etc.), previous/next 3D perspective previews, "Watch Trailer" popup trigger, and "Book Tickets" CTA.
  3. **Multi-Criteria Filter Bar:** Responsive date selector, multi-language dropdown, genre selector, and price range filters with reactive state management.
  4. **Interactive Cinema Seat Map:** Curved cinema screen visual ("ALL EYES THIS WAY • CINEMA SCREEN"), dynamic seat color coding (Available, Selected, Held, Booked), and pessimistic locking indicators.
  5. **Digital QR Code Ticket:** High-fidelity printable cinema pass with movie details, booking ID, seat list, and scannable QR code.
  6. **Attribution & Protected Team Matrix Page (`/team`):** Interactive passcode-protected interface showcasing the live status, architecture, and verified deliverables of all 4 members.
- **Created & Maintained Files:**
  - `frontend/src/components/Navbar.tsx` (Navbar with search routing and notification bell)
  - `frontend/src/components/NavTabs.tsx` (Clean cinema navigation tabs)
  - `frontend/src/components/HeroCarousel.tsx` (3D coverflow carousel)
  - `frontend/src/components/FilterBar.tsx` (Multi-criteria glass filter bar)
  - `frontend/src/components/MovieCard.tsx` (Movie card with rating and poster hover effects)
  - `frontend/src/components/MovieSection.tsx` (Categorized movie carousels)
  - `frontend/src/components/QRCodeTicket.tsx` (Printable digital cinema QR pass)
  - `frontend/src/components/TrailerModal.tsx` (YouTube player modal)
  - `frontend/src/components/FeatureHighlights.tsx` (Bottom 4 showcase feature cards)
  - `frontend/src/app/page.tsx` (Home page with live search filtering and dynamic grid)
  - `frontend/src/app/movies/[id]/page.tsx` (Movie details with in-page YouTube trailer and showtime booking)
  - `frontend/src/app/shows/[id]/seats/page.tsx` (Interactive cinema seat map with real-time locking)
  - `frontend/src/app/booking/payment/page.tsx` (Multi-channel payment gateway UI)
  - `frontend/src/app/booking/confirmation/page.tsx` (Booking celebration and QR pass)
  - `frontend/src/app/my-bookings/page.tsx` (User bookings history)
  - `frontend/src/app/theatres/page.tsx` (Theatres directory across 3 cities)
  - `frontend/src/app/team/page.tsx` (Protected 4-member architecture matrix and live test consoles)

---

### 🗄️ Member 2: Relational Database Architecture & Content Ingestion (Modular Monolith)
**Core Focus:** Designing the relational database schema, seeding catalog data, and building content APIs.
- **Key Responsibilities:**
  1. **PostgreSQL Relational Schema:** Normalized tables for `movies`, `languages`, `genres`, `cast_members`, `movie_genres`, `movie_cast`, `theatres`, `screens`, `seat_types`, and `seats`.
  2. **22 Movie Catalog Ingestion:** Complete datasets with high-definition posters, YouTube trailer URLs, release dates, durations, directors, writers, and ratings (including *IRUMUDI* and *PEDDI*).
  3. **Multi-City Theatre Layouts:** Multiplex seed data across Bengaluru (PVR Orion, INOX Garuda, Cinepolis Forum), Hyderabad (PVR Somajiguda, AMB Cinemas, Prasads Multiplex), and Chennai (AGS Villivakkam, PVR Escape, Sathyam Cinemas) with 32 screens and 35,700 seats.
  4. **Dynamic Showtime Scheduler:** Show generation linking movies to screens with tier pricing multipliers (Regular, Premium, Recliner, VIP) for Today, Tomorrow, and Day 3 (with advance booking restricted to next 2 days for `COMING_SOON` movies).
  5. **Catalog & Search APIs:** Endpoints for multi-criteria movie filtering (`/api/movies`), theatre listings (`/api/theatres`), and grouped movie showtimes (`/api/shows/movie/:movieId`).
- **Created & Maintained Files:**
  - `database/migrations/001_init_schema.sql` (PostgreSQL DDL schema definitions, enums, triggers, indexes)
  - `database/seeds/001_seed_data.sql` (Initial relational seeds for 22 movies, theatres, screens, and seat layouts)
  - `backend/src/db/seeds/seed_all_shows.ts` (Dynamic showtime scheduler generating 357 shows and 35,700 seats)
  - `backend/src/db/index.ts` (PostgreSQL pg connection pool and parameterized query helper)
  - `backend/src/routes/movies.ts` (REST endpoints for movie catalog, search, filtering, and reviews)
  - `backend/src/routes/theatres.ts` (REST endpoints for multiplexes, screens, and cities)
  - `backend/src/routes/shows.ts` (Grouped movie showtimes, advance booking guards, and screen seat layouts)

---

### 🏛️ Member 3: System Architect & Concurrency Engineering Lead (Microservice Core)
**Core Focus:** Designing the complete end-to-end system architecture, transactional concurrency control, ACID safety, seat lock janitor daemon, showtime lifecycle state machine, user authentication, and mock payment gateway.
- **Key Responsibilities:**
  1. **System Architecture Design:** Architected the overarching system combining the **Modular Monolith** for content retrieval with the **Concurrency Microservice Boundary** for transactional bookings and pessimistic seat locks.
  2. **Row-Level Pessimistic Seat Locking (`SELECT ... FOR UPDATE`):** Engineered the concurrency control mechanism on `show_seats` to lock seat rows inside ACID transactions, preventing double-booking and race conditions under heavy concurrent load.
  3. **Automated Seat Lock Janitor Cron:** Scheduled background task running every 30 seconds to automatically release expired held seats (`locked_until < NOW()`) and restore availability to connected clients.
  4. **Showtime Lifecycle Engine:** Background daemon updating show status (`UPCOMING` -> `STARTED` -> `ENDED`) in real time, guaranteeing that past screenings cannot be booked while preserving full historical data in PostgreSQL.
  5. **Seat Lock Duration Management (5-Minute TTL):** 300-second lock expiry mechanism with automatic release on expiration or explicit cancellation.
  6. **ACID Booking Transaction Pipeline:** Two-phase booking state transition (`PENDING` → `CONFIRMED` / `CANCELLED`) with strict database consistency.
  7. **JWT & Bcrypt Security Layer:** Role-based access control (User/Admin), salted password hashing (10 rounds), and secure bearer token verification (`/api/auth/login`, `/api/auth/register`).
  8. **Mock Payment Gateway:** Multi-method payment processing (UPI, Debit/Credit Card, Net Banking, Digital Wallets) with transactional seat confirmation.
- **Created & Maintained Files:**
  - `backend/src/routes/seats.ts` (Row-level pessimistic seat locking endpoint with `SELECT ... FOR UPDATE` and release mechanism)
  - `backend/src/services/cronService.ts` (Automated 30-second seat lock janitor daemon releasing expired held seats)
  - `backend/src/services/showLifecycleService.ts` (Real-time showtime lifecycle monitor transitioning UPCOMING -> STARTED -> ENDED)
  - `backend/src/routes/bookings.ts` (Two-phase ACID booking creation and user bookings retrieval)
  - `backend/src/routes/payments.ts` (Mock payment gateway simulation with transactional finalization)
  - `backend/src/routes/auth.ts` (JWT authentication, bcrypt password hashing, and user profile)
  - `backend/src/middleware/auth.ts` (Bearer token verification and role authorization middleware)
  - `backend/src/utils/helpers.ts` (Booking reference generation, QR code generation, ticket formatting)
  - `frontend/src/lib/dateUtils.ts` (Dynamic 4-day rolling window generator based on real-time clock)
  - `frontend/src/context/AuthContext.tsx` (Client-side authentication state and persistent tokens)

---

### 📡 Member 4: Admin Operations & Real-Time Event Hub (WebSockets & Operations)
**Core Focus:** Operational analytics, real-time WebSockets event hub, in-app notification center, and administrative audit logging.
- **Key Responsibilities:**
  1. **Executive Admin Dashboard:** Real-time analytics tracking total revenue from PostgreSQL `payments`, booking counts by status, registered users, and cinema seat occupancy rates (`/api/admin/dashboard`).
  2. **Real-Time WebSockets Engine (Socket.IO):** Live broadcast hub for seat status changes (`seats_held`, `seats_released`, `seats_booked`) and instant user notifications in private rooms (`user_${userId}`).
  3. **In-App Notification Center & Navbar Bell:** Notification database service (`notifications` table) with unread counter badges and dropdown anchored directly below the navbar bell icon.
  4. **Security & Audit Logging:** Immutable audit records (`audit_logs`) tracking administrative actions and system modifications.
  5. **Operational Diagnostics & Table Explorer:** Endpoints exposing live database table status, column definitions, and row counts (`/api/system/*`).
- **Created & Maintained Files:**
  - `backend/src/socket/index.ts` (Socket.IO WebSocket initialization and room management)
  - `backend/src/services/notificationService.ts` (Notification persistence and live socket emit)
  - `backend/src/services/auditService.ts` (Administrative audit logging)
  - `backend/src/routes/admin.ts` (Admin revenue metrics, user management, and audit trails)
  - `backend/src/routes/notifications.ts` (Notification inbox endpoints and read receipt updates)
  - `backend/src/routes/system.ts` (System status, DB table explorer, and live concurrency lock simulator)
  - `frontend/src/context/NotificationContext.tsx` (Real-time socket notifications and toast popups)
  - `frontend/src/app/admin/page.tsx` (Executive admin dashboard with revenue analytics)

---

## 🧪 Demonstration Guide for Evaluators

| Step | Member Demonstrated | Action | Verification |
|---|---|---|---|
| 1 | **Member 1** | Open `http://localhost:3000` | Review dark glassmorphic UI, 3D coverflow carousel, filter bar, and search bar |
| 2 | **Member 2** | Click "Inspect Member 2 Database Schema & Tables" on `/team` | Verify all 22 normalized PostgreSQL tables, column counts, row counts, and 22 seeded movies |
| 3 | **Member 3** | Click "⚡ Run Live Pessimistic Concurrency Test" on `/team` | Watch real-time PostgreSQL `SELECT ... FOR UPDATE` trace showing race conditions prevented live |
| 4 | **Member 3 & 1** | Open live seat map, select seats, hold them, and pay | Confirm seats lock for 5 mins, payment confirms, and instant QR pass generates |
| 5 | **Member 4** | Open `http://localhost:3000/admin` | Login with `admin@showbee.com` (`Admin@123`) to review live DB revenue and audit logs |
| 6 | **Member 4** | Book a ticket or trigger notification | Observe live real-time notification alert banner drop down directly beneath the Notification Bell button in the top navbar |
