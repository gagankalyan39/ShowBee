'use client';

import React from 'react';
import { Lock, Check, ShieldCheck, Clock } from 'lucide-react';
import { SeatItem } from '@/types';

interface SeatMapProps {
  rows: Record<string, SeatItem[]>;
  selectedSeats: SeatItem[];
  onToggleSeat: (seat: SeatItem) => void;
  holdExpiresAt?: string | null;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  rows,
  selectedSeats,
  onToggleSeat,
  holdExpiresAt,
}) => {
  const rowKeys = Object.keys(rows).sort();

  const isSelected = (seat: SeatItem) => {
    return selectedSeats.some((s) => s.show_seat_id === seat.show_seat_id);
  };

  const getSeatColorClass = (seat: SeatItem) => {
    if (isSelected(seat)) {
      return 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/50 scale-105';
    }
    if (seat.status === 'BOOKED') {
      return 'bg-red-950/60 border-red-800/40 text-red-500/40 cursor-not-allowed';
    }
    if (seat.status === 'HELD') {
      return 'bg-amber-950/60 border-amber-700/60 text-amber-400 cursor-not-allowed animate-pulse';
    }
    // Available
    if (seat.seat_type === 'PREMIUM') {
      return 'bg-purple-950/40 border-purple-500/40 text-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-400';
    }
    return 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-400';
  };

  return (
    <div className="w-full p-4 sm:p-8 rounded-3xl glass-panel flex flex-col items-center select-none">
      
      {/* Curved Screen Banner */}
      <div className="w-full max-w-xl flex flex-col items-center my-4 mb-10">
        <div className="w-full h-3 rounded-[100%] bg-gradient-to-b from-rose-500 to-transparent opacity-80 blur-xs shadow-lg shadow-rose-500/30" />
        <div className="w-full h-8 border-t-2 border-rose-400/50 rounded-[50%] -mt-1 flex items-center justify-center">
          <span className="text-[11px] font-bold text-gray-400 tracking-[0.25em] uppercase mt-4">
            All Eyes This Way • Cinema Screen
          </span>
        </div>
      </div>

      {/* Seat Map Grid */}
      <div className="w-full overflow-x-auto pb-6 flex justify-center">
        <div className="flex flex-col gap-3 min-w-[500px]">
          {rowKeys.map((rowLabel) => {
            const seats = rows[rowLabel] || [];
            const isPremium = ['A', 'B', 'C', 'D'].includes(rowLabel);

            return (
              <div key={rowLabel} className="flex items-center justify-center gap-2 sm:gap-3">
                {/* Row Label Left */}
                <span className="w-6 text-center text-xs font-bold text-gray-400">
                  {rowLabel}
                </span>

                {/* Seats in Row */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {seats.map((seat) => {
                    const selected = isSelected(seat);
                    const disabled = seat.status !== 'AVAILABLE' && !selected;

                    return (
                      <button
                        key={seat.show_seat_id}
                        disabled={disabled}
                        onClick={() => onToggleSeat(seat)}
                        title={`Row ${seat.row_label} Seat ${seat.seat_number} - ₹${seat.price} (${seat.seat_type})`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center relative ${getSeatColorClass(
                          seat
                        )}`}
                      >
                        {selected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : seat.status === 'HELD' ? (
                          <Lock className="w-3 h-3" />
                        ) : seat.status === 'BOOKED' ? (
                          '✕'
                        ) : (
                          seat.seat_number
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Row Label Right */}
                <span className="w-6 text-center text-xs font-bold text-gray-400">
                  {rowLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seat Type & Status Legends */}
      <div className="w-full max-w-2xl pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-emerald-950/40 border border-emerald-500/50" />
          <span className="text-gray-300">Regular (₹200)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-purple-950/40 border border-purple-500/50" />
          <span className="text-gray-300">Premium (₹250)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-rose-600 border border-rose-400 shadow-sm" />
          <span className="text-white font-bold">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-amber-950/60 border border-amber-700/60 text-amber-400 flex items-center justify-center text-[8px]">
            🔒
          </div>
          <span className="text-amber-300">Held</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-red-950/60 border border-red-800/40 text-red-500 flex items-center justify-center text-[8px]">
            ✕
          </div>
          <span className="text-gray-400">Booked</span>
        </div>
      </div>

      {/* Member 3 Technical Proof: Pessimistic Locking Badge */}
      <div className="mt-6 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
        <span>
          <strong>Pessimistic Lock Engine Active:</strong> Row-level locks (<code className="bg-blue-950/80 px-1 py-0.5 rounded text-[11px]">SELECT FOR UPDATE</code>) prevent double-booking during your selection.
        </span>
      </div>

    </div>
  );
};
