import { query } from './index';

async function main() {
  await query(`
    UPDATE movies 
    SET title = 'IRUMUDI', 
        poster_url = '/movies/irumudi.jpg', 
        banner_url = '/movies/irumudi.jpg' 
    WHERE id = 'a1000000-0000-0000-0000-000000000001'
  `);
  console.log('✅ Title successfully updated to IRUMUDI');
  process.exit(0);
}

main().catch(console.error);
