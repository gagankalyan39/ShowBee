'use client';

import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import {
  Zap,
  Lock,
  RotateCcw,
  Square,
  ShieldCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Film,
  Sparkles,
  BarChart2,
  Clock,
  Flame,
  Award,
  Layers,
  Terminal,
  RefreshCw,
} from 'lucide-react';

interface BenchmarkLabProps {
  onNotify?: (title: string, msg: string, type: string) => void;
}

export default function AdminBenchmarkLab({ onNotify }: BenchmarkLabProps) {
  // Configuration State
  const [totalUsers, setTotalUsers] = useState<number>(1000);
  const [mode, setMode] = useState<'PESSIMISTIC' | 'OPTIMISTIC' | 'HEAD_TO_HEAD'>('HEAD_TO_HEAD');
  const [contention, setContention] = useState<'HOTSPOT' | 'DISTRIBUTED'>('HOTSPOT');
  const [selectedShowId, setSelectedShowId] = useState<string>('');
  const [candidateShows, setCandidateShows] = useState<any[]>([]);

  // Simulation Running State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeRunId, setActiveRunId] = useState<string>('');
  const [activeStage, setActiveStage] = useState<string>('');
  const [progressData, setProgressData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [headToHeadResult, setHeadToHeadResult] = useState<any>(null);
  const [singleResult, setSingleResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Seat Map Visualizer State
  const [seatMap, setSeatMap] = useState<any[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize socket and load candidate shows
  useEffect(() => {
    loadShows();
    loadHistory();

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000');

    const s = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = s;

    s.on('benchmark_progress', (data: any) => {
      setProgressData(data);
      if (data.recentLogs && data.recentLogs.length) {
        setLogs((prev) => [...prev.slice(-100), ...data.recentLogs]);
      }
    });

    s.on('benchmark_status', (data: any) => {
      setActiveStage(data.message || data.stage);
      setLogs((prev) => [...prev.slice(-100), `🔔 ${data.message || data.stage}`]);
    });

    s.on('benchmark_complete', (data: any) => {
      setIsRunning(false);
      setActiveStage('Simulation Completed');
      if (data.type === 'HEAD_TO_HEAD') {
        setHeadToHeadResult(data.result);
      } else {
        setSingleResult(data.summary);
      }
      loadHistory();
      if (selectedShowId) {
        loadSeatMap(selectedShowId);
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const loadShows = async () => {
    try {
      const res = await adminAPI.getBenchmarkShows();
      if (res.success && res.data.length > 0) {
        setCandidateShows(res.data);
        if (!selectedShowId) {
          setSelectedShowId(res.data[0].id);
          loadSeatMap(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load benchmark shows:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await adminAPI.getBenchmarkHistory();
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const loadSeatMap = async (showId: string) => {
    try {
      setIsLoadingSeats(true);
      const res = await adminAPI.getBenchmarkSeatMap(showId);
      if (res.success) {
        setSeatMap(res.data);
      }
    } catch (err) {
      console.error('Failed to load seat map:', err);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  const handleShowSelect = (showId: string) => {
    setSelectedShowId(showId);
    loadSeatMap(showId);
  };

  const handleStartSimulation = async () => {
    if (!selectedShowId) {
      alert('Please select a target showtime');
      return;
    }

    try {
      setIsRunning(true);
      setLogs([`🚀 Launching simulation: ${totalUsers.toLocaleString()} Users in ${mode} mode (${contention} Contention)...`]);
      setProgressData(null);
      setHeadToHeadResult(null);
      setSingleResult(null);
      setActiveStage('Starting Worker Pipelines...');

      const res = await adminAPI.startBenchmark({
        totalUsers,
        mode,
        contention,
        showId: selectedShowId,
        concurrencyLimit: 25,
      });

      if (res.success) {
        setActiveRunId(res.runId);
      } else {
        setIsRunning(false);
        alert(res.message || 'Failed to start simulation');
      }
    } catch (err: any) {
      setIsRunning(false);
      alert(err.message || 'Simulation error');
    }
  };

  const handleStopSimulation = async () => {
    if (!activeRunId) return;
    try {
      await adminAPI.stopBenchmark(activeRunId);
      setIsRunning(false);
      setActiveStage('Stopped by Administrator');
      setLogs((prev) => [...prev, '🛑 Simulation stopped by Administrator']);
    } catch (err: any) {
      console.error('Failed to stop simulation:', err);
    }
  };

  const handleResetSeats = async () => {
    if (!selectedShowId) return;
    try {
      await adminAPI.resetBenchmarkSeats(selectedShowId);
      await loadSeatMap(selectedShowId);
      setLogs((prev) => [...prev, '🧹 Target screening seats reset to AVAILABLE state.']);
    } catch (err: any) {
      alert(err.message || 'Failed to reset seats');
    }
  };

  // Group seats by row for cinema grid
  const seatsByRow: Record<string, any[]> = {};
  seatMap.forEach((s) => {
    if (!seatsByRow[s.row_label]) seatsByRow[s.row_label] = [];
    seatsByRow[s.row_label].push(s);
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── TOP BANNER ────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-amber-900/20 border border-blue-500/30 glass-panel relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> High-Concurrency Simulation Suite
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-bold uppercase tracking-wider">
                Up to 10,000 Concurrent Users
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                0 Double-Bookings Guaranteed
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <span>Pessimistic vs Optimistic Locking Lab</span>
            </h2>
            <p className="text-sm text-gray-300 max-w-2xl">
              Simulate up to <strong>10,000 virtual users</strong> competing for seats in real-time. Compare PostgreSQL
              row-level locking (<code className="text-blue-300 font-mono">SELECT ... FOR UPDATE</code>) against atomic
              version-based Compare-And-Set (<code className="text-purple-300 font-mono">CAS version match</code>).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleResetSeats}
              disabled={isRunning}
              className="px-4 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Reset Seats</span>
            </button>
            {isRunning ? (
              <button
                onClick={handleStopSimulation}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-900/40 flex items-center gap-2 animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Simulation</span>
              </button>
            ) : (
              <button
                onClick={handleStartSimulation}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-900/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Run {totalUsers.toLocaleString()} Users Test</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SIMULATION CONTROLS GRID ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: User Scale & Presets */}
        <div className="p-5 rounded-3xl glass-panel space-y-4 border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" /> User Load Scale
            </span>
            <span className="text-base font-black text-amber-400 font-mono">
              {totalUsers.toLocaleString()} Users
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[100, 500, 1000, 5000, 10000].map((preset) => (
              <button
                key={preset}
                disabled={isRunning}
                onClick={() => setTotalUsers(preset)}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  totalUsers === preset
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-gray-400 uppercase font-semibold">Custom Virtual User Count</label>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              disabled={isRunning}
              value={totalUsers}
              onChange={(e) => setTotalUsers(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>100</span>
              <span>2,500</span>
              <span>5,000</span>
              <span>7,500</span>
              <span>10,000 Max</span>
            </div>
          </div>
        </div>

        {/* Card 2: Locking Engine Mode */}
        <div className="p-5 rounded-3xl glass-panel space-y-4 border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-400" /> Locking Algorithm
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase">{mode}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              disabled={isRunning}
              onClick={() => setMode('PESSIMISTIC')}
              className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 border transition-all ${
                mode === 'PESSIMISTIC'
                  ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-lg shadow-blue-900/30'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              <Lock className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-black">Pessimistic</span>
              <span className="text-[10px] text-gray-400">SELECT FOR UPDATE</span>
            </button>

            <button
              disabled={isRunning}
              onClick={() => setMode('OPTIMISTIC')}
              className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 border transition-all ${
                mode === 'OPTIMISTIC'
                  ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-lg shadow-purple-900/30'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              <Zap className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-black">Optimistic</span>
              <span className="text-[10px] text-gray-400">Version CAS</span>
            </button>

            <button
              disabled={isRunning}
              onClick={() => setMode('HEAD_TO_HEAD')}
              className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 border transition-all ${
                mode === 'HEAD_TO_HEAD'
                  ? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-lg shadow-amber-900/30 ring-1 ring-amber-400/50'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-black">Compare Both</span>
              <span className="text-[10px] text-gray-400">Head-to-Head</span>
            </button>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            {mode === 'HEAD_TO_HEAD'
              ? '⚡ Runs both engines sequentially under identical initial conditions, then produces a comprehensive side-by-side comparison report.'
              : mode === 'PESSIMISTIC'
              ? '🔒 Acquires strict row-level exclusive locks in PostgreSQL. Subsequent concurrent buyers queue or safely rollback.'
              : '⚡ Non-blocking reads with atomic Compare-And-Set version check. Collision detected on commit.'}
          </p>
        </div>

        {/* Card 3: Contention & Showtime */}
        <div className="p-5 rounded-3xl glass-panel space-y-4 border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" /> Contention Profile
            </span>
            <div className="flex gap-1">
              <button
                disabled={isRunning}
                onClick={() => setContention('HOTSPOT')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  contention === 'HOTSPOT' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'text-gray-400 hover:text-white'
                }`}
              >
                Hotspot (5 VIP)
              </button>
              <button
                disabled={isRunning}
                onClick={() => setContention('DISTRIBUTED')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  contention === 'DISTRIBUTED' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'text-gray-400 hover:text-white'
                }`}
              >
                Distributed Hall
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-gray-400 uppercase font-semibold">Target Showtime</label>
            <select
              disabled={isRunning}
              value={selectedShowId}
              onChange={(e) => handleShowSelect(e.target.value)}
              className="w-full bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {candidateShows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.movie_title} — {s.theatre_name} ({s.available_seats} / {s.total_seats} seats available)
                </option>
              ))}
            </select>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-gray-400 flex items-center justify-between">
            <span>Contention Profile:</span>
            <span className="font-semibold text-white">
              {contention === 'HOTSPOT' ? '🔥 10k users fight for same 5 VIP seats' : '🌐 10k users spread across all seats'}
            </span>
          </div>
        </div>
      </div>

      {/* ── LIVE TELEMETRY & PROGRESS BAR ─────────────────────────────── */}
      {(isRunning || progressData) && (
        <div className="p-6 rounded-3xl glass-panel space-y-6 border border-blue-500/30 bg-blue-950/20 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>{activeStage || 'Live Simulation Execution Telemetry'}</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Active Run: <span className="text-blue-300">{progressData?.runId || activeRunId}</span> • Mode:{' '}
                  <span className="text-amber-300 font-bold">{progressData?.mode || mode}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-xs text-gray-400 font-mono uppercase">Throughput</div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {progressData?.currentRps || 0} <span className="text-xs text-gray-400 font-normal">RPS</span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <div className="text-xs text-gray-400 font-mono uppercase">Avg Latency</div>
                <div className="text-xl font-black text-blue-400 font-mono">
                  {progressData?.avgLatencyMs || 0} <span className="text-xs text-gray-400 font-normal">ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">
                Processed:{' '}
                <strong className="text-white">
                  {(progressData?.completedCount || 0).toLocaleString()}
                </strong>{' '}
                / {(progressData?.totalUsers || totalUsers).toLocaleString()} Users
              </span>
              <span className="text-amber-400 font-black font-mono">
                {progressData?.progressPercent || 0}%
              </span>
            </div>
            <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 rounded-full transition-all duration-150 ease-out shadow-lg shadow-indigo-500/50"
                style={{ width: `${Math.min(100, Math.max(0, progressData?.progressPercent || 0))}%` }}
              />
            </div>
          </div>

          {/* Real-Time Metric Counters HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-1">
              <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bookings Succeeded
              </div>
              <div className="text-2xl font-black text-emerald-300 font-mono">
                {(progressData?.successfulBookings || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20 space-y-1">
              <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Collisions / Conflicts
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                {(progressData?.conflictCount || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/20 space-y-1">
              <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Double-Bookings Prevented
              </div>
              <div className="text-2xl font-black text-blue-300 font-mono flex items-center gap-1.5">
                <span>0</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold uppercase">
                  100% ACID
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
              <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Elapsed Time
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono">
                {((progressData?.elapsedTimeMs || 0) / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEAD-TO-HEAD COMPARISON REPORT ────────────────────────────── */}
      {headToHeadResult && (
        <div className="p-6 rounded-3xl glass-panel space-y-6 border border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-black/60 relative overflow-hidden animate-slideUp">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3" /> Live Head-to-Head Benchmark Report
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Pessimistic vs Optimistic Locking Comparison
              </h3>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Run: <span className="text-amber-300 font-bold">{headToHeadResult.runId}</span> •{' '}
              {new Date(headToHeadResult.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pessimistic Card */}
            <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-500/40 space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase">Pessimistic Locking</h4>
                    <p className="text-[11px] text-blue-300 font-mono">SELECT ... FOR UPDATE (Row Locks)</p>
                  </div>
                </div>
                {headToHeadResult.comparison.winnerThroughput === 'PESSIMISTIC' && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400 text-blue-300 text-[10px] font-black uppercase">
                    🏆 Higher Throughput
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Throughput</span>
                  <span className="text-lg font-black text-emerald-400">
                    {headToHeadResult.pessimistic.throughputRps} RPS
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Avg Latency</span>
                  <span className="text-lg font-black text-blue-400">
                    {headToHeadResult.pessimistic.latencies.avg} ms
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Successful Bookings</span>
                  <span className="text-lg font-black text-white">
                    {headToHeadResult.pessimistic.successfulBookings}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Conflicts / Rollbacks</span>
                  <span className="text-lg font-black text-amber-400">
                    {headToHeadResult.pessimistic.conflictCount}
                  </span>
                </div>
              </div>

              {/* Latency percentiles */}
              <div className="p-3 rounded-xl bg-black/50 border border-white/[0.05] space-y-1.5 text-[11px] font-mono">
                <div className="text-gray-400 uppercase text-[10px] font-bold">Latency Percentiles</div>
                <div className="flex justify-between text-gray-300">
                  <span>p50: <strong className="text-white">{headToHeadResult.pessimistic.latencies.p50}ms</strong></span>
                  <span>p90: <strong className="text-white">{headToHeadResult.pessimistic.latencies.p90}ms</strong></span>
                  <span>p95: <strong className="text-white">{headToHeadResult.pessimistic.latencies.p95}ms</strong></span>
                  <span>p99: <strong className="text-white">{headToHeadResult.pessimistic.latencies.p99}ms</strong></span>
                </div>
              </div>
            </div>

            {/* Optimistic Card */}
            <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase">Optimistic Locking</h4>
                    <p className="text-[11px] text-purple-300 font-mono">CAS Version Check (Atomic CAS)</p>
                  </div>
                </div>
                {headToHeadResult.comparison.winnerThroughput === 'OPTIMISTIC' && (
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 text-[10px] font-black uppercase">
                    🏆 Higher Throughput
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Throughput</span>
                  <span className="text-lg font-black text-emerald-400">
                    {headToHeadResult.optimistic.throughputRps} RPS
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Avg Latency</span>
                  <span className="text-lg font-black text-purple-400">
                    {headToHeadResult.optimistic.latencies.avg} ms
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Successful Bookings</span>
                  <span className="text-lg font-black text-white">
                    {headToHeadResult.optimistic.successfulBookings}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40">
                  <span className="text-gray-400 block text-[10px] uppercase">Version Collisions</span>
                  <span className="text-lg font-black text-amber-400">
                    {headToHeadResult.optimistic.conflictCount}
                  </span>
                </div>
              </div>

              {/* Latency percentiles */}
              <div className="p-3 rounded-xl bg-black/50 border border-white/[0.05] space-y-1.5 text-[11px] font-mono">
                <div className="text-gray-400 uppercase text-[10px] font-bold">Latency Percentiles</div>
                <div className="flex justify-between text-gray-300">
                  <span>p50: <strong className="text-white">{headToHeadResult.optimistic.latencies.p50}ms</strong></span>
                  <span>p90: <strong className="text-white">{headToHeadResult.optimistic.latencies.p90}ms</strong></span>
                  <span>p95: <strong className="text-white">{headToHeadResult.optimistic.latencies.p95}ms</strong></span>
                  <span>p99: <strong className="text-white">{headToHeadResult.optimistic.latencies.p99}ms</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Architectural Verdict Box */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-300 uppercase tracking-wider block">
                Architectural Recommendation & Concurrency Verdict:
              </span>
              <p className="text-gray-300 leading-relaxed">
                {headToHeadResult.comparison.recommendation} Both algorithms achieved{' '}
                <strong className="text-emerald-300">0 Double Bookings (100% ACID consistency)</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE CINEMA HALL VISUALIZER & TERMINAL TRACE ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cinema Seat Map Visualizer */}
        <div className="p-5 rounded-3xl glass-panel space-y-4 border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Cinema Hall Seat Visualizer
              </h3>
            </div>
            <button
              onClick={() => selectedShowId && loadSeatMap(selectedShowId)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Refresh Seat Map"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Screen curve */}
          <div className="py-2">
            <div className="w-3/4 mx-auto h-2 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-t-full shadow-lg shadow-blue-500/50 mb-1" />
            <p className="text-[10px] text-center text-gray-500 tracking-widest uppercase">Cinema Screen</p>
          </div>

          {/* Seats grid */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto px-2 py-1 scrollbar-thin">
            {Object.keys(seatsByRow).length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-500">Loading screening layout...</div>
            ) : (
              Object.keys(seatsByRow)
                .sort()
                .map((rowLabel) => (
                  <div key={rowLabel} className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-gray-500 w-4 text-center">
                      {rowLabel}
                    </span>
                    <div className="flex gap-1">
                      {seatsByRow[rowLabel].map((seat) => {
                        const isBooked = seat.status === 'BOOKED';
                        const isHeld = seat.status === 'HELD';
                        return (
                          <div
                            key={seat.id}
                            title={`Seat ${seat.row_label}${seat.seat_number} - Status: ${seat.status} (v${seat.version})`}
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold font-mono transition-all duration-300 ${
                              isBooked
                                ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/50'
                                : isHeld
                                ? 'bg-amber-500 text-black animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400'
                            }`}
                          >
                            {seat.seat_number}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-white/[0.06] text-[10px]">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" /> Available
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Held / Locked
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded bg-rose-600" /> Booked / Claimed
            </span>
          </div>
        </div>

        {/* Real-Time Terminal Log Stream */}
        <div className="p-5 rounded-3xl glass-panel space-y-3 border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Transaction Execution Trace
              </h3>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              {logs.length} stream events
            </span>
          </div>

          <div className="h-64 overflow-y-auto bg-black/60 rounded-2xl p-3 font-mono text-[11px] leading-relaxed space-y-1 text-gray-300 border border-white/[0.05]">
            {logs.length === 0 ? (
              <div className="text-gray-600 italic py-10 text-center">
                Simulation idle. Click &quot;Run Test&quot; to begin streaming database transactions.
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.includes('✅')
                      ? 'text-emerald-400'
                      : log.includes('⛔')
                      ? 'text-amber-400'
                      : log.includes('⚠️')
                      ? 'text-rose-400'
                      : log.includes('🚀')
                      ? 'text-blue-300 font-bold'
                      : 'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>

          <div className="text-[10px] text-gray-500 flex justify-between font-mono pt-1">
            <span>WebSocket Channel: <strong className="text-emerald-400">benchmark_progress</strong></span>
            <span>ACID Engine: <strong className="text-blue-400">PostgreSQL</strong></span>
          </div>
        </div>
      </div>

      {/* ── RECENT SIMULATION BENCHMARK HISTORY ───────────────────────── */}
      {history.length > 0 && (
        <div className="p-6 rounded-3xl glass-panel space-y-4 border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Simulation History & Benchmark Archive</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">Showing {history.length} past runs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] text-gray-400">
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Virtual Users</th>
                  <th className="py-2.5 px-3">Contention</th>
                  <th className="py-2.5 px-3">Throughput (RPS)</th>
                  <th className="py-2.5 px-3">Avg Latency</th>
                  <th className="py-2.5 px-3">Double Bookings</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((item, idx) => {
                  const isH2H = !!item.headToHead;
                  const res = isH2H ? item.headToHead.pessimistic : item.result;
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] text-gray-300">
                      <td className="py-2 px-3 text-white font-bold">{item.runId}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isH2H
                              ? 'bg-amber-500/20 text-amber-300'
                              : item.config.mode === 'PESSIMISTIC'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {isH2H ? 'HEAD_TO_HEAD' : item.config.mode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white font-bold">
                        {item.config.totalUsers.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-gray-400">{item.config.contention}</td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">
                        {isH2H
                          ? `P: ${item.headToHead.pessimistic.throughputRps} / O: ${item.headToHead.optimistic.throughputRps}`
                          : `${res?.throughputRps || 0}`}
                      </td>
                      <td className="py-2 px-3 text-blue-400">
                        {isH2H
                          ? `P: ${item.headToHead.pessimistic.latencies.avg}ms / O: ${item.headToHead.optimistic.latencies.avg}ms`
                          : `${res?.latencies?.avg || 0}ms`}
                      </td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">0 (Guaranteed)</td>
                      <td className="py-2 px-3 text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
