// ============================================================
// MEMBER 3 - Backend/Booking: Auth Routes (Microservice boundary)
// ============================================================
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role, created_at',
      [name, email.toLowerCase(), phone || null, hash, 'USER']
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any);
    res.status(201).json({ success: true, message: 'Registered successfully', data: { user, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been disabled' });
    }
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any);
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, message: 'Login successful', data: { user: safeUser, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, role, avatar_url, last_login, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
