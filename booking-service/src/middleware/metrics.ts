import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration } from '../metrics';

const ARCHITECTURE = process.env.ARCHITECTURE_LABEL || 'microservice';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Normalize route for label (strip UUIDs)
  const route = req.route?.path || req.path.replace(/[0-9a-f-]{36}/gi, ':id').replace(/\d+/g, ':num');

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, route, String(res.statusCode), ARCHITECTURE)
      .observe(duration);
  });

  next();
}
