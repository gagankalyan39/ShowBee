# 🎬 ShowBee — Movie Ticket Booking Platform

> A modern, full-stack cinema ticket booking platform with real-time seat synchronization, secure booking, digital QR tickets, and a premium glassmorphic UI.

ShowBee is a full-stack movie ticket booking system designed and developed by a **4-member college team**. It provides users with a seamless cinema booking experience while giving administrators a powerful dashboard to manage movies, theatres, shows, bookings, users, payments, and system activity.

---

## ✨ Features

### 🎥 User Features

* 🎬 Browse movies and available showtimes
* 🔎 Search and filter movies by genre and other details
* 🪑 Interactive cinema seat selection
* 🔄 Real-time seat availability synchronization
* 🔒 Temporary seat locking to prevent double booking
* 💳 Mock payment processing
* 🎟️ Digital movie tickets
* 📱 QR-code based digital passes
* ❤️ Personal watchlist
* ⭐ Movie reviews and ratings
* 🎁 Gift card management
* 🔔 Real-time notifications

### 🛡️ Admin Features

* 📊 Real-time analytics dashboard
* 💰 Revenue and payment tracking
* 🎟️ Booking and ticket management
* 👥 User management
* 🎬 Movie catalog management
* 🎭 Theatre and screen management
* 🕐 Show scheduling
* 📈 Seat occupancy statistics
* 🔐 Security and audit logs
* 🔄 Real-time system monitoring

---

## 🚀 Highlights

### 🔒 Pessimistic Seat Locking

ShowBee uses PostgreSQL transactions with:

```sql
SELECT ... FOR UPDATE
```

to implement row-level pessimistic locking.

This prevents race conditions when multiple users attempt to book the same seat simultaneously.

The system also includes an automatic seat-lock expiration mechanism.

---

### ⚡ Real-Time Seat Synchronization

Socket.IO is used to synchronize seat availability between users in real time.

When a seat is locked or booked:

```text
User A
   │
   ├── Selects Seat
   ↓
Backend
   │
   ├── Locks Seat
   ↓
Socket.IO
   │
   ├───────────────┐
   ↓               ↓
User B           User C
Seat Map         Seat Map
Updated          Updated
```

This ensures that users always see the latest seat availability.

---

### 🎟️ Digital QR Tickets

After successful mock payment confirmation, ShowBee automatically generates a digital ticket containing a QR code.

The digital pass can be used as a convenient representation of the user's booking.

---

### 🎭 Dynamic Cinema Layouts

The system supports multiple theatres, screens, and seating configurations.

Current seating tiers include:

| Seat Type |  Price |
| --------- | -----: |
| Regular   |   ₹200 |
| Premium   |   ₹250 |
| VIP       | Custom |

Cinema layouts can contain different seat configurations for different screens.

---

### 🎬 Movie Catalog

The application includes a seeded catalog of **22 movies**, including:

* High-definition movie posters
* YouTube trailer embeds
* Movie synopsis
* Duration
* Ratings
* Genres
* Cast information

---

### 🖥️ Premium Glassmorphic UI

The frontend uses a cinematic dark theme with:

* Glassmorphism components
* Glowing accent tokens
* 3D visual effects
* Animated interfaces
* Movie coverflow hero carousel
* Interactive seat grid
* Responsive layouts
* Modern iconography

---

## 🛠️ Technology Stack

| Layer                | Technologies                            |
| -------------------- | --------------------------------------- |
| **Frontend**         | Next.js 14, React 18, TypeScript        |
| **Styling**          | Tailwind CSS                            |
| **UI**               | Glassmorphism, Lucide Icons, 3D Effects |
| **State Management** | React Context API                       |
| **Backend**          | Node.js, Express 5, TypeScript          |
| **Database**         | PostgreSQL 15                           |
| **Database Driver**  | pg (node-postgres)                      |
| **Authentication**   | JWT, bcryptjs                           |
| **Real-Time**        | Socket.IO                               |
| **Scheduling**       | node-cron                               |
| **QR Generation**    | QRCode                                  |
| **Architecture**     | Full-stack + modular services           |

