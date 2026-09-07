'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { bookingAPI } from '@/lib/api';
import { Booking } from '@/types';
import { QRCodeTicket } from '@/components/QRCodeTicket';
import { CheckCircle2, Ticket, ArrowRight, Home } from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    bookingAPI
      .getById(bookingId)
      .then((res) => {
        if (res.success && res.data) {
          setBooking(res.data);
        } else {
          setError('Booking record not found');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load confirmation details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400">Loading your confirmed cinema ticket...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-3xl glass-panel text-center">
        <p className="text-rose-400 font-bold mb-4">{error || 'Booking not found'}</p>
        <Link href="/" className="px-5 py-2 rounded-full brand-btn text-xs font-bold text-white">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-24 text-center">
      
      {/* Celebration Header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-950/50 animate-bounce">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
          Booking Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 max-w-md">
          Your payment of <strong>₹{booking.total_amount}</strong> has been received and seats are permanently locked.
        </p>
      </div>

      {/* Render QR Ticket Component */}
      <QRCodeTicket booking={booking} />

      {/* Next Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/my-bookings"
          className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-2 transition-all hover:scale-105"
        >
          <Ticket className="w-4 h-4 text-rose-400" />
          <span>View in My Bookings</span>
        </Link>

        <Link
          href="/"
          className="px-6 py-3 rounded-full brand-btn text-xs font-bold text-white flex items-center gap-2 transition-all hover:scale-105 shadow-md shadow-rose-600/30"
        >
          <Home className="w-4 h-4" />
          <span>Book Another Movie</span>
        </Link>
      </div>

    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading ticket confirmation...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
