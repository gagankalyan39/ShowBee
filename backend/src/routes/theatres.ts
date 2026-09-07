// ============================================================
// MEMBER 2 - Movie/Data: Theatre & Screen Routes
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/theatres - List all active theatres (optional city filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, search } = req.query;
    let sql = `
      SELECT t.*, 
        (SELECT COUNT(*) FROM screens s WHERE s.theatre_id = t.id AND s.is_active = true) as screen_count
      FROM theatres t 
      WHERE t.is_active = true
    `;
    const params: any[] = [];

    if (city) {
      params.push(city);
      sql += ` AND LOWER(t.city) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (t.name ILIKE $${params.length} OR t.address ILIKE $${params.length})`;
    }

    sql += ` ORDER BY t.name ASC`;

    const result = await query(sql, params);
    res.json({
      success: true,
      data: result.rows,
      meta: {
        module: 'MEMBER_2_CATALOG_SERVICE',
        count: result.rows.length,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/theatres/cities - List distinct cities
router.get('/cities', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT DISTINCT city FROM theatres WHERE is_active = true ORDER BY city ASC`
    );
    res.json({
      success: true,
      data: result.rows.map((r: any) => r.city),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/theatres/:id - Get theatre by ID with screens
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const theatreRes = await query(`SELECT * FROM theatres WHERE id = $1`, [id]);
    if (theatreRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Theatre not found' });
    }

    const screensRes = await query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM seats se WHERE se.screen_id = s.id) as seat_count
       FROM screens s 
       WHERE s.theatre_id = $1 AND s.is_active = true
       ORDER BY s.name ASC`,
      [id]
    );

    const showsRes = await query(
      `SELECT sh.*, 
        m.id as movie_id, m.title as movie_title, m.poster_url, m.duration_mins, m.rating,
        l.name as language_name,
        sc.name as screen_name, sc.screen_type,
        CASE 
          WHEN sh.end_time <= NOW() THEN 'ENDED'
          WHEN sh.start_time <= NOW() AND sh.end_time > NOW() THEN 'STARTED'
          ELSE 'UPCOMING'
        END as show_status,
        (sh.start_time > NOW()) as is_bookable,
        (sh.end_time <= NOW()) as is_concluded,
        (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = sh.id AND ss.status = 'AVAILABLE') as available_seats
      FROM shows sh
      JOIN movies m ON sh.movie_id = m.id
      JOIN screens sc ON sh.screen_id = sc.id
      LEFT JOIN languages l ON sh.language_id = l.id
      WHERE sc.theatre_id = $1 AND sh.is_active = true
      ORDER BY sh.start_time ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...theatreRes.rows[0],
        screens: screensRes.rows,
        shows: showsRes.rows,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/theatres/:id/shows - Get upcoming shows for a theatre
router.get('/:id/shows', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    let sql = `
      SELECT sh.*, 
        m.title as movie_title, m.poster_url, m.duration_mins, m.rating,
        l.name as language_name,
        sc.name as screen_name, sc.screen_type
      FROM shows sh
      JOIN movies m ON sh.movie_id = m.id
      JOIN screens sc ON sh.screen_id = sc.id
      LEFT JOIN languages l ON sh.language_id = l.id
      WHERE sc.theatre_id = $1 AND sh.is_active = true
    `;
    const params: any[] = [id];

    if (date) {
      params.push(date);
      sql += ` AND DATE(sh.start_time) = $${params.length}`;
    } else {
      sql += ` AND sh.start_time >= NOW()`;
    }

    sql += ` ORDER BY sh.start_time ASC`;

    const result = await query(sql, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Create Theatre (Member 4 / Member 2)
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, city, address, postal_code, latitude, longitude, amenities } = req.body;
    if (!name || !city || !address) {
      return res.status(400).json({ success: false, message: 'Name, city and address are required' });
    }

    const result = await query(
      `INSERT INTO theatres (name, city, address, postal_code, latitude, longitude, amenities)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, city, address, postal_code || null, latitude || null, longitude || null, amenities || []]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
