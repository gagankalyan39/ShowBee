'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingAPI } from '@/lib/api';
import { Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Ticket, Calendar, Clock, MapPin, QrCode, ArrowLeft, AlertCircle } from 'lucide-react';
import { QRCodeTicket } from '@/components/QRCodeTicket';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Booking | null>(null);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const res = await bookingAPI.getMyBookings();
      if (res.success && res.data) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error('Failed to load user bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBookings();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Reserved seats will be released.')) return;
    try {
      await bookingAPI.cancel(bookingId);
      alert('Booking cancelled successfully and seats released.');
      loadBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl glass-panel text-center space-y-4">
        <Ticket className="w-12 h-12 text-rose-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">Sign in to view your bookings</h1>
        <p className="text-xs text-gray-400">Access all your digital movie tickets, QR passes, and booking history.</p>
        <Link href="/auth/login" className="inline-block px-6 py-2.5 rounded-full brand-btn text-xs font-bold text-white">
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-rose-500" />
            <span>My Cinema Bookings</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Logged in as <strong>{user.email}</strong>
          </p>
        </div>

        <Link href="/" className="px-4 py-2 rounded-full glass-card text-xs font-semibold text-gray-300 hover:text-white">
          Explore Movies
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Retrieving your bookings from PostgreSQL...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-16 text-center rounded-3xl glass-panel space-y-3">
          <Ticket className="w-10 h-10 text-gray-500 mx-auto" />
          <p className="text-sm font-bold text-gray-300">You haven&apos;t booked any tickets yet.</p>
          <Link href="/" className="inline-block px-5 py-2 rounded-full brand-btn text-xs font-bold text-white mt-2">
            Book Your First Movie
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-5 sm:p-6 rounded-3xl glass-panel hover:border-rose-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Left Details */}
              <div className="flex gap-4 items-center">
                {b.poster_url && (
                  <img
                    src={b.poster_url}
                    alt={b.movie_title || 'Movie'}
                    className="w-16 h-24 object-cover rounded-xl border border-white/10 shadow-md shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white uppercase tracking-wide">
                      {b.movie_title}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : b.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <p className="text-xs text-rose-400 font-semibold">{b.theatre_name}</p>
                  <p className="text-[11px] text-gray-400">{b.screen_name} ({b.screen_type})</p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-300">
                    <span>Date: <strong>{b.start_time ? new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}</strong></span>
                    <span>•</span>
                    <span>Time: <strong>{b.start_time ? new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '7:00 PM'}</strong></span>
                    <span>•</span>
                    <span>Ref: <code className="font-mono text-rose-300">{b.booking_reference}</code></span>
                  </div>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
                <button
                  onClick={() => setActiveTicket(b)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                >
                  <QrCode className="w-4 h-4 text-rose-400" />
                  <span>View QR Ticket</span>
                </button>

                {b.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs text-red-400 hover:text-red-300 font-semibold transition-all"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative my-8 w-full max-w-md">
            <button
              onClick={() => setActiveTicket(null)}
              className="absolute -top-10 right-0 text-gray-300 hover:text-white text-sm font-bold flex items-center gap-1"
            >
              ✕ Close
            </button>
            <QRCodeTicket booking={activeTicket} />
          </div>
        </div>
      )}

    </div>
  );
}
