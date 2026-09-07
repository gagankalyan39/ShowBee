import { query } from './index';

async function run() {
  const r = await query(`
    SELECT t.id as theatre_id, t.name as theatre, t.city, COUNT(s.id) as screen_count
    FROM theatres t
    LEFT JOIN screens s ON t.id = s.theatre_id
    GROUP BY t.id, t.name, t.city
    ORDER BY t.city, t.name
  `);
  console.log('Current Screen Count per Theatre:');
  console.table(r.rows);

  const screens = await query(`
    SELECT s.id, s.name as screen_name, s.theatre_id, t.name as theatre_name, t.city
    FROM screens s
    JOIN theatres t ON s.theatre_id = t.id
    ORDER BY t.city, t.name, s.name
  `);
  console.log('All Screens:');
  console.table(screens.rows);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
