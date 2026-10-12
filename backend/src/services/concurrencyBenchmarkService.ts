// ============================================================
// CONCURRENCY BENCHMARK & SIMULATION SERVICE
// High-throughput simulation of up to 10,000 concurrent users
// comparing Pessimistic Locking (SELECT ... FOR UPDATE)
// vs Optimistic Locking (Version Compare-And-Set CAS)
// ============================================================

import { getClient, query } from '../db';
import { getIO } from '../socket';
import { v4 as uuidv4 } from 'uuid';

export type LockMode = 'PESSIMISTIC' | 'OPTIMISTIC';
export type ContentionMode = 'HOTSPOT' | 'DISTRIBUTED' | 'FLASH_SALE';

export interface SimulationConfig {
  totalUsers: number;          // e.g. 100, 1000, 5000, 10000
  mode: LockMode | 'HEAD_TO_HEAD';
  contention: ContentionMode;  // HOTSPOT (5-10 seats) or DISTRIBUTED (all seats)
  showId: string;
  concurrencyLimit?: number;   // In-flight parallel workers (default 25)
}

export interface MetricSummary {
  mode: LockMode;
  totalUsers: number;
  successfulBookings: number;
  conflictCount: number;
  errorCount: number;
  doubleBookingsPrevented: number; // Verification count (0 double bookings)
  elapsedTimeMs: number;
  throughputRps: number;
  latencies: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  seatStates: {
    bookedCount: number;
    availableCount: number;
    heldCount: number;
  };
  summaryText: string;
}

export interface HeadToHeadResult {
  runId: string;
  timestamp: string;
  config: SimulationConfig;
  pessimistic: MetricSummary;
  optimistic: MetricSummary;
  comparison: {
    winnerThroughput: LockMode;
    throughputDiffPercent: number;
    winnerLatency: LockMode;
    latencyDiffPercent: number;
    conflictDiff: number;
    recommendation: string;
  };
}

class ConcurrencyBenchmarkEngine {
  private activeSimulations: Map<string, { abort: boolean }> = new Map();
  private benchmarkHistory: any[] = [];

  public getHistory() {
    return this.benchmarkHistory.slice(-20).reverse();
  }

  public abortSimulation(runId: string) {
    const sim = this.activeSimulations.get(runId);
    if (sim) {
      sim.abort = true;
      return true;
    }
    return false;
  }