---

## 📁 Project Structure

```text
showbee/
│
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   ├── components/          # Reusable UI components
│   │   └── lib/                 # Utilities and API clients
│   ├── public/                  # Static assets
│   └── package.json
│
├── backend/                     # Express.js backend
│   ├── src/
│   │   ├── controllers/         # Request controllers
│   │   ├── services/            # Business logic
│   │   ├── routes/              # API routes
│   │   ├── db/                  # Database configuration
│   │   └── microservices/       # Modular services
│   └── package.json
│
├── database/                    # Database migrations and seeds
│
├── docker-compose.yml           # Docker configuration
│
├── start-all.ps1               # Windows PowerShell startup
│
├── start-all.bat               # Windows Batch startup
│
└── README.md
```

---

# 🚀 Getting Started

## 1. Prerequisites

Make sure you have the following installed:

* **Node.js v18+**
* **PostgreSQL 15+**
* **Git**
* npm

The project has been tested with **Node.js v24**.

---

## 2. Clone the Repository

```bash
git clone https://github.com/gagankalyan39/ShowBee.git
cd ShowBee
```

---

## 3. Configure PostgreSQL

Create a PostgreSQL database named:

```text
showbee
```

Make sure PostgreSQL is running on:

```text
localhost:5432
```

Then configure your database credentials in the backend environment configuration.

> ⚠️ Never commit real passwords, API keys, JWT secrets, or other credentials to GitHub.

---

## 4. Install Backend Dependencies

```bash
cd backend
npm install
```

---

## 5. Setup and Seed the Database

From the `backend` directory:

```bash
npm run db:setup
```

This initializes the database schema and seeds:

* 22 movies
* 5 theatres
* Screens
* Cinema seats
* Shows
* Administrator account
* Test customer account
* Supporting application data

---

## 6. Start the Backend

```bash
npm run dev
```

The backend server runs at:

```text
http://localhost:5000
```

Socket.IO is also enabled for real-time communication.

---

## 7. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

---

## 8. Start the Frontend

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

Open:

```text
http://localhost:3000
```

---

# 🔑 Demo Login Credentials

For local development and demonstration, the project provides demo accounts.

| Role              | Email               | Password    |
| ----------------- | ------------------- | ----------- |
| 🛡️ Administrator | `admin@showbee.com` | `Admin@123` |
| 🎟️ Customer      | `user@showbee.com`  | `Admin@123` |

The login page also provides **Demo Fill** buttons for convenient testing.

> ⚠️ These credentials are intended only for the local/demo environment. Do not use them in production.

---

# 👥 Team & Responsibilities

ShowBee was developed by a **4-member college team**, with responsibilities divided across the major system components.

### 👨‍💻 Member 1 — Frontend & UI

Responsible for:

* Next.js 14 application
* Glassmorphism design system
* 3D movie coverflow carousel
* Movie filtering interface
* Interactive seat selection
* Digital QR ticket interface
* Responsive UI/UX

---

### 🗄️ Member 2 — Movie Catalog & Database

Responsible for:

* PostgreSQL database architecture
* Database schema
* Movie catalog
* 22 seeded movies
* Theatre configuration
* Cinema screen layouts
* Seat configuration
* Movie trailers
* Show scheduling

---

### 🔐 Member 3 — Booking Engine & Seat Locking

Responsible for:

* JWT authentication
* Role-based authorization
* Booking APIs
* PostgreSQL transactions
* Pessimistic seat locking
* `SELECT ... FOR UPDATE`
* 5-minute seat-lock TTL
* Mock payment gateway
* Digital ticket generation

---

### 📊 Member 4 — Admin & Integration

Responsible for:

