// ============================================================
// SHOWBEE BACKEND ENTRY POINT
// Orchestrates Modular Monolith Services & Microservice Boundaries
// Member 1 (UI Integration), Member 2 (Movies/Data),
// Member 3 (Pessimistic Locking & Bookings), Member 4 (Admin/Realtime)
// ============================================================
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
process.env.ARCHITECTURE_LABEL = process.env.ARCHITECTURE_LABEL || 'monolith';

// Middlewares
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';
import { register } from './metrics';
import pool, { updatePoolMetrics } from './db';

// Socket.IO
import { initSocket } from './socket';

// Background Cron Services & Database Sync
import { startSeatLockCleanupJob } from './services/seatLockService';
import { startShowLifecycleService } from './services/showLifecycleService';
import { syncSeatHierarchy } from './services/seatHierarchySyncService';
import { ensureDatabaseSchema } from './services/schemaMigrationService';

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

// Start background cron jobs & sync seat hierarchy
ensureDatabaseSchema().catch(console.error);
startSeatLockCleanupJob();
startShowLifecycleService();
syncSeatHierarchy();

// Global Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(metricsMiddleware);

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

// Prometheus metrics endpoint
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    updatePoolMetrics();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err.message);
  }
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

  // Auto-trigger Prometheus & Grafana monitoring containers if docker is available
  import('child_process').then(({ exec }) => {
    exec('docker compose up -d prometheus grafana', (err) => {
      if (!err) {
        console.log('📊 Grafana (port 3001) & Prometheus (port 9090) auto-started via Docker Compose');
      }
    });
  }).catch(() => {});
});

export { app, server };
