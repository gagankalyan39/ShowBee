'use client';

import React, { useRef } from 'react';
import { Ticket, Calendar, Clock, MapPin, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Booking } from '@/types';

interface QRCodeTicketProps {
  booking: Booking;
}

export const QRCodeTicket: React.FC<QRCodeTicketProps> = ({ booking }) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const seatsList = booking.seats && booking.seats.length > 0
    ? booking.seats.map((s) => `${s.row_label}${s.seat_number}`).join(', ')
    : 'Seats Reserved';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
      {/* Ticket Container */}
      <div
        ref={ticketRef}
        className="w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#1b1535] to-[#120d24] border border-white/20 shadow-2xl relative"
      >
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-rose-600 to-pink-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6" />
            <span className="font-black text-lg tracking-wider">SHOWBEE CINEMA TICKET</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-bold tracking-wider uppercase">
            {booking.status}
          </span>
        </div>

        {/* Movie Info */}
        <div className="p-6 space-y-4">
          <div className="flex gap-4">
            {booking.poster_url && (
              <img
                src={booking.poster_url}
                alt={booking.movie_title || 'Movie'}
                className="w-20 h-28 object-cover rounded-xl border border-white/10 shadow-md shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white uppercase tracking-tight truncate">
                {booking.movie_title || 'Movie Title'}
              </h2>
              <p className="text-xs text-rose-400 font-semibold mt-1">
                {booking.theatre_name || 'Cinema Theatre'}
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{booking.theatre_city || 'Bengaluru'}</span>
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-gray-200">
                {booking.screen_name || 'Screen 1'} • {booking.screen_type || '2D'}
              </span>
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-rose-400" /> Date
              </span>
              <span className="font-bold text-white">
                {booking.start_time ? new Date(booking.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" /> Showtime
              </span>
              <span className="font-bold text-white">
                {booking.start_time ? new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '7:00 PM'}
              </span>
            </div>
          </div>

          {/* Seats & Booking Reference */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block">Reserved Seats</span>
              <span className="font-black text-rose-400 text-sm">{seatsList}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block">Booking ID</span>
              <span className="font-mono font-bold text-gray-200">{booking.booking_reference}</span>
            </div>
          </div>

          {/* Dotted Cut Line */}
          <div className="relative py-2">
            <div className="border-b-2 border-dashed border-white/20 w-full" />
            <div className="absolute -left-8 top-0.5 w-5 h-5 rounded-full bg-[#0a0714]" />
            <div className="absolute -right-8 top-0.5 w-5 h-5 rounded-full bg-[#0a0714]" />
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-gray-900 shadow-inner">
            {booking.qr_code ? (
              <img
                src={booking.qr_code}
                alt={`QR Code ${booking.booking_reference}`}
                className="w-36 h-36 object-contain"
              />
            ) : (
              <div className="w-36 h-36 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                Generating QR...
              </div>
            )}
            <span className="text-[11px] font-mono font-bold text-gray-600 mt-2">
              Scan at cinema turnstile
            </span>
          </div>

          {/* Verification info */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
            <span>Total Paid: <strong className="text-white text-xs">₹{booking.total_amount}</strong></span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
        </div>
      </div>

      {/* Print / Save Button */}
      <button
        onClick={handlePrint}
        className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:scale-105"
      >
        <Printer className="w-4 h-4" />
        <span>Print / Save Ticket (PDF)</span>
      </button>
    </div>
  );
};
