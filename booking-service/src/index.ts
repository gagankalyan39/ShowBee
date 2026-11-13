// ============================================================
// SHOWBEE Booking Microservice
// Handles: seats (locking), bookings (ACID), payments (mock)
// Port: 5002
// Architecture label: microservice
// ============================================================
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
process.env.ARCHITECTURE_LABEL = 'microservice';

import { register } from './metrics';
import { metricsMiddleware } from './middleware/metrics';
import pool, { updatePoolMetrics } from './db';
import seatsRouter from './routes/seats';
import bookingsRouter from './routes/bookings';
import paymentsRouter from './routes/payments';

const app = express();
const server = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(metricsMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'booking-microservice', 
    architecture: 'microservice',
    port: process.env.PORT || 5002,
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    updatePoolMetrics();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err.message);
  }
});

// Routes
app.use('/api/shows', seatsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Booking microservice: route not found' });
});

const PORT = parseInt(process.env.PORT || '5002');
server.listen(PORT, () => {
  console.log(`🔒 Booking Microservice running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});

export default app;
