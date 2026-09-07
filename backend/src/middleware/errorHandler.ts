import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(status).json({ success: false, message, ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}) });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};
