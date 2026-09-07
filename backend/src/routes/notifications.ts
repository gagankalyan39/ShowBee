// ============================================================
// MEMBER 4 - Admin/Notifications: Notification Routes
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications — user's notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = ['user_id = $1'];
    const params: any[] = [userId];
    if (unreadOnly === 'true') conditions.push('is_read = FALSE');

    const result = await query(`
      SELECT * FROM notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, Number(limit), offset]);

    const unreadCount = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE', [userId]
    );

    res.json({ success: true, data: result.rows, unreadCount: Number(unreadCount.rows[0].count) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user!.id]);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user!.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [req.params.id, req.user!.id]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/notifications/broadcast — admin broadcast
router.post('/broadcast', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, message } = req.body;
    const users = await query('SELECT id FROM users WHERE is_active=TRUE AND role=\'USER\'');
    for (const user of users.rows) {
      await query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES ($1,$2,$3,$4)',
        [user.id, type || 'SYSTEM', title, message]
      );
    }
    res.json({ success: true, message: `Broadcast sent to ${users.rows.length} users` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
