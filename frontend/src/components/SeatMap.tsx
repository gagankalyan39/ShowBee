'use client';

import React, { useMemo } from 'react';
import { Lock, Check, ShieldCheck, Crown, Sparkles, Film, Armchair, Zap } from 'lucide-react';
import { SeatItem } from '@/types';

interface SeatMapProps {
  rows: Record<string, SeatItem[]>;
  selectedSeats: SeatItem[];
  onToggleSeat: (seat: SeatItem) => void;
  holdExpiresAt?: string | null;
  lockMode?: 'PESSIMISTIC' | 'OPTIMISTIC';
}

export const SeatMap: React.FC<SeatMapProps> = ({
  rows,
  selectedSeats,
  onToggleSeat,
  lockMode = 'PESSIMISTIC',
}) => {
  // Ordered A to J: Row A closest to screen, Row J farthest away
  const rowKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].filter(
    (key) => rows[key] !== undefined
  );

  const isSelected = (seat: SeatItem) => {
    return selectedSeats.some((s) => s.show_seat_id === seat.show_seat_id);
  };

  // Dynamically extract the exact tier prices from the seats in the show
  const tierPrices = useMemo(() => {
    const prices: Record<string, number> = {
      REGULAR: 200,
      PREMIUM: 250,
      VIP: 350,
      RECLINER: 450,
    };

    Object.values(rows).forEach((rowSeats) => {
      rowSeats.forEach((s) => {
        const row = s.row_label.toUpperCase();
        let cat = 'REGULAR';
        if (['A', 'B'].includes(row)) cat = 'REGULAR';
        else if (['C', 'D', 'E', 'F'].includes(row)) cat = 'PREMIUM';
        else if (['G', 'H'].includes(row)) cat = 'VIP';
        else if (['I', 'J'].includes(row)) cat = 'RECLINER';

        const p = Math.round(Number(s.price) || 0);
        if (p > 0) {
          prices[cat] = p;
        }
      });
    });

    return prices;
  }, [rows]);

  const getSeatCategory = (rowLabel: string): {
    name: string;
    label: string;
    badgeStyle: string;
    textColor: string;
    borderColor: string;
    icon: React.ComponentType<{ className?: string }>;
  } => {
    const row = rowLabel.toUpperCase();
    if (['A', 'B'].includes(row)) {
      return {
        name: 'REGULAR',
        label: 'Regular / Standard',
        badgeStyle: 'bg-emerald-500/25 border-emerald-500/50',
        textColor: 'text-emerald-300',
        borderColor: 'border-emerald-500/20',
        icon: Film,
      };
    }
    if (['C', 'D', 'E', 'F'].includes(row)) {
      return {
        name: 'PREMIUM',
        label: 'Premium',
        badgeStyle: 'bg-purple-600/30 border-purple-400/60',
        textColor: 'text-purple-300',
        borderColor: 'border-purple-500/20',
        icon: Sparkles,
      };
    }
    if (['G', 'H'].includes(row)) {
      return {
        name: 'VIP',
        label: 'VIP',
        badgeStyle: 'bg-amber-500/30 border-amber-400/60',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-500/20',
        icon: Crown,
      };
    }
    // Rows I, J
    return {
      name: 'RECLINER',
      label: 'Luxury Recliner',
      badgeStyle: 'bg-cyan-500/30 border-cyan-400/60',
      textColor: 'text-cyan-300',
      borderColor: 'border-cyan-500/20',
      icon: Armchair,
    };
  };

  const getSeatColorClass = (seat: SeatItem) => {
    if (isSelected(seat)) {
      return 'bg-rose-600 text-white border-rose-300 shadow-lg shadow-rose-600/70 ring-2 ring-rose-400/60 scale-105 font-black';
    }
    if (seat.status === 'BOOKED') {
      return 'bg-white/[0.03] border-white/[0.08] text-gray-600 cursor-not-allowed opacity-60';
    }
    if (seat.status === 'HELD') {
      if (lockMode === 'OPTIMISTIC') {
        return 'bg-purple-950/80 border-purple-500/80 text-purple-300 cursor-not-allowed animate-pulse ring-1 ring-purple-500/50';
      }
      return 'bg-amber-950/80 border-amber-600/70 text-amber-400 cursor-not-allowed animate-pulse ring-1 ring-amber-500/50';
    }

    // Available seat styles by hierarchy category
    const row = seat.row_label.toUpperCase();
    if (['A', 'B'].includes(row)) {
      return 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-black hover:border-emerald-300 shadow-sm shadow-emerald-500/10';
    }
    if (['C', 'D', 'E', 'F'].includes(row)) {
      return 'bg-purple-950/40 border-purple-500/50 text-purple-200 hover:bg-purple-500 hover:text-white hover:border-purple-300 shadow-sm shadow-purple-500/10';
    }
    if (['G', 'H'].includes(row)) {
      return 'bg-amber-950/40 border-amber-400/60 text-amber-200 hover:bg-amber-400 hover:text-black hover:border-amber-300 shadow-sm shadow-amber-500/15';
    }
    // Rows I, J: Luxury Recliners
    return 'bg-cyan-950/40 border-cyan-400/60 text-cyan-200 hover:bg-cyan-400 hover:text-black hover:border-cyan-300 shadow-sm shadow-cyan-500/15';
  };

  // Section divider flags for the 4 tiers in exact front-to-back order
  const isFirstOfTier = (row: string) => {
    return row === 'A' || row === 'C' || row === 'G' || row === 'I';
  };

  return (
    <div className="w-full p-4 sm:p-8 rounded-3xl glass-panel flex flex-col items-center select-none">
      
      {/* Centered Cinema Screen at Top */}
      <div className="w-full max-w-xl flex flex-col items-center my-4 mb-6">
        <div className="w-full h-3 rounded-[100%] bg-gradient-to-b from-rose-500 via-rose-400 to-transparent opacity-80 blur-xs shadow-lg shadow-rose-500/30" />
        <div className="w-full h-8 border-t-2 border-rose-400/60 rounded-[50%] -mt-1 flex items-center justify-center">
          <span className="text-[11px] font-bold text-gray-400 tracking-[0.3em] uppercase mt-4">
            Cinema Screen • All Eyes This Way
          </span>
        </div>
      </div>

      {/* Concurrency Engine Visual Indicator Banner */}
      <div className="w-full max-w-xl mb-6">
        {lockMode === 'PESSIMISTIC' ? (
          <div className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs text-blue-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Pessimistic Mode:</strong> Physical PostgreSQL Row-Lock (<code className="bg-blue-950/80 px-1 py-0.5 rounded text-[11px] text-blue-300 font-mono">SELECT FOR UPDATE</code>)
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300 font-bold shrink-0">
              Exclusive 5m Lock
            </span>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Optimistic Mode:</strong> Lock-Free Atomic Versioning (<code className="bg-purple-950/80 px-1 py-0.5 rounded text-[11px] text-purple-300 font-mono">CAS WHERE version=v</code>)
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 font-bold shrink-0">
              Atomic CAS v+1
            </span>
          </div>
        )}
      </div>

      {/* Symmetrical Seat Map Grid with Realistic Central Aisle */}
      <div className="w-full overflow-x-auto pb-6 flex justify-center">
        <div className="flex flex-col gap-2.5 min-w-[560px]">
          {rowKeys.map((rowLabel) => {
            const seats = rows[rowLabel] || [];
            const sortedSeats = [...seats].sort((a, b) => a.seat_number - b.seat_number);
            const leftAisle = sortedSeats.filter((s) => s.seat_number <= 5);
            const rightAisle = sortedSeats.filter((s) => s.seat_number > 5);

            const category = getSeatCategory(rowLabel);
            const CategoryIcon = category.icon;
            const showDivider = isFirstOfTier(rowLabel);
            const tierPrice = tierPrices[category.name] || 200;

            return (
              <React.Fragment key={rowLabel}>
                {/* Category Section Header Divider with Admin Given Price */}
                {showDivider && (
                  <div className={`w-full flex items-center justify-between gap-3 ${rowLabel === 'A' ? 'pt-2' : 'pt-5'} pb-1.5 border-b ${category.borderColor}`}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={`w-3.5 h-3.5 ${category.textColor}`} />
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${category.textColor}`}>
                        {category.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold hidden sm:inline">
                        {rowLabel === 'A' ? 'Rows A–B • Front' : rowLabel === 'C' ? 'Rows C–F • Center Prime' : rowLabel === 'G' ? 'Rows G–H • Rear' : 'Rows I–J • Upper Deck'}
                      </span>
                      <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/[0.08] border border-white/10 shadow-sm">
                        ₹{tierPrice}
                      </span>
                    </div>
                  </div>
                )}

                {/* Row Container: Row Letter Left | 5 Seats | Central Aisle | 5 Seats | Row Letter Right */}
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {/* Left Row Letter */}
                  <span className="w-6 text-center text-xs font-bold text-gray-400">
                    {rowLabel}
                  </span>

                  {/* Left Seats (1 - 5) */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {leftAisle.map((seat) => {
                      const selected = isSelected(seat);
                      const disabled = seat.status !== 'AVAILABLE' && !selected;
                      const seatPrice = Math.round(Number(seat.price) || tierPrice);
                      const seatVersion = seat.version || 1;

                      const tooltipTitle =
                        lockMode === 'OPTIMISTIC'
                          ? `Row ${seat.row_label} Seat ${seat.seat_number} - ₹${seatPrice} (${category.label}) • Version: v${seatVersion} [Atomic CAS: Target v${seatVersion + 1}]`
                          : `Row ${seat.row_label} Seat ${seat.seat_number} - ₹${seatPrice} (${category.label}) • Pessimistic Lock: Exclusive Row Lock`;

                      return (
                        <button
                          key={seat.show_seat_id}
                          disabled={disabled}
                          onClick={() => onToggleSeat(seat)}
                          title={tooltipTitle}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center relative ${getSeatColorClass(
                            seat
                          )}`}
                        >
                          {selected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : seat.status === 'HELD' ? (
                            lockMode === 'OPTIMISTIC' ? (
                              <span className="text-[8px] font-mono font-bold text-purple-300">v{seatVersion + 1}</span>
                            ) : (
                              <Lock className="w-3 h-3 text-amber-400" />
                            )
                          ) : seat.status === 'BOOKED' ? (
                            <span className="text-[10px] text-gray-500 font-bold">✕</span>
                          ) : lockMode === 'OPTIMISTIC' ? (
                            <div className="flex flex-col items-center justify-center leading-none">
                              <span className="text-[10px]">{seat.seat_number}</span>
                              <span className="text-[7px] font-mono text-purple-300/80 -mt-0.5">v{seatVersion}</span>
                            </div>
                          ) : (
                            seat.seat_number
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Realistic Central Aisle Walkway */}
                  <div className="w-6 sm:w-8 flex items-center justify-center" title="Central Aisle">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest rotate-90 sm:rotate-0">
                      AISLE
                    </span>
                  </div>

                  {/* Right Seats (6 - 10) */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {rightAisle.map((seat) => {
                      const selected = isSelected(seat);
                      const disabled = seat.status !== 'AVAILABLE' && !selected;
                      const seatPrice = Math.round(Number(seat.price) || tierPrice);
                      const seatVersion = seat.version || 1;

                      const tooltipTitle =
                        lockMode === 'OPTIMISTIC'
                          ? `Row ${seat.row_label} Seat ${seat.seat_number} - ₹${seatPrice} (${category.label}) • Version: v${seatVersion} [Atomic CAS: Target v${seatVersion + 1}]`
                          : `Row ${seat.row_label} Seat ${seat.seat_number} - ₹${seatPrice} (${category.label}) • Pessimistic Lock: Exclusive Row Lock`;

                      return (
                        <button
                          key={seat.show_seat_id}
                          disabled={disabled}
                          onClick={() => onToggleSeat(seat)}
                          title={tooltipTitle}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center relative ${getSeatColorClass(
                            seat
                          )}`}
                        >
                          {selected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : seat.status === 'HELD' ? (
                            lockMode === 'OPTIMISTIC' ? (
                              <span className="text-[8px] font-mono font-bold text-purple-300">v{seatVersion + 1}</span>
                            ) : (
                              <Lock className="w-3 h-3 text-amber-400" />
                            )
                          ) : seat.status === 'BOOKED' ? (
                            <span className="text-[10px] text-gray-500 font-bold">✕</span>
                          ) : lockMode === 'OPTIMISTIC' ? (
                            <div className="flex flex-col items-center justify-center leading-none">
                              <span className="text-[10px]">{seat.seat_number}</span>
                              <span className="text-[7px] font-mono text-purple-300/80 -mt-0.5">v{seatVersion}</span>
                            </div>
                          ) : (
                            seat.seat_number
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Row Letter */}
                  <span className="w-6 text-center text-xs font-bold text-gray-400">
                    {rowLabel}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Legend Explaining Every Seat Color, Price & Concurrency Mode */}
      <div className="w-full max-w-3xl pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs">
        {/* Regular */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-emerald-950/40 border border-emerald-500/50 shadow-sm" />
          <span className="text-gray-300 font-semibold">Regular (₹{tierPrices.REGULAR})</span>
        </div>

        {/* Premium */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-purple-950/40 border border-purple-500/50 shadow-sm" />
          <span className="text-gray-300 font-semibold">Premium (₹{tierPrices.PREMIUM})</span>
        </div>

        {/* VIP */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-amber-950/40 border border-amber-400/60 shadow-sm" />
          <span className="text-gray-300 font-semibold">VIP (₹{tierPrices.VIP})</span>
        </div>

        {/* Luxury Recliner */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-cyan-950/40 border border-cyan-400/60 shadow-sm" />
          <span className="text-gray-300 font-semibold">Luxury Recliner (₹{tierPrices.RECLINER})</span>
        </div>

        {/* Selected */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-rose-600 border border-rose-300 shadow-sm" />
          <span className="text-white font-bold">Selected</span>
        </div>

        {/* Held — Concurrency Aware */}
        {lockMode === 'OPTIMISTIC' ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-purple-950/80 border border-purple-500 text-purple-300 flex items-center justify-center text-[7px] font-mono font-bold">
              v+1
            </div>
            <span className="text-purple-300">Held (⚡ CAS v+1)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-amber-950/80 border border-amber-600/70 text-amber-400 flex items-center justify-center text-[8px]">
              🔒
            </div>
            <span className="text-amber-300">Held (🔒 Row Lock)</span>
          </div>
        )}

        {/* Booked */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-white/[0.03] border border-white/[0.08] text-gray-500 flex items-center justify-center text-[8px]">
            ✕
          </div>
          <span className="text-gray-400">Booked</span>
        </div>
      </div>

      {/* Technical Concurrency Engine Proof Badge */}
      {lockMode === 'OPTIMISTIC' ? (
        <div className="mt-6 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-200 text-xs flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong>Optimistic Concurrency Active:</strong> Non-blocking Compare-And-Swap (<code className="bg-purple-950/80 px-1 py-0.5 rounded text-[11px] text-purple-300 font-mono">UPDATE show_seats SET version=v+1 WHERE id=... AND version=v</code>) detects collisions via atomic version matching with zero lock queueing.
          </span>
        </div>
      ) : (
        <div className="mt-6 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-200 text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Pessimistic Concurrency Active:</strong> Real-time row-level locking (<code className="bg-blue-950/80 px-1 py-0.5 rounded text-[11px] text-blue-300 font-mono">SELECT * FROM show_seats WHERE id=... FOR UPDATE</code>) acquires physical row locks in PostgreSQL to serialize concurrent checkouts.
          </span>
        </div>
      )}

    </div>
  );
};
