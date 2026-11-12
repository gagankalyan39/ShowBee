'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { showAPI, bookingAPI } from '@/lib/api';
import { SeatItem, DetailedShow } from '@/types';
import { SeatMap } from '@/components/SeatMap';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { ArrowLeft, Clock, ShieldCheck, Ticket, AlertCircle, Zap, Lock } from 'lucide-react';

export default function SeatSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params?.id as string;
  const { user } = useAuth();
  const { socket } = useNotifications();

  const [show, setShow] = useState<DetailedShow | null>(null);
  const [rows, setRows] = useState<Record<string, SeatItem[]>>({});
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockMode, setLockMode] = useState<'PESSIMISTIC' | 'OPTIMISTIC'>('PESSIMISTIC');

  // Load seats
  const loadSeatsData = async () => {
    try {
      setIsLoading(true);
      const res = await showAPI.getSeats(showId);
      if (res.success && res.data) {
        setShow(res.data.show);
        setRows(res.data.rows);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load cinema seats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!showId) return;
    loadSeatsData();

    // Socket.IO real-time listener for this show
    if (socket) {
      socket.emit('join_show', showId);

      socket.on('seats_held', (data: any) => {
        if (data.showId === showId) {
          // Update seats locally
          setRows((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((r) => {
              next[r] = next[r].map((seat) =>
                data.seatIds.includes(seat.show_seat_id)
                  ? { ...seat, status: 'HELD' }
                  : seat
              );
            });
            return next;
          });
        }
      });

      socket.on('seats_released', (data: any) => {
        if (data.showId === showId) {
          setRows((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((r) => {
              next[r] = next[r].map((seat) =>
                data.seatIds.includes(seat.seat_id) || data.seatIds.includes(seat.show_seat_id)
                  ? { ...seat, status: 'AVAILABLE' }
                  : seat
              );
            });
            return next;
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_show', showId);
      }
    };
  }, [showId, socket]);

  const isEnded = show ? new Date(show.end_time) <= new Date() : false;

  const toggleSeat = (seat: SeatItem) => {
    if (isEnded) {
      setErrorMessage('This screening has already concluded. Booking is closed.');
      return;
    }
    setErrorMessage(null);
    if (selectedSeats.some((s) => s.show_seat_id === seat.show_seat_id)) {
      setSelectedSeats((prev) => prev.filter((s) => s.show_seat_id !== seat.show_seat_id));
    } else {
      if (selectedSeats.length >= 8) {
        setErrorMessage('You can select a maximum of 8 seats at a time.');
        return;
      }
      setSelectedSeats((prev) => [...prev, seat]);
    }
  };

  const getSeatCategoryLabel = (rowLabel: string) => {
    const row = rowLabel.toUpperCase();
    if (['A', 'B'].includes(row)) return 'Regular';
    if (['C', 'D', 'E', 'F'].includes(row)) return 'Premium';
    if (['G', 'H'].includes(row)) return 'VIP';
    return 'Luxury Recliner';
  };

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedSeats.forEach((seat) => {
      const cat = getSeatCategoryLabel(seat.row_label);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [selectedSeats]);

  const calculateSubtotal = () => {
    return selectedSeats.reduce((sum, s) => sum + parseFloat(s.price as any), 0);
  };

  // HOLD SEATS WITH PESSIMISTIC LOCKING
  const handleProceed = async () => {
    if (isEnded) {
      setErrorMessage('This screening has already concluded. Please select an upcoming screening.');
      return;
    }

    if (!user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (selectedSeats.length === 0) {
      setErrorMessage('Please select at least 1 seat to proceed.');
      return;
    }

    try {
      setIsHolding(true);
      setErrorMessage(null);

      const seatIds = selectedSeats.map((s) => s.show_seat_id);

      // 1. Acquire Lock via selected Concurrency Engine (Pessimistic or Optimistic)
      const holdRes = await showAPI.holdSeats(showId, seatIds, lockMode);

      if (!holdRes.success) {
        throw new Error(holdRes.message || 'Seat lock failed');
      }

      // 2. Create pending booking record
      const bookingRes = await bookingAPI.create({
        showId,
        seatIds,
      });

      if (!bookingRes.success || !bookingRes.data) {
        throw new Error('Failed to create booking transaction');
      }

      // 3. Navigate to mock payment gateway
      router.push(`/booking/payment?bookingId=${bookingRes.data.id}`);
    } catch (err: any) {
      console.error('Seat hold error:', err);
      const isAuthErr = err.message?.includes('token') || err.message?.includes('401') || err.message?.includes('logged in') || err.message?.includes('Unauthorized') || err.message?.includes('No token');
      if (isAuthErr) {
        setErrorMessage('Your login session has expired. Redirecting to sign in to complete your booking...');
        setTimeout(() => {
          router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
        }, 1500);
        return;
      }
      setErrorMessage(err.message || 'Could not hold seats. Another user may have just locked them.');
      loadSeatsData(); // Refresh to show current lock status
    } finally {
      setIsHolding(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-24">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to showtimes
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            {show ? `${show.movie_title} • ${show.theatre_name}` : 'Cinema Seat Selection'}
          </h1>
          {show && (
            <p className="text-xs text-rose-400 mt-0.5">
              {show.screen_name} ({show.screen_type}) • {new Date(show.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Pessimistic vs Optimistic Lock Mode Indicator */}
        {lockMode === 'PESSIMISTIC' ? (
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold shadow-sm shadow-blue-500/10">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Pessimistic: PostgreSQL Row-Lock (SELECT FOR UPDATE)</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold shadow-sm shadow-purple-500/10">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Optimistic: Atomic CAS Versioning (v → v+1)</span>
          </div>
        )}
      </div>

      {/* Concluded Screening Banner */}
      {isEnded && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-white">This screening has already concluded.</p>
              <p className="text-gray-300 mt-0.5">Historical booking data is preserved in PostgreSQL, but booking is now closed. Please choose an upcoming showtime.</p>
            </div>
          </div>
          <button
            onClick={() => router.push(show?.movie_id ? `/movies/${show.movie_id}` : '/')}
            className="px-4 py-2 rounded-xl brand-btn text-white font-bold text-xs shrink-0 whitespace-nowrap shadow-md self-start sm:self-auto"
          >
            View Upcoming Shows
          </button>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Loading seat layout from PostgreSQL...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Seat Map (2 Cols) */}
          <div className="lg:col-span-2">
            <SeatMap
              rows={rows}
              selectedSeats={selectedSeats}
              onToggleSeat={toggleSeat}
              lockMode={lockMode}
            />
          </div>

          {/* Booking Summary Panel (1 Col) */}
          <div className="space-y-4">
            <div className="p-6 rounded-3xl glass-panel space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Ticket className="w-4 h-4 text-rose-400" />
                <span>Selected Seats ({selectedSeats.length})</span>
              </h2>

              {selectedSeats.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">
                  Click on available seats on the map to select your seats.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map((seat) => (
                      <span
                        key={seat.show_seat_id}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                          lockMode === 'OPTIMISTIC'
                            ? 'bg-purple-600/20 border-purple-500/40 text-purple-200'
                            : 'bg-blue-600/20 border-blue-500/40 text-blue-200'
                        }`}
                      >
                        <span className="text-white font-black">{seat.row_label}{seat.seat_number}</span>
                        <span className="font-bold">₹{Math.round(Number(seat.price))}</span>
                        <span className="text-[10px] opacity-75 font-normal">• {getSeatCategoryLabel(seat.row_label)}</span>
                        {lockMode === 'OPTIMISTIC' ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-300 border border-purple-400/40 font-bold">
                            CAS v{seat.version || 1}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-900/90 text-blue-300 border border-blue-400/40 font-bold">
                            🔒 Lock
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="border-t border-white/[0.08] pt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal ({selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'})</span>
                      <span className="font-bold text-white">₹{calculateSubtotal()}</span>
                    </div>
                    {(Object.entries(categoryBreakdown) as [string, number][]).map(([cat, count]) => {
                      const catTotal = selectedSeats
                        .filter((s) => getSeatCategoryLabel(s.row_label) === cat)
                        .reduce((sum, s) => sum + Math.round(Number(s.price)), 0);
                      return (
                        <div key={cat} className="flex justify-between text-gray-400 text-[11px] pl-2 border-l border-white/10">
                          <span>{cat} ({count}x)</span>
                          <span className="font-medium text-gray-300">₹{catTotal}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-gray-400 pt-1">
                      <span>Convenience Fee (incl. GST)</span>
                      <span className="font-semibold text-white">₹30</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.06]">
                      <span>Total Amount</span>
                      <span className="text-rose-400 font-extrabold">₹{calculateSubtotal() + 30}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Concurrency Strategy Comparison Panel */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[11px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Concurrency Engine
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    lockMode === 'OPTIMISTIC' ? 'bg-purple-950 text-purple-300 border border-purple-500/30' : 'bg-blue-950 text-blue-300 border border-blue-500/30'
                  }`}>
                    {lockMode === 'OPTIMISTIC' ? 'Version-CAS Engine' : 'Row-Lock Engine'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLockMode('PESSIMISTIC')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      lockMode === 'PESSIMISTIC'
                        ? 'bg-blue-600/25 border-blue-400 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/60'
                        : 'bg-black/30 border-white/[0.06] text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-300">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Pessimistic</span>
                    </div>
                    <span className="text-[10px] text-gray-300 block mt-1 font-mono">SELECT FOR UPDATE</span>
                    <span className="text-[9px] text-blue-400 block mt-0.5 font-semibold">🔒 Exclusive Lock Pin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLockMode('OPTIMISTIC')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      lockMode === 'OPTIMISTIC'
                        ? 'bg-purple-600/25 border-purple-400 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-400/60'
                        : 'bg-black/30 border-white/[0.06] text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-purple-300">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>Optimistic</span>
                    </div>
                    <span className="text-[10px] text-gray-300 block mt-1 font-mono">Atomic CAS (v + 1)</span>
                    <span className="text-[9px] text-purple-400 block mt-0.5 font-semibold">⚡ Version Counter</span>
                  </button>
                </div>

                {lockMode === 'PESSIMISTIC' ? (
                  <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[10px] text-blue-200/90 space-y-1">
                    <p className="font-bold text-blue-300 flex items-center gap-1">
                      <span>🔒 How Pessimistic Locking Works:</span>
                    </p>
                    <p className="leading-relaxed">
                      Holds an exclusive physical lock on the database row (<code className="text-blue-300 font-mono">SELECT FOR UPDATE</code>). Competing transactions for the same seat are blocked in PostgreSQL FIFO queue until your hold expires or completes.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[10px] text-purple-200/90 space-y-1">
                    <p className="font-bold text-purple-300 flex items-center gap-1">
                      <span>⚡ How Optimistic Locking Works:</span>
                    </p>
                    <p className="leading-relaxed">
                      Zero row locks during selection. Each seat tracks an atomic version (<code className="text-purple-300 font-mono">v1, v2</code>). When checking out, it executes <code className="text-purple-300 font-mono">WHERE id=$id AND version=$v</code>. If another user committed first, version conflict aborts safely.
                    </p>
                  </div>
                )}
              </div>

              {/* Proceed Button */}
              <button
                onClick={handleProceed}
                disabled={selectedSeats.length === 0 || isHolding || isEnded}
                className={`w-full py-3.5 rounded-2xl brand-btn text-white text-xs sm:text-sm font-bold tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 ${
                  selectedSeats.length === 0 || isHolding || isEnded ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
                }`}
              >
                {isEnded ? (
                  <span>Screening Concluded (Booking Closed)</span>
                ) : isHolding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {lockMode === 'PESSIMISTIC'
                        ? 'Acquiring PostgreSQL Row Lock...'
                        : 'Validating Version & Executing CAS...'}
                    </span>
                  </>
                ) : !user ? (
                  <span>Sign In & Proceed (₹{calculateSubtotal() > 0 ? calculateSubtotal() + 30 : 0})</span>
                ) : lockMode === 'PESSIMISTIC' ? (
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    Hold via Row-Lock (₹{calculateSubtotal() > 0 ? calculateSubtotal() + 30 : 0})
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Commit via Atomic CAS (₹{calculateSubtotal() > 0 ? calculateSubtotal() + 30 : 0})
                  </span>
                )}
              </button>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