* Admin dashboard
* Analytics
* Revenue tracking
* Socket.IO integration
* Real-time seat synchronization
* 30-second lock cleanup cron
* Audit logs
* System monitoring
* Team verification matrix

---

# 🧩 System Architecture

```text
                    ┌──────────────────────┐
                    │      Next.js UI      │
                    │      Port 3000       │
                    └──────────┬───────────┘
                               │
                         HTTP / REST
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Express Server    │
                    │      Port 5000       │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌───────────┐    ┌───────────┐
        │   Auth   │     │  Booking  │    │  Payment  │
        │ Service  │     │  Service  │    │  Service  │
        └──────────┘     └─────┬─────┘    └───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     PostgreSQL       │
                    │       Database       │
                    └──────────────────────┘
                               │
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Socket.IO       │
                    │   Real-Time Events   │
                    └──────────────────────┘
```

---

# 🔄 Booking Flow

```text
Browse Movies
      ↓
Select Movie
      ↓
Select Theatre & Show
      ↓
View Seat Map
      ↓
Select Seats
      ↓
Temporary Seat Lock
      ↓
Payment
      ↓
Booking Confirmation
      ↓
QR Ticket Generated
```

If another user tries to select a locked seat, the backend prevents the conflicting booking through database-level locking and transaction control.

---

# ⏱️ Seat Lock Lifecycle

```text
Available
    │
    ▼
User Selects Seat
    │
    ▼
Temporary Lock
    │
    ├──── Payment Successful ────► Booked
    │
    │
    └──── Timeout ───────────────► Available
```

ShowBee uses a **5-minute seat-lock TTL** for inactive booking sessions.

A background cleanup process runs periodically to release expired locks.

---

# 📊 Admin Dashboard

The administrator console provides visibility into important system metrics, including:

* Total bookings
* Revenue
* Seat occupancy
* Active users
* Movie performance
* Booking volumes
* Payment activity
* Security audit logs
* Real-time operational status

---

# 👥 Team Verification Dashboard

ShowBee includes an interactive team verification page:

```text
http://localhost:3000/team
```

The page displays the operational status and deliverables associated with all four project members.

---

# 🔐 Security

The application includes several security-focused mechanisms:

* JWT-based authentication
* Password hashing with bcrypt
* Role-based access control
* Database transactions
* Pessimistic row-level locking
* Booking validation
* Automatic seat-lock expiration
* Security audit logs

For production deployment, additional security hardening should be applied, including secure secrets management, HTTPS, rate limiting, production payment integration, and appropriate database access controls.

---

# 🐳 Docker

The project also includes Docker configuration for local development.

```bash
docker-compose up
```

Alternatively, on Windows:

```powershell
./start-all.ps1
```

or:

```cmd
start-all.bat
```

---

# 📌 Important Notes

### Environment Variables

Create the required `.env` files locally.

Do **not** commit them to GitHub.

Example:

```text
.env
.env.local
.env.development.local
.env.production.local
```

### Dependencies

`node_modules` is intentionally excluded from the repository.

After cloning:

```bash
npm install
```

must be run inside the required frontend/backend directories.

---

# 🗺️ Future Improvements

Possible future enhancements include:

* Real payment gateway integration
* Email and SMS ticket notifications
* Production cloud deployment
* Mobile application
* Advanced recommendation engine
* Promotional coupons
* Multi-language support
* Automated CI/CD pipeline
* Enhanced analytics
* Cloud-based media storage
* Containerized production deployment

---

# 📄 License

This project was created as an **educational college project**.

See the `LICENSE` file for additional information.

---

# 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes

```bash
git commit -m "Add amazing feature"
```

4. Push the branch

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request

---

# ⭐ Show Your Support

If you found ShowBee interesting or useful, consider giving the repository a ⭐ on GitHub.

---

## 🎬 ShowBee

**A complete cinema booking experience — from movie discovery to digital ticketing.**

> Built with ❤️ by the **ShowBee Team** for a college full-stack development project.
