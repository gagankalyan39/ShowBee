'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
  Trash2,
  BellOff,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useLocation } from '@/context/LocationContext';
import { Compass, Loader2 } from 'lucide-react';

interface NavbarProps {
  onSearch?: (query: string) => void;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
}

function NavbarInner({ onSearch, selectedCity: propCity, onSelectCity }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlParamQuery = searchParams?.get('q') || '';

  const { user, logout, isAdmin } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAllNotifications, 
    deleteNotification, 
    activeToast, 
    dismissToast 
  } = useNotifications();
  const { 
    selectedCity: globalCity, 
    setSelectedCity: setGlobalCity, 
    cities, 
    isLocating, 
    detectLocation, 
    locationStatus 
  } = useLocation();

  const selectedCity = propCity || globalCity;

  const [searchQuery, setSearchQuery] = useState(urlParamQuery);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Smooth smartphone & web click-outside / touch dismissal for notification center, city, and user menus
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifMenu(false);
      }
      if (cityRef.current && !cityRef.current.contains(target)) {
        setShowCityMenu(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifMenu(false);
        setShowCityMenu(false);
        setShowUserMenu(false);
        setMobileMenuOpen(false);
        dismissToast();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismissToast]);

  // Close menus when navigating to another route
  useEffect(() => {
    setShowNotifMenu(false);
    setShowCityMenu(false);
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Sync state if URL query param changes
  useEffect(() => {
    setSearchQuery(urlParamQuery);
  }, [urlParamQuery]);

  const handleCitySelect = (city: string) => {
    setGlobalCity(city);
    if (onSelectCity) onSelectCity(city);
    setShowCityMenu(false);
  };

  const handleGPSDetect = async () => {
    const detected = await detectLocation();
    if (detected && onSelectCity) {
      onSelectCity(detected);
    }
  };

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
    <header className="sticky top-0 z-50 w-full px-4 sm:px-8 py-3.5" style={{ background: 'rgba(7,5,15,0.88)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* LOGO (Bee Icon + SHOWBEE) */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #e11d48 0%, #9f1239 50%, #be185d 100%)', boxShadow: '0 6px 20px rgba(225,29,72,0.45), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
            {/* Custom Bee SVG Icon */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white stroke-white stroke-1">
              <path d="M12 2C10.5 2 9.2 3 8.7 4.3C7.5 4 6.2 4.4 5.3 5.3C4.2 6.4 4 8.1 4.7 9.4C3.6 10.3 3 11.7 3 13.2C3 16.5 5.5 19.3 8.7 19.9C9.6 21.2 11.2 22 13 22C14.8 22 16.4 21.2 17.3 19.9C20.5 19.3 23 16.5 23 13.2C23 11.7 22.4 10.3 21.3 9.4C22 8.1 21.8 6.4 20.7 5.3C19.8 4.4 18.5 4 17.3 4.3C16.8 3 15.5 2 14 2H12ZM9 11H15V13H9V11ZM8 15H16V17H8V15Z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Outfit, Inter, sans-serif', background: 'linear-gradient(135deg, #ffffff 0%, #fecdd3 50%, #f43f5e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            SHOW<span style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>BEE</span>
          </span>
        </Link>

        {/* SEARCH BAR (Pill shaped with search icon) */}
        <form 
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-xl relative items-center"
        >
          <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search movies, genres, cast, directors..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm text-gray-100 placeholder-gray-500 outline-none transition-all"
            style={{ background: 'rgba(16,11,30,0.75)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(14px)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,63,94,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244,63,94,0.12), inset 0 2px 8px rgba(0,0,0,0.2)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.2)'; }}
          />
        </form>

        {/* RIGHT CONTROLS: City Selector + Notification Bell + Auth Button */}
        <div className="flex items-center gap-3">
          
          {/* City Selector */}
          <div className="relative" ref={cityRef}>
            <button
              onClick={() => {
                setShowCityMenu(!showCityMenu);
                setShowUserMenu(false);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold text-gray-200 transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{selectedCity}</span>
              <span className="text-gray-500 text-[10px]">▼</span>
            </button>

            {showCityMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#171128] border border-white/[0.12] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Location</span>
                  <span className="text-[10px] text-rose-400 font-bold">{selectedCity}</span>
                </div>

                {/* GPS Auto Detect Button */}
                <div className="px-2 pt-1 pb-2 border-b border-white/[0.08]">
                  <button
                    onClick={handleGPSDetect}
                    disabled={isLocating}
                    className="w-full px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        <span>Detecting via GPS...</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-3.5 h-3.5 text-rose-400" />
                        <span>Detect Location (GPS)</span>
                      </>
                    )}
                  </button>
                  {locationStatus && (
                    <p className="text-[10px] text-amber-300 mt-1.5 px-1 leading-tight">{locationStatus}</p>
                  )}
                </div>

                <div className="pt-1">
                  {cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                        selectedCity === city
                          ? 'bg-rose-500/20 text-rose-300 font-semibold'
                          : 'text-gray-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className={`w-3 h-3 ${selectedCity === city ? 'text-rose-400' : 'text-gray-500'}`} />
                        {city}
                      </span>
                      {selectedCity === city && <span className="text-rose-400 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

            {/* Notification Bell (Member 4 Socket.io Feature) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowUserMenu(false);
                setShowCityMenu(false);
                if (activeToast) dismissToast();
              }}
              className="relative p-2.5 rounded-2xl text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse shadow-sm shadow-rose-500/50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* REAL-TIME NOTIFICATION POPUP — Auto dismisses after a few seconds with progress bar countdown */}
            {activeToast && !showNotifMenu && (
              <div 
                className="absolute right-0 top-full mt-2.5 z-50 w-80 sm:w-96 animate-in slide-in-from-top-2 fade-in duration-300 shadow-2xl"
                role="alert"
              >
                {/* Arrow pointer to bell icon */}
                <div 
                  className="absolute -top-1.5 right-3.5 w-3.5 h-3.5 transform rotate-45 z-10"
                  style={{
                    background: '#160e28',
                    borderTop: '1px solid rgba(244, 63, 94, 0.5)',
                    borderLeft: '1px solid rgba(244, 63, 94, 0.5)',
                  }}
                />

                <div 
                  className="relative overflow-hidden p-4 rounded-2xl flex items-start gap-3"
                  style={{
                    background: 'linear-gradient(145deg, rgba(22, 14, 40, 0.98) 0%, rgba(12, 7, 24, 0.98) 100%)',
                    backdropFilter: 'blur(36px)',
                    WebkitBackdropFilter: 'blur(36px)',
                    border: '1px solid rgba(244, 63, 94, 0.5)',
                    boxShadow: '0 24px 60px -10px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(244, 63, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 0 24px rgba(225, 29, 72, 0.1)',
                  }}
                >
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
                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">{activeToast.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed break-words font-normal">
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
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* 4-second linear shrink timer countdown bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-rose-400 animate-shrink-width" />
                  </div>
                </div>
              </div>
            )}

            {/* Notification Dropdown with Mobile Backdrop */}
            {showNotifMenu && (
              <>
                {/* Smartphone backdrop: clicking or tapping anywhere closes smoothly */}
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 sm:hidden transition-opacity duration-200"
                  onClick={() => setShowNotifMenu(false)}
                  aria-hidden="true"
                />

                <div 
                  className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-3xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                  style={{
                    background: 'linear-gradient(160deg, rgba(18, 12, 34, 0.98) 0%, rgba(10, 6, 20, 0.99) 100%)',
                    backdropFilter: 'blur(36px)',
                    WebkitBackdropFilter: 'blur(36px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.22), inset 0 0 25px rgba(225, 29, 72, 0.06)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {notifications.length > 0 && (
                        <>
                          {unreadCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAllAsRead();
                              }}
                              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 font-medium px-2 py-1 rounded-lg hover:bg-white/[0.05] transition-colors"
                              title="Mark all notifications as read"
                            >
                              <CheckCheck className="w-3 h-3 text-emerald-400" />
                              <span className="hidden sm:inline">Mark read</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearAllNotifications();
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/15 transition-colors"
                            title="Clear all notifications completely"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear all</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowNotifMenu(false)}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors sm:hidden"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-gray-500">
                          <BellOff className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-xs font-semibold text-gray-300">You&apos;re all caught up!</p>
                        <p className="text-[11px] text-gray-500">No notifications right now.</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isBooking = n.type?.includes('BOOKING');
                        const isFail = n.type?.includes('FAIL') || n.type?.includes('ERROR');

                        return (
                          <div
                            key={n.id}
                            onClick={() => !n.is_read && markAsRead(n.id)}
                            className="group relative p-3 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-2.5"
                            style={
                              n.is_read
                                ? {
                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255, 255, 255, 0.09)',
                                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                  }
                                : {
                                    background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(124, 58, 237, 0.16) 100%)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(244, 63, 94, 0.45)',
                                    boxShadow: '0 4px 18px rgba(225, 29, 72, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
                                  }
                            }
                          >
                            {/* Category Icon Badge */}
                            <div 
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${
                                n.is_read
                                  ? 'bg-white/[0.06] text-gray-300 border border-white/[0.08]'
                                  : 'bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-rose-500/20'
                              }`}
                            >
                              {isBooking ? (
                                <Ticket className="w-3.5 h-3.5 text-rose-400" />
                              ) : isFail ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Bell className="w-3.5 h-3.5 text-purple-300" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1 mb-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {!n.is_read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 shadow-sm shadow-rose-400 animate-pulse" />
                                  )}
                                  <span className={`text-xs font-bold truncate ${n.is_read ? 'text-gray-200' : 'text-white'}`}>
                                    {n.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(n.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-400 hover:bg-white/10 transition-all"
                                    title="Delete notification"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className={`text-xs leading-relaxed break-words ${n.is_read ? 'text-gray-300' : 'text-gray-100'}`}>
                                {n.message}
                              </p>
                              {isBooking && (
                                <div className="mt-1.5">
                                  <Link
                                    href="/my-bookings"
                                    onClick={() => setShowNotifMenu(false)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 underline"
                                  >
                                    View My Bookings &amp; QR Ticket →
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Auth Section */}
          {user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifMenu(false);
                  setShowCityMenu(false);
                }}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl text-xs font-semibold text-gray-200 transition-all hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
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
                    <>
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Admin Portal</span>
                      </Link>
                      <Link
                        href="/admin?tab=shows"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-rose-300 hover:bg-rose-500/10 hover:text-white transition-colors font-medium"
                      >
                        <Calendar className="w-3.5 h-3.5 text-rose-400" />
                        <span>Shows Scheduling</span>
                      </Link>
                    </>
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
