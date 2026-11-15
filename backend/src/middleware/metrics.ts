import { Request, Response, NextFunction } from 'express';
import { 
  httpRequestDuration, 
  httpRequests, 
  httpErrors, 
  activeVirtualUsers, 
  targetVirtualUsers, 
  currentLoadStage 
} from '../metrics';

let lastTelemetrySeen = 0;
const ARCHITECTURE = (process.env.ARCHITECTURE_LABEL || 'monolith').trim();

// Auto-decay gauge if no load test traffic in 45 seconds
setInterval(() => {
  if (lastTelemetrySeen > 0 && Date.now() - lastTelemetrySeen > 45000) {
    activeVirtualUsers.labels(ARCHITECTURE).set(0);
    targetVirtualUsers.labels(ARCHITECTURE).set(0);
    currentLoadStage.labels(ARCHITECTURE).set(0);
    lastTelemetrySeen = 0;
  }
}, 5000);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Extract K6 live load test telemetry headers
  const vuHeader = req.headers['x-k6-vu'];
  const targetHeader = req.headers['x-k6-target-vu'];
  const stageHeader = req.headers['x-k6-stage'];

  if (vuHeader || targetHeader) {
    lastTelemetrySeen = Date.now();
    if (targetHeader) {
      const target = parseInt(String(targetHeader), 10);
      if (!isNaN(target) && target > 0) {
        targetVirtualUsers.labels(ARCHITECTURE).set(target);
        activeVirtualUsers.labels(ARCHITECTURE).set(target);
      }
    } else if (vuHeader) {
      const vus = parseInt(String(vuHeader), 10);
      if (!isNaN(vus) && vus > 0) activeVirtualUsers.labels(ARCHITECTURE).set(vus);
    }
    if (stageHeader) {
      const stg = parseInt(String(stageHeader), 10);
      if (!isNaN(stg)) currentLoadStage.labels(ARCHITECTURE).set(stg);
    }
  }

  // Handle direct telemetry endpoint
  if (req.path === '/api/telemetry/stage' && req.method === 'POST') {
    const { vus, targetVus, stage } = req.body || {};
    lastTelemetrySeen = Date.now();
    if (typeof vus === 'number') activeVirtualUsers.labels(ARCHITECTURE).set(vus);
    if (typeof targetVus === 'number') targetVirtualUsers.labels(ARCHITECTURE).set(targetVus);
    if (typeof stage === 'number') currentLoadStage.labels(ARCHITECTURE).set(stage);
    res.json({ status: 'OK', vus, targetVus, stage, architecture: ARCHITECTURE });
    return;
  }

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = String(res.statusCode);

    // Normalize route: preserve baseUrl + route pattern, sanitize raw UUIDs & numbers to prevent cardinality explosion
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
