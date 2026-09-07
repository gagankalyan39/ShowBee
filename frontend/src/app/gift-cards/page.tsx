'use client';

import React, { useState } from 'react';
import { Gift, Sparkles, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function GiftCardsPage() {
  const [selectedDenom, setSelectedDenom] = useState(500);

  const denominations = [250, 500, 1000, 2000, 5000];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-24 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Gift className="w-7 h-7 text-rose-500" />
          <span>SHOWBEE Cinema Gift Cards</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          The perfect gift for cinema lovers. Redeemable on any movie ticket or combo snack at partner theatres.
        </p>
      </div>

      {/* Gift Card Mockup Visual */}
      <div className="w-full max-w-md mx-auto aspect-[1.6/1] rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-rose-600 via-purple-700 to-indigo-900 border border-white/20 shadow-2xl relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-xs">
              SB
            </div>
            <span className="text-lg font-black text-white tracking-wider">SHOWBEE</span>
          </div>
          <span className="text-xs font-bold text-rose-200 uppercase tracking-widest">VIP Pass</span>
        </div>

        <div>
          <span className="text-xs text-rose-200 block">Card Value</span>
          <span className="text-3xl sm:text-4xl font-black text-white">₹{selectedDenom}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/80 font-mono">
          <span>**** **** **** 8824</span>
          <span>VAL: 12/28</span>
        </div>
      </div>

      {/* Denomination Selector */}
      <div className="p-6 rounded-3xl glass-panel max-w-md mx-auto space-y-4">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
          Select Card Amount:
        </span>
        <div className="grid grid-cols-5 gap-2">
          {denominations.map((val) => (
            <button
              key={val}
              onClick={() => setSelectedDenom(val)}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                selectedDenom === val
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]'
              }`}
            >
              ₹{val}
            </button>
          ))}
        </div>

        <button
          onClick={() => alert(`Gift card of ₹${selectedDenom} added to checkout!`)}
          className="w-full py-3 rounded-2xl brand-btn text-white text-xs font-bold uppercase tracking-wider shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 mt-4"
        >
          <span>Purchase Gift Card (₹{selectedDenom})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
