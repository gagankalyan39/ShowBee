import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function seedAllShows() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🚀 Fast bulk-seeding comprehensive theatres, screens, and shows for all 22 movies...');
    await client.query('BEGIN');

    // 1. Ensure Theatres across Bengaluru, Hyderabad, and Chennai
    const theatresData = [
      // Bengaluru
      {
        id: 'c1000000-0000-0000-0000-000000000001',
        name: 'PVR Orion Mall',
        city: 'Bengaluru',
        address: 'Dr Rajkumar Rd, Rajajinagar, Bengaluru',
        amenities: ['IMAX', 'Dolby Atmos', '4K Laser Projection', 'Recliner Lounges', 'Gourmet Food Court'],
      },
      {
        id: 'c1000000-0000-0000-0000-000000000002',
        name: 'INOX Garuda Mall',
        city: 'Bengaluru',
        address: 'Magrath Rd, Ashok Nagar, Bengaluru',
        amenities: ['Dolby Atmos', 'INSIGNIA Luxury', 'Recliner Seats', 'Valet Parking'],
      },
      {
        id: 'c1000000-0000-0000-0000-000000000003',
        name: 'Cinepolis Forum Mall',
        city: 'Bengaluru',
        address: 'Hosur Rd, Koramangala, Bengaluru',
        amenities: ['4DX Motion', 'VIP Lounge', 'Dolby 7.1', 'Online F&B'],
      },
      // Hyderabad
      {
        id: 'c1000000-0000-0000-0000-000000000004',
        name: 'PVR IMAX Somajiguda',
        city: 'Hyderabad',
        address: 'Somajiguda, Circle, Hyderabad',
        amenities: ['IMAX with Laser', 'Dolby Atmos', 'Recliner Rows', 'VIP Lounges'],
      },
      {
        id: 'c1000000-0000-0000-0000-000000000006',
        name: 'AMB Cinemas Gachibowli',
        city: 'Hyderabad',
        address: 'Sarath City Capital Mall, Gachibowli, Hyderabad',
        amenities: ['Superplex', 'Dolby Atmos', 'VIP Recliners', 'Platinum Lounge'],
      },
      {
        id: 'c1000000-0000-0000-0000-000000000007',
        name: 'Prasads Multiplex',
        city: 'Hyderabad',
        address: 'NTR Gardens, Khairatabad, Hyderabad',
        amenities: ['Giant Screen', 'Dolby Atmos', '4DX', 'Gaming Arcade'],
      },
      // Chennai
      {
        id: 'c1000000-0000-0000-0000-000000000005',
        name: 'AGS Cinemas Villivakkam',
        city: 'Chennai',
        address: 'Villivakkam / T. Nagar, Chennai',
        amenities: ['Dolby Atmos', '4K Projection', 'Snack Bar', 'Air Conditioned'],
      },
      {
        id: 'c1000000-0000-0000-0000-000000000008',
        name: 'PVR SPI Escape Express Avenue',
        city: 'Chennai',
        address: 'Express Avenue Mall, Royapettah, Chennai',
        amenities: ['Escape Luxury', 'Blind Screen', 'Dolby Atmos', 'Caramel Popcorn Hub'],
      },
      {
        id: 'c1000000-0000-0000-0000-000000000009',
        name: 'Sathyam Cinemas Royapettah',
        city: 'Chennai',
        address: 'Thiru Vi Ka Rd, Royapettah, Chennai',
        amenities: ['Iconic Cinema', 'Dolby Atmos', 'RDX 3D', 'Signature Concessions'],
      },
    ];

    for (const t of theatresData) {
      await client.query(
        `INSERT INTO theatres (id, name, city, address, amenities, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, 
           city = EXCLUDED.city, 
           address = EXCLUDED.address, 
           amenities = EXCLUDED.amenities`,
        [t.id, t.name, t.city, t.address, t.amenities]
      );
    }
    console.log(`✅ Verified ${theatresData.length} theatres across Bengaluru, Hyderabad & Chennai`);

    // 2. Ensure Screens for each Theatre (3 screens per theatre)
    const allTheatres = await client.query(`SELECT id, name FROM theatres`);
    const screenTypes = ['IMAX with Laser', 'Dolby Atmos 4K', '4DX Experience'];

    for (const t of allTheatres.rows) {
      const existingScreens = await client.query(`SELECT id FROM screens WHERE theatre_id = $1`, [t.id]);
      if (existingScreens.rows.length < 3) {
        for (let i = 1; i <= 3; i++) {
          await client.query(
            `INSERT INTO screens (theatre_id, name, capacity, screen_type, is_active)
             VALUES ($1, $2, 100, $3, true)
             ON CONFLICT DO NOTHING`,
            [t.id, `Screen ${i} (${screenTypes[i - 1]})`, screenTypes[i - 1]]
          );
        }
      }
    }
    console.log('✅ Verified screens for all theatres');

    // 3. Ensure Seats for all screens
    const allScreens = await client.query(`SELECT id FROM screens`);
    const seatTypeRegular = (await client.query(`SELECT id FROM seat_types WHERE name='REGULAR'`)).rows[0]?.id || 1;
    const seatTypePremium = (await client.query(`SELECT id FROM seat_types WHERE name='PREMIUM'`)).rows[0]?.id || 2;

    for (const sc of allScreens.rows) {
      const existingSeats = await client.query(`SELECT COUNT(*) as count FROM seats WHERE screen_id = $1`, [sc.id]);
      if (parseInt(existingSeats.rows[0].count, 10) < 100) {
        // Fast bulk insert 100 seats in a single query!
        await client.query(`
          INSERT INTO seats (screen_id, seat_type_id, row_label, seat_number)
          SELECT 
            $1,
            CASE WHEN r IN ('A','B','C','D') THEN $2::INTEGER ELSE $3::INTEGER END,
            r,
            n
          FROM unnest(ARRAY['A','B','C','D','E','F','G','H','I','J']) as r
          CROSS JOIN generate_series(1, 10) as n
          ON CONFLICT (screen_id, row_label, seat_number) DO NOTHING
        `, [sc.id, seatTypePremium, seatTypeRegular]);
      }
    }
    console.log('✅ Verified 100 seats per screen');

    // 4. Generate Shows for ALL 22 MOVIES
    // COMING_SOON movies ONLY get advance booking for next 2 days (Tomorrow & Day 3), NOT today!
    // NOW_SHOWING movies get shows for Today, Tomorrow, and Day 3.
    const allMovies = await client.query(`SELECT id, title, language_id, status FROM movies ORDER BY title ASC`);
    const screensList = (await client.query(`SELECT s.id as screen_id, s.theatre_id, t.city FROM screens s JOIN theatres t ON s.theatre_id = t.id`)).rows;

    // Clean up unbooked shows on or after current date so schedules are fresh
    await client.query(`
      DELETE FROM shows 
      WHERE id NOT IN (SELECT DISTINCT show_id FROM bookings WHERE status IN ('CONFIRMED', 'PENDING'))
      AND (
        DATE(start_time) >= CURRENT_DATE - INTERVAL '1 day'
      )
    `);

    const showSlots = [
      { startHour: 10, startMin: 0, durMins: 150, price: 200 },
      { startHour: 13, startMin: 30, durMins: 150, price: 250 },
      { startHour: 17, startMin: 0, durMins: 150, price: 250 },
      { startHour: 20, startMin: 30, durMins: 150, price: 300 },
      { startHour: 22, startMin: 45, durMins: 150, price: 300 },
    ];

    console.log(`🎬 Bulk-generating showtimes and show_seats for ${allMovies.rows.length} movies...`);

    for (let mIdx = 0; mIdx < allMovies.rows.length; mIdx++) {
      const movie = allMovies.rows[mIdx];
      const isComingSoon = movie.status === 'COMING_SOON';
      // Coming soon movies: ONLY for next 2 days ([1, 2] = Tomorrow & Day 3). NEVER day 0 (Today)!
      // Now showing movies: Today, Tomorrow, Day 3 ([0, 1, 2]).
      const days = isComingSoon ? [1, 2] : [0, 1, 2];

      for (const day of days) {
        for (const city of ['Bengaluru', 'Hyderabad', 'Chennai']) {
          const cityScreens = screensList.filter((s) => s.city === city);
          if (cityScreens.length === 0) continue;

          const targetScreen = cityScreens[(mIdx + day) % cityScreens.length];
          const slots = [showSlots[mIdx % showSlots.length], showSlots[(mIdx + 2) % showSlots.length]];

          for (const slot of slots) {
            const showRes = await client.query(
              `INSERT INTO shows (movie_id, screen_id, start_time, end_time, base_price, language_id, is_active)
               VALUES (
                 $1, $2,
                 CURRENT_DATE + ($3 || ' days')::INTERVAL + ($4 || ' hours')::INTERVAL + ($5 || ' minutes')::INTERVAL,
                 CURRENT_DATE + ($3 || ' days')::INTERVAL + ($4 || ' hours')::INTERVAL + ($6 || ' minutes')::INTERVAL,
                 $7, $8, true
               )
               RETURNING id, screen_id, base_price`,
              [
                movie.id,
                targetScreen.screen_id,
                day,
                slot.startHour,
                slot.startMin,
                slot.startMin + slot.durMins,
                slot.price,
                movie.language_id,
              ]
            );

            const showId = showRes.rows[0].id;
            const basePrice = showRes.rows[0].base_price;

            // FAST BULK INSERT ALL 100 SHOW_SEATS IN ONE SINGLE QUERY!
            await client.query(`
              INSERT INTO show_seats (show_id, seat_id, status, price)
              SELECT 
                $1,
                s.id,
                'AVAILABLE',
                $2 * st.price_multiplier
              FROM seats s
              JOIN seat_types st ON s.seat_type_id = st.id
              WHERE s.screen_id = $3
              ON CONFLICT (show_id, seat_id) DO NOTHING
            `, [showId, basePrice, targetScreen.screen_id]);
          }
        }
      }
    }

    await client.query('COMMIT');

    const totalShows = await client.query(`SELECT COUNT(*) as count FROM shows`);
    const totalShowSeats = await client.query(`SELECT COUNT(*) as count FROM show_seats`);

    console.log(`🎉 SUCCESS! Total active shows across all cities: ${totalShows.rows[0].count}`);
    console.log(`🎟️ Total bookable show seats: ${totalShowSeats.rows[0].count}`);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error bulk seeding shows:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAllShows().catch(console.error);