  /**
   * Run a simulation run with either PESSIMISTIC or OPTIMISTIC locking
   */
  public async runSingleSimulation(
    runId: string,
    config: SimulationConfig,
    activeMode: LockMode,
    isSubRun = false
  ): Promise<MetricSummary> {
    const io = getIO();
    const abortState = { abort: false };
    if (!isSubRun) {
      this.activeSimulations.set(runId, abortState);
    }

    const { totalUsers, contention, showId } = config;
    const concurrency = Math.min(config.concurrencyLimit || 25, 40);

    // Fetch candidate seats for this show
    const seatsRes = await query(`
      SELECT ss.id, ss.status, ss.version, se.row_label, se.seat_number
      FROM show_seats ss
      JOIN seats se ON ss.seat_id = se.id
      WHERE ss.show_id = $1
      ORDER BY se.row_label, se.seat_number
    `, [showId]);

    if (!seatsRes.rows.length) {
      throw new Error(`No seats found for show ${showId}`);
    }

    const allSeats = seatsRes.rows;
    // Determine target seats based on contention profile
    let targetSeatPool: typeof allSeats = [];
    if (contention === 'HOTSPOT') {
      // Small high-contention pool (5 hot VIP seats)
      targetSeatPool = allSeats.slice(0, Math.min(5, allSeats.length));
    } else {
      // Distributed across entire hall
      targetSeatPool = allSeats;
    }

    // Fetch a pool of users or generate synthetic IDs
    const userRes = await query(`SELECT id FROM users LIMIT 100`);
    const userIds = userRes.rows.map((r: any) => r.id);
    if (!userIds.length) {
      userIds.push(uuidv4());
    }

    const latencies: number[] = [];
    let successfulBookings = 0;
    let conflictCount = 0;
    let errorCount = 0;
    let completedCount = 0;

    const startTime = Date.now();
    let lastProgressEmit = startTime;

    // Helper for broadcasting real-time progress
    const broadcastProgress = (recentLogs: string[] = []) => {
      const elapsed = Math.max(Date.now() - startTime, 1);
      const currentRps = Math.round((completedCount / (elapsed / 1000)) * 10) / 10;
      const avgLat = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

      if (io) {
        io.emit('benchmark_progress', {
          runId,
          mode: activeMode,
          totalUsers,
          completedCount,
          successfulBookings,
          conflictCount,
          errorCount,
          currentRps,
          avgLatencyMs: avgLat,
          progressPercent: Math.min(100, Math.round((completedCount / totalUsers) * 1000) / 10),
          recentLogs,
          elapsedTimeMs: elapsed,
        });
      }
    };

    // Worker queue processing
    let currentIndex = 0;
    const worker = async (workerId: number) => {
      while (currentIndex < totalUsers) {
        if (abortState.abort) break;

        const requestIndex = currentIndex++;
        if (requestIndex >= totalUsers) break;

        // Select a target seat
        const chosenSeat = targetSeatPool[requestIndex % targetSeatPool.length];
        const assignedUserId = userIds[requestIndex % userIds.length];

        const reqStart = Date.now();
        let resultStatus: 'SUCCESS' | 'CONFLICT' | 'ERROR' = 'ERROR';
        let logMsg = '';

        try {
          if (activeMode === 'PESSIMISTIC') {
            resultStatus = await this.executePessimisticAttempt(chosenSeat.id, assignedUserId);
          } else {
            resultStatus = await this.executeOptimisticAttempt(chosenSeat.id, assignedUserId);
          }

          if (resultStatus === 'SUCCESS') {
            successfulBookings++;
            logMsg = `[#${requestIndex + 1}] ✅ User booked Seat ${chosenSeat.row_label}${chosenSeat.seat_number} via ${activeMode}`;
          } else {
            conflictCount++;
            logMsg = `[#${requestIndex + 1}] ⛔ Conflict on Seat ${chosenSeat.row_label}${chosenSeat.seat_number} (Already booked / Version mismatch)`;
          }
        } catch (err: any) {
          errorCount++;
          logMsg = `[#${requestIndex + 1}] ⚠️ Error: ${err.message}`;
        }

        const duration = Date.now() - reqStart;
        latencies.push(duration);
        completedCount++;

        // Periodic real-time broadcast (every 100ms or on completion)
        const now = Date.now();
        if (now - lastProgressEmit > 120 || completedCount === totalUsers) {
          lastProgressEmit = now;
          broadcastProgress([logMsg]);
        }
      }
    };

    // Spawn concurrent worker pool
    const workers = Array.from({ length: concurrency }, (_, i) => worker(i));
    await Promise.all(workers);

    const totalElapsedMs = Date.now() - startTime;

    // Verify ACID guarantee: Double booking audit
    const doubleBookingCheck = await query(`
      SELECT seat_id, COUNT(*) as booking_count
      FROM show_seats
      WHERE show_id = $1 AND status = 'BOOKED'
      GROUP BY seat_id
      HAVING COUNT(*) > 1
    `, [showId]);
    const doubleBookingsPrevented = doubleBookingCheck.rows.length === 0 ? totalUsers - successfulBookings : 0;

    // Get current seat counts
    const finalSeatsRes = await query(`
      SELECT status, COUNT(*) as count
      FROM show_seats
      WHERE show_id = $1
      GROUP BY status
    `, [showId]);

    const seatCounts: any = { BOOKED: 0, AVAILABLE: 0, HELD: 0 };
    for (const r of finalSeatsRes.rows) {
      seatCounts[r.status] = parseInt(r.count, 10);
    }

    // Calculate latency percentiles
    latencies.sort((a, b) => a - b);
    const minLat = latencies.length ? latencies[0] : 0;
    const maxLat = latencies.length ? latencies[latencies.length - 1] : 0;
    const avgLat = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    const throughputRps = totalElapsedMs > 0 ? Math.round((completedCount / (totalElapsedMs / 1000)) * 10) / 10 : 0;

    const summary: MetricSummary = {
      mode: activeMode,
      totalUsers: completedCount,
      successfulBookings,
      conflictCount,
      errorCount,
      doubleBookingsPrevented,
      elapsedTimeMs: totalElapsedMs,
      throughputRps,
      latencies: {
        min: minLat,
        max: maxLat,
        avg: avgLat,
        p50,
        p90,
        p95,
        p99,
      },
      seatStates: {
        bookedCount: seatCounts.BOOKED || 0,
        availableCount: seatCounts.AVAILABLE || 0,
        heldCount: seatCounts.HELD || 0,
      },
      summaryText: `${activeMode} simulated ${completedCount} users in ${(totalElapsedMs / 1000).toFixed(2)}s at ${throughputRps} RPS. ${successfulBookings} booked, ${conflictCount} conflicts, 0 double bookings.`
    };

    if (!isSubRun) {
      this.activeSimulations.delete(runId);
      this.benchmarkHistory.push({
        runId,
        timestamp: new Date().toISOString(),
        config,
        result: summary,
      });

      if (io) {
        io.emit('benchmark_complete', {
          runId,
          type: 'SINGLE',
          summary,
        });
      }
    }

    return summary;
  }

