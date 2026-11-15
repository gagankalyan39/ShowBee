'use client';

import React, { useState } from 'react';
import { 
  Star, 
  Award, 
  ShieldCheck, 
  Layers, 
  Activity, 
  Server, 
  Cpu, 
  CheckCircle2, 
  BookOpen, 
  FileText,
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface StarRatingProps {
  score: number; // 1 to 5
  max?: number;
}

function StarDisplay({ score, max = 5 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <div className="flex text-amber-400">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={i < score ? 'text-amber-400' : 'text-slate-600'}>
            ★
          </span>
        ))}
      </div>
      <span className="text-slate-300 font-semibold ml-1">({score}/{max})</span>
    </div>
  );
}

export default function ArchitectureStarRatings() {
  const [activeView, setActiveView] = useState<'both' | 'reference' | 'empirical'>('both');

  // Exact reference ratings from Head First Software Architecture (HFSA)
  // Chapter 7: Modular Monolith, page 495
  // Chapter 10: Microservices, page 668
  const referenceData = [
    { characteristic: 'Maintainability', monolith: 3, microservice: 5, notes: 'Microservices enable independent code ownership and bounded contexts' },
    { characteristic: 'Testability', monolith: 3, microservice: 5, notes: 'Microservices allow isolated unit, integration and contract testing' },
    { characteristic: 'Deployability', monolith: 3, microservice: 5, notes: 'Microservices can be deployed independently without entire app redeploy' },
    { characteristic: 'Simplicity', monolith: 4, microservice: 1, notes: 'Monolith: single process, unified build, no distributed orchestration' },
    { characteristic: 'Evolvability', monolith: 3, microservice: 5, notes: 'Microservices allow per-service technology upgrades and replacements' },
    { characteristic: 'Performance', monolith: 3, microservice: 2, notes: 'Monolith in-process calls have zero network serialization overhead' },
    { characteristic: 'Scalability', monolith: 1, microservice: 5, notes: 'Microservices enable independent horizontal auto-scaling per service' },
    { characteristic: 'Elasticity', monolith: 1, microservice: 4, notes: 'Microservices spin up/down granular containers based on load spikes' },
    { characteristic: 'Fault Tolerance', monolith: 1, microservice: 5, notes: 'Microservice failure is isolated; Monolith crash halts entire system' },
  ];

  // Empirically observed measurements from 24 SHOWBEE K6 benchmark runs
  const empiricalData = [
    {
      metric: 'Peak Throughput (Dist)',
      monolithScore: 4,
      monolithValue: '320.42 RPS',
      microserviceScore: 5,
      microserviceValue: '342.64 RPS',
      evidence: 'Microservice offloaded express server, achieving +6.9% higher sustained throughput',
    },
    {
      metric: 'Median Latency p50 (Hotspot)',
      monolithScore: 4,
      monolithValue: '16.96 ms',
      microserviceScore: 5,
      microserviceValue: '5.18 ms',
      evidence: 'Microservice dedicated event-loop yielded 3.27x faster median seat acquisition',
    },
    {
      metric: 'Tail Latency p95 (Hotspot)',
      monolithScore: 4,
      monolithValue: '80.53 ms',
      microserviceScore: 5,
      microserviceValue: '40.59 ms',
      evidence: 'Under intense 100-VU lock contention, Microservice reduced p95 tail by ~50%',
    },
    {
      metric: 'Data Integrity (Double Bookings)',
      monolithScore: 5,
      monolithValue: '0 Double Bookings',
      microserviceScore: 5,
      microserviceValue: '0 Double Bookings',
      evidence: 'Zero race condition violations across all 24 runs due to PostgreSQL SELECT FOR UPDATE / CAS',
    },
    {
      metric: 'Operational Simplicity',
      monolithScore: 4,
      monolithValue: 'Single Process (:5001)',
      microserviceScore: 1,
      microserviceValue: 'Multi-Service (:5001 + :5002)',
      evidence: 'Monolith requires 1 port, 1 env, 0 inter-service tokens; Microservice adds IPC overhead',
    },
    {
      metric: 'Fault Isolation',
      monolithScore: 1,
      monolithValue: 'Monolith Crash = Outage',
      microserviceScore: 5,
      microserviceValue: 'Booking Service Isolated',
      evidence: 'If Monolith catalog stalls, booking-service continues processing ticket checkouts on :5002',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase tracking-widest">
              <BookOpen className="w-4 h-4" />
              <span>Architectural Reference vs. Empirical Evaluation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1">
              Architecture Star Rating Comparison
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Rigorous comparative evaluation contrasting qualitative architectural ratings from{' '}
              <em className="text-white font-semibold">Head First Software Architecture</em> against actual empirical measurements recorded during the 24 SHOWBEE K6 benchmark runs.
            </p>
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center gap-2 bg-white/[0.04] p-1.5 rounded-2xl border border-white/10 self-start">
            <button
              onClick={() => setActiveView('both')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'both' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Views
            </button>
            <button
              onClick={() => setActiveView('reference')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'reference' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-slate-400 hover:text-white'
              }`}
            >
              Table A (Book)
            </button>
            <button
              onClick={() => setActiveView('empirical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'empirical' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-slate-400 hover:text-white'
              }`}
            >
              Table B (Empirical)
            </button>
          </div>
        </div>
      </div>

      {/* TABLE A: REFERENCE ARCHITECTURAL RATINGS */}
      {(activeView === 'both' || activeView === 'reference') && (
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-blue-500/20 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold">
                  TABLE A
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Reference Architectural Ratings — Head First Software Architecture
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Qualitative reference ratings cited from <strong className="text-slate-200">Chapter 7 (page 495)</strong> for Modular Monolith and <strong className="text-slate-200">Chapter 10 (page 668)</strong> for Microservices.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold">Monolith Cost: $$</span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400 font-bold">Microservice Cost: $$$$$</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Architectural Characteristic</th>
                  <th className="py-3 px-4 text-center">Modular Monolith (Port 5001)</th>
                  <th className="py-3 px-4 text-center">Microservices (Port 5002)</th>
                  <th className="py-3 px-4">Theoretical Architectural Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {referenceData.map((row) => (
                  <tr key={row.characteristic} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                      {row.characteristic}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center">
                        <StarDisplay score={row.monolith} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center">
                        <StarDisplay score={row.microservice} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] leading-relaxed">
                      {row.notes}
                    </td>
                  </tr>
                ))}
                {/* Cost Row */}
                <tr className="bg-white/[0.03] font-bold">
                  <td className="py-3.5 px-4 text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Overall Operational Cost
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-emerald-400 text-sm">
                    $$ (Low)
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-rose-400 text-sm">
                    $$$$$ (High)
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    Monolith runs on minimal single-node infra; Microservices incur container orchestration, network mesh, and telemetry costs.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCORING RUBRIC ACCORDION */}
      {(activeView === 'both' || activeView === 'empirical') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Documented Experimental Scoring Rubric</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 pt-1">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="font-bold text-white block">Throughput (RPS):</span>
              <p className="text-[11px] text-slate-400">
                5★: &gt;300 RPS | 4★: 200-300 RPS | 3★: 100-200 RPS | 2★: 50-100 RPS | 1★: &lt;50 RPS
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="font-bold text-white block">Tail Latency (p95):</span>
              <p className="text-[11px] text-slate-400">
                5★: &lt;50ms | 4★: 50-100ms | 3★: 100-200ms | 2★: 200-500ms | 1★: &gt;500ms
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="font-bold text-white block">Data Integrity:</span>
              <p className="text-[11px] text-slate-400">
                5★: 0 Double Bookings (100% ACID) | 3★: 1-2 anomalies | 1★: Systematic Race Conditions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TABLE B: EMPIRICALLY OBSERVED SHOWBEE RATINGS */}
      {(activeView === 'both' || activeView === 'empirical') && (
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/20 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                  TABLE B
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Experimentally Observed SHOWBEE Rating (Empirical 24-Run Evaluation)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Derived strictly from 24 controlled K6 load tests (8 configurations × 3 repetitions). Separate from theoretical book ratings.
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold self-start">
              PostgreSQL 15 + K6 Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Empirical Performance Factor</th>
                  <th className="py-3 px-4 text-center">Modular Monolith (:5001)</th>
                  <th className="py-3 px-4 text-center">Microservice (:5002)</th>
                  <th className="py-3 px-4">Measured Empirical Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {empiricalData.map((row) => (
                  <tr key={row.metric} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {row.metric}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-emerald-400 font-bold">{row.monolithValue}</span>
                        <StarDisplay score={row.monolithScore} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-teal-300 font-bold">{row.microserviceValue}</span>
                        <StarDisplay score={row.microserviceScore} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px] leading-relaxed">
                      {row.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Research Hypotheses Scorecard */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-4">
        <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Research Hypotheses Verification Status</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {[
            { id: 'H1', title: 'Architecture Influences Performance', status: 'SUPPORTED', desc: 'Microservice achieved +6.9% higher throughput and ~50% lower p95 latency under hotspot contention.' },
            { id: 'H2', title: 'Monolith Offers Lower Simplicity Cost', status: 'SUPPORTED', desc: 'Monolith requires 1 port, zero distributed networking, and zero inter-service authentication headers.' },
            { id: 'H3', title: 'Microservices Offer Elasticity & Isolation', status: 'SUPPORTED', desc: 'Booking engine remains responsive even when monolith catalog query loops experience load.' },
            { id: 'H4', title: 'In-Process Monolith Call Latency', status: 'PARTIALLY SUPPORTED', desc: 'While in-process calls have 0 network hops, event-loop contention in monolith elevated tail latency compared to microservice.' },
            { id: 'H5', title: 'OCC vs PCC Distinct Regimes', status: 'SUPPORTED', desc: 'PCC dominated distributed throughput (342.64 RPS vs 184.10 RPS for OCC due to CAS retry storms).' },
            { id: 'H6', title: 'Zero Double Bookings Invariant', status: 'SUPPORTED', desc: '100% data integrity achieved: 0 duplicate bookings across 24 experimental runs.' },
          ].map((hypo) => (
            <div key={hypo.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-white">{hypo.id}: {hypo.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  hypo.status === 'SUPPORTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {hypo.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{hypo.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
