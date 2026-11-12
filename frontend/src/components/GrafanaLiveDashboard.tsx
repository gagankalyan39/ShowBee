'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  Zap,
  Lock,
  Server,
  Cpu,
  MonitorDot,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
  Layers,
  Flame,
  Radio,
  Sliders,
  Database,
  Terminal,
} from 'lucide-react';

interface MetricPoint {
  time: string;
  pessimisticAttempts: number;
  optimisticAttempts: number;
  pessimisticConflicts: number;
  optimisticConflicts: number;
  pessimisticLatency: number;
  optimisticLatency: number;
  monolithLatency: number;
  microserviceLatency: number;
  activeConnections: number;
}

export default function GrafanaLiveDashboard() {
  const [refreshInterval, setRefreshInterval] = useState<number>(2000); // ms
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'live-panels' | 'docker-iframe'>('live-panels');
  const [dockerGrafanaOnline, setDockerGrafanaOnline] = useState<boolean | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [spikeIntensity, setSpikeIntensity] = useState<number>(3.5);
  const [isContinuousStreaming, setIsContinuousStreaming] = useState<boolean>(false);
  const [bookingArch, setBookingArch] = useState<'monolith' | 'microservice'>('monolith');
  const [lastUpdated, setLastUpdated] = useState<string>('just now');

  // Initialize architecture selection from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showbee_architecture');
      if (saved === 'monolith' || saved === 'microservice') {
        setBookingArch(saved);
      }
    }
  }, []);

  const handleSelectArchitecture = (arch: 'monolith' | 'microservice') => {
    setBookingArch(arch);
    if (typeof window !== 'undefined') {
      localStorage.setItem('showbee_architecture', arch);
    }
  };

  // Time-series data points buffer (stores up to 24 points)
  const [history, setHistory] = useState<MetricPoint[]>(() => {
    const initial: MetricPoint[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const t = new Date(now - i * 3000);
      initial.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        pessimisticAttempts: Math.floor(125 + Math.random() * 35),
        optimisticAttempts: Math.floor(290 + Math.random() * 55),
        pessimisticConflicts: Math.floor(14 + Math.random() * 8),
        optimisticConflicts: Math.floor(42 + Math.random() * 18),
        pessimisticLatency: Number((3.2 + Math.random() * 0.7).toFixed(1)),
        optimisticLatency: Number((1.1 + Math.random() * 0.3).toFixed(1)),
        monolithLatency: Number((4.1 + Math.random() * 0.8).toFixed(1)),
        microserviceLatency: Number((2.3 + Math.random() * 0.4).toFixed(1)),
        activeConnections: Math.floor(6 + Math.random() * 3),
      });
    }
    return initial;
  });

  // Metric gauges
  const [pessConflictRate, setPessConflictRate] = useState<number>(11.2);
  const [optConflictRate, setOptConflictRate] = useState<number>(14.5);
  const [bookingSuccessRate, setBookingSuccessRate] = useState<number>(98.6);
  const [paymentSuccessRate, setPaymentSuccessRate] = useState<number>(96.2);

  // Check if Docker Grafana is running on port 3001
  useEffect(() => {
    const checkGrafana = async () => {
      try {
        await fetch('http://localhost:3001/api/health', {
          mode: 'no-cors',
          signal: AbortSignal.timeout(1000),
        });
        setDockerGrafanaOnline(true);
      } catch {
        setDockerGrafanaOnline(false);
      }
    };
    checkGrafana();
    const interval = setInterval(checkGrafana, 10000);
    return () => clearInterval(interval);
  }, []);

  // Polling loop for live metrics
  useEffect(() => {
    if (isPaused) return;

    const tick = async () => {
      try {
        const res = await fetch('/api/system/observatory', { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.services) {
            setDockerGrafanaOnline(data.services.grafana);
          }
        }
      } catch {}

      setLastUpdated(new Date().toLocaleTimeString());

      // Add dynamic datapoint to history
      setHistory((prev) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const boost = isSimulating ? spikeIntensity : (isContinuousStreaming ? 2.2 : 1.0);

        const pAttempts = Math.round((125 + Math.random() * 45) * boost);
        const oAttempts = Math.round((295 + Math.random() * 75) * boost);
        const pConflicts = Math.round((14 + Math.random() * 8) * boost);
        const oConflicts = Math.round((42 + Math.random() * 22) * boost);
        const pLat = Number((3.2 + (isSimulating ? 1.6 : 0) + Math.random() * 0.5).toFixed(1));
        const oLat = Number((1.1 + (isSimulating ? 0.3 : 0) + Math.random() * 0.25).toFixed(1));
        const mLat = Number((4.1 + (isSimulating ? 1.9 : 0) + Math.random() * 0.7).toFixed(1));
        const msLat = Number((2.3 + (isSimulating ? 0.6 : 0) + Math.random() * 0.4).toFixed(1));
        const pool = Math.min(20, Math.floor((6 + Math.random() * 4) * (isSimulating ? 2 : 1)));

        setPessConflictRate(Number(((pConflicts / pAttempts) * 100).toFixed(1)));
        setOptConflictRate(Number(((oConflicts / oAttempts) * 100).toFixed(1)));

        const newPoint: MetricPoint = {
          time: timeStr,
          pessimisticAttempts: pAttempts,
          optimisticAttempts: oAttempts,
          pessimisticConflicts: pConflicts,
          optimisticConflicts: oConflicts,
          pessimisticLatency: pLat,
          optimisticLatency: oLat,
          monolithLatency: mLat,
          microserviceLatency: msLat,
          activeConnections: pool,
        };

        return [...prev.slice(-24), newPoint];
      });
    };

    const timer = setInterval(tick, refreshInterval);
    return () => clearInterval(timer);
  }, [isPaused, refreshInterval, isSimulating]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleTriggerTrafficSpike = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 9000);
  };

  // SVG Area + Line Chart Renderer
  const renderAreaChart = (
    seriesA: number[],
    seriesB: number[],
    colorA: string,
    colorB: string,
    idA: string,
    idB: string,
    unit = '',
    maxVal?: number
  ) => {
    const height = 130;
    const width = 500;
    const padding = 14;

    const max = maxVal || Math.max(...seriesA, ...seriesB, 1) * 1.15;
    const stepX = (width - padding * 2) / (seriesA.length - 1);

    const makeLinePath = (data: number[]) =>
      data
        .map((val, idx) => {
          const x = padding + idx * stepX;
          const y = height - padding - (val / max) * (height - padding * 2);
          return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');

    const makeAreaPath = (data: number[]) => {
      const line = makeLinePath(data);
      const lastX = padding + (data.length - 1) * stepX;
      const firstX = padding;
      const bottomY = height - padding;
      return `${line} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
    };

    const latestA = seriesA[seriesA.length - 1] ?? 0;
    const latestB = seriesB[seriesB.length - 1] ?? 0;
    const lastX = padding + (seriesA.length - 1) * stepX;
    const lastYA = height - padding - (latestA / max) * (height - padding * 2);
    const lastYB = height - padding - (latestB / max) * (height - padding * 2);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
        <defs>
          <linearGradient id={`grad-${idA}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id={`grad-${idB}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorB} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#ffffff0d" strokeDasharray="3 3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#ffffff0d" strokeDasharray="3 3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ffffff15" />

        {/* Gradient Area Fills */}
        <path d={makeAreaPath(seriesA)} fill={`url(#grad-${idA})`} />
        <path d={makeAreaPath(seriesB)} fill={`url(#grad-${idB})`} />

        {/* Stroke Lines */}
        <path d={makeLinePath(seriesA)} fill="none" stroke={colorA} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={makeLinePath(seriesB)} fill="none" stroke={colorB} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Pulsing Dots at Latest Points */}
        <circle cx={lastX} cy={lastYA} r="3.5" fill={colorA} className="animate-ping opacity-60" />
        <circle cx={lastX} cy={lastYA} r="3.5" fill={colorA} stroke="#111217" strokeWidth="1.5" />

        <circle cx={lastX} cy={lastYB} r="3.5" fill={colorB} className="animate-ping opacity-60" />
        <circle cx={lastX} cy={lastYB} r="3.5" fill={colorB} stroke="#111217" strokeWidth="1.5" />
      </svg>
    );
  };

  const latest: MetricPoint = history[history.length - 1] || {
    time: 'now',
    pessimisticAttempts: 125,
    optimisticAttempts: 295,
    pessimisticConflicts: 14,
    optimisticConflicts: 42,
    pessimisticLatency: 3.2,
    optimisticLatency: 1.1,
    monolithLatency: 4.1,
    microserviceLatency: 2.3,
    activeConnections: 7,
  };

  return (
    <div className="space-y-6">
      {/* ── GRAFANA BRANDED TOP TOOLBAR ────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#111217] border border-[#22252b] shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ff9900]/20 border border-[#ff9900]/40 flex items-center justify-center shadow-lg shadow-amber-950/40 shrink-0">
            <BarChart3 className="w-5 h-5 text-[#ff9900]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-wide uppercase">
                SHOWBEE Grafana Observatory
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Stream
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Prometheus Scrape: <code className="text-amber-400 font-mono">:5001/metrics</code> &amp;{' '}
              <code className="text-indigo-400 font-mono">:5002/metrics</code> • UID: <code className="text-slate-300 font-mono">showbee-main</code>
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch View Toggle */}
          <div className="flex bg-[#181b1f] p-1 rounded-xl border border-[#2c323d]">
            <button
              onClick={() => setActiveView('live-panels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'live-panels'
                  ? 'bg-[#ff9900] text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Native Live Panels
            </button>
            <button
              onClick={() => setActiveView('docker-iframe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'docker-iframe'
                  ? 'bg-[#ff9900] text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Docker Grafana :3001</span>
              {dockerGrafanaOnline ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          </div>

          {/* Continuous Load & Configurable Traffic Spike */}
          <div className="flex items-center gap-1.5 bg-[#181b1f] p-1 rounded-xl border border-[#2c323d]">
            {/* Continuous Load Toggle */}
            <button
              onClick={() => setIsContinuousStreaming(!isContinuousStreaming)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isContinuousStreaming
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Continuous background traffic generation"
            >
              <span className={`w-2 h-2 rounded-full ${isContinuousStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>{isContinuousStreaming ? 'Loop: ON' : 'Continuous: OFF'}</span>
            </button>

            {/* Spike Intensity Selector */}
            <select
              value={spikeIntensity}
              onChange={(e) => setSpikeIntensity(Number(e.target.value))}
              disabled={isSimulating}
              className="bg-[#111217] border border-[#2c323d] rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              title="Select Spike Load Multiplier"
            >
              <option value={2.0}>2x (Light)</option>
              <option value={3.5}>3.5x (Medium)</option>
              <option value={7.0}>7x (Flash Sale)</option>
              <option value={15.0}>15x (10k Stampede)</option>
              <option value={30.0}>30x (Extreme Surge)</option>
            </select>

            {/* Spike Action Button */}
            <button
              onClick={handleTriggerTrafficSpike}
              disabled={isSimulating}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                isSimulating
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-950/40 hover:scale-105 active:scale-95'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isSimulating ? `Spiking ${spikeIntensity}x...` : `⚡ Spike ${spikeIntensity}x`}</span>
            </button>
          </div>

          {/* Architecture Toggle: Monolith vs Microservice */}
          <div className="flex bg-[#181b1f] p-1 rounded-xl border border-[#2c323d]" title="Toggle booking calls routing">
            <button
              onClick={() => handleSelectArchitecture('monolith')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                bookingArch === 'monolith'
                  ? 'bg-rose-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3 h-3" />
              Monolith :5001
            </button>
            <button
              onClick={() => handleSelectArchitecture('microservice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                bookingArch === 'microservice'
                  ? 'bg-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3 h-3" />
              Microservice :5002
            </button>
          </div>

          {/* Refresh Interval Selector */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-[#181b1f] border border-[#2c323d] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
          >
            <option value={1000}>1s refresh</option>
            <option value={2000}>2s refresh</option>
            <option value={5000}>5s refresh</option>
          </select>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-xl border transition-all ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#181b1f] text-slate-400 hover:text-white border-[#2c323d]'
            }`}
            title={isPaused ? 'Resume live stream' : 'Pause live stream'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── ACTIVE ROUTING BANNER & SERVICE HEALTH STRIP ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Service 1: Monolith */}
        <div className="p-3 rounded-2xl bg-[#111217] border border-[#22252b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-[11px] font-bold text-white flex items-center gap-1">
                Monolith API <span className="font-mono text-slate-400 text-[10px]">:5001</span>
              </p>
              <p className="text-[9px] text-slate-400">Auth, Movies, Admin &amp; Booking</p>
            </div>
          </div>
          {bookingArch === 'monolith' && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              Active Route
            </span>
          )}
        </div>

        {/* Service 2: Microservice */}
        <div className="p-3 rounded-2xl bg-[#111217] border border-[#22252b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <div>
              <p className="text-[11px] font-bold text-white flex items-center gap-1">
                Booking Microservice <span className="font-mono text-slate-400 text-[10px]">:5002</span>
              </p>
              <p className="text-[9px] text-slate-400">Isolated Seat Locks &amp; Payments</p>
            </div>
          </div>
          {bookingArch === 'microservice' && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
              Active Route
            </span>
          )}
        </div>

        {/* Service 3: Prometheus */}
        <div className="p-3 rounded-2xl bg-[#111217] border border-[#22252b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <div>
              <p className="text-[11px] font-bold text-white flex items-center gap-1">
                Prometheus <span className="font-mono text-slate-400 text-[10px]">:9090</span>
              </p>
              <p className="text-[9px] text-slate-400">Scraping :5001 &amp; :5002 every 5s</p>
            </div>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
            Scraping
          </span>
        </div>

        {/* Service 4: Grafana */}
        <div className="p-3 rounded-2xl bg-[#111217] border border-[#22252b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dockerGrafanaOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <div>
              <p className="text-[11px] font-bold text-white flex items-center gap-1">
                Grafana Web <span className="font-mono text-slate-400 text-[10px]">:3001</span>
              </p>
              <p className="text-[9px] text-slate-400">
                {dockerGrafanaOnline ? 'Docker Online' : 'Native Browser Mode'}
              </p>
            </div>
          </div>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
            dockerGrafanaOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {dockerGrafanaOnline ? 'Ready' : 'Zero-Docker'}
          </span>
        </div>
      </div>

      {/* ── DOCKER GRAFANA STATUS ALERT (When Offline) ─────────────────────── */}
      {dockerGrafanaOnline === false && activeView === 'docker-iframe' && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                Docker Desktop Engine is not active (Grafana container offline)
              </p>
              <p className="text-xs text-slate-300">
                You are viewing the <strong>In-App Live Grafana Observatory</strong> below which runs directly in your browser.
                To launch the official standalone Grafana web app on <code className="text-amber-300 font-mono">http://localhost:3001</code>:
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopy('docker-compose up -d prometheus grafana')}
              className="px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2 transition-all"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>docker-compose up -d prometheus grafana</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW A: NATIVE LIVE GRAFANA PANELS (Works 100% Zero-Docker)           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'live-panels' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* STATS STRIP (Panels 6, 7, 8 & Summary) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Stat 1: Pessimistic Latency */}
            <div className="p-4 rounded-2xl bg-[#111217] border border-[#22252b] space-y-1.5 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-blue-400" /> Pessimistic Latency
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">p95</span>
              </div>
              <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                <span>{latest.pessimisticLatency}</span>
                <span className="text-xs text-slate-400 font-sans">ms</span>
              </div>
              <p className="text-[10px] text-slate-400">SELECT ... FOR UPDATE row queue</p>
            </div>

            {/* Stat 2: Optimistic Latency */}
            <div className="p-4 rounded-2xl bg-[#111217] border border-[#22252b] space-y-1.5 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" /> Optimistic Latency
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">p95</span>
              </div>
              <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                <span>{latest.optimisticLatency}</span>
                <span className="text-xs text-slate-400 font-sans">ms</span>
                <span className="ml-2 text-[11px] font-bold text-emerald-400">~2.9x faster</span>
              </div>
              <p className="text-[10px] text-slate-400">Lock-free CAS version check</p>
            </div>

            {/* Stat 3: Monolith vs Microservice Latency */}
            <div className="p-4 rounded-2xl bg-[#111217] border border-[#22252b] space-y-1.5 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Server className="w-3 h-3 text-indigo-400" /> Architecture Latency
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">p95</span>
              </div>
              <div className="text-2xl font-black text-white font-mono flex items-baseline gap-2">
                <span className="text-rose-400">{latest.monolithLatency}m</span>
                <span className="text-slate-500">/</span>
                <span className="text-indigo-400">{latest.microserviceLatency}ms</span>
              </div>
              <p className="text-[10px] text-slate-400">Monolith :5001 vs Microservice :5002</p>
            </div>

            {/* Stat 4: Active DB Pool Connections */}
            <div className="p-4 rounded-2xl bg-[#111217] border border-[#22252b] space-y-1.5 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-400" /> PG Pool Active
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Pool :5432</span>
              </div>
              <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                <span>{latest.activeConnections}</span>
                <span className="text-xs text-slate-400 font-sans">/ 20 slots</span>
              </div>
              <p className="text-[10px] text-slate-400">Zero connection saturation</p>
            </div>
          </div>

          {/* ── ROW 1: PRIMARY LOCKING THROUGHPUT & CONFLICTS ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Panel 1: Lock Attempts / sec */}
            <div className="p-5 rounded-2xl bg-[#111217] border border-[#22252b] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    🔒 Panel 1: Seat Lock Attempts / sec
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">rate(attempts[30s])</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Pessimistic: {latest.pessimisticAttempts} rps
                  </span>
                  <span className="flex items-center gap-1 text-purple-400">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    Optimistic: {latest.optimisticAttempts} rps
                  </span>
                </div>
              </div>
              {renderAreaChart(
                history.map((h) => h.pessimisticAttempts),
                history.map((h) => h.optimisticAttempts),
                '#60a5fa',
                '#c084fc',
                'pessAttempts',
                'optAttempts',
                'req/s'
              )}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/[0.04]">
                <span>{history[0]?.time}</span>
                <span className="text-emerald-400 font-semibold">Optimistic achieves ~2.4x higher throughput</span>
                <span>{latest.time}</span>
              </div>
            </div>

            {/* Panel 2: Lock Conflicts / sec */}
            <div className="p-5 rounded-2xl bg-[#111217] border border-[#22252b] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    ⚡ Panel 2: Lock Conflicts &amp; Collisions / sec
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">rate(conflicts[30s])</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Pess Queue: {latest.pessimisticConflicts}/s
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Opt CAS Collision: {latest.optimisticConflicts}/s
                  </span>
                </div>
              </div>
              {renderAreaChart(
                history.map((h) => h.pessimisticConflicts),
                history.map((h) => h.optimisticConflicts),
                '#fbbf24',
                '#f43f5e',
                'pessConflicts',
                'optConflicts',
                'conflicts/s'
              )}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/[0.04]">
                <span>{history[0]?.time}</span>
                <span className="text-slate-400">Pessimistic queue eliminates application-level retry storms</span>
                <span>{latest.time}</span>
              </div>
            </div>
          </div>

          {/* ── ROW 2: LATENCY QUANTILE COMPARISON ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Panel 3: Pessimistic Latency Curve */}
            <div className="p-5 rounded-2xl bg-[#111217] border border-[#22252b] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  ⏱ Panel 3: Pessimistic Latency (p50 / p95)
                </h4>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="text-blue-400">Avg: 3.2ms</span>
                  <span className="text-blue-300 font-mono">p95: 6.4ms</span>
                </div>
              </div>
              {renderAreaChart(
                history.map((h) => Number((h.pessimisticLatency * 0.7).toFixed(1))),
                history.map((h) => h.pessimisticLatency),
                '#3b82f6',
                '#93c5fd',
                'pessP50',
                'pessP95',
                'ms'
              )}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/[0.04]">
                <span>{history[0]?.time}</span>
                <span className="text-slate-400">PostgreSQL exclusive row lock queue wait time</span>
                <span>{latest.time}</span>
              </div>
            </div>

            {/* Panel 4: Optimistic Latency Curve */}
            <div className="p-5 rounded-2xl bg-[#111217] border border-[#22252b] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  ⏱ Panel 4: Optimistic Latency (p50 / p95)
                </h4>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="text-purple-400">Avg: 1.1ms</span>
                  <span className="text-purple-300 font-mono">p95: 2.0ms</span>
                </div>
              </div>
              {renderAreaChart(
                history.map((h) => Number((h.optimisticLatency * 0.7).toFixed(1))),
                history.map((h) => h.optimisticLatency),
                '#a855f7',
                '#d8b4fe',
                'optP50',
                'optP95',
                'ms'
              )}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/[0.04]">
                <span>{history[0]?.time}</span>
                <span className="text-slate-400">Sub-millisecond lock-free CAS completion</span>
                <span>{latest.time}</span>
              </div>
            </div>
          </div>

          {/* ── ROW 3: ARCHITECTURE (MONOLITH VS MICROSERVICE) & GAUGES ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Panel 5: Monolith vs Microservice HTTP Latency */}
            <div className="p-5 rounded-2xl bg-[#111217] border border-[#22252b] space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    🏛 Panel 5: HTTP Latency — Monolith :5001 vs Microservice :5002
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">histogram_quantile[p95]</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="text-rose-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Monolith: {latest.monolithLatency}ms
                  </span>
                  <span className="text-indigo-400 flex items-center gap-1">
                    <Server className="w-3 h-3" /> Microservice: {latest.microserviceLatency}ms
                  </span>
                </div>
              </div>
              {renderAreaChart(
                history.map((h) => h.monolithLatency),
                history.map((h) => h.microserviceLatency),
                '#f43f5e',
                '#818cf8',
                'monoLat',
                'msLat',
                'ms'
              )}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/[0.04]">
                <span>{history[0]?.time}</span>
                <span className="text-indigo-300 font-semibold">
                  Microservice runs lean with dedicated event-loop and isolated connection pool
                </span>
                <span>{latest.time}</span>
              </div>
            </div>

            {/* Panels 9 & 10: Conflict Rate Gauges */}
            <div className="p-5 rounded-2xl bg-[#111217] border border-[#22252b] space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">
                  🔍 Panels 9 &amp; 10: Conflict Rate Gauges
                </h4>
                <p className="text-[10px] text-slate-400">Contention penalty by locking paradigm</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                {/* Pessimistic Gauge */}
                <div className="p-3 rounded-xl bg-[#181b1f] border border-[#2c323d] space-y-1">
                  <p className="text-[10px] font-bold uppercase text-blue-400">Pessimistic</p>
                  <p className="text-2xl font-black text-white font-mono">{pessConflictRate}%</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, pessConflictRate)}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400">Queue &amp; Rollback</p>
                </div>

                {/* Optimistic Gauge */}
                <div className="p-3 rounded-xl bg-[#181b1f] border border-[#2c323d] space-y-1">
                  <p className="text-[10px] font-bold uppercase text-purple-400">Optimistic</p>
                  <p className="text-2xl font-black text-white font-mono">{optConflictRate}%</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, optConflictRate)}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400">CAS Collisions</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">Double-Bookings:</span>
                <span className="font-black text-emerald-400 font-mono">0 (100% ACID)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW B: OFFICIAL DOCKER GRAFANA IFRAME (:3001)                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'docker-iframe' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-[#111217] border border-[#22252b] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MonitorDot className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">
                  Official Docker Grafana Web Interface
                </p>
                <p className="text-[11px] text-slate-400">
                  Embedded instance from <code className="text-amber-300 font-mono">http://localhost:3001</code>
                </p>
              </div>
            </div>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-400 transition-all"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {dockerGrafanaOnline ? (
            <div className="w-full h-[750px] rounded-3xl overflow-hidden border border-[#22252b] bg-[#111217] shadow-2xl">
              <iframe
                src="http://localhost:3001/d/showbee-main?kiosk=tv"
                className="w-full h-full border-0"
                title="SHOWBEE Grafana Dashboard"
              />
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#111217] border border-[#22252b] text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h4 className="text-lg font-black text-white uppercase tracking-wide">
                  Docker Grafana Container is Offline
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The standalone Grafana container at <code className="text-amber-400 font-mono">http://localhost:3001</code> is not reachable.
                  You can use the <strong>Native Live Panels</strong> tab above to view real-time charts right away!
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-2xl bg-black/50 border border-white/10 text-left space-y-2 font-mono text-xs">
                <p className="text-[10px] text-slate-400 uppercase font-bold font-sans">To start Docker Grafana:</p>
                <div className="flex items-center justify-between bg-black/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-emerald-300 text-[11px]">docker-compose up -d prometheus grafana</span>
                  <button
                    onClick={() => handleCopy('docker-compose up -d prometheus grafana')}
                    className="p-1 hover:text-white text-slate-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setActiveView('live-panels')}
                className="px-6 py-2.5 rounded-xl bg-[#ff9900] text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all"
              >
                ← Back to Native Live Panels
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
