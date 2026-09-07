'use client';

import React from 'react';
import { Tag, Sparkles, Copy, Check, Ticket } from 'lucide-react';
import Link from 'next/link';

export default function OffersPage() {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const offers = [
    {
      code: 'SHOWBEE50',
      title: 'Flat ₹50 OFF on All Shows',
      desc: 'Applicable on bookings of 2 or more tickets across any cinema theatre in Bengaluru, Hyderabad, or Chennai.',
      tag: 'POPULAR',
      validTill: '30 Sep 2026',
    },
    {
      code: 'FIRSTTICKET',
      title: 'New User Special: 20% Instant Discount',
      desc: 'Sign up today and get 20% off up to ₹100 on your first booking with SHOWBEE.',
      tag: 'NEW USER',
      validTill: '31 Oct 2026',
    },
    {
      code: 'WEEKEND30',
      title: 'Weekend Cinema Fever',
      desc: 'Book tickets for Friday, Saturday, or Sunday and enjoy ₹30 off convenience fee.',
      tag: 'WEEKEND',
      validTill: '15 Oct 2026',
    },
  ];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-24 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Tag className="w-7 h-7 text-rose-500" />
          <span>Exclusive Cinema Offers &amp; Discounts</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Save more on every movie ticket with verified promotional coupons
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div
            key={offer.code}
            className="p-6 rounded-3xl glass-card flex flex-col justify-between space-y-4 hover:border-rose-500/40 transition-all"
          >
            <div className="space-y-3">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase">
                {offer.tag}
              </span>
              <h2 className="text-base font-bold text-white tracking-wide">
                {offer.title}
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                {offer.desc}
              </p>
            </div>

            <div className="pt-4 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10">
                <code className="text-xs font-mono font-bold text-rose-400">{offer.code}</code>
                <button
                  onClick={() => handleCopy(offer.code)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-white font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedCode === offer.code ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 text-center">Valid until {offer.validTill}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-3xl glass-panel text-center space-y-3 max-w-xl mx-auto">
        <Ticket className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">Ready to book your movie?</h3>
        <p className="text-xs text-gray-400">Apply any of the promo codes above on the checkout page to redeem your discount.</p>
        <Link href="/" className="inline-block px-6 py-2.5 rounded-full brand-btn text-xs font-bold text-white shadow-md">
          Browse Now Showing Movies
        </Link>
      </div>
    </div>
  );
}
