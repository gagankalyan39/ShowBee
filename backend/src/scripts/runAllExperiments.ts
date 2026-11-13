import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import pool, { getClient } from '../db';
import { resetSeatsAndShows } from './benchmarkDb';

const execFileAsync = promisify(execFile);
const K6_BIN = path.resolve(__dirname, '../../../load-test/bin/k6.exe');
const RESULTS_DIR = path.resolve(__dirname, '../../../experiments/results');

interface ExperimentConfig {
  id: string;
  name: string;
  architecture: 'monolith' | 'microservice';
  targetUrl: string;
  lockMode: 'PESSIMISTIC' | 'OPTIMISTIC';
  workload: 'hotspot' | 'distributed';
  script: string;
  vus: number;
}

const EXPERIMENTS: ExperimentConfig[] = [
  {
    id: 'exp1_mono_pess_hotspot',
    name: 'Monolith + Pessimistic + Hotspot',
    architecture: 'monolith',
    targetUrl: 'http://localhost:5001',
    lockMode: 'PESSIMISTIC',
    workload: 'hotspot',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-c-hotspot.js'),
    vus: 50,
  },
  {
    id: 'exp2_mono_opt_hotspot',
    name: 'Monolith + Optimistic + Hotspot',
    architecture: 'monolith',
    targetUrl: 'http://localhost:5001',
    lockMode: 'OPTIMISTIC',
    workload: 'hotspot',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-c-hotspot.js'),
    vus: 50,
  },
  {
    id: 'exp3_mono_pess_dist',
    name: 'Monolith + Pessimistic + Distributed',
    architecture: 'monolith',
    targetUrl: 'http://localhost:5001',
    lockMode: 'PESSIMISTIC',
    workload: 'distributed',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-d-distributed.js'),
    vus: 30,
  },
  {
    id: 'exp4_mono_opt_dist',
    name: 'Monolith + Optimistic + Distributed',
    architecture: 'monolith',
    targetUrl: 'http://localhost:5001',
    lockMode: 'OPTIMISTIC',
    workload: 'distributed',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-d-distributed.js'),
    vus: 30,
  },
  {
    id: 'exp5_micro_pess_hotspot',
    name: 'Microservice + Pessimistic + Hotspot',
    architecture: 'microservice',
    targetUrl: 'http://localhost:5002',
    lockMode: 'PESSIMISTIC',
    workload: 'hotspot',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-c-hotspot.js'),
    vus: 50,
  },
  {
    id: 'exp6_micro_opt_hotspot',
    name: 'Microservice + Optimistic + Hotspot',
    architecture: 'microservice',
    targetUrl: 'http://localhost:5002',
    lockMode: 'OPTIMISTIC',
    workload: 'hotspot',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-c-hotspot.js'),
    vus: 50,
  },
  {
    id: 'exp7_micro_pess_dist',
    name: 'Microservice + Pessimistic + Distributed',
    architecture: 'microservice',
    targetUrl: 'http://localhost:5002',
    lockMode: 'PESSIMISTIC',
    workload: 'distributed',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-d-distributed.js'),
    vus: 30,
  },
  {
    id: 'exp8_micro_opt_dist',
    name: 'Microservice + Optimistic + Distributed',
    architecture: 'microservice',
    targetUrl: 'http://localhost:5002',
    lockMode: 'OPTIMISTIC',
    workload: 'distributed',
    script: path.resolve(__dirname, '../../../load-test/k6/scenario-d-distributed.js'),
    vus: 30,
  },
];

