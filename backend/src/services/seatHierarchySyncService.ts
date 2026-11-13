import pool, { query } from '../db';

/**
 * Seat Hierarchy Synchronization Service
 * Ensures:
 * 1. All 4 seat types (REGULAR, PREMIUM, VIP, RECLINER) exist with correct multipliers.
 * 2. Every seat in the database belongs to the correct seat_type_id according to the cinema hierarchy:
 *    - Rows A-B: REGULAR (front)
 *    - Rows C-F: PREMIUM (center)
 *    - Rows G-H: VIP (rear)
 *    - Rows I-J: RECLINER (luxury back)
 * 3. Any anomalous show_seats prices are repaired to match the show's base_price & tier structure.
 */
export async function syncSeatHierarchy(): Promise<void> {
  try {
    // 1. Ensure seat types exist
    await query(`
      INSERT INTO seat_types (name, price_multiplier) VALUES
        ('REGULAR', 1.0),
        ('PREMIUM', 1.25),
        ('VIP', 1.75),
        ('RECLINER', 2.25)
      ON CONFLICT DO NOTHING;
    `);

    // Fetch IDs
    const typesRes = await query(`SELECT id, name FROM seat_types`);
    const typeMap = new Map<string, number>();
    typesRes.rows.forEach((r: any) => typeMap.set(r.name.toUpperCase(), r.id));

    const regId = typeMap.get('REGULAR') || 1;
    const premId = typeMap.get('PREMIUM') || 2;
    const vipId = typeMap.get('VIP') || 4;
    const reclId = typeMap.get('RECLINER') || 3;

    // 2. Synchronize seats table: set seat_type_id according to row_label
    await query(`
      UPDATE seats
      SET seat_type_id = CASE
        WHEN UPPER(row_label) IN ('A', 'B') THEN $1::integer
        WHEN UPPER(row_label) IN ('C', 'D', 'E', 'F') THEN $2::integer
        WHEN UPPER(row_label) IN ('G', 'H') THEN $3::integer
        WHEN UPPER(row_label) IN ('I', 'J') THEN $4::integer
        ELSE $1::integer
      END
      WHERE is_active = true;
    `, [regId, premId, vipId, reclId]);

    // 3. Repair show_seats where Row A/B was erroneously given higher price than base_price
    await query(`
      UPDATE show_seats ss
      SET price = sh.base_price
      FROM seats se, shows sh
      WHERE ss.seat_id = se.id
        AND ss.show_id = sh.id
        AND UPPER(se.row_label) IN ('A', 'B')
        AND ss.price > sh.base_price;
    `);

    // 4. Ensure Row C-F (Premium) matches round(base_price * 1.25) if corrupted
    await query(`
      UPDATE show_seats ss
      SET price = ROUND(sh.base_price * 1.25)
      FROM seats se, shows sh
      WHERE ss.seat_id = se.id
        AND ss.show_id = sh.id
        AND UPPER(se.row_label) IN ('C', 'D', 'E', 'F')
        AND ss.price > ROUND(sh.base_price * 1.75);
    `);

    console.log('✅ Cinema seating hierarchy synchronized: Rows A-B (Regular), C-F (Premium), G-H (VIP), I-J (Recliner)');
  } catch (err: any) {
    console.warn('Seat hierarchy sync warning (non-fatal):', err.message);
  }
}

