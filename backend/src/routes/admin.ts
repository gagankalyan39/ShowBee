// ============================================================
// MEMBER 4 - Admin, Analytics & Auditing Engine
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/dashboard - Comprehensive system analytics
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // 1. Total revenue
    const revenueRes = await query(`
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM payments
      WHERE status = 'SUCCESS'
    `);

    // 2. Total bookings count by status
    const bookingsCountRes = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_bookings
      FROM bookings
    `);

    // 3. Total users
    const usersCountRes = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'ADMIN') as admin_count,
        COUNT(*) FILTER (WHERE role = 'USER') as customer_count
      FROM users
    `);

    // 4. Movies count
    const moviesCountRes = await query(`
      SELECT 
        COUNT(*) as total_movies,
        COUNT(*) FILTER (WHERE status = 'NOW_SHOWING') as now_showing,
        COUNT(*) FILTER (WHERE status = 'COMING_SOON') as coming_soon,
        COUNT(*) FILTER (WHERE is_published = true) as published_movies
      FROM movies
    `);

    // 5. Seat occupancy rate across all active shows
    const occupancyRes = await query(`
      SELECT 
        COUNT(*) as total_seats_offered,
        COUNT(*) FILTER (WHERE status = 'BOOKED') as seats_booked,
        COUNT(*) FILTER (WHERE status = 'HELD') as seats_held,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as seats_available
      FROM show_seats
    `);

    // 6. Recent bookings
    const recentBookingsRes = await query(`
      SELECT b.id, b.booking_reference, b.total_amount, b.status, b.created_at,
             u.name as user_name, u.email as user_email,
             m.title as movie_title,
             sh.start_time
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN shows sh ON b.show_id = sh.id
      JOIN movies m ON sh.movie_id = m.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    // 7. Recent audit logs
    const auditLogsRes = await query(`
      SELECT a.*, u.name as admin_name
      FROM audit_logs a
      LEFT JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        revenue: {
          total: parseFloat(revenueRes.rows[0].total_revenue),
        },
        bookings: bookingsCountRes.rows[0],
        users: usersCountRes.rows[0],
        movies: moviesCountRes.rows[0],
        occupancy: {
          total: parseInt(occupancyRes.rows[0].total_seats_offered, 10),
          booked: parseInt(occupancyRes.rows[0].seats_booked, 10),
          held: parseInt(occupancyRes.rows[0].seats_held, 10),
          available: parseInt(occupancyRes.rows[0].seats_available, 10),
          rate_percent: occupancyRes.rows[0].total_seats_offered > 0
            ? Math.round((occupancyRes.rows[0].seats_booked / occupancyRes.rows[0].total_seats_offered) * 100)
            : 0,
        },
        recentBookings: recentBookingsRes.rows,
        recentAuditLogs: auditLogsRes.rows,
      },
      meta: {
        module: 'MEMBER_4_ADMIN_ANALYTICS',
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users - List all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, is_active, created_at, last_login 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/users/:id/status - Toggle user active status
router.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const result = await query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, is_active`,
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log admin audit
    await query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, new_values)
       VALUES ($1, 'UPDATE_USER_STATUS', 'users', $2, $3)`,
      [(req as any).user.id, id, JSON.stringify({ is_active })]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/audit-logs - View system audit logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, u.name as admin_name, u.email as admin_email
       FROM audit_logs a
       LEFT JOIN users u ON a.admin_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/reports/revenue - Revenue breakdown by movie
router.get('/reports/revenue', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        m.id as movie_id,
        m.title as movie_title,
        m.poster_url,
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(bs.id) as total_tickets_sold,
        COALESCE(SUM(p.amount), 0) as total_revenue
      FROM movies m
      LEFT JOIN shows sh ON sh.movie_id = m.id
      LEFT JOIN bookings b ON b.show_id = sh.id AND b.status = 'CONFIRMED'
      LEFT JOIN booking_seats bs ON bs.booking_id = b.id
      LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'SUCCESS'
      GROUP BY m.id, m.title, m.poster_url
      ORDER BY total_revenue DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
