// ============================================================
// SHOWBEE BACKEND ENTRY POINT
// Orchestrates Modular Monolith Services & Microservice Boundaries
// Member 1 (UI Integration), Member 2 (Movies/Data),
// Member 3 (Pessimistic Locking & Bookings), Member 4 (Admin/Realtime)
// ============================================================
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Middlewares
import { errorHandler } from './middleware/errorHandler';

// Socket.IO
import { initSocket } from './socket';

// Background Cron Services
import { startSeatLockCleanupJob } from './services/seatLockService';
import { startShowLifecycleService } from './services/showLifecycleService';

// Routes
import authRoutes from './routes/auth';
import movieRoutes from './routes/movies';
import theatreRoutes from './routes/theatres';
import showRoutes from './routes/shows';
import seatRoutes from './routes/seats';
import bookingRoutes from './routes/bookings';
import paymentRoutes from './routes/payments';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import systemRoutes from './routes/system';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start background cron jobs
startSeatLockCleanupJob();
startShowLifecycleService();

// Global Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files for movie posters & assets
const postersPath = path.join(__dirname, '../../frontend/public/movies');
app.use('/movies', express.static(postersPath));

// API Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    system: 'SHOWBEE Cinema Booking Platform',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/theatres', theatreRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/shows', seatRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🎬 SHOWBEE Backend Server running on http://0.0.0.0:${PORT} (LAN & Localhost accessible)`);
  console.log(`📡 Real-Time Socket.IO connected`);
  console.log(`🔒 Pessimistic Seat Locking Engine ACTIVE`);
  console.log(`👥 4-Member Modular Architecture ONLINE: /api/system/team`);
});

export { app, server };
