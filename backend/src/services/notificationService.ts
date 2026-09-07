// ============================================================
// MEMBER 4 - Notifications Service (DB persistence + Socket.IO)
// ============================================================
import { query } from '../db';
import { getIO } from '../socket';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata: any = null
) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message, metadata ? JSON.stringify(metadata) : null]
    );

    const notification = result.rows[0];

    // Emit live event via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error: any) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
}

export async function createNotificationForAllUsers(
  type: string,
  title: string,
  message: string,
  metadata: any = null
) {
  try {
    const usersRes = await query(`SELECT id FROM users WHERE is_active = true`);
    const notifications = [];

    for (const u of usersRes.rows) {
      const n = await createNotification(u.id, type, title, message, metadata);
      if (n) notifications.push(n);
    }

    // Broadcast announcement event to all connected sockets
    const io = getIO();
    if (io) {
      io.emit('broadcast_notification', {
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
      });
    }

    return notifications;
  } catch (error: any) {
    console.error('Failed to broadcast notification:', error.message);
    return [];
  }
}