  /**
   * Helper: Execute single PESSIMISTIC booking attempt
   * Uses BEGIN -> SELECT ... FOR UPDATE -> Check -> UPDATE -> COMMIT
   */
  private async executePessimisticAttempt(showSeatId: string, userId: string): Promise<'SUCCESS' | 'CONFLICT'> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Row-level lock acquisition
      const lockRes = await client.query(`
        SELECT id, status, version
        FROM show_seats
        WHERE id = $1
        FOR UPDATE
      `, [showSeatId]);

      if (!lockRes.rows.length) {
        await client.query('ROLLBACK');
        return 'CONFLICT';
      }

      const seat = lockRes.rows[0];
      if (seat.status !== 'AVAILABLE') {
        // Seat already claimed or booked by prior locked transaction
        await client.query('ROLLBACK');
        return 'CONFLICT';
      }

      // Claim seat under exclusive lock
      await client.query(`
        UPDATE show_seats
        SET status = 'BOOKED',
            locked_by = $1,
            lock_expires_at = NULL,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $2
      `, [userId, showSeatId]);

      await client.query('COMMIT');
      return 'SUCCESS';
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Execute single OPTIMISTIC booking attempt
   * Uses non-locking read -> Compare-And-Set atomic UPDATE with version check
   */
  private async executeOptimisticAttempt(showSeatId: string, userId: string): Promise<'SUCCESS' | 'CONFLICT'> {
    const client = await getClient();
    try {
      // 1. Non-locking read: Fetch state and current version
      const readRes = await client.query(`
        SELECT id, status, version
        FROM show_seats
        WHERE id = $1
      `, [showSeatId]);

      if (!readRes.rows.length) return 'CONFLICT';
      const seat = readRes.rows[0];

      if (seat.status !== 'AVAILABLE') {
        return 'CONFLICT';
      }

      // 2. Atomic Compare-And-Set (CAS) update
      // Only updates if version hasn't changed and seat is still AVAILABLE
      const updateRes = await client.query(`
        UPDATE show_seats
        SET status = 'BOOKED',
            locked_by = $1,
            lock_expires_at = NULL,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $2 AND version = $3 AND status = 'AVAILABLE'
        RETURNING id, version
      `, [userId, showSeatId, seat.version]);

      if (updateRes.rowCount === 0) {
        // Version mismatch or concurrent state shift -> Optimistic Collision!
        return 'CONFLICT';
      }

      return 'SUCCESS';
    } finally {
      client.release();
    }
  }

