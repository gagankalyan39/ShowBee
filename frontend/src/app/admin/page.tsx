'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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
  Zap
} from 'lucide-react';
import AdminBenchmarkLab from '@/components/AdminBenchmarkLab';

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [revenueReports, setRevenueReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'benchmark' | 'overview' | 'users' | 'reports' | 'logs'>('benchmark');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashRes, usersRes, logsRes, revRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getUsers(),
        adminAPI.getAuditLogs(),
        adminAPI.getRevenueReport(),
      ]);

      if (dashRes.success) setStats(dashRes.data);
      if (usersRes.success) setUsersList(usersRes.data);
      if (logsRes.success) setAuditLogs(logsRes.data);
      if (revRes.success) setRevenueReports(revRes.data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl glass-panel text-center space-y-4">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-white uppercase">Admin Portal Restricted</h1>
        <p className="text-xs text-gray-400">
          You must be logged in as an Administrator (e.g. <code className="text-rose-300">admin@showbee.com</code>) to view real-time system metrics.
        </p>
        <Link href="/auth/login" className="inline-block px-6 py-2.5 rounded-full brand-btn text-xs font-bold text-white">
          Login as Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase">
              Member 4 • Admin & Auditing Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-rose-500" />
            <span>ShowBee Management Console</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Live database analytics, transactional audit records, and user management
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] self-start">
          {[
            { id: 'benchmark', label: '⚡ 10k Concurrency Lab', highlight: true },
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Users' },
            { id: 'reports', label: 'Revenue' },
            { id: 'logs', label: 'Audit Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? tab.highlight
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20'
                    : 'bg-rose-600 text-white shadow-md'
                  : tab.highlight
                  ? 'text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Loading live operational statistics from PostgreSQL...</p>
        </div>
      ) : (
        <>
          {/* TAB: 10,000 USERS CONCURRENCY & BENCHMARK LAB */}
          {activeTab === 'benchmark' && (
            <AdminBenchmarkLab />
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-8">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Revenue */}
                <div className="p-5 rounded-3xl glass-card space-y-2 border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Total Revenue</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">
                    ₹{stats.revenue?.total?.toLocaleString() || 0}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-semibold">PostgreSQL Confirmed Payments</p>
                </div>

                {/* Total Bookings */}
                <div className="p-5 rounded-3xl glass-card space-y-2 border-rose-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Total Bookings</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <Ticket className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {stats.bookings?.total_bookings || 0}
                  </p>
                  <p className="text-[11px] text-rose-400 font-semibold">
                    {stats.bookings?.confirmed_bookings || 0} Confirmed • {stats.bookings?.pending_bookings || 0} Pending
                  </p>
                </div>

                {/* Seat Occupancy */}
                <div className="p-5 rounded-3xl glass-card space-y-2 border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Occupancy Rate</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Percent className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {stats.occupancy?.rate_percent || 0}%
                  </p>
                  <p className="text-[11px] text-purple-400 font-semibold">
                    {stats.occupancy?.booked || 0} / {stats.occupancy?.total || 0} Cinema Seats Booked
                  </p>
                </div>

                {/* Movies Count */}
                <div className="p-5 rounded-3xl glass-card space-y-2 border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Active Movies</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Film className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {stats.movies?.total_movies || 22}
                  </p>
                  <p className="text-[11px] text-blue-400 font-semibold">
                    {stats.movies?.now_showing || 0} Now Showing • {stats.movies?.coming_soon || 0} Upcoming
                  </p>
                </div>

              </div>

              {/* Recent Bookings Table */}
              <div className="p-6 rounded-3xl glass-panel space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Recent Customer Transactions</span>
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-gray-400">
                        <th className="pb-3 font-semibold">Booking Ref</th>
                        <th className="pb-3 font-semibold">User</th>
                        <th className="pb-3 font-semibold">Movie</th>
                        <th className="pb-3 font-semibold">Show Date</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {stats.recentBookings && stats.recentBookings.length > 0 ? (
                        stats.recentBookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 font-mono font-bold text-rose-400">{b.booking_reference}</td>
                            <td className="py-3 text-white font-medium">{b.user_name} ({b.user_email})</td>
                            <td className="py-3 text-gray-300 font-semibold">{b.movie_title}</td>
                            <td className="py-3 text-gray-400">{new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="py-3 text-white font-bold">₹{b.total_amount}</td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  b.status === 'CONFIRMED'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-400">
                            No bookings yet. Try booking a ticket from the catalog!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="p-6 rounded-3xl glass-panel space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Registered Users ({usersList.length})</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-gray-400">
                      <th className="pb-3 font-semibold">Name</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">Role</th>
                      <th className="pb-3 font-semibold">Joined</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 text-white font-bold">{u.name}</td>
                        <td className="py-3 text-gray-300">{u.email}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-gray-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {u.is_active ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
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

          {/* TAB 3: REVENUE REPORTS */}
          {activeTab === 'reports' && (
            <div className="p-6 rounded-3xl glass-panel space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <span>Revenue Breakdown by Movie</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-gray-400">
                      <th className="pb-3 font-semibold">Movie</th>
                      <th className="pb-3 font-semibold">Confirmed Bookings</th>
                      <th className="pb-3 font-semibold">Tickets Sold</th>
                      <th className="pb-3 font-semibold">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {revenueReports.map((r) => (
                      <tr key={r.movie_id} className="hover:bg-white/[0.02]">
                        <td className="py-3 font-bold text-white uppercase">{r.movie_title}</td>
                        <td className="py-3 text-gray-300">{r.total_bookings}</td>
                        <td className="py-3 text-gray-300">{r.total_tickets_sold}</td>
                        <td className="py-3 text-emerald-400 font-bold">₹{r.total_revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="p-6 rounded-3xl glass-panel space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>System Security & Action Audit Logs</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-gray-400">
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 font-semibold">Action</th>
                      <th className="pb-3 font-semibold">Entity</th>
                      <th className="pb-3 font-semibold">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 text-gray-400 font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 font-bold text-rose-300">{log.action}</td>
                          <td className="py-2.5 text-gray-300">{log.entity} ({log.entity_id || 'N/A'})</td>
                          <td className="py-2.5 text-white font-medium">{log.admin_name || 'System Auto'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-400">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
