import { query, getClient } from './index';

export async function setupSingleScreenTheatres() {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    console.log('🎬 Configuring exactly 1 INDEPENDENT screen per theatre...');

    // 1. The 9 multiplex theatres
    const theatresRes = await client.query(`SELECT id, name, city FROM theatres ORDER BY city, name`);
    const theatres = theatresRes.rows;
    console.log(`Found ${theatres.length} theatres across Bengaluru, Hyderabad & Chennai`);

    // Get seat types (REGULAR, PREMIUM, RECLINER, VIP)
    const regularRes = await client.query(`SELECT id FROM seat_types WHERE UPPER(name) = 'REGULAR'`);
    const premiumRes = await client.query(`SELECT id FROM seat_types WHERE UPPER(name) = 'PREMIUM'`);
    const reclinerRes = await client.query(`SELECT id FROM seat_types WHERE UPPER(name) = 'RECLINER'`);
    const vipRes = await client.query(`SELECT id FROM seat_types WHERE UPPER(name) = 'VIP'`);

    const seatTypeRegular = regularRes.rows[0]?.id || 1;
    const seatTypePremium = premiumRes.rows[0]?.id || 2;
    const seatTypeRecliner = reclinerRes.rows[0]?.id || 3;
    const seatTypeVip = vipRes.rows[0]?.id || 4;

    const singleScreens: { screenId: string; theatreId: string; city: string; theatreName: string }[] = [];

    for (const t of theatres) {
      // Find screens for this theatre
      const screensRes = await client.query(
        `SELECT id, name FROM screens WHERE theatre_id = $1 ORDER BY created_at ASC, name ASC`,
        [t.id]
      );

      let primaryScreenId: string;

      if (screensRes.rows.length === 0) {
        // Create 1 independent screen
        const insRes = await client.query(
          `INSERT INTO screens (theatre_id, name, capacity, screen_type, is_active)
           VALUES ($1, 'Screen 1 (Main Audi)', 100, 'Dolby Atmos & Laser 4K', true)
           RETURNING id`,
          [t.id]
        );
        primaryScreenId = insRes.rows[0].id;
      } else {
        // Keep the first screen as the single screen, update its name and activate it
        primaryScreenId = screensRes.rows[0].id;
        await client.query(
          `UPDATE screens SET name = 'Screen 1 (Main Audi)', capacity = 100, screen_type = 'Dolby Atmos & Laser 4K', is_active = true WHERE id = $1`,
          [primaryScreenId]
        );

        // Deactivate extra screens so historical booking data is preserved, but only 1 active screen exists
        await client.query(
          `UPDATE screens SET is_active = false WHERE theatre_id = $1 AND id != $2`,
          [t.id, primaryScreenId]
        );
      }

      // Ensure primary screen has standard 100 seats (A-J, 1-10)
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      for (const r of rows) {
        let typeId = seatTypeRegular;
        if (['E', 'F', 'G'].includes(r)) typeId = seatTypePremium;
        else if (['H', 'I'].includes(r)) typeId = seatTypeRecliner;
        else if (r === 'J') typeId = seatTypeVip;

        for (let num = 1; num <= 10; num++) {
          await client.query(
            `INSERT INTO seats (screen_id, seat_type_id, row_label, seat_number, is_active)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT DO NOTHING`,
            [primaryScreenId, typeId, r, num]
          );
        }
      }

      singleScreens.push({
        screenId: primaryScreenId,
        theatreId: t.id,
        city: t.city,
        theatreName: t.name,
      });
    }

    console.log(`✅ Configured exactly ${singleScreens.length} independent active screens (1 per theatre) with 100 seats each`);

    // 2. Clean up ONLY unbooked upcoming shows so historical data & bookings are preserved!
    await client.query(`
      DELETE FROM show_seats 
      WHERE show_id IN (
        SELECT id FROM shows 
        WHERE id NOT IN (SELECT DISTINCT show_id FROM bookings)
        AND id NOT IN (SELECT DISTINCT ss.show_id FROM show_seats ss JOIN booking_seats bs ON ss.id = bs.show_seat_id)
        AND DATE(start_time) >= CURRENT_DATE
      )
    `);
    await client.query(`
      DELETE FROM shows 
      WHERE id NOT IN (SELECT DISTINCT show_id FROM bookings)
      AND id NOT IN (SELECT DISTINCT ss.show_id FROM show_seats ss JOIN booking_seats bs ON ss.id = bs.show_seat_id)
      AND DATE(start_time) >= CURRENT_DATE
    `);

    // 3. Movies
    const moviesRes = await client.query(`SELECT id, title, language_id, status FROM movies ORDER BY title ASC`);
    const allMovies = moviesRes.rows;

    // Show timing slots:
    // Day 0 (Today): Concluded daytime shows (to verify historical persistence without booking) + Upcoming evening/night shows (for immediate booking)
    const todaySlots = [
      { startHour: 11, startMin: 0, durMins: 140, price: 200, label: 'Morning Show (Concluded)' },
      { startHour: 15, startMin: 30, durMins: 140, price: 250, label: 'Matinee (Concluded)' },
      { startHour: 21, startMin: 45, durMins: 145, price: 280, label: 'Late Evening (Upcoming - Bookable)' },
      { startHour: 23, startMin: 30, durMins: 145, price: 300, label: 'Night Owl (Upcoming - Bookable)' },
    ];

    const regularDaySlots = [
      { startHour: 10, startMin: 0, durMins: 145, price: 200 },
      { startHour: 13, startMin: 15, durMins: 145, price: 250 },
      { startHour: 16, startMin: 30, durMins: 145, price: 250 },
      { startHour: 19, startMin: 45, durMins: 145, price: 300 },
      { startHour: 22, startMin: 30, durMins: 145, price: 300 },
    ];

    console.log(`🎬 Scheduling shows across 9 independent screens for ${allMovies.length} movies...`);

    // Days: 0 (Today/06 Sep), 1 (Tomorrow/07 Sep), 2 (Day 3/08 Sep), 3 (Day 4/09 Sep), 4 (Day 5/10 Sep)
    for (let mIdx = 0; mIdx < allMovies.length; mIdx++) {
      const movie = allMovies[mIdx];
      const isComingSoon = movie.status === 'COMING_SOON';
      // COMING_SOON movies: ONLY advance booking for tomorrow (1) and Day 3 (2). NEVER today (0)!
      // NOW_SHOWING movies: Today (0), Tomorrow (1), Day 3 (2), Day 4 (3), Day 5 (4).
      const days = isComingSoon ? [1, 2] : [0, 1, 2, 3, 4];

      for (const day of days) {
        // Each movie gets scheduled across all 3 cities on that city's independent screen
        for (const city of ['Bengaluru', 'Hyderabad', 'Chennai']) {
          const cityScreens = singleScreens.filter((s) => s.city.toLowerCase() === city.toLowerCase());
          if (cityScreens.length === 0) continue;

          // Target theatre screen for this movie on this day
          const targetScreen = cityScreens[(mIdx + day) % cityScreens.length];

          // For Today (day 0), schedule both an upcoming slot and a concluded slot
          const slotsForThisDay = day === 0 
            ? [todaySlots[(mIdx) % 2], todaySlots[2 + (mIdx % 2)]] // 1 concluded + 1 upcoming
            : [regularDaySlots[(mIdx + day) % regularDaySlots.length], regularDaySlots[(mIdx + day + 2) % regularDaySlots.length]];

          for (const slot of slotsForThisDay) {
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
                targetScreen.screenId,
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

            // Bulk insert 100 show_seats
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
            `, [showId, basePrice, targetScreen.screenId]);
          }
        }
      }
    }

    await client.query('COMMIT');

    const totalScreens = await client.query(`SELECT COUNT(*) as count FROM screens`);
    const totalShows = await client.query(`SELECT COUNT(*) as count FROM shows`);
    const totalShowSeats = await client.query(`SELECT COUNT(*) as count FROM show_seats`);

    console.log(`\n🎉 Single Screen Architecture Configured!`);
    console.log(`📺 Independent screens: ${totalScreens.rows[0].count} (1 per theatre)`);
    console.log(`🎬 Total dynamic scheduled shows: ${totalShows.rows[0].count}`);
    console.log(`🎟️ Total bookable show seats: ${totalShowSeats.rows[0].count}`);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up single screens:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if invoked directly
setupSingleScreenTheatres()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
