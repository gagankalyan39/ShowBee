'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Search, 
  MapPin, 
  Bell, 
  User, 
  Menu, 
  X, 
  LogOut, 
  Ticket, 
  ShieldAlert, 
  CheckCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

interface NavbarProps {
  onSearch?: (query: string) => void;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
}

function NavbarInner({ onSearch, selectedCity = 'Bengaluru', onSelectCity }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlParamQuery = searchParams?.get('q') || '';

  const { user, logout, isAdmin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, activeToast, dismissToast } = useNotifications();

  const [searchQuery, setSearchQuery] = useState(urlParamQuery);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cities = ['Bengaluru', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi NCR'];

  // Sync state if URL query param changes
  useEffect(() => {
    setSearchQuery(urlParamQuery);
  }, [urlParamQuery]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (onSearch) {
      onSearch(val);
    } else {
      // If user is typing on home page, update query param seamlessly
      if (pathname === '/') {
        if (val.trim()) {
          router.replace(`/?q=${encodeURIComponent(val.trim())}`, { scroll: false });
        } else {
          router.replace('/', { scroll: false });
        }
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      if (searchQuery.trim()) {
        router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        router.push('/');
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-8 py-3 bg-[#0d0a17]/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* LOGO (Bee Icon + SHOWBEE) */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-105 transition-transform">
            {/* Custom Bee SVG Icon */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white stroke-white stroke-1">
              <path d="M12 2C10.5 2 9.2 3 8.7 4.3C7.5 4 6.2 4.4 5.3 5.3C4.2 6.4 4 8.1 4.7 9.4C3.6 10.3 3 11.7 3 13.2C3 16.5 5.5 19.3 8.7 19.9C9.6 21.2 11.2 22 13 22C14.8 22 16.4 21.2 17.3 19.9C20.5 19.3 23 16.5 23 13.2C23 11.7 22.4 10.3 21.3 9.4C22 8.1 21.8 6.4 20.7 5.3C19.8 4.4 18.5 4 17.3 4.3C16.8 3 15.5 2 14 2H12ZM9 11H15V13H9V11ZM8 15H16V17H8V15Z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-wider text-white bg-gradient-to-r from-white via-rose-100 to-rose-400 bg-clip-text text-transparent">
            SHOW<span className="text-rose-500">BEE</span>
          </span>
        </Link>

        {/* SEARCH BAR (Pill shaped with search icon) */}
        <form 
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-xl relative items-center"
        >
          <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search for movies, genres, cast, directors..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/[0.1] focus:border-rose-500 text-sm text-gray-100 placeholder-gray-400 outline-none transition-all shadow-inner"
          />
        </form>

        {/* RIGHT CONTROLS: City Selector + Notification Bell + Auth Button */}
        <div className="flex items-center gap-3">
          
          {/* City Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCityMenu(!showCityMenu);
                setShowUserMenu(false);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-gray-200 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{selectedCity}</span>
              <span className="text-gray-400 text-[10px]">▼</span>
            </button>

            {showCityMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#171128] border border-white/[0.12] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Select Location
                </div>
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      if (onSelectCity) onSelectCity(city);
                      setShowCityMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                      selectedCity === city
                        ? 'bg-rose-500/20 text-rose-300 font-semibold'
                        : 'text-gray-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{city}</span>
                    {selectedCity === city && <span className="text-rose-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

            {/* Notification Bell (Member 4 Socket.io Feature) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowUserMenu(false);
                setShowCityMenu(false);
                if (activeToast) dismissToast();
              }}
              className="relative p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* REAL-TIME NOTIFICATION POPUP — Anchored directly at Bell Button location! */}
            {activeToast && !showNotifMenu && (
              <div className="absolute right-0 top-full mt-2.5 z-50 w-80 sm:w-96 animate-in slide-in-from-top-2 fade-in duration-300">
                {/* Arrow pointer to bell icon */}
                <div className="absolute -top-2 right-3.5 w-4 h-4 bg-[#140e2b] border-t border-l border-rose-500/60 transform rotate-45 z-10" />

                <div className="relative p-4 rounded-2xl bg-[#140e2b]/98 backdrop-blur-2xl border-2 border-rose-500/60 shadow-2xl shadow-rose-950/80 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-500/40">
                    {activeToast.type?.includes('BOOKING') ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : activeToast.type?.includes('FAIL') ? (
                      <AlertCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Bell className="w-5 h-5 text-white animate-bounce" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-white tracking-wide truncate">
                        {activeToast.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 shrink-0">{activeToast.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed break-words">
                      {activeToast.message}
                    </p>
                    {activeToast.type?.includes('BOOKING') && (
                      <div className="mt-2">
                        <Link
                          href="/my-bookings"
                          onClick={dismissToast}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 underline"
                        >
                          View My Bookings &amp; QR Ticket →
                        </Link>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={dismissToast}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    aria-label="Close Notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Notification Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#171128] border border-white/[0.12] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-rose-400" /> Notifications
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-2.5 rounded-xl cursor-pointer text-left transition-colors ${
                          n.is_read
                            ? 'bg-white/[0.02] hover:bg-white/[0.05] text-gray-300'
                            : 'bg-rose-500/10 border border-rose-500/20 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-rose-300">{n.title}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Auth Section */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifMenu(false);
                  setShowCityMenu(false);
                }}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-gray-200 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline-block max-w-[100px] truncate">{user.name}</span>
                <span className="text-gray-400 text-[10px]">▼</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#171128] border border-white/[0.12] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-white/[0.08]">
                    <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    {isAdmin && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>

                  <Link
                    href="/my-bookings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5 text-rose-400" />
                    <span>My Bookings</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Portal</span>
                    </Link>
                  )}

                  <div className="border-t border-white/[0.08] my-1"></div>

                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                      router.push('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 rounded-full brand-btn text-white text-xs font-bold tracking-wide shadow-md shadow-rose-500/30 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login / Sign Up</span>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/[0.06] text-gray-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {mobileMenuOpen && (
        <div className="mt-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search movies, cast, genres..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs text-white"
            />
          </form>
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.08]">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-xs text-gray-200 py-1 font-medium">Movies</Link>
            <Link href="/theatres" onClick={() => setMobileMenuOpen(false)} className="text-xs text-gray-200 py-1">Theatres</Link>
            <Link href="/my-bookings" onClick={() => setMobileMenuOpen(false)} className="text-xs text-gray-200 py-1">My Bookings</Link>
            {isAdmin && <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="text-xs text-amber-400 py-1 font-semibold">Admin Portal</Link>}
          </div>
        </div>
      )}
    </header>
  );
}

export const Navbar: React.FC<NavbarProps> = (props) => {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 w-full px-4 sm:px-8 py-3 bg-[#0d0a17]/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-2xl font-black text-white">SHOW<span className="text-rose-500">BEE</span></span>
        </div>
      </header>
    }>
      <NavbarInner {...props} />
    </Suspense>
  );
};