interface RawRun {
  experimentId: string;
  experimentName: string;
  architecture: string;
  lockMode: string;
  workload: string;
  repetition: number;
  totalRequests: number;
  throughputRps: number;
  avgLatencyMs: number;
  medLatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  attempts: number;
  successes: number;
  conflicts: number;
  retries: number;
  conflictRatePct: number;
  errorRatePct: number;
  doubleBookings: number;
  timestamp: string;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[], avg: number): number {
  if (nums.length <= 1) return 0;
  const variance = nums.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

function round(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

async function verifyDoubleBookings(showId: string): Promise<number> {
  const client = await getClient();
  try {
    const res = await client.query(`
      SELECT seat_id, COUNT(*)
      FROM show_seats
      WHERE show_id = $1 AND status = 'BOOKED'
      GROUP BY seat_id
      HAVING COUNT(*) > 1
    `, [showId]);
    return res.rows.length;
  } finally {
    client.release();
  }
}

async function run() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  console.log('================================================================');
  console.log('🚀 SHOWBEE BENCHMARK ENGINE: EXECUTING 8 CORE EXPERIMENTS × 3 REPS');
  console.log('================================================================');

  const rawRuns: RawRun[] = [];
  const REPETITIONS = 3;

  for (let expIdx = 0; expIdx < EXPERIMENTS.length; expIdx++) {
    const exp = EXPERIMENTS[expIdx];
    console.log(`\n------------------------------------------------------------`);
    console.log(`[${expIdx + 1}/8] EXPERIMENT: ${exp.name} (${exp.id})`);
    console.log(`------------------------------------------------------------`);

    for (let rep = 1; rep <= REPETITIONS; rep++) {
      console.log(`🔄 Resetting show seats and state for Repetition ${rep}/${REPETITIONS}...`);
      const resetResult = await resetSeatsAndShows();
      const showId = resetResult.showId;

      const summaryExportPath = path.resolve(RESULTS_DIR, `temp_${exp.id}_rep${rep}.json`);
      if (fs.existsSync(summaryExportPath)) fs.unlinkSync(summaryExportPath);

      const envArgs = [
        '-e', `TARGET_URL=${exp.targetUrl}`,
        '-e', `TARGET_SHOW_ID=${showId}`,
        '-e', `LOCK_MODE=${exp.lockMode}`,
        '-e', `VUS=${exp.vus}`,
        '-e', 'ITERATIONS=2',
        '-e', 'DURATION=10s',
        '--summary-export', summaryExportPath,
      ];

      console.log(`▶ Executing K6: ${exp.script} with ${exp.vus} VUs on ${exp.targetUrl} [${exp.lockMode}]...`);
      const startTime = Date.now();

      try {
        await execFileAsync(K6_BIN, ['run', ...envArgs, exp.script], {
          timeout: 90000,
          cwd: path.resolve(__dirname, '../../../load-test'),
        });
      } catch (execErr: any) {
        // k6 may return non-zero if thresholds trigger; check if summary was produced
        if (!fs.existsSync(summaryExportPath)) {
          console.error(`❌ K6 execution failed without summary:`, execErr.message);
          throw execErr;
        }
      }

      const elapsedSec = (Date.now() - startTime) / 1000;
      console.log(`✔ Finished in ${elapsedSec.toFixed(2)}s. Verifying database integrity...`);

      const doubleBookings = await verifyDoubleBookings(showId);
      if (doubleBookings > 0) {
        throw new Error(`CRITICAL INTEGRITY FAILURE: ${doubleBookings} double booking(s) detected!`);
      }

      // Read summary JSON
      const summaryRaw = fs.readFileSync(summaryExportPath, 'utf-8');
      const summary = JSON.parse(summaryRaw);
      fs.unlinkSync(summaryExportPath); // clean up temp file

      const metrics = summary.metrics || {};
      const httpReqs = metrics.http_reqs || {};
      const duration = metrics.http_req_duration || {};
      const failed = metrics.http_req_failed || {};

      let attempts = 0;
      let successes = 0;
      let conflicts = 0;
      let retries = 0;

      if (exp.workload === 'hotspot') {
        attempts = metrics.k6_hotspot_attempts_total?.count || 0;
        successes = metrics.k6_hotspot_successes_total?.count || 0;
        conflicts = metrics.k6_hotspot_conflicts_total?.count || 0;
        retries = metrics.k6_hotspot_retries_total?.count || 0;
      } else {
        attempts = metrics.k6_dist_attempts_total?.count || 0;
        successes = metrics.k6_dist_successes_total?.count || 0;
        conflicts = metrics.k6_dist_conflicts_total?.count || 0;
      }

      const throughputRps = round(httpReqs.rate || 0, 2);
      const totalRequests = httpReqs.count || 0;
      const avgLatencyMs = round(duration.avg || 0, 2);
      const medLatencyMs = round(duration.med || 0, 2);
      const p90LatencyMs = round(duration['p(90)'] || 0, 2);
      const p95LatencyMs = round(duration['p(95)'] || 0, 2);
      const p99LatencyMs = round(duration['p(99)'] || duration['p(95)'] || 0, 2);
      const maxLatencyMs = round(duration.max || 0, 2);
      const conflictRatePct = attempts > 0 ? round((conflicts / attempts) * 100, 2) : 0;
      const errorRatePct = round((failed.value || 0) * 100, 2);

      const runRecord: RawRun = {
        experimentId: exp.id,
        experimentName: exp.name,
        architecture: exp.architecture,
        lockMode: exp.lockMode,
        workload: exp.workload,
        repetition: rep,
        totalRequests,
        throughputRps,
        avgLatencyMs,
        medLatencyMs,
        p90LatencyMs,
        p95LatencyMs,
        p99LatencyMs,
        maxLatencyMs,
        attempts,
        successes,
        conflicts,
        retries,
        conflictRatePct,
        errorRatePct,
        doubleBookings,
        timestamp: new Date().toISOString(),
      };

      rawRuns.push(runRecord);
      console.log(`📊 Rep ${rep}: Throughput=${throughputRps} RPS | p95=${p95LatencyMs}ms | Conflicts=${conflicts}/${attempts} (${conflictRatePct}%) | Double Bookings=${doubleBookings}`);

      // Small cooldown between runs
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // Write raw runs JSON & CSV
  const rawJsonPath = path.resolve(RESULTS_DIR, 'raw_experiment_runs.json');
  fs.writeFileSync(rawJsonPath, JSON.stringify(rawRuns, null, 2), 'utf-8');

  const csvHeaders = [
    'experimentId', 'experimentName', 'architecture', 'lockMode', 'workload', 'repetition',
    'totalRequests', 'throughputRps', 'avgLatencyMs', 'medLatencyMs', 'p90LatencyMs', 'p95LatencyMs', 'p99LatencyMs', 'maxLatencyMs',
    'attempts', 'successes', 'conflicts', 'retries', 'conflictRatePct', 'errorRatePct', 'doubleBookings', 'timestamp'
  ];
  const csvRows = [
    csvHeaders.join(','),
    ...rawRuns.map((r) => [
      r.experimentId, `"${r.experimentName}"`, r.architecture, r.lockMode, r.workload, r.repetition,
      r.totalRequests, r.throughputRps, r.avgLatencyMs, r.medLatencyMs, r.p90LatencyMs, r.p95LatencyMs, r.p99LatencyMs, r.maxLatencyMs,
      r.attempts, r.successes, r.conflicts, r.retries, r.conflictRatePct, r.errorRatePct, r.doubleBookings, r.timestamp
    ].join(','))
  ];
  const rawCsvPath = path.resolve(RESULTS_DIR, 'raw_experiment_runs.csv');
  fs.writeFileSync(rawCsvPath, csvRows.join('\n'), 'utf-8');

  // Compute Aggregates across the 3 repetitions for each experiment
  const aggregated: any[] = [];
  for (const exp of EXPERIMENTS) {
    const expRuns = rawRuns.filter((r) => r.experimentId === exp.id);
    const tps = expRuns.map((r) => r.throughputRps);
    const p50s = expRuns.map((r) => r.medLatencyMs);
    const p95s = expRuns.map((r) => r.p95LatencyMs);
    const p99s = expRuns.map((r) => r.p99LatencyMs);
    const avgs = expRuns.map((r) => r.avgLatencyMs);
    const conflictRates = expRuns.map((r) => r.conflictRatePct);
    const errorRates = expRuns.map((r) => r.errorRatePct);

    const meanThroughput = round(mean(tps));
    const stdThroughput = round(stdDev(tps, meanThroughput));

    const meanP50 = round(mean(p50s));
    const stdP50 = round(stdDev(p50s, meanP50));

    const meanP95 = round(mean(p95s));
    const stdP95 = round(stdDev(p95s, meanP95));

    const meanP99 = round(mean(p99s));
    const stdP99 = round(stdDev(p99s, meanP99));

    const meanConflict = round(mean(conflictRates));
    const stdConflict = round(stdDev(conflictRates, meanConflict));

    const meanError = round(mean(errorRates));
    const doubleBookingsSum = expRuns.reduce((acc, r) => acc + r.doubleBookings, 0);

    aggregated.push({
      experimentId: exp.id,
      name: exp.name,
      architecture: exp.architecture,
      lockMode: exp.lockMode,
      workload: exp.workload,
      repetitions: REPETITIONS,
      throughputRps: { mean: meanThroughput, stdDev: stdThroughput },
      p50LatencyMs: { mean: meanP50, stdDev: stdP50 },
      p95LatencyMs: { mean: meanP95, stdDev: stdP95 },
      p99LatencyMs: { mean: meanP99, stdDev: stdP99 },
      conflictRatePct: { mean: meanConflict, stdDev: stdConflict },
      errorRatePct: meanError,
      doubleBookingsTotal: doubleBookingsSum,
    });
  }

  const aggJsonPath = path.resolve(RESULTS_DIR, 'aggregated_summary.json');
  fs.writeFileSync(aggJsonPath, JSON.stringify(aggregated, null, 2), 'utf-8');

  const aggCsvHeaders = [
    'experimentId', 'name', 'architecture', 'lockMode', 'workload',
    'throughputRps_mean', 'throughputRps_stdDev',
    'p50LatencyMs_mean', 'p50LatencyMs_stdDev',
    'p95LatencyMs_mean', 'p95LatencyMs_stdDev',
    'p99LatencyMs_mean', 'p99LatencyMs_stdDev',
    'conflictRatePct_mean', 'conflictRatePct_stdDev',
    'doubleBookingsTotal'
  ];
  const aggCsvRows = [
    aggCsvHeaders.join(','),
    ...aggregated.map((a) => [
      a.experimentId, `"${a.name}"`, a.architecture, a.lockMode, a.workload,
      a.throughputRps.mean, a.throughputRps.stdDev,
      a.p50LatencyMs.mean, a.p50LatencyMs.stdDev,
      a.p95LatencyMs.mean, a.p95LatencyMs.stdDev,
      a.p99LatencyMs.mean, a.p99LatencyMs.stdDev,
      a.conflictRatePct.mean, a.conflictRatePct.stdDev,
      a.doubleBookingsTotal
    ].join(','))
  ];
  const aggCsvPath = path.resolve(RESULTS_DIR, 'aggregated_summary.csv');
  fs.writeFileSync(aggCsvPath, aggCsvRows.join('\n'), 'utf-8');

  console.log('\n================================================================');
  console.log('✅ ALL 24 BENCHMARK RUNS COMPLETED SUCCESSFULLY');
  console.log(`Raw runs: ${rawJsonPath} (${rawRuns.length} runs)`);
  console.log(`Aggregated: ${aggJsonPath}`);
  console.log('================================================================\n');

  console.table(aggregated.map((a) => ({
    Experiment: a.name,
    'Throughput (RPS)': `${a.throughputRps.mean} ± ${a.throughputRps.stdDev}`,
    'p95 Latency (ms)': `${a.p95LatencyMs.mean} ± ${a.p95LatencyMs.stdDev}`,
    'p99 Latency (ms)': `${a.p99LatencyMs.mean} ± ${a.p99LatencyMs.stdDev}`,
    'Conflict Rate %': `${a.conflictRatePct.mean}%`,
    'Double Bookings': a.doubleBookingsTotal,
  })));
}

if (require.main === module) {
  run()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Fatal benchmark execution error:', err);
      pool.end();
      process.exit(1);
    });
}
