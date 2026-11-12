// Notification stub — calls monolith notification API
import { query } from '../db';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2::notification_type, $3, $4, $5)`,
      [userId, type, title, message, JSON.stringify(data || {})]
    );
  } catch (err: any) {
    console.error('Notification error:', err.message);
  }
}
