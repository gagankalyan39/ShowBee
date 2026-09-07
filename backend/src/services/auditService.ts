// ============================================================
// MEMBER 4 - Audit Logging Service
// Tracks all critical administrative, financial & catalog changes
// ============================================================
import { query } from '../db';

export async function logAudit(
  adminId: string | null,
  action: string,
  entity: string,
  entityId: string | null = null,
  oldValues: any = null,
  newValues: any = null,
  ipAddress: string | null = null
) {
  try {
    const result = await query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        adminId,
        action,
        entity,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
      ]
    );
    return result.rows[0];
  } catch (err: any) {
    console.error('Audit logging failed:', err.message);
    return null;
  }
}
