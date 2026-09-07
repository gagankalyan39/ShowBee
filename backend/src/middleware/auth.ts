// ============================================================
// MEMBER 3 - Backend/Booking: Auth Middleware
// ============================================================
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; name: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const result = await query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.userId]);
    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireAuth = authenticate;

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows[0]) req.user = result.rows[0];
  } catch {}
  next();
};
