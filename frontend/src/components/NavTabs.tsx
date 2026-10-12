'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Building2, Tag, Gift, Users, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface TabItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

export const NavTabs: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const tabs: TabItem[] = [
    { label: 'Movies', href: '/', icon: Film },
    { label: 'Theatres', href: '/theatres', icon: Building2 },
    { label: 'Offers', href: '/offers', icon: Tag },
    { label: 'Gift Cards', href: '/gift-cards', icon: Gift },
  ];

  if (isAdmin) {
    tabs.push({ label: 'Admin', href: '/admin', icon: Shield, badge: 'Portal' });
  }

  return (
    <div className="w-full bg-[#110c22]/70 border-b border-white/[0.06] px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-6 overflow-x-auto py-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-500' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                  isActive ? 'bg-rose-500 text-white' : 'bg-white/[0.1] text-gray-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
