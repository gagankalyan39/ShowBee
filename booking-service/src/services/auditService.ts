import { query } from '../db';

export async function logAudit(
  adminId: string,
  action: string,
  entity: string,
  entityId: any,
  metadata?: any
) {
  try {
    await query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, entity, entityId, JSON.stringify(metadata || {})]
    );
  } catch (err: any) {
    console.error('Audit log error:', err.message);
  }
}