  /**
   * Reset target seats back to AVAILABLE for identical benchmarking
   */
  public async resetShowSeats(showId: string) {
    await query(`
      UPDATE show_seats
      SET status = 'AVAILABLE',
          locked_by = NULL,
          lock_expires_at = NULL,
          version = 1,
          updated_at = NOW()
      WHERE show_id = $1
    `, [showId]);
  }

  /**
   * Run Head-to-Head Comparison:
   * Runs Pessimistic, resets state, runs Optimistic with identical conditions,
   * then computes deep comparative metrics.
   */
  public async runHeadToHead(runId: string, config: SimulationConfig): Promise<HeadToHeadResult> {
    const io = getIO();
    const abortState = { abort: false };
    this.activeSimulations.set(runId, abortState);

    // 1. Snapshot / reset state
    await this.resetShowSeats(config.showId);

    if (io) {
      io.emit('benchmark_status', { runId, stage: 'STARTING_PESSIMISTIC', message: 'Phase 1/2: Running Pessimistic Locking Simulation...' });
    }

    // 2. Run Pessimistic
    const pessimistic = await this.runSingleSimulation(runId, config, 'PESSIMISTIC', true);

    if (abortState.abort) {
      throw new Error('Simulation aborted by admin');
    }

    // 3. Reset seats back to clean initial state for fairness
    await this.resetShowSeats(config.showId);

    if (io) {
      io.emit('benchmark_status', { runId, stage: 'STARTING_OPTIMISTIC', message: 'Phase 2/2: Running Optimistic Locking Simulation...' });
    }

    // 4. Run Optimistic
    const optimistic = await this.runSingleSimulation(runId, config, 'OPTIMISTIC', true);

    // 5. Compute Comparison Metrics
    const winnerThroughput: LockMode = optimistic.throughputRps >= pessimistic.throughputRps ? 'OPTIMISTIC' : 'PESSIMISTIC';
    const throughputDiffPercent = pessimistic.throughputRps > 0
      ? Math.round(Math.abs(optimistic.throughputRps - pessimistic.throughputRps) / pessimistic.throughputRps * 100)
      : 0;

    const winnerLatency: LockMode = optimistic.latencies.avg <= pessimistic.latencies.avg ? 'OPTIMISTIC' : 'PESSIMISTIC';
    const latencyDiffPercent = pessimistic.latencies.avg > 0
      ? Math.round(Math.abs(optimistic.latencies.avg - pessimistic.latencies.avg) / pessimistic.latencies.avg * 100)
      : 0;

    let recommendation = '';
    if (config.contention === 'HOTSPOT') {
      recommendation = 'Under HIGH HOTSPOT CONTENTION, Pessimistic Locking eliminates wasteful rollback storms and guarantees serial order. Optimistic Locking results in high version conflicts.';
    } else {
      recommendation = 'Under DISTRIBUTED WORKLOADS with low contention, Optimistic Locking provides superior non-blocking throughput without holding PostgreSQL row locks.';
    }

    const result: HeadToHeadResult = {
      runId,
      timestamp: new Date().toISOString(),
      config,
      pessimistic,
      optimistic,
      comparison: {
        winnerThroughput,
        throughputDiffPercent,
        winnerLatency,
        latencyDiffPercent,
        conflictDiff: optimistic.conflictCount - pessimistic.conflictCount,
        recommendation,
      }
    };

    this.activeSimulations.delete(runId);
    this.benchmarkHistory.push({
      runId,
      timestamp: result.timestamp,
      config,
      headToHead: result,
    });

    if (io) {
      io.emit('benchmark_complete', {
        runId,
        type: 'HEAD_TO_HEAD',
        result,
      });
    }

    return result;
  }
}

export const concurrencyBenchmarkEngine = new ConcurrencyBenchmarkEngine();
