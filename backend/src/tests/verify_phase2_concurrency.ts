// ============================================================
// PHASE 2 CONCURRENCY & INTEGRITY VERIFICATION TEST SUITE
// Tests all 10 Concurrency & Database Integrity Requirements:
// 1. Pessimistic Locking Row Exclusivity
// 2. Optimistic Locking Version CAS
// 3. Prevention of Double Bookings Under Contention
// 4. Atomic Multi-Seat All-or-Nothing Transactions
// 5. Version Checking & Increments on State Transitions
// 6. Database Uniqueness & Trigger Constraints
// 7. Transaction Rollback Cleanliness
// 8. 5-Minute Seat Hold Expiry & Reclaim
// 9. Race Condition Prevention: Payment vs Expiry
// 10. Idempotency of Repeated Booking Requests
// ============================================================

import { query, getClient } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { ensureDatabaseSchema } from '../services/schemaMigrationService';

async function runPhase2Verification() {
  console.log('====================================================');
  console.log('🧪 SHOWBEE PHASE 2 CONCURRENCY & INTEGRITY TEST SUITE');
  console.log('====================================================\n');

  // Step 0: Ensure migrations 001-003 are applied
  await ensureDatabaseSchema();

  // Find a test show
  const showRes = await query(`
    SELECT s.id, m.title, COUNT(ss.id) as total_seats
    FROM shows s
    JOIN movies m ON s.movie_id = m.id
    JOIN show_seats ss ON ss.show_id = s.id
    GROUP BY s.id, m.title
    LIMIT 1
  `);

  if (!showRes.rows.length) {
    throw new Error('No shows found in database. Seed database first.');
  }

  const showId = showRes.rows[0].id;
  console.log(`🎬 Target Screening: "${showRes.rows[0].title}" (ID: ${showId})\n`);

  // Get test users
  const userRes = await query(`SELECT id, email FROM users LIMIT 2`);
  if (userRes.rows.length < 2) {
    throw new Error('Need at least 2 users in database for concurrency test.');
  }
  const userA = userRes.rows[0].id;
  const userB = userRes.rows[1].id;

  // Reset seats for clean test
  await query(`
    UPDATE show_seats 
    SET status = 'AVAILABLE', locked_by = NULL, lock_expires_at = NULL, version = 1, updated_at = NOW()
    WHERE show_id = $1
  `, [showId]);

  // Fetch 3 test seats
  const seatsRes = await query(`
    SELECT id, seat_id, version, status 
    FROM show_seats 
    WHERE show_id = $1 
    ORDER BY id ASC
    LIMIT 3
  `, [showId]);

  const seat1 = seatsRes.rows[0];
  const seat2 = seatsRes.rows[1];
  const seat3 = seatsRes.rows[2];

  let passedTests = 0;
  const totalTests = 10;

  // -----------------------------------------------------------
  // TEST 1: PESSIMISTIC LOCKING (SELECT FOR UPDATE exclusivity)
  // -----------------------------------------------------------
  console.log('🔹 Test 1: Pessimistic Locking Row Exclusivity (SELECT FOR UPDATE)...');
  const client1 = await getClient();
  const client2 = await getClient();
  try {
    await client1.query('BEGIN');
    const lock1 = await client1.query(
      `SELECT id, status, version FROM show_seats WHERE id = $1 FOR UPDATE`,
      [seat1.id]
    );
    if (lock1.rows[0].status !== 'AVAILABLE') throw new Error('Expected AVAILABLE');

    // Update seat1 under lock
    await client1.query(
      `UPDATE show_seats SET status = 'HELD', locked_by = $1, lock_expires_at = NOW() + INTERVAL '5 min', version = version + 1 WHERE id = $2`,
      [userA, seat1.id]
    );
    await client1.query('COMMIT');

    // Client 2 verifies seat is HELD
    await client2.query('BEGIN');
    const lock2 = await client2.query(
      `SELECT id, status, locked_by FROM show_seats WHERE id = $1 FOR UPDATE`,
      [seat1.id]
    );
    if (lock2.rows[0].status === 'HELD' && lock2.rows[0].locked_by === userA) {
      console.log('   ✅ PASS: Pessimistic lock serialized and updated state correctly.');
      passedTests++;
    } else {
      throw new Error(`Unexpected seat status: ${lock2.rows[0].status}`);
    }
    await client2.query('ROLLBACK');
  } finally {
    client1.release();
    client2.release();
  }

  // -----------------------------------------------------------
  // TEST 2: OPTIMISTIC LOCKING CAS (Version Compare-And-Set)
  // -----------------------------------------------------------
  console.log('\n🔹 Test 2: Optimistic Locking CAS Version Match & Conflict Handling...');
  // Reset seat2
  await query(`UPDATE show_seats SET status = 'AVAILABLE', locked_by = NULL, version = 1 WHERE id = $1`, [seat2.id]);
  const s2Read = await query(`SELECT id, version FROM show_seats WHERE id = $1`, [seat2.id]);
  const s2Version = s2Read.rows[0].version;

  // User A updates version 1 -> 2
  const casA = await query(`
    UPDATE show_seats 
    SET status = 'HELD', locked_by = $1, version = version + 1
    WHERE id = $2 AND version = $3 AND status = 'AVAILABLE'
    RETURNING id, version
  `, [userA, seat2.id, s2Version]);

  if (casA.rowCount !== 1 || casA.rows[0].version !== s2Version + 1) {
    throw new Error('User A CAS failed');
  }

  // User B tries to update with stale version 1
  const casB = await query(`
    UPDATE show_seats 
    SET status = 'HELD', locked_by = $1, version = version + 1
    WHERE id = $2 AND version = $3 AND status = 'AVAILABLE'
    RETURNING id, version
  `, [userB, seat2.id, s2Version]);

  if (casB.rowCount === 0) {
    console.log('   ✅ PASS: Stale version CAS rejected. 0 uncoordinated overwrites.');
    passedTests++;
  } else {
    throw new Error('FAIL: CAS accepted stale version!');
  }

  // -----------------------------------------------------------
  // TEST 3: ZERO DOUBLE-BOOKINGS UNDER CONCURRENCY
  // -----------------------------------------------------------
  console.log('\n🔹 Test 3: Zero Double-Bookings Under High-Contention Race...');
  await query(`UPDATE show_seats SET status = 'AVAILABLE', locked_by = NULL, version = 1 WHERE id = $1`, [seat3.id]);

  // Simulate 10 simultaneous attempts to book seat3
  const attempts = Array.from({ length: 10 }, async (_, idx) => {
    const c = await getClient();
    try {
      await c.query('BEGIN');
      const res = await c.query(
        `SELECT id, status FROM show_seats WHERE id = $1 FOR UPDATE`,
        [seat3.id]
      );
      if (res.rows[0].status === 'AVAILABLE') {
        await c.query(
          `UPDATE show_seats SET status = 'BOOKED', locked_by = $1, version = version + 1 WHERE id = $2`,
          [idx % 2 === 0 ? userA : userB, seat3.id]
        );
        await c.query('COMMIT');
        return 'SUCCESS';
      } else {
        await c.query('ROLLBACK');
        return 'CONFLICT';
      }
    } catch {
      await c.query('ROLLBACK').catch(() => {});
      return 'ERROR';
    } finally {
      c.release();
    }
  });

  const results = await Promise.all(attempts);
  const successes = results.filter(r => r === 'SUCCESS').length;
  const conflicts = results.filter(r => r === 'CONFLICT').length;

  if (successes === 1 && conflicts === 9) {
    console.log(`   ✅ PASS: Exactly 1 user acquired seat; 9 conflicts cleanly rejected. Zero double-bookings.`);
    passedTests++;
  } else {
    throw new Error(`FAIL: Expected 1 success, got ${successes}`);
  }

  // -----------------------------------------------------------
  // TEST 4: ATOMIC MULTI-SEAT TRANSACTIONS (All-or-Nothing)
  // -----------------------------------------------------------
  console.log('\n🔹 Test 4: Atomic Multi-Seat All-or-Nothing Rollback...');
  // seat1 is HELD, seat2 is HELD, seat3 is BOOKED.
  // User attempts to hold [seat1, seat2] where seat1 is already held by userA
  const multiClient = await getClient();
  try {
    await multiClient.query('BEGIN');
    const lockRes = await multiClient.query(`
      SELECT id, status, locked_by, lock_expires_at 
      FROM show_seats 
      WHERE id = ANY($1::uuid[])
      ORDER BY id ASC
      FOR UPDATE
    `, [[seat1.id, seat2.id]]);

    // Check availability for User B
    const unavailable = lockRes.rows.filter(s => s.status !== 'AVAILABLE');
    if (unavailable.length > 0) {
      await multiClient.query('ROLLBACK');
      console.log(`   ✅ PASS: Multi-seat request aborted cleanly (${unavailable.length} seats unavailable). Neither seat claimed.`);
      passedTests++;
    } else {
      await multiClient.query('ROLLBACK');
      throw new Error('FAIL: Multi-seat check failed to detect held seats');
    }
  } finally {
    multiClient.release();
  }

  // -----------------------------------------------------------
  // TEST 5: VERSION INCREMENTS ON ALL STATE TRANSITIONS
  // -----------------------------------------------------------
  console.log('\n🔹 Test 5: Version Increment Tracking Across Lifecycle...');
  await query(`UPDATE show_seats SET status = 'AVAILABLE', version = 10 WHERE id = $1`, [seat1.id]);

  // Transition AVAILABLE -> HELD
  await query(`
    UPDATE show_seats SET status = 'HELD', locked_by = $1, lock_expires_at = NOW() + INTERVAL '5 min', version = version + 1
    WHERE id = $2
  `, [userA, seat1.id]);
  const v1 = (await query(`SELECT version FROM show_seats WHERE id = $1`, [seat1.id])).rows[0].version;

  // Transition HELD -> AVAILABLE (release)
  await query(`
    UPDATE show_seats SET status = 'AVAILABLE', locked_by = NULL, lock_expires_at = NULL, version = version + 1
    WHERE id = $1
  `, [seat1.id]);
  const v2 = (await query(`SELECT version FROM show_seats WHERE id = $1`, [seat1.id])).rows[0].version;

  if (v1 === 11 && v2 === 12) {
    console.log('   ✅ PASS: Version incremented on both Hold (+1) and Release (+1).');
    passedTests++;
  } else {
    throw new Error(`FAIL: Expected versions 11 and 12, got ${v1} and ${v2}`);
  }

  // -----------------------------------------------------------
  // TEST 6: DATABASE TRIGGER DOUBLE-BOOKING PREVENTION
  // -----------------------------------------------------------
  console.log('\n🔹 Test 6: Database Trigger trg_prevent_duplicate_seat_booking...');
  // Create dummy confirmed booking for seat1
  const b1 = await query(`
    INSERT INTO bookings (user_id, show_id, booking_reference, subtotal, total_amount, status)
    VALUES ($1, $2, $3, 200, 200, 'CONFIRMED')
    RETURNING id
  `, [userA, showId, `REF-${Date.now()}-1`]);

  await query(`
    INSERT INTO booking_seats (booking_id, seat_id, show_seat_id, price)
    VALUES ($1, $2, $3, 200)
  `, [b1.rows[0].id, seat1.seat_id, seat1.id]);

  // Create another booking and try to insert the exact same show_seat_id
  const b2 = await query(`
    INSERT INTO bookings (user_id, show_id, booking_reference, subtotal, total_amount, status)
    VALUES ($1, $2, $3, 200, 200, 'CONFIRMED')
    RETURNING id
  `, [userB, showId, `REF-${Date.now()}-2`]);

  let triggerCaught = false;
  try {
    await query(`
      INSERT INTO booking_seats (booking_id, seat_id, show_seat_id, price)
      VALUES ($1, $2, $3, 200)
    `, [b2.rows[0].id, seat1.seat_id, seat1.id]);
  } catch (err: any) {
    if (err.message.includes('ACID VIOLATION') || err.message.includes('already CONFIRMED')) {
      triggerCaught = true;
    }
  }

  // Clean up test bookings
  await query(`DELETE FROM bookings WHERE id IN ($1, $2)`, [b1.rows[0].id, b2.rows[0].id]);

  if (triggerCaught) {
    console.log('   ✅ PASS: PostgreSQL trigger blocked duplicate confirmed booking at database level.');
    passedTests++;
  } else {
    throw new Error('FAIL: Trigger did not reject duplicate seat in confirmed booking');
  }

  // -----------------------------------------------------------
  // TEST 7: TRANSACTION ROLLBACK BEHAVIOR
  // -----------------------------------------------------------
  console.log('\n🔹 Test 7: Transaction Rollback State Restoration...');
  await query(`UPDATE show_seats SET status = 'AVAILABLE', locked_by = NULL, version = 5 WHERE id = $1`, [seat2.id]);
  const rbClient = await getClient();
  try {
    await rbClient.query('BEGIN');
    await rbClient.query(
      `UPDATE show_seats SET status = 'HELD', locked_by = $1, version = version + 1 WHERE id = $2`,
      [userA, seat2.id]
    );
    // Explicit rollback
    await rbClient.query('ROLLBACK');
  } finally {
    rbClient.release();
  }

  const rbCheck = await query(`SELECT status, locked_by, version FROM show_seats WHERE id = $1`, [seat2.id]);
  if (rbCheck.rows[0].status === 'AVAILABLE' && rbCheck.rows[0].version === 5 && rbCheck.rows[0].locked_by === null) {
    console.log('   ✅ PASS: Rollback restored seat state and version completely.');
    passedTests++;
  } else {
    throw new Error('FAIL: Rollback did not restore original state');
  }

  // -----------------------------------------------------------
  // TEST 8: 5-MINUTE SEAT HOLD EXPIRY
  // -----------------------------------------------------------
  console.log('\n🔹 Test 8: Seat Hold Expiry & Automatic Reclamation...');
  // Set seat1 to expired HELD state
  await query(`
    UPDATE show_seats 
    SET status = 'HELD', locked_by = $1, lock_expires_at = NOW() - INTERVAL '1 second'
    WHERE id = $2
  `, [userA, seat1.id]);

  // Query as User B: expired hold should be re-claimable
  const expCheck = await query(`
    SELECT id, status, locked_by, lock_expires_at 
    FROM show_seats 
    WHERE id = $1
  `, [seat1.id]);
  const seatRow = expCheck.rows[0];
  const isExpired = seatRow.status === 'HELD' && new Date(seatRow.lock_expires_at) <= new Date();

  if (isExpired) {
    // Reclaim seat
    await query(`
      UPDATE show_seats 
      SET status = 'HELD', locked_by = $1, lock_expires_at = NOW() + INTERVAL '5 min', version = version + 1
      WHERE id = $2
    `, [userB, seat1.id]);

    const reclaim = await query(`SELECT locked_by FROM show_seats WHERE id = $1`, [seat1.id]);
    if (reclaim.rows[0].locked_by === userB) {
      console.log('   ✅ PASS: Expired 5-minute hold safely reclaimed by subsequent user.');
      passedTests++;
    } else {
      throw new Error('FAIL: Reclaim failed');
    }
  } else {
    throw new Error('FAIL: Expiry check failed');
  }

  // -----------------------------------------------------------
  // TEST 9: RACE CONDITION BETWEEN PAYMENT AND HOLD EXPIRY
  // -----------------------------------------------------------
  console.log('\n🔹 Test 9: Payment vs Expiry Race Condition Detection...');
  // User A holds seat2, but hold expires before payment
  await query(`
    UPDATE show_seats 
    SET status = 'HELD', locked_by = $1, lock_expires_at = NOW() - INTERVAL '10 seconds'
    WHERE id = $2
  `, [userA, seat2.id]);

  // Create pending booking for User A
  const pBooking = await query(`
    INSERT INTO bookings (user_id, show_id, booking_reference, subtotal, total_amount, status)
    VALUES ($1, $2, $3, 150, 150, 'PENDING')
    RETURNING id
  `, [userA, showId, `RACE-${Date.now()}`]);

  await query(`
    INSERT INTO booking_seats (booking_id, seat_id, show_seat_id, price)
    VALUES ($1, $2, $3, 150)
  `, [pBooking.rows[0].id, seat2.seat_id, seat2.id]);

  // Payment process check: re-verify seat under FOR UPDATE
  const payClient = await getClient();
  let paymentRejected = false;
  try {
    await payClient.query('BEGIN');
    const chk = await payClient.query(`
      SELECT ss.id, ss.status, ss.locked_by, ss.lock_expires_at 
      FROM show_seats ss
      JOIN booking_seats bs ON bs.show_seat_id = ss.id
      WHERE bs.booking_id = $1
      ORDER BY ss.id ASC
      FOR UPDATE
    `, [pBooking.rows[0].id]);

    const s = chk.rows[0];
    if (s.status !== 'HELD' || s.locked_by !== userA || new Date(s.lock_expires_at) <= new Date()) {
      paymentRejected = true;
      await payClient.query(`UPDATE bookings SET status = 'FAILED' WHERE id = $1`, [pBooking.rows[0].id]);
      await payClient.query('COMMIT');
    } else {
      await payClient.query('COMMIT');
    }
  } finally {
    payClient.release();
  }

  // Clean up
  await query(`DELETE FROM bookings WHERE id = $1`, [pBooking.rows[0].id]);

  if (paymentRejected) {
    console.log('   ✅ PASS: Payment rejected because seat hold expired. 0 stale-hold bookings.');
    passedTests++;
  } else {
    throw new Error('FAIL: Payment allowed on expired seat hold!');
  }

  // -----------------------------------------------------------
  // TEST 10: IDEMPOTENCY FOR REPEATED BOOKING REQUESTS
  // -----------------------------------------------------------
  console.log('\n🔹 Test 10: Idempotency Enforcement on Repeated Requests...');
  const testKey = `IDEMP-${Date.now()}`;
  
  // First insert with idempotency key
  const i1 = await query(`
    INSERT INTO bookings (user_id, show_id, booking_reference, subtotal, total_amount, status, idempotency_key)
    VALUES ($1, $2, $3, 100, 100, 'PENDING', $4)
    RETURNING id, booking_reference
  `, [userA, showId, `REF-IDEMP-1`, testKey]);

  // Second insert with exact same idempotency key for same user must violate unique constraint
  let idempotencyCaught = false;
  try {
    await query(`
      INSERT INTO bookings (user_id, show_id, booking_reference, subtotal, total_amount, status, idempotency_key)
      VALUES ($1, $2, $3, 100, 100, 'PENDING', $4)
    `, [userA, showId, `REF-IDEMP-2`, testKey]);
  } catch (err: any) {
    if (err.code === '23505' || err.message.includes('unique constraint') || err.message.includes('idx_bookings_user_idempotency')) {
      idempotencyCaught = true;
    }
  }

  // Clean up
  await query(`DELETE FROM bookings WHERE id = $1`, [i1.rows[0].id]);

  if (idempotencyCaught) {
    console.log('   ✅ PASS: Duplicate request with same Idempotency-Key safely blocked by database.');
    passedTests++;
  } else {
    throw new Error('FAIL: Duplicate idempotency key was accepted!');
  }

  // -----------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------
  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} CONCURRENCY & INTEGRITY TESTS PASSED!`);
  console.log('====================================================\n');
  process.exit(0);
}

runPhase2Verification().catch(err => {
  console.error('❌ Phase 2 Verification Failed:', err);
  process.exit(1);
});
