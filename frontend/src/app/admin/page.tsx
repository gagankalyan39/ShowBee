'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adminAPI, theatreAPI, movieAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  ShieldCheck, 
  TrendingUp, 
  Ticket, 
  Users, 
  Film, 
  IndianRupee, 
  Activity, 
  Lock, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Percent, 
  Zap,
  BarChart3,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  ExternalLink,
  Layers,
  MonitorDot,
  Building2,
  Sparkles,
  MapPin,
  Check,
  X,
  RefreshCw,
  Eye,
  Tv,
  Search,
  ArrowUpRight,
  UploadCloud,
  SlidersHorizontal,
  ChevronRight,
  Star,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import AdminBenchmarkLab from '../../components/AdminBenchmarkLab';
import GrafanaLiveDashboard from '../../components/GrafanaLiveDashboard';
import ImageDropzone from '../../components/ImageDropzone';
import GalleryDropzone from '../../components/GalleryDropzone';

export default function AdminDashboardPage() {
  const { user, isAdmin, isLoading: authLoading, login } = useAuth();
  const { socket } = useNotifications();

  // Helper for local date string (YYYY-MM-DD) avoiding UTC drift
  const getLocalDateStr = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [revenueReports, setRevenueReports] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as any) || 'overview';
  const validTabs = ['overview', 'analysis', 'movies', 'shows', 'users', 'benchmark', 'logs', 'grafana'];

  // Tabs: overview, analysis, movies, shows, users, benchmark, logs, grafana
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'movies' | 'shows' | 'users' | 'benchmark' | 'logs' | 'grafana'>(
    validTabs.includes(initialTab) ? initialTab : 'overview'
  );

  // Directly sync activeTab with ?tab= query parameter so show schedule is always directly accessible
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'overview' | 'analysis' | 'movies' | 'shows' | 'users' | 'benchmark' | 'logs' | 'grafana') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Admin Sign In State
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState(false);
  const [quickLoginError, setQuickLoginError] = useState<string | null>(null);
  const [adminLoginForm, setAdminLoginForm] = useState({
    email: 'admin@showbee.com',
    password: 'Admin@123'
  });

  const handleAdminLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const emailToUse = customEmail || adminLoginForm.email;
    const passToUse = customPass || adminLoginForm.password;
    try {
      setIsQuickLoggingIn(true);
      setQuickLoginError(null);
      await login(emailToUse, passToUse);
      showToast('Authenticated as ShowBee Admin!');
    } catch (err: any) {
      setQuickLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  // Movie Management State
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [editingMovie, setEditingMovie] = useState<any | null>(null);
  const [editModalTab, setEditModalTab] = useState<'media' | 'info' | 'gallery'>('media');
  const [isSavingMovie, setIsSavingMovie] = useState(false);
  const [movieSearch, setMovieSearch] = useState('');

  // Shows & Theatres Management State
  const [showsList, setShowsList] = useState<any[]>([]);
  const [theatresList, setTheatresList] = useState<any[]>([]);
  const [showFilterCity, setShowFilterCity] = useState('');
  const [showFilterMovie, setShowFilterMovie] = useState('');
  const [showSortOption, setShowSortOption] = useState<
    'TIME_ASC' | 'TIME_DESC' | 'MOVIE_ASC' | 'MOVIE_DESC' | 'THEATRE_ASC' | 'THEATRE_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'OCCUPANCY_DESC' | 'OCCUPANCY_ASC'
  >('TIME_ASC');
  const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);
  const [isSchedulingShow, setIsSchedulingShow] = useState(false);
  const [isBatchDeletingShows, setIsBatchDeletingShows] = useState(false);
  const [showModalOpen, setShowModalOpen] = useState(false);

  // Multi-theatre batch show creation state
  const [batchMovieId, setBatchMovieId] = useState('');
  const [batchTheatres, setBatchTheatres] = useState<string[]>([]);
  const [batchDates, setBatchDates] = useState<string[]>([getLocalDateStr(0)]);
  const [batchTimes, setBatchTimes] = useState<string[]>(['10:00', '13:30', '16:45', '20:00']);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [customDateInput, setCustomDateInput] = useState('');
  const [tierPrices, setTierPrices] = useState({
    REGULAR: 200,
    PREMIUM: 250,
    VIP: 350,
    RECLINER: 450,
  });
  const [batchPrice, setBatchPrice] = useState(200);
  const [batchFormat, setBatchFormat] = useState('2D');
  const [batchScreenType, setBatchScreenType] = useState('ALL');

  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleShowsUpdated = async (data?: any) => {
      try {
        if (data?.action === 'DELETED' && data?.show_id) {
          setShowsList((prev) => prev.filter((s) => s.id !== data.show_id));
          setSelectedShowIds((prev) => prev.filter((id) => id !== data.show_id));
        } else if (data?.action === 'BATCH_DELETED' && Array.isArray(data?.show_ids)) {
          setShowsList((prev) => prev.filter((s) => !data.show_ids.includes(s.id)));
          setSelectedShowIds((prev) => prev.filter((id) => !data.show_ids.includes(id)));
        }
        const refreshed = await adminAPI.getAllShows({ limit: 500 });
        if (refreshed.success && Array.isArray(refreshed.data)) {
          setShowsList(refreshed.data);
        }
      } catch (e) {
        console.error('Failed to auto-refresh shows:', e);
      }
    };

    const handleOccupancyChanged = async () => {
      try {
        const [refreshedShows, revRes] = await Promise.all([
          adminAPI.getAllShows({ limit: 500 }),
          adminAPI.getRevenueReport()
        ]);
        if (refreshedShows.success && Array.isArray(refreshedShows.data)) {
          setShowsList(refreshedShows.data);
        }
        if (revRes.success && Array.isArray(revRes.data)) {
          setRevenueReports(revRes.data);
        }
      } catch (e) {
        console.error('Failed to auto-refresh live occupancy:', e);
      }
    };

    socket.on('shows_updated', handleShowsUpdated);
    socket.on('seats_held', handleOccupancyChanged);
    socket.on('seats_released', handleOccupancyChanged);
    socket.on('booking_confirmed', handleOccupancyChanged);

    return () => {
      socket.off('shows_updated', handleShowsUpdated);
      socket.off('seats_held', handleOccupancyChanged);
      socket.off('seats_released', handleOccupancyChanged);
      socket.off('booking_confirmed', handleOccupancyChanged);
    };
  }, [socket]);

  const loadData = async (showRefreshIndicator = false) => {
    setApiError(null);
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);

      // Use Promise.allSettled so one failed API call doesn't block the rest
      const [dashRes, usersRes, logsRes, revRes, moviesRes, theatresRes, showsRes] = await Promise.allSettled([
        adminAPI.getDashboard(),
        adminAPI.getUsers(),
        adminAPI.getAuditLogs(),
        adminAPI.getRevenueReport(),
        adminAPI.getMovies({ limit: 100 }),
        theatreAPI.getAll(),
        adminAPI.getAllShows({ limit: 500 })
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.success) setStats(dashRes.value.data);
      else if (dashRes.status === 'rejected') setApiError('Dashboard API notice: ' + dashRes.reason?.message);

      if (usersRes.status === 'fulfilled' && usersRes.value?.success && Array.isArray(usersRes.value.data)) setUsersList(usersRes.value.data);
      if (logsRes.status === 'fulfilled' && logsRes.value?.success && Array.isArray(logsRes.value.data)) setAuditLogs(logsRes.value.data);
      if (revRes.status === 'fulfilled' && revRes.value?.success && Array.isArray(revRes.value.data)) setRevenueReports(revRes.value.data);
      if (moviesRes.status === 'fulfilled' && moviesRes.value?.success && Array.isArray(moviesRes.value.data)) setMoviesList(moviesRes.value.data);
      if (theatresRes.status === 'fulfilled' && theatresRes.value?.success && Array.isArray(theatresRes.value.data)) setTheatresList(theatresRes.value.data);
      if (showsRes.status === 'fulfilled' && showsRes.value?.success && Array.isArray(showsRes.value.data)) setShowsList(showsRes.value.data);

    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setApiError(err.message || 'Failed to connect to backend');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Wait for auth context to finish loading before deciding
    if (authLoading) return;
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, authLoading]);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
      showToast(`User status updated to ${!currentStatus ? 'Active' : 'Disabled'}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  // ──── MOVIE EDITING HANDLERS ──────────────────────────────────────────────────────────────────
  const openEditMovieModal = (movie: any) => {
    setEditingMovie({
      ...movie,
      gallery_images: Array.isArray(movie.images) ? movie.images.map((img: any) => img.url) : [],
    });
    setEditModalTab('media');
  };

  const handleSaveMovie = async () => {
    if (!editingMovie) return;
    try {
      setIsSavingMovie(true);
      const res = await adminAPI.updateMovie(editingMovie.id, {
        title: editingMovie.title,
        synopsis: editingMovie.synopsis,
        director: editingMovie.director,
        writer: editingMovie.writer,
        duration_mins: Number(editingMovie.duration_mins) || 150,
        rating: Number(editingMovie.rating) || 8.0,
        status: editingMovie.status,
        poster_url: editingMovie.poster_url,
        banner_url: editingMovie.banner_url,
        trailer_url: editingMovie.trailer_url,
        is_trending: editingMovie.is_trending,
        is_published: editingMovie.is_published,
        gallery_images: editingMovie.gallery_images,
      });

      if (res.success) {
        showToast(`"${editingMovie.title}" visual media & information updated!`);
        setMoviesList((prev) => prev.map((m) => (m.id === editingMovie.id ? { ...m, ...res.data } : m)));
        setEditingMovie(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save movie media', 'error');
    } finally {
      setIsSavingMovie(false);
    }
  };

  // ──── SHOW SCHEDULING HANDLERS ──────────────────────────────────────────────────────────────
  const handleToggleTheatreSelection = (theatreId: string) => {
    setBatchTheatres((prev) =>
      prev.includes(theatreId) ? prev.filter((id) => id !== theatreId) : [...prev, theatreId]
    );
  };

  const handleSelectAllTheatresForCity = (city: string) => {
    const cityTheatres = (theatresList || []).filter((t) => t?.city?.toLowerCase() === city.toLowerCase()).map((t) => t.id);
    const allSelected = cityTheatres.length > 0 && cityTheatres.every((id) => batchTheatres.includes(id));
    if (allSelected) {
      setBatchTheatres((prev) => prev.filter((id) => !cityTheatres.includes(id)));
    } else {
      setBatchTheatres((prev) => Array.from(new Set([...prev, ...cityTheatres])));
    }
  };

  const handleScheduleBatchShows = async () => {
    if (!batchMovieId) {
      return showToast('Please select a movie for the screening', 'error');
    }
    if (batchTheatres.length === 0) {
      return showToast('Please select at least one theatre', 'error');
    }
    if (batchDates.length === 0 || batchTimes.length === 0) {
      return showToast('Please select at least one date and showtime', 'error');
    }

    try {
      setIsSchedulingShow(true);
      const res = await adminAPI.createShowBatch({
        movie_id: batchMovieId,
        theatre_ids: batchTheatres,
        dates: batchDates,
        times: batchTimes,
        base_price: Number(tierPrices.REGULAR) || Number(batchPrice) || 200,
        tier_prices: tierPrices,
        format: batchFormat,
        screen_type: batchScreenType,
      });

      if (res.success) {
        showToast(res.message);
        setShowModalOpen(false);
        const refreshed = await adminAPI.getAllShows({ limit: 500 });
        if (refreshed.success) setShowsList(refreshed.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule shows', 'error');
    } finally {
      setIsSchedulingShow(false);
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!confirm('Are you sure you want to remove this show and its seat matrix? It will be completely removed.')) {
      return;
    }
    try {
      // Optimistically remove immediately from local state
      setShowsList((prev) => prev.filter((s) => s.id !== showId));
      setSelectedShowIds((prev) => prev.filter((id) => id !== showId));
      
      const res = await adminAPI.deleteShow(showId);
      if (res.success) {
        showToast(res.message);
      } else {
        const refreshed = await adminAPI.getAllShows({ limit: 500 });
        if (refreshed.success) setShowsList(refreshed.data);
        showToast(res.message || 'Failed to remove show', 'error');
      }
    } catch (err: any) {
      const refreshed = await adminAPI.getAllShows({ limit: 500 });
      if (refreshed.success) setShowsList(refreshed.data);
      showToast(err.message || 'Failed to delete show', 'error');
    }
  };

  const handleDeleteShowBatch = async () => {
    if (selectedShowIds.length === 0) return;
    if (!confirm(`Are you sure you want to remove ${selectedShowIds.length} selected show(s)? All associated seat matrices will be completely removed.`)) {
      return;
    }
    const idsToDelete = [...selectedShowIds];
    try {
      setIsBatchDeletingShows(true);
      // Optimistically remove immediately
      setShowsList((prev) => prev.filter((s) => !idsToDelete.includes(s.id)));
      setSelectedShowIds([]);

      const res = await adminAPI.deleteShowsBatch(idsToDelete);
      if (res.success) {
        showToast(res.message);
      } else {
        const refreshed = await adminAPI.getAllShows({ limit: 500 });
        if (refreshed.success) setShowsList(refreshed.data);
        showToast(res.message || 'Failed to remove selected shows', 'error');
      }
    } catch (err: any) {
      const refreshed = await adminAPI.getAllShows({ limit: 500 });
      if (refreshed.success) setShowsList(refreshed.data);
      showToast(err.message || 'Failed to delete selected shows', 'error');
    } finally {
      setIsBatchDeletingShows(false);
    }
  };

  const toggleSelectAllShows = () => {
    const visibleIds = sortedAndFilteredShows.map((s) => s.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedShowIds.includes(id));
    if (allSelected) {
      setSelectedShowIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedShowIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectShow = (id: string) => {
    setSelectedShowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Theatres grouped by city
  const theatresByCity = useMemo(() => {
    const map: Record<string, any[]> = {};
    (theatresList || []).forEach((t) => {
      const city = t?.city || 'Other';
      if (!map[city]) map[city] = [];
      map[city].push(t);
    });
    return map;
  }, [theatresList]);

  // Filtered and Sorted shows with full sorting options
  const sortedAndFilteredShows = useMemo(() => {
    const filtered = (showsList || []).filter((s) => {
      if (showFilterCity && s?.theatre_city?.toLowerCase() !== showFilterCity.toLowerCase()) return false;
      if (showFilterMovie && s?.movie_id !== showFilterMovie) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (showSortOption) {
        case 'TIME_ASC':
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        case 'TIME_DESC':
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        case 'MOVIE_ASC':
          return (a.movie_title || '').localeCompare(b.movie_title || '');
        case 'MOVIE_DESC':
          return (b.movie_title || '').localeCompare(a.movie_title || '');
        case 'THEATRE_ASC':
          return (a.theatre_name || '').localeCompare(b.theatre_name || '');
        case 'THEATRE_DESC':
          return (b.theatre_name || '').localeCompare(a.theatre_name || '');
        case 'PRICE_ASC':
          return Number(a.base_price || 0) - Number(b.base_price || 0);
        case 'PRICE_DESC':
          return Number(b.base_price || 0) - Number(a.base_price || 0);
        case 'OCCUPANCY_DESC':
          return Number(b.booked_seats || 0) - Number(a.booked_seats || 0);
        case 'OCCUPANCY_ASC':
          return Number(b.available_seats || 0) - Number(a.available_seats || 0);
        default:
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
    });
  }, [showsList, showFilterCity, showFilterMovie, showSortOption]);

  // Filtered movies
  const filteredMovies = useMemo(() => {
    if (!movieSearch) return moviesList || [];
    const q = movieSearch.toLowerCase();
    return (moviesList || []).filter((m) => m?.title?.toLowerCase().includes(q) || m?.director?.toLowerCase().includes(q));
  }, [moviesList, movieSearch]);

  // Still loading auth — show spinner so we don't flash the wrong state
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="relative min-h-[75vh] flex items-center justify-center p-4">
        <div className="ambient-glow bg-rose-600/20 w-96 h-96 top-1/4 left-1/3" />
        <div className="ambient-glow bg-purple-600/20 w-96 h-96 bottom-1/4 right-1/3" />
        <div className="max-w-lg w-full p-8 sm:p-10 rounded-3xl glass-panel-elevated text-center space-y-6 border border-rose-500/30 relative z-10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-rose-600/40">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Console Access</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Authenticate as an Administrator to access real-time multiplex analytics, catalog management, media dropzone, and 10k concurrency labs.
            </p>
            {user && !isAdmin && (
              <p className="text-[11px] text-amber-300 mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                ⚠️ Currently signed in as <strong>{user.email}</strong> (Customer Role) — switch to an admin account below.
              </p>
            )}
            {quickLoginError && (
              <p className="text-[11px] text-rose-300 mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />{quickLoginError}</span>
              </p>
            )}
          </div>

          {/* 1-Click Instant Login Button */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleAdminLogin(undefined, 'admin@showbee.com', 'Admin@123')}
              disabled={isQuickLoggingIn}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-rose-600/40 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isQuickLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Entering Operations Suite...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>⚡ 1-Click Instant Sign In as Admin</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-2 text-slate-500 text-[10px] uppercase font-bold">
              <div className="h-px bg-white/10 flex-1" />
              <span>Or Custom Credentials</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <form onSubmit={(e) => handleAdminLogin(e)} className="space-y-3 text-left">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Admin Email</label>
                <input
                  type="email"
                  value={adminLoginForm.email}
                  onChange={(e) => setAdminLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                  placeholder="admin@showbee.com"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Password</label>
                <input
                  type="password"
                  value={adminLoginForm.password}
                  onChange={(e) => setAdminLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isQuickLoggingIn}
                className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
              >
                Sign In
              </button>
            </form>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <Link href="/" className="hover:text-white transition-colors">← Back to ShowBee Cinema</Link>
            <Link href="/auth/login" className="text-rose-400 hover:text-rose-300">Customer Login →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-32 space-y-8">
      {/* Ambient background glows for rich glassmorphism */}
      <div className="ambient-glow bg-rose-600/10 w-[480px] h-[480px] -top-20 -left-20" />
      <div className="ambient-glow bg-purple-600/10 w-[550px] h-[550px] top-40 -right-20" />
      <div className="ambient-glow bg-teal-600/10 w-[420px] h-[420px] bottom-40 left-1/4" />

      {/* Toast Alert */}
      {notificationMsg && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 border ${
          notificationMsg.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 backdrop-blur-2xl shadow-emerald-950/50' 
            : 'bg-rose-950/90 text-rose-200 border-rose-500/40 backdrop-blur-2xl shadow-rose-950/50'
        }`}>
          {notificationMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* ──── TOP HEADER HERO ────────────────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel-elevated space-y-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                SHOWBEE ENTERPRISE OPERATIONS CONSOLE
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold">
                PostgreSQL 15 Connected
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Command &amp; Media Center
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Manage cinema catalog, drag &amp; drop high-resolution movie media, orchestrate multi-theatre showtimes, and monitor real-time platform transactions.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-slate-200 font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Refresh live data from backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Operator</span>
              <span className="text-xs font-semibold text-rose-300">{user?.email || 'admin@showbee.com'}</span>
            </div>
          </div>
        </div>

        {/* ──── SPACIOUS FROSTED GLASS TAB BAR ──────────────────────────────────────── */}
        <div className="pt-2 border-t border-white/[0.08]">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'analysis', label: 'Analytics & Revenue', icon: BarChart3, badge: 'Live' },
              { id: 'movies', label: 'Movies & Media', icon: Film, count: moviesList.length },
              { id: 'shows', label: 'Shows Scheduling', icon: Calendar, count: showsList.length },
              { id: 'users', label: 'User Directory', icon: Users, count: usersList.length },
              { id: 'benchmark', label: '10k Concurrency Lab', icon: Zap, highlight: true },
              { id: 'logs', label: 'Audit Trail', icon: FileText },
              { id: 'grafana', label: 'Grafana Observatory', icon: MonitorDot, badge: 'Live', highlight: true },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`group px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                    isActive
                      ? tab.highlight
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/50 shadow-lg shadow-purple-900/40'
                        : 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/40'
                      : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110 text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider border border-emerald-500/30">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/30 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-300">Backend API Issue</p>
            <p className="text-xs text-amber-400/80 mt-0.5">{apiError}</p>
            <button onClick={() => loadData(true)} className="mt-2 text-[11px] font-bold text-amber-300 hover:text-white underline">Retry Connection →</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">Synchronizing database metrics from PostgreSQL...</p>
          <p className="text-xs text-slate-500">Connecting to backend at localhost:5000...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: OVERVIEW (Spacious & Decongested) */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Stat Cards Grid - High visual impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Revenue */}
                <div className="p-6 rounded-3xl glass-card space-y-3 border-emerald-500/30 relative overflow-hidden group">
                  <div className="ambient-glow bg-emerald-500/10 w-32 h-32 -right-8 -top-8 group-hover:scale-150 transition-transform" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Platform Sales</span>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
                      <IndianRupee className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      ₹{(stats?.revenue?.total || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      PostgreSQL Confirmed Revenue
                    </p>
                  </div>
                </div>

                {/* Total Bookings */}
                <div className="p-6 rounded-3xl glass-card space-y-3 border-rose-500/30 relative overflow-hidden group">
                  <div className="ambient-glow bg-rose-500/10 w-32 h-32 -right-8 -top-8 group-hover:scale-150 transition-transform" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Bookings</span>
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-inner">
                      <Ticket className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {stats?.bookings?.total_bookings || 0}
                    </p>
                    <p className="text-xs text-rose-300 font-semibold mt-1">
                      {stats?.bookings?.confirmed_bookings || 0} Confirmed • {stats?.bookings?.pending_bookings || 0} Pending
                    </p>
                  </div>
                </div>

                {/* Seat Occupancy Rate */}
                <div className="p-6 rounded-3xl glass-card space-y-3 border-purple-500/30 relative overflow-hidden group">
                  <div className="ambient-glow bg-purple-500/10 w-32 h-32 -right-8 -top-8 group-hover:scale-150 transition-transform" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seat Occupancy Rate</span>
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-inner">
                      <Percent className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {stats?.occupancy?.rate_percent || 0}%
                    </p>
                    <p className="text-xs text-purple-300 font-semibold mt-1">
                      {stats?.occupancy?.booked || 0} / {stats?.occupancy?.total || 0} Seats Occupied
                    </p>
                  </div>
                </div>

                {/* Active Movies */}
                <div className="p-6 rounded-3xl glass-card space-y-3 border-cyan-500/30 relative overflow-hidden group">
                  <div className="ambient-glow bg-cyan-500/10 w-32 h-32 -right-8 -top-8 group-hover:scale-150 transition-transform" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cinematic Titles</span>
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
                      <Film className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {moviesList.length || 22}
                    </p>
                    <p className="text-xs text-cyan-300 font-semibold mt-1">
                      {stats?.movies?.now_showing || 18} Now Showing • {theatresList.length} Theatres
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <button
                  onClick={() => handleTabChange('movies')}
                  className="p-6 rounded-3xl glass-card text-left hover:border-rose-500/50 hover:bg-rose-950/20 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Media Management</span>
                    <p className="text-sm font-bold text-white group-hover:text-rose-200 transition-colors">
                      Upload &amp; Drag Movie Images
                    </p>
                    <p className="text-xs text-slate-400">Update posters, banners, and trailer URLs with drag &amp; drop</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-md shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                </button>

                <button
                  onClick={() => handleTabChange('shows')}
                  className="p-6 rounded-3xl glass-card text-left hover:border-purple-500/50 hover:bg-purple-950/20 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Scheduling Hub</span>
                    <p className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                      Multi-Theatre Show Batch
                    </p>
                    <p className="text-xs text-slate-400">Schedule screenings across multiple cities and multiplexes</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-md shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                </button>

                <button
                  onClick={() => handleTabChange('analysis')}
                  className="p-6 rounded-3xl glass-card text-left hover:border-teal-500/50 hover:bg-teal-950/20 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Deep Analytics</span>
                    <p className="text-sm font-bold text-white group-hover:text-teal-200 transition-colors">
                      Commercial Analysis &amp; Revenue
                    </p>
                    <p className="text-xs text-slate-400">Inspect box office breakdown and theatre occupancy rates</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-teal-600/20 text-teal-300 border border-teal-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-md shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </button>
              </div>

              {/* Recent Bookings Table - Spacious & Clear */}
              <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-rose-400" />
                    <span>Recent Platform Transactions</span>
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    Showing latest confirmed bookings
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider text-[11px]">
                        <th className="pb-3.5 font-bold">Booking Ref</th>
                        <th className="pb-3.5 font-bold">Customer</th>
                        <th className="pb-3.5 font-bold">Movie</th>
                        <th className="pb-3.5 font-bold">Show Date &amp; Time</th>
                        <th className="pb-3.5 font-bold">Amount</th>
                        <th className="pb-3.5 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {stats?.recentBookings && stats.recentBookings.length > 0 ? (
                        stats.recentBookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-4 font-mono font-bold text-rose-400">{b.booking_reference}</td>
                            <td className="py-4">
                              <p className="text-white font-semibold">{b.user_name || 'Guest User'}</p>
                              <p className="text-[11px] text-slate-400">{b.user_email}</p>
                            </td>
                            <td className="py-4 text-slate-200 font-semibold">{b.movie_title}</td>
                            <td className="py-4 text-slate-300">
                              {b.start_time ? `${new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                            </td>
                            <td className="py-4 text-white font-bold text-sm">₹{b.total_amount}</td>
                            <td className="py-4 text-right">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  b.status === 'CONFIRMED'
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            No recent transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: DEDICATED ANALYSIS TAB */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'analysis' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Analytical KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-6 rounded-3xl glass-card space-y-2 border-emerald-500/25">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Box Office Sales</span>
                  <p className="text-3xl sm:text-4xl font-black text-emerald-400">₹{(stats?.revenue?.total || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Net across all screens &amp; tiers</p>
                </div>
                <div className="p-6 rounded-3xl glass-card space-y-2 border-purple-500/25">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seat Occupancy</span>
                  <p className="text-3xl sm:text-4xl font-black text-purple-400">{stats?.occupancy?.rate_percent || 0}%</p>
                  <p className="text-xs text-slate-400">{stats?.occupancy?.booked || 0} seats booked / {stats?.occupancy?.total || 0} offered</p>
                </div>
                <div className="p-6 rounded-3xl glass-card space-y-2 border-teal-500/25">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Booking Success Rate</span>
                  <p className="text-3xl sm:text-4xl font-black text-teal-400">
                    {(stats?.bookings?.total_bookings || 0) > 0 
                      ? Math.round(((stats?.bookings?.confirmed_bookings || 0) / (stats?.bookings?.total_bookings || 1)) * 100) 
                      : 0}%
                  </p>
                  <p className="text-xs text-slate-400">{stats?.bookings?.confirmed_bookings || 0} confirmed ticket checkouts</p>
                </div>
                <div className="p-6 rounded-3xl glass-card space-y-2 border-rose-500/25">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multiplex Network</span>
                  <p className="text-3xl sm:text-4xl font-black text-rose-400">{theatresList.length} Theatres</p>
                  <p className="text-xs text-slate-400">Serving Bengaluru, Hyderabad &amp; Chennai</p>
                </div>
              </div>

              {/* Movie Commercial Revenue Breakdown */}
              <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                      <BarChart3 className="w-5 h-5 text-emerald-400" />
                      <span>Movie Commercial Performance &amp; Revenue Leaderboard</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Total gross revenue, unit bookings, and relative box office market share
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold self-start">
                    PostgreSQL Live Aggregation
                  </span>
                </div>

                <div className="space-y-4">
                  {revenueReports && revenueReports.length > 0 ? (
                    revenueReports.map((r, idx) => {
                      const maxRev = Math.max(...revenueReports.map((item) => parseFloat(item.total_revenue) || 1), 1);
                      const rev = parseFloat(r.total_revenue) || 0;
                      const percent = Math.min(Math.round((rev / maxRev) * 100), 100);

                      return (
                        <div key={r.movie_id || idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                              <span className="w-7 text-sm font-mono font-black text-slate-400">
                                #{idx + 1}
                              </span>
                              {r.poster_url ? (
                                <img src={r.poster_url} alt={r.movie_title || 'Movie'} className="w-12 h-16 rounded-xl object-cover shadow-md border border-white/10" />
                              ) : (
                                <div className="w-12 h-16 rounded-xl bg-white/10 flex items-center justify-center text-xs text-slate-400 font-bold border border-white/10">SB</div>
                              )}
                              <div>
                                <p className="text-base font-bold text-white uppercase tracking-wide">{r.movie_title || 'Untitled'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  <span className="text-emerald-400 font-semibold">{r.total_bookings || 0} Bookings</span> • {r.total_tickets_sold || 0} Tickets Issued
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-black text-emerald-400">₹{rev.toLocaleString()}</span>
                              <span className="block text-[11px] text-slate-400">Gross Sales</span>
                            </div>
                          </div>

                          {/* Visual Progress Bar */}
                          <div className="w-full bg-white/[0.06] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-green-400 rounded-full transition-all duration-700 shadow-sm"
                              style={{ width: `${Math.max(percent, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-slate-400 text-xs">
                      No commercial revenue data recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* City Multiplex Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Bengaluru', 'Hyderabad', 'Chennai'].map((city) => {
                  const cityTheatres = (theatresList || []).filter((t) => t?.city?.toLowerCase() === city.toLowerCase());
                  const cityShows = (showsList || []).filter((s) => s?.theatre_city?.toLowerCase() === city.toLowerCase());
                  const cityBooked = cityShows.reduce((sum, s) => sum + (parseInt(s?.booked_seats, 10) || 0), 0);
                  const cityTotal = cityShows.reduce((sum, s) => sum + (parseInt(s?.total_seats, 10) || 0), 0);
                  const occRate = cityTotal > 0 ? Math.round((cityBooked / cityTotal) * 100) : 0;

                  return (
                    <div key={city} className="p-6 rounded-3xl glass-card space-y-4 border-white/[0.08]">
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider border border-rose-500/30">
                          {city}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{cityTheatres.length} Theatres</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-2xl font-black text-white">{cityShows.length} Scheduled Shows</span>
                        <p className="text-xs text-slate-300">{cityBooked} seats booked ({occRate}% occupancy)</p>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-2 pt-3 border-t border-white/[0.06]">
                        {cityTheatres.map((t) => (
                          <li key={t.id} className="flex items-center justify-between">
                            <span className="truncate max-w-[190px] font-medium">{t.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded-md">{t.screen_count || 3} screens</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: MOVIE & MEDIA MANAGEMENT (Upload & Drag Images) */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'movies' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                    <Film className="w-5 h-5 text-rose-500" />
                    <span>Movie Catalog &amp; Visual Media Hub ({moviesList.length} Titles)</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Upload or drag &amp; drop movie posters, widescreen backdrop banners, and gallery stills
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search titles, directors..."
                    value={movieSearch}
                    onChange={(e) => setMovieSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-400 w-64 sm:w-72"
                  />
                </div>
              </div>

              {/* Movies Grid - Wide, spacious cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMovies.map((m) => (
                  <div key={m.id} className="p-6 rounded-3xl glass-card flex flex-col justify-between space-y-5 hover:border-rose-500/40 transition-all group">
                    <div className="flex gap-4">
                      {/* Movie Poster Preview */}
                      <div className="w-24 h-36 rounded-2xl overflow-hidden shrink-0 bg-black/50 border border-white/10 relative shadow-md">
                        {m.poster_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.poster_url}
                            alt={m.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                            No Poster
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            m.status === 'NOW_SHOWING' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {m.status}
                          </span>
                          <span className="text-xs text-amber-400 font-bold"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline mr-1" />{m.rating}</span>
                        </div>
                        <h3 className="text-base font-bold text-white truncate" title={m.title}>{m.title}</h3>
                        <p className="text-xs text-slate-300 truncate">Dir: {m.director || 'N/A'}</p>
                        <p className="text-xs text-slate-400">{m.duration_mins} mins • {m.language || 'Cinema'}</p>
                      </div>
                    </div>

                    {/* Media attachments badge strip */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.06] text-[11px]">
                      <span className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 ${
                        m.poster_url ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-white/5'
                      }`}>
                        🖼️ Poster
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 ${
                        m.banner_url ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-slate-800 text-slate-400 border-white/5'
                      }`}>
                        📺 Banner
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 ${
                        m.trailer_url ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-white/5'
                      }`}>
                        🎬 Trailer
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-white/5 text-slate-400 font-mono text-[10px] ml-auto">
                        {Array.isArray(m.images) ? m.images.length : 0} Stills
                      </span>
                    </div>

                    <button
                      onClick={() => openEditMovieModal(m)}
                      className="w-full py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-rose-600/30"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Visual Media &amp; Details</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* ──── HIGH-END GLASSMORPHIC EDIT MOVIE MODAL ──── */}
              {editingMovie && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
                  <div className="ambient-glow bg-rose-600/20 w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl glass-panel-elevated p-6 sm:p-8 space-y-6 border border-white/20 shadow-2xl relative z-10">
                    
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.1]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                          <Edit3 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">
                            Editing: {editingMovie.title}
                          </h3>
                          <p className="text-xs text-slate-300">
                            Upload or drag images directly, link YouTube trailers, and update film attributes
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingMovie(null)}
                        className="p-2 rounded-2xl bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.12] transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Sub-Tabs */}
                    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] w-fit">
                      <button
                        type="button"
                        onClick={() => setEditModalTab('media')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          editModalTab === 'media'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Poster &amp; Backdrop Banner</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditModalTab('gallery')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          editModalTab === 'gallery'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Gallery Stills ({editingMovie.gallery_images?.length || 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditModalTab('info')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          editModalTab === 'info'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Movie Metadata &amp; Synopsis</span>
                      </button>
                    </div>

                    {/* Sub-Tab 1: Poster & Backdrop Drag & Drop */}
                    {editModalTab === 'media' && (
                      <div className="space-y-6 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
                          {/* Poster Drag & Drop */}
                          <ImageDropzone
                            label="Movie Poster Image"
                            sublabel="Portrait 2:3 aspect ratio — Drag file or enter direct link"
                            value={editingMovie.poster_url || ''}
                            onChange={(url) => setEditingMovie({ ...editingMovie, poster_url: url })}
                            aspectRatio="poster"
                            placeholder="https://... or /movies/poster.jpg"
                          />

                          {/* Banner Backdrop Drag & Drop */}
                          <ImageDropzone
                            label="Backdrop Banner Image"
                            sublabel="Widescreen 16:9 banner — Drag file or enter direct link"
                            value={editingMovie.banner_url || ''}
                            onChange={(url) => setEditingMovie({ ...editingMovie, banner_url: url })}
                            aspectRatio="banner"
                            placeholder="https://... or /movies/banner.jpg"
                          />
                        </div>

                        {/* Trailer Link */}
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                            <Tv className="w-4 h-4 text-rose-400" />
                            <span>YouTube Trailer URL</span>
                          </label>
                          <input
                            type="text"
                            value={editingMovie.trailer_url || ''}
                            onChange={(e) => setEditingMovie({ ...editingMovie, trailer_url: e.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                          />
                          <p className="text-[11px] text-slate-400">
                            Plays in the ShowBee high-definition trailer modal when users click &ldquo;Watch Trailer&rdquo;.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sub-Tab 2: Gallery Stills Dropzone */}
                    {editModalTab === 'gallery' && (
                      <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] animate-in fade-in duration-150">
                        <GalleryDropzone
                          images={editingMovie.gallery_images || []}
                          onChange={(imgs) => setEditingMovie({ ...editingMovie, gallery_images: imgs })}
                        />
                      </div>
                    )}

                    {/* Sub-Tab 3: Metadata & Info */}
                    {editModalTab === 'info' && (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">Movie Title</label>
                            <input
                              type="text"
                              value={editingMovie.title || ''}
                              onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })}
                              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">Status</label>
                            <select
                              value={editingMovie.status || 'NOW_SHOWING'}
                              onChange={(e) => setEditingMovie({ ...editingMovie, status: e.target.value })}
                              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white bg-[#17122a]"
                            >
                              <option value="NOW_SHOWING">NOW_SHOWING</option>
                              <option value="COMING_SOON">COMING_SOON</option>
                              <option value="ENDED">ENDED</option>
                              <option value="DRAFT">DRAFT</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">Rating (0 - 10)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingMovie.rating || ''}
                              onChange={(e) => setEditingMovie({ ...editingMovie, rating: e.target.value })}
                              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">Duration (mins)</label>
                            <input
                              type="number"
                              value={editingMovie.duration_mins || ''}
                              onChange={(e) => setEditingMovie({ ...editingMovie, duration_mins: e.target.value })}
                              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">Director</label>
                            <input
                              type="text"
                              value={editingMovie.director || ''}
                              onChange={(e) => setEditingMovie({ ...editingMovie, director: e.target.value })}
                              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">Synopsis</label>
                          <textarea
                            rows={3}
                            value={editingMovie.synopsis || ''}
                            onChange={(e) => setEditingMovie({ ...editingMovie, synopsis: e.target.value })}
                            className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Modal Footer Controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.1]">
                      <span className="text-xs text-slate-400">
                        Changes will be saved immediately to PostgreSQL.
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingMovie(null)}
                          className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveMovie}
                          disabled={isSavingMovie}
                          className="px-6 py-2.5 rounded-xl brand-btn text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-50"
                        >
                          {isSavingMovie ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Movie Media</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: SHOWS SCHEDULING (Multi-theatre add & remove) */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'shows' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-rose-500" />
                    <span>Cinema Shows &amp; Multi-Theatre Scheduler</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Select multiple multiplexes across cities and batch-create showtimes with row-locked seat matrix
                  </p>
                </div>

                <button
                  onClick={() => setShowModalOpen(true)}
                  className="px-5 py-3 rounded-2xl brand-btn text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 hover:scale-[1.02] transition-transform self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule Shows (Multi-Theatre)</span>
                </button>
              </div>

              {/* Filters & Sorting Bar */}
              <div className="p-4 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  {/* City Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">City:</span>
                    <select
                      value={showFilterCity}
                      onChange={(e) => setShowFilterCity(e.target.value)}
                      className="px-3 py-1.5 rounded-xl glass-input text-white bg-[#18132e]"
                    >
                      <option value="">All Cities</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Chennai">Chennai</option>
                    </select>
                  </div>

                  {/* Movie Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">Movie:</span>
                    <select
                      value={showFilterMovie}
                      onChange={(e) => setShowFilterMovie(e.target.value)}
                      className="px-3 py-1.5 rounded-xl glass-input text-white bg-[#18132e] max-w-xs truncate"
                    >
                      <option value="">All Movies</option>
                      {moviesList.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sort By:</span>
                    </span>
                    <select
                      value={showSortOption}
                      onChange={(e) => setShowSortOption(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl glass-input text-white bg-[#18132e] font-medium"
                    >
                      <option value="TIME_ASC">Date &amp; Time: Earliest First</option>
                      <option value="TIME_DESC">Date &amp; Time: Latest First</option>
                      <option value="MOVIE_ASC">Movie: A → Z</option>
                      <option value="MOVIE_DESC">Movie: Z → A</option>
                      <option value="THEATRE_ASC">Theatre: A → Z</option>
                      <option value="THEATRE_DESC">Theatre: Z → A</option>
                      <option value="PRICE_ASC">Base Price: Low → High</option>
                      <option value="PRICE_DESC">Base Price: High → Low</option>
                      <option value="OCCUPANCY_DESC">Occupancy: Most Booked</option>
                      <option value="OCCUPANCY_ASC">Occupancy: Most Available</option>
                    </select>
                  </div>
                </div>

                {/* Right side stats and bulk delete button */}
                <div className="flex items-center gap-3 ml-auto">
                  {selectedShowIds.length > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                      <span className="text-xs text-rose-300 font-bold bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                        {selectedShowIds.length} selected
                      </span>
                      <button
                        onClick={handleDeleteShowBatch}
                        disabled={isBatchDeletingShows}
                        className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/40 transition-transform active:scale-95 disabled:opacity-50"
                        title="Remove all selected shows"
                      >
                        {isBatchDeletingShows ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Remove Selected ({selectedShowIds.length})</span>
                      </button>
                      <button
                        onClick={() => setSelectedShowIds([])}
                        className="px-2 py-1 text-slate-400 hover:text-white text-xs underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    Showing <strong className="text-white">{sortedAndFilteredShows.length}</strong> scheduled screenings
                  </span>
                </div>
              </div>

              {/* Shows List Table */}
              <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider text-[11px]">
                        <th className="pb-3.5 font-bold w-10">
                          <button
                            onClick={toggleSelectAllShows}
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Select all visible shows"
                          >
                            {sortedAndFilteredShows.length > 0 && sortedAndFilteredShows.every((s) => selectedShowIds.includes(s.id)) ? (
                              <CheckSquare className="w-4 h-4 text-rose-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th 
                          onClick={() => setShowSortOption((curr) => curr === 'MOVIE_ASC' ? 'MOVIE_DESC' : 'MOVIE_ASC')}
                          className="pb-3.5 font-bold cursor-pointer hover:text-white transition-colors select-none"
                        >
                          <span className="inline-flex items-center gap-1">
                            Movie
                            {showSortOption === 'MOVIE_ASC' && <ArrowUp className="w-3 h-3 text-rose-400" />}
                            {showSortOption === 'MOVIE_DESC' && <ArrowDown className="w-3 h-3 text-rose-400" />}
                          </span>
                        </th>
                        <th 
                          onClick={() => setShowSortOption((curr) => curr === 'THEATRE_ASC' ? 'THEATRE_DESC' : 'THEATRE_ASC')}
                          className="pb-3.5 font-bold cursor-pointer hover:text-white transition-colors select-none"
                        >
                          <span className="inline-flex items-center gap-1">
                            Theatre &amp; City
                            {showSortOption === 'THEATRE_ASC' && <ArrowUp className="w-3 h-3 text-rose-400" />}
                            {showSortOption === 'THEATRE_DESC' && <ArrowDown className="w-3 h-3 text-rose-400" />}
                          </span>
                        </th>
                        <th className="pb-3.5 font-bold">Screen</th>
                        <th 
                          onClick={() => setShowSortOption((curr) => curr === 'TIME_ASC' ? 'TIME_DESC' : 'TIME_ASC')}
                          className="pb-3.5 font-bold cursor-pointer hover:text-white transition-colors select-none"
                        >
                          <span className="inline-flex items-center gap-1">
                            Date &amp; Time
                            {showSortOption === 'TIME_ASC' && <ArrowUp className="w-3 h-3 text-rose-400" />}
                            {showSortOption === 'TIME_DESC' && <ArrowDown className="w-3 h-3 text-rose-400" />}
                          </span>
                        </th>
                        <th 
                          onClick={() => setShowSortOption((curr) => curr === 'PRICE_ASC' ? 'PRICE_DESC' : 'PRICE_ASC')}
                          className="pb-3.5 font-bold cursor-pointer hover:text-white transition-colors select-none"
                        >
                          <span className="inline-flex items-center gap-1">
                            Base Price
                            {showSortOption === 'PRICE_ASC' && <ArrowUp className="w-3 h-3 text-rose-400" />}
                            {showSortOption === 'PRICE_DESC' && <ArrowDown className="w-3 h-3 text-rose-400" />}
                          </span>
                        </th>
                        <th 
                          onClick={() => setShowSortOption((curr) => curr === 'OCCUPANCY_DESC' ? 'OCCUPANCY_ASC' : 'OCCUPANCY_DESC')}
                          className="pb-3.5 font-bold cursor-pointer hover:text-white transition-colors select-none"
                        >
                          <span className="inline-flex items-center gap-1">
                            Occupancy
                            {showSortOption === 'OCCUPANCY_DESC' && <ArrowUp className="w-3 h-3 text-rose-400" />}
                            {showSortOption === 'OCCUPANCY_ASC' && <ArrowDown className="w-3 h-3 text-rose-400" />}
                          </span>
                        </th>
                        <th className="pb-3.5 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {sortedAndFilteredShows.length > 0 ? (
                        sortedAndFilteredShows.map((s) => {
                          const isSelected = selectedShowIds.includes(s.id);
                          return (
                            <tr 
                              key={s.id} 
                              className={`transition-colors ${
                                isSelected ? 'bg-rose-500/10 hover:bg-rose-500/15' : 'hover:bg-white/[0.03]'
                              }`}
                            >
                              <td className="py-4">
                                <button
                                  onClick={() => toggleSelectShow(s.id)}
                                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                  title="Select show for batch removal"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-rose-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-500" />
                                  )}
                                </button>
                              </td>
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  {s.poster_url && (
                                    <img src={s.poster_url} alt="" className="w-8 h-11 rounded-lg object-cover shadow" />
                                  )}
                                  <div>
                                    <p className="font-bold text-white uppercase">{s.movie_title}</p>
                                    <span className="text-[10px] text-slate-400">{s.format || '2D'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4">
                                <p className="text-white font-semibold">{s.theatre_name}</p>
                                <span className="text-[10px] text-purple-300 font-bold">{s.theatre_city}</span>
                              </td>
                              <td className="py-4 text-slate-300">
                                {s.screen_name || 'Screen 1'}
                                <span className="block text-[10px] text-slate-400">{s.screen_type}</span>
                              </td>
                              <td className="py-4">
                                <p className="text-white font-semibold">
                                  {new Date(s.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </p>
                                <span className="text-[11px] text-rose-400 font-mono">
                                  {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-4 text-white font-bold text-sm">₹{s.base_price}</td>
                              <td className="py-4">
                                <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                                  {s.booked_seats || 0} booked
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {s.available_seats || 0} available ({s.total_seats || 0} total)
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => handleDeleteShow(s.id)}
                                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
                                  title="Remove this screening"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No shows found matching filters. Click &ldquo;Schedule Shows&rdquo; to add new screenings!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ──── MULTI-THEATRE SCHEDULING MODAL ──── */}
              {showModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
                  <div className="ambient-glow bg-purple-600/20 w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl glass-panel-elevated p-6 sm:p-8 space-y-6 border border-white/20 shadow-2xl relative z-10">
                    
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.1]">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-rose-500" />
                          <span>Schedule Shows Across Multiple Theatres</span>
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Select movie, check multiple multiplexes, dates and timings to auto-generate screenings
                        </p>
                      </div>
                      <button
                        onClick={() => setShowModalOpen(false)}
                        className="p-2 rounded-2xl bg-white/[0.06] text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-6 text-xs">
                      {/* Step 1: Select Movie */}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                          1. Select Movie Title
                        </label>
                        <select
                          value={batchMovieId}
                          onChange={(e) => setBatchMovieId(e.target.value)}
                          className="w-full glass-input px-4 py-3 rounded-xl text-sm text-white font-semibold bg-[#18132e]"
                        >
                          <option value="">-- Choose Movie from Catalog --</option>
                          {moviesList.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title} ({m.duration_mins} mins • {m.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Step 2: Select Multiple Theatres */}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                            2. Select Multiple Theatres ({batchTheatres.length} Selected)
                          </label>
                          <span className="text-[11px] text-rose-400 font-semibold">
                            Choose across Bengaluru, Hyderabad &amp; Chennai
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {Object.keys(theatresByCity).map((city) => (
                            <div key={city} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                                <span className="font-bold text-white text-xs">{city}</span>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllTheatresForCity(city)}
                                  className="text-[10px] text-rose-400 hover:underline font-semibold"
                                >
                                  Toggle All
                                </button>
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {(theatresByCity[city] || []).map((t) => {
                                  const isSelected = batchTheatres.includes(t.id);
                                  return (
                                    <label
                                      key={t.id}
                                      className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-[11px] transition-colors ${
                                        isSelected ? 'bg-rose-600/20 text-white font-semibold border border-rose-500/30' : 'text-slate-300 hover:bg-white/[0.04]'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleTheatreSelection(t.id)}
                                        className="rounded accent-rose-500 w-3.5 h-3.5"
                                      />
                                      <span className="truncate">{t.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step 3: Dates & Showtimes */}
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* 3A: Dates */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                                3. Screening Dates ({batchDates.length} Selected)
                              </label>
                              <span className="text-[10px] text-slate-400">Local Cinema Clock</span>
                            </div>

                            {/* Quick Preset Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: 'Today', val: getLocalDateStr(0) },
                                { label: 'Tomorrow', val: getLocalDateStr(1) },
                                { label: 'Day 3', val: getLocalDateStr(2) },
                                { label: 'Day 4', val: getLocalDateStr(3) },
                              ].map((d) => {
                                const isChecked = batchDates.includes(d.val);
                                return (
                                  <button
                                    type="button"
                                    key={d.val}
                                    onClick={() => {
                                      setBatchDates((prev) =>
                                        isChecked ? prev.filter((x) => x !== d.val) : [...prev, d.val]
                                      );
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                      isChecked
                                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                                    }`}
                                  >
                                    {d.label} ({d.val.slice(5)})
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Date Input */}
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="date"
                                value={customDateInput}
                                onChange={(e) => setCustomDateInput(e.target.value)}
                                className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-[#17122a] border border-white/[0.1]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (customDateInput && !batchDates.includes(customDateInput)) {
                                    setBatchDates((prev) => [...prev, customDateInput]);
                                    setCustomDateInput('');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-colors"
                              >
                                + Add Date
                              </button>
                            </div>

                            {/* Selected Dates Badges */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {batchDates.map((d) => (
                                <span
                                  key={d}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[11px] font-mono text-rose-300"
                                >
                                  {d}
                                  <button
                                    type="button"
                                    onClick={() => setBatchDates((prev) => prev.filter((x) => x !== d))}
                                    className="text-rose-300 hover:text-white"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 3B: Show Timings */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                                4. Show Timings ({batchTimes.length} Selected)
                              </label>
                              <span className="text-[10px] text-slate-400">24-hour / Local</span>
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex flex-wrap gap-1.5">
                              {['10:00', '13:30', '16:45', '20:00', '22:45'].map((t) => {
                                const isChecked = batchTimes.includes(t);
                                return (
                                  <button
                                    type="button"
                                    key={t}
                                    onClick={() => {
                                      setBatchTimes((prev) =>
                                        isChecked ? prev.filter((x) => x !== t) : [...prev, t]
                                      );
                                    }}
                                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold border transition-all ${
                                      isChecked
                                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Time Input */}
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="time"
                                value={customTimeInput}
                                onChange={(e) => setCustomTimeInput(e.target.value)}
                                className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-[#17122a] border border-white/[0.1] font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (customTimeInput && !batchTimes.includes(customTimeInput)) {
                                    setBatchTimes((prev) => [...prev, customTimeInput].sort());
                                    setCustomTimeInput('');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-colors"
                              >
                                + Add Time
                              </button>
                            </div>

                            {/* Selected Times Badges */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {batchTimes.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-[11px] font-mono text-purple-300"
                                >
                                  {t}
                                  <button
                                    type="button"
                                    onClick={() => setBatchTimes((prev) => prev.filter((x) => x !== t))}
                                    className="text-purple-300 hover:text-white"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 4: Seat Tier Pricing (Explicit Admin Controlled Amounts) */}
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <label className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-2">
                              <IndianRupee className="w-4 h-4 text-emerald-400" />
                              <span>5. Seat Tier Pricing &amp; Format (Exact Price Controls)</span>
                            </label>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Admin sets exact ticket prices per tier. No opaque multipliers — what you set here is what users see and pay.
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start font-bold">
                            Direct Tier Allocation
                          </span>
                        </div>

                        {/* 4 Tier Pricing Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* Regular */}
                          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Regular</span>
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">₹</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={tierPrices.REGULAR || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setTierPrices((prev) => ({ ...prev, REGULAR: val === '' ? 0 : Number(val) }));
                                }}
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                                placeholder="200"
                                className="w-full glass-input pl-6 pr-2 py-1.5 rounded-lg text-sm font-bold text-white bg-black/40 border border-emerald-500/40 focus:border-emerald-400 focus:outline-none"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block">Rows A-B (Closest to screen)</span>
                          </div>

                          {/* Premium */}
                          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Premium</span>
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-400">₹</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={tierPrices.PREMIUM || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setTierPrices((prev) => ({ ...prev, PREMIUM: val === '' ? 0 : Number(val) }));
                                }}
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                                placeholder="250"
                                className="w-full glass-input pl-6 pr-2 py-1.5 rounded-lg text-sm font-bold text-white bg-black/40 border border-purple-500/40 focus:border-purple-400 focus:outline-none"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block">Rows C-F (Prime center section)</span>
                          </div>

                          {/* VIP */}
                          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">VIP</span>
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">₹</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={tierPrices.VIP || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setTierPrices((prev) => ({ ...prev, VIP: val === '' ? 0 : Number(val) }));
                                }}
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                                placeholder="350"
                                className="w-full glass-input pl-6 pr-2 py-1.5 rounded-lg text-sm font-bold text-white bg-black/40 border border-amber-500/40 focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block">Rows G-H (Elevated rear VIP)</span>
                          </div>

                          {/* Recliner */}
                          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Recliner</span>
                              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400">₹</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={tierPrices.RECLINER || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setTierPrices((prev) => ({ ...prev, RECLINER: val === '' ? 0 : Number(val) }));
                                }}
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                                placeholder="450"
                                className="w-full glass-input pl-6 pr-2 py-1.5 rounded-lg text-sm font-bold text-white bg-black/40 border border-cyan-500/40 focus:border-cyan-400 focus:outline-none"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block">Rows I-J (Luxury recliners)</span>
                          </div>
                        </div>

                        {/* Format & Screen Type Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
                          <div>
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 block">
                              Screening Format
                            </label>
                            <select
                              value={batchFormat}
                              onChange={(e) => setBatchFormat(e.target.value)}
                              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white bg-[#18132e]"
                            >
                              <option value="2D">2D Standard Cinema</option>
                              <option value="3D">3D Stereoscopic</option>
                              <option value="IMAX">IMAX with Laser</option>
                              <option value="4DX">4DX Motion &amp; Effects</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 block">
                              Target Screens
                            </label>
                            <select
                              value={batchScreenType}
                              onChange={(e) => setBatchScreenType(e.target.value)}
                              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white bg-[#18132e]"
                            >
                              <option value="ALL">All Screens (Primary)</option>
                              <option value="IMAX">IMAX Screens Only</option>
                              <option value="Dolby">Dolby Atmos Screens Only</option>
                              <option value="4DX">4DX Screens Only</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Summary Calculation */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-blue-500/10 border border-rose-500/20 text-rose-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-sm text-white flex items-center gap-2">
                            <span>⚡ Live Batch Generation Preview:</span>
                          </p>
                          <span className="px-3 py-1 rounded-full bg-rose-600/30 text-rose-300 text-xs font-mono font-bold border border-rose-500/40">
                            {batchTheatres.length * batchDates.length * batchTimes.length} Screenings
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {batchTheatres.length} Theatres × {batchDates.length} Dates × {batchTimes.length} Showtimes will be generated in PostgreSQL with real-time WebSocket sync.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Regular: ₹{tierPrices.REGULAR}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Premium: ₹{tierPrices.PREMIUM}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            VIP: ₹{tierPrices.VIP}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Recliner: ₹{tierPrices.RECLINER}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.1]">
                      <button
                        onClick={() => setShowModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-bold hover:bg-white/[0.12] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleScheduleBatchShows}
                        disabled={isSchedulingShow}
                        className="px-6 py-2.5 rounded-xl brand-btn text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSchedulingShow ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Scheduling Shows...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Launch Shows Across Theatres</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: USERS DIRECTORY */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Platform Registered Users ({usersList.length})</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">User authentication directory</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="pb-3.5 font-bold">User</th>
                      <th className="pb-3.5 font-bold">Email</th>
                      <th className="pb-3.5 font-bold">Role</th>
                      <th className="pb-3.5 font-bold">Joined</th>
                      <th className="pb-3.5 font-bold">Status</th>
                      <th className="pb-3.5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-xs uppercase">
                              {u.name?.slice(0, 2) || 'US'}
                            </div>
                            <span className="text-white font-bold">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/10 text-slate-300 border-white/10'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            u.is_active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'
                          }`}>
                            {u.is_active ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                              u.is_active
                                ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 6: 10,000 USER CONCURRENCY LAB */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'benchmark' && (
            <AdminBenchmarkLab />
          )}

          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 7: AUDIT LOGS */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'logs' && (
            <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>System Security &amp; Action Audit Trail</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">Immutable audit logging</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="pb-3.5 font-bold">Timestamp</th>
                      <th className="pb-3.5 font-bold">Action</th>
                      <th className="pb-3.5 font-bold">Entity</th>
                      <th className="pb-3.5 font-bold">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 font-bold text-rose-300">
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-300 font-mono text-[11px]">
                            {log.entity} {log.entity_id ? `(${log.entity_id})` : ''}
                          </td>
                          <td className="py-3.5 text-white font-medium">{log.admin_name || 'System Auto'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB: GRAFANA OBSERVATORY */}
          {/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'grafana' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <GrafanaLiveDashboard />
            </div>
          )}
        </>
      )}

    </div>
  );
}
