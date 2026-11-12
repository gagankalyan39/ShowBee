'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Building2, Tag, Gift, Shield } from 'lucide-react';
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
    <div
      className="w-full px-4 sm:px-8"
      style={{
        background: 'rgba(8, 5, 16, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-200'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, rgba(225,29,72,0.2) 0%, rgba(159,18,57,0.15) 100%)',
                border: '1px solid rgba(244,63,94,0.35)',
                boxShadow: '0 4px 16px rgba(225,29,72,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
              } : {
                background: 'transparent',
                border: '1px solid transparent',
              }}
            >
              <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-rose-400' : 'text-gray-600'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-lg font-black uppercase tracking-wider ${
                    isActive ? 'text-white' : 'text-gray-400'
                  }`}
                  style={isActive
                    ? { background: 'rgba(225,29,72,0.8)', border: '1px solid rgba(244,63,94,0.4)' }
                    : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
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
