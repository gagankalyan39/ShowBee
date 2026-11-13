import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequests, httpErrors } from '../metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const ARCHITECTURE = process.env.ARCHITECTURE_LABEL || 'microservice';

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = String(res.statusCode);

    const base = req.baseUrl || '';
    const rawPath = req.route?.path || req.path;
    const normalized = (base + rawPath)
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:num');

    httpRequestDuration
      .labels(req.method, normalized, statusCode, ARCHITECTURE)
      .observe(duration);

    httpRequests
      .labels(req.method, normalized, statusCode, ARCHITECTURE)
      .inc();

    if (res.statusCode >= 400) {
      httpErrors
        .labels(req.method, normalized, statusCode, ARCHITECTURE)
        .inc();
    }
  });

  next();
}
