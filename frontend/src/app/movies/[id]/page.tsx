'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { movieAPI } from '@/lib/api';
import { Movie } from '@/types';
import { getBookingDates } from '@/lib/dateUtils';
import { useNotifications } from '@/context/NotificationContext';
import { 
  Star, 
  Clock, 
  Globe, 
  Calendar, 
  Play, 
  Ticket, 
  ArrowLeft, 
  User, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  Sparkles,
  Film,
  AlertCircle
} from 'lucide-react';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { socket } = useNotifications();

  const [movie, setMovie] = useState<any>(null);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [selectedDate, setSelectedDate] = useState('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isShowsLoading, setIsShowsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComingSoon = movie?.status === 'COMING_SOON';
  const cities = ['Bengaluru', 'Hyderabad', 'Chennai'];
  const dates = getBookingDates(isComingSoon);

  // Helper to extract YouTube embed URL
  const getEmbedUrl = (url?: string) => {
    if (!url) return '';
    try {
      let videoId = '';
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : url;
    } catch {
      return url;
    }
  };

  // 1. Fetch movie details
  useEffect(() => {
    if (!id) return;
    async function loadMovie() {
      try {
        setIsLoading(true);
        const res = await movieAPI.getById(id);
        if (res.success && res.data) {
          setMovie(res.data);
          // For Coming Soon movies: default to Tomorrow! Never Today!
          if (res.data.status === 'COMING_SOON') {
            setSelectedDate('tomorrow');
          } else {
            setSelectedDate('today');
          }
        } else {
          setError('Movie not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load movie');
      } finally {
        setIsLoading(false);
      }
    }
    loadMovie();
  }, [id]);

  // 2. Fetch shows for selected city & date
  const loadShows = async () => {
    if (!id) return;
    try {
      setIsShowsLoading(true);
      const showsRes = await movieAPI.getShows(id, selectedCity, selectedDate);
      if (showsRes.success && showsRes.data) {
        setTheatres(showsRes.data);
      } else {
        setTheatres([]);
      }
    } catch (err) {
      console.error('Failed to load shows:', err);
      setTheatres([]);
    } finally {
      setIsShowsLoading(false);
    }
  };

  useEffect(() => {
    loadShows();
  }, [id, selectedCity, selectedDate]);

  // 3. Real-time updates: Socket.IO events and periodic refresh
  useEffect(() => {
    if (socket) {
      socket.on('shows_updated', () => {
        loadShows();
      });
    }
    const interval = setInterval(() => {
      loadShows();
    }, 25000);
    return () => clearInterval(interval);
  }, [id, selectedCity, selectedDate, socket]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Loading movie details &amp; showtimes...</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-3xl glass-panel text-center">
        <p className="text-rose-400 font-bold mb-4">{error || 'Movie not found'}</p>
        <Link href="/" className="px-5 py-2 rounded-full brand-btn text-xs font-bold text-white">
          Back to Catalog
        </Link>
      </div>
    );
  }

  // Safe strings helper to prevent React runtime error: Objects are not valid as a React child
  const genreList: string[] = Array.isArray(movie.genres)
    ? movie.genres.map((g: any) => (typeof g === 'string' ? g : g?.name || ''))
    : [];

  const castList: string[] = Array.isArray(movie.cast)
    ? movie.cast.map((c: any) => (typeof c === 'string' ? c : c?.name || ''))
    : [];

  return (
    <div className="w-full pb-24">
      {/* Top Banner Backdrop */}
      <div className="relative w-full h-[300px] sm:h-[400px] overflow-hidden">
        <img
          src={movie.banner_url || movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover object-center filter blur-xs brightness-40 transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090714] via-[#090714]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090714] via-transparent to-[#090714]/70" />

        {/* Back navigation */}
        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-xs font-semibold text-white transition-all hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Movies</span>
          </button>
        </div>
      </div>

      {/* Main Movie Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-36 sm:-mt-48 relative z-20 space-y-12">
        
        {/* Section 1: Poster & Information */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Poster Card */}
          <div className="w-60 sm:w-72 shrink-0 mx-auto md:mx-0">
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden glass-card border-2 border-white/15 shadow-2xl shadow-rose-950/40">
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Scroll To Booking Button */}
            <a
              href="#booking-section"
              className="mt-4 w-full py-3 rounded-2xl brand-btn text-white text-center text-sm font-bold tracking-wider uppercase shadow-lg shadow-rose-600/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              <span>Book Seats Below</span>
            </a>
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {movie.status === 'NOW_SHOWING' ? 'Now Showing' : 'Coming Soon'}
                </span>
                {movie.is_trending && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    🔥 Trending
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {movie.title}
              </h1>

              {/* Quick Metadata */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs sm:text-sm text-gray-300">
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-amber-300 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{movie.rating ? Number(movie.rating).toFixed(1) : '8.0'}/10</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>{movie.duration_mins ? `${Math.floor(movie.duration_mins / 60)}h ${movie.duration_mins % 60}m` : '2h 15m'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>{movie.language || 'Telugu'}</span>
                </div>

                {movie.release_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{new Date(movie.release_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              {/* Genres Pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {genreList.map((g, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-gray-200"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <div className="p-6 rounded-3xl glass-panel space-y-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Synopsis
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                {movie.synopsis || 'An action-packed cinema spectacle crafted for big-screen presentation with immersive sound, stunning cinematography, and compelling performances.'}
              </p>
            </div>

            {/* Crew & Cast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl glass-card">
                <span className="text-[11px] text-gray-400 uppercase font-semibold block">Director</span>
                <p className="text-sm font-bold text-white mt-0.5">{movie.director || 'Visionary Director'}</p>
              </div>
              <div className="p-4 rounded-2xl glass-card">
                <span className="text-[11px] text-gray-400 uppercase font-semibold block">Writer / Screenplay</span>
                <p className="text-sm font-bold text-white mt-0.5">{movie.writer || movie.director || 'Original Story'}</p>
              </div>
            </div>

            {castList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top Cast</h2>
                <div className="flex flex-wrap gap-2.5">
                  {castList.map((actor, idx) => (
                    <div key={idx} className="px-3.5 py-1.5 rounded-xl glass-card text-xs font-semibold text-gray-200 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-rose-400" />
                      <span>{actor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Video Playing Option Below (Directly Embedded YouTube Player!) */}
        {movie.trailer_url && (
          <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-4 border border-rose-500/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                <Film className="w-5 h-5 text-rose-500" />
                <span>Watch Official Trailer &amp; Teaser</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase">
                HD Player
              </span>
            </div>

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner">
              <iframe
                src={getEmbedUrl(movie.trailer_url)}
                title={`${movie.title} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}

        {/* Section 3: Booking Seats Shows and Timing Right Now */}
        <div id="booking-section" className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6 border border-white/15">
          
          {/* Advance Booking Banner for Coming Soon */}
          {isComingSoon && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold uppercase tracking-wider block text-amber-200">
                  Advance Booking Open (Next 2 Days)
                </span>
                <span className="text-gray-300">
                  This movie is <strong>Coming Soon</strong>. Same-day bookings are closed, but advance premiere screenings are open for Tomorrow &amp; Day 3!
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                <Ticket className="w-6 h-6 text-rose-500" />
                <span>Select City, Theatre &amp; Show Timing</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Choose a showtime to enter the interactive cinema seat map with real-time pessimistic locking
              </p>
            </div>

            {/* City Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] self-start">
              <MapPin className="w-4 h-4 text-rose-400 ml-2" />
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    selectedCity === city
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Date Selector Tabs (Dynamic real-time dates) */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {dates.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDate(d.value)}
                className={`px-5 py-3 rounded-2xl border text-center transition-all ${
                  selectedDate === d.value
                    ? 'bg-rose-500/20 border-rose-500/50 text-white shadow-lg shadow-rose-950/40'
                    : 'glass-card text-gray-400 hover:text-white'
                }`}
              >
                <span className="block text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  {d.label}
                </span>
                <span className="block text-sm font-black text-white mt-0.5">
                  {d.dateStr}
                </span>
              </button>
            ))}
          </div>

          {/* Shows Loading State */}
          {isShowsLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-7 h-7 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Loading theatres and shows in {selectedCity}...</p>
            </div>
          ) : theatres.length === 0 ? (
            <div className="py-12 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
              <Building2 className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-bold text-gray-300">
                {isComingSoon && selectedDate === 'today'
                  ? 'Same-day screenings are not available for Coming Soon movies.'
                  : `No shows currently scheduled in ${selectedCity} for ${dates.find((d) => d.value === selectedDate)?.label}.`}
              </p>
              <p className="text-xs text-gray-500">
                {isComingSoon
                  ? 'Please select Tomorrow or Day 3 to book advance premiere tickets.'
                  : 'Try switching to another city (e.g. Bengaluru, Hyderabad, Chennai) or select Tomorrow.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {theatres.map((theatre: any) => (
                <div
                  key={theatre.id}
                  className="p-5 sm:p-6 rounded-2xl glass-card flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10 hover:border-rose-500/40 transition-all"
                >
                  {/* Theatre Details */}
                  <div className="space-y-1.5 max-w-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-rose-400" />
                      <h3 className="text-base font-bold text-white tracking-wide">
                        {theatre.name}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{theatre.address}</span>
                    </p>
                    {theatre.amenities && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {theatre.amenities.map((am: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-gray-300">
                            {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Show Timing Buttons (Real-time Ended, Running, and Upcoming states) */}
                  <div className="flex-1 flex flex-wrap items-center gap-3">
                    {theatre.shows.map((show: any) => {
                      const startTime = new Date(show.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isEnded = show.show_status === 'ENDED' || new Date(show.end_time) <= new Date();
                      const isStarted = show.show_status === 'STARTED' || (!isEnded && new Date(show.start_time) <= new Date());

                      if (isEnded) {
                        return (
                          <div
                            key={show.id}
                            className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center min-w-[120px] opacity-40 cursor-not-allowed select-none"
                            title="This screening has concluded"
                          >
                            <span className="text-sm font-bold text-gray-500 line-through block">
                              {startTime}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 block uppercase mt-0.5">
                              Concluded
                            </span>
                            <span className="text-[9px] text-gray-500 block mt-0.5">
                              {show.screen_name}
                            </span>
                          </div>
                        );
                      }

                      if (isStarted) {
                        return (
                          <div
                            key={show.id}
                            className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center min-w-[120px] opacity-70 cursor-not-allowed select-none"
                            title="Movie is currently playing in cinema"
                          >
                            <span className="text-sm font-bold text-amber-300 block">
                              {startTime}
                            </span>
                            <span className="text-[10px] font-bold text-amber-400 block uppercase mt-0.5">
                              Running Now
                            </span>
                            <span className="text-[9px] text-gray-400 block mt-0.5">
                              {show.screen_name}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={show.id}
                          href={`/shows/${show.id}/seats`}
                          className="p-3.5 rounded-2xl glass-card border border-white/15 hover:border-rose-400 hover:bg-rose-500/20 transition-all text-center min-w-[120px] group shadow-md hover:scale-105"
                        >
                          <span className="text-sm font-black text-white group-hover:text-rose-300 block">
                            {startTime}
                          </span>
                          <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                            ₹{show.base_price}
                          </span>
                          <span className="text-[10px] text-gray-300 font-medium block mt-0.5">
                            {show.screen_name}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-semibold block">
                            {show.available_seats !== undefined ? `${show.available_seats} Available` : 'Available'}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pessimistic Lock Engine Badge */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Pessimistic Seat Locking:</strong> Selecting any showtime will open the live cinema grid where seats are locked in PostgreSQL for 5 minutes during checkout.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
