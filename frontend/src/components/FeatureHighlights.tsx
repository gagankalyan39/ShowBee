'use client';

import React from 'react';
import { Ticket, Percent, ShieldCheck, Headphones } from 'lucide-react';

export const FeatureHighlights: React.FC = () => {
  const features = [
    {
      title: 'Easy Booking',
      desc: 'Book tickets in just a few clicks',
      icon: Ticket,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      title: 'Best Prices',
      desc: 'Get the best deals & offers',
      icon: Percent,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Secure Payments',
      desc: '100% secure transactions',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: '24/7 Support',
      desc: 'We are here to help you',
      icon: Headphones,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 my-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-2xl glass-card flex items-center gap-4 hover:border-rose-500/30 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${f.bg}`}>
                <Icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">{f.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
