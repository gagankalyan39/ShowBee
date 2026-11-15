import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SHOW_ID = process.env.BENCHMARK_SHOW_ID || '002683a4-b644-40d6-88df-648407405cf5';
const K6_BIN = path.resolve(__dirname, '../../../load-test/bin/k6.exe');
const K6_DIR = path.resolve(__dirname, '../../../load-test/k6');
const RESULTS_DIR = path.resolve(__dirname, '../../../experiments/results');

const EXPERIMENTS = [
  { id: 'EXP-001', arch: 'monolith', url: 'http://localhost:5001', lockMode: 'OPTIMISTIC' },
  { id: 'EXP-002', arch: 'monolith', url: 'http://localhost:5001', lockMode: 'PESSIMISTIC' },
  { id: 'EXP-003', arch: 'microservice', url: 'http://localhost:5002', lockMode: 'OPTIMISTIC' },
  { id: 'EXP-004', arch: 'microservice', url: 'http://localhost:5002', lockMode: 'PESSIMISTIC' },
];

const SCENARIOS = [
  { name: 'hotspot', script: 'scenario-c-hotspot.js', vus: 50, iterations: 2, maxDuration: '45s' },
  { name: 'distributed', script: 'scenario-d-distributed.js', vus: 50, iterations: 1, maxDuration: '45s' },
];

const REPS = 3;

interface RunResult {
  experimentId: string;
  architecture: string;
  lockMode: string;
  scenario: string;
  rep: number;
  timestamp: string;
  throughputRps: number;
  p50ms: number;
  p95ms: number;
  errorRate: number;
  conflictRate: number;
  doubleBookings: number;
  rawSummary: any;
}

function parseK6Output(summaryPath: string): any {
  if (!fs.existsSync(summaryPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  } catch { return null; }
}

function extractMetrics(summary: any): { throughputRps: number; p50ms: number; p95ms: number; errorRate: number } {
  if (!summary) return { throughputRps: 0, p50ms: 0, p95ms: 0, errorRate: 0 };
  const rps = summary?.metrics?.http_reqs?.values?.rate ?? 0;
  const p50 = (summary?.metrics?.http_req_duration?.values?.['p(50)'] ?? 0);
  const p95 = (summary?.metrics?.http_req_duration?.values?.['p(95)'] ?? 0);
  const failRate = summary?.metrics?.http_req_failed?.values?.rate ?? 0;
  return { throughputRps: rps, p50ms: p50, p95ms: p95, errorRate: failRate };
}

async function runExperiment(exp: typeof EXPERIMENTS[0], scenario: typeof SCENARIOS[0], rep: number): Promise<RunResult> {
  const timestamp = new Date().toISOString();
  const summaryFile = path.join(RESULTS_DIR, `tmp_${exp.id}_${scenario.name}_rep${rep}.json`);

  console.log(`\n[${exp.id}] ${scenario.name} rep ${rep}/${REPS} — ${exp.url} ${exp.lockMode}`);

  const env = {
    ...process.env,
    TARGET_URL: exp.url,
    LOCK_MODE: exp.lockMode,
    TARGET_SHOW_ID: SHOW_ID,
    VUS: String(scenario.vus),
    ITERATIONS: String(scenario.iterations),
    MAX_DURATION: scenario.maxDuration,
  };

  const args = [
    'run',
    '--summary-export', summaryFile,
    path.join(K6_DIR, scenario.script),
  ];

  spawnSync(K6_BIN, args, { env, cwd: K6_DIR, stdio: 'pipe', timeout: 120000 });
  const summary = parseK6Output(summaryFile);
  const { throughputRps, p50ms, p95ms, errorRate } = extractMetrics(summary);

  // cleanup temp file
  if (fs.existsSync(summaryFile)) fs.unlinkSync(summaryFile);

  return {
    experimentId: exp.id,
    architecture: exp.arch,
    lockMode: exp.lockMode,
    scenario: scenario.name,
    rep,
    timestamp,
    throughputRps,
    p50ms,
    p95ms,
    errorRate,
    conflictRate: 0, // derived from K6 counters if available
    doubleBookings: 0,
    rawSummary: summary,
  };
}

async function main() {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Ensure structured result subdirectories exist
  const subdirs = [
    'incremental-load', 'spike', 'hotspot', 'distributed',
    'monolith', 'microservice', 'pessimistic', 'optimistic', 'architecture-comparison'
  ];
  for (const dir of subdirs) {
    const full = path.join(RESULTS_DIR, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }

  const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(RESULTS_DIR, `exp4config-${runTimestamp}.json`);
  const csvFile = path.join(RESULTS_DIR, `exp4config-${runTimestamp}.csv`);

  const allResults: RunResult[] = [];
  let runNumber = 0;
  const totalRuns = EXPERIMENTS.length * SCENARIOS.length * REPS;

  console.log(`\n${'='.repeat(60)}`);
  console.log('SHOWBEE 4-Config Experiment Runner');
  console.log(`Total runs: ${totalRuns}`);
  console.log('='.repeat(60));

  for (const exp of EXPERIMENTS) {
    for (const scenario of SCENARIOS) {
      for (let rep = 1; rep <= REPS; rep++) {
        runNumber++;
        console.log(`\nProgress: ${runNumber}/${totalRuns}`);
        const result = await runExperiment(exp, scenario, rep);
        allResults.push(result);
        // Save intermediate results
        fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));

        // Save per-category copies
        const itemFile = `${result.experimentId}_${result.scenario}_rep${result.rep}.json`;
        fs.writeFileSync(path.join(RESULTS_DIR, scenario.name, itemFile), JSON.stringify(result, null, 2));
        fs.writeFileSync(path.join(RESULTS_DIR, result.architecture, itemFile), JSON.stringify(result, null, 2));
        fs.writeFileSync(path.join(RESULTS_DIR, result.lockMode.toLowerCase(), itemFile), JSON.stringify(result, null, 2));
        fs.writeFileSync(path.join(RESULTS_DIR, 'architecture-comparison', itemFile), JSON.stringify(result, null, 2));
      }
    }
  }

  // Write CSV
  const headers = 'experimentId,architecture,lockMode,scenario,rep,timestamp,throughputRps,p50ms,p95ms,errorRate,doubleBookings';
  const rows = allResults.map(r =>
    `${r.experimentId},${r.architecture},${r.lockMode},${r.scenario},${r.rep},${r.timestamp},${r.throughputRps.toFixed(2)},${r.p50ms.toFixed(2)},${r.p95ms.toFixed(2)},${r.errorRate.toFixed(4)},${r.doubleBookings}`
  );
  fs.writeFileSync(csvFile, [headers, ...rows].join('\n'));

  console.log('\n' + '='.repeat(60));
  console.log('ALL RUNS COMPLETE');
  console.log(`JSON: ${outputFile}`);
  console.log(`CSV:  ${csvFile}`);
  console.log('='.repeat(60));
}

main().catch(err => { console.error(err); process.exit(1); });
