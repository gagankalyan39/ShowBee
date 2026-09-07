'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { movieAPI } from '@/lib/api';
import { Movie, Theatre } from '@/types';
import { MapPin, Calendar, Clock, ArrowLeft, Building2, Sparkles } from 'lucide-react';

import { getBookingDates } from '@/lib/dateUtils';

export default function BookMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params?.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [selectedDate, setSelectedDate] = useState('today');
  const [isLoading, setIsLoading] = useState(true);

  const isComingSoon = movie?.status === 'COMING_SOON';
  const dates = getBookingDates(isComingSoon);
  const cities = ['Bengaluru', 'Hyderabad', 'Chennai'];

  useEffect(() => {
    if (!movieId) return;

    async function loadData() {
      try {
        setIsLoading(true);
        const [movieRes, showsRes] = await Promise.all([
          movieAPI.getById(movieId),
          movieAPI.getShows(movieId, selectedCity, selectedDate),
        ]);

        if (movieRes.success && movieRes.data) {
          setMovie(movieRes.data);
          if (movieRes.data.status === 'COMING_SOON' && selectedDate === 'today') {
            setSelectedDate('tomorrow');
          }
        }
        if (showsRes.success) setTheatres(showsRes.data);
      } catch (err) {
        console.error('Failed to load shows:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [movieId, selectedCity, selectedDate]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to details
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            {movie ? `${movie.title} – Select Theatre & Showtime` : 'Select Showtime'}
          </h1>
          {movie && (
            <p className="text-xs text-gray-400 mt-1">
              {movie.language || 'Telugu'} • {movie.genres?.join(', ') || 'Action'} • {movie.duration_mins || 150} mins
            </p>
          )}
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-2 bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.06] self-start">
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

      {/* Date Selector Tabs */}
      <div className="flex items-center gap-3 my-6 overflow-x-auto pb-2">
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

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Loading theatres and active shows...</p>
        </div>
      )}

      {/* Theatres List */}
      {!isLoading && (
        <div className="space-y-4">
          {theatres.length === 0 ? (
            <div className="py-12 p-8 rounded-3xl glass-panel text-center">
              <Building2 className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-300">No shows currently listed for {selectedCity} on this date.</p>
              <p className="text-xs text-gray-500 mt-1">Try selecting another city like Bengaluru or another date.</p>
            </div>
          ) : (
            theatres.map((theatre: any) => (
              <div
                key={theatre.id}
                className="p-6 rounded-3xl glass-panel hover:border-rose-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Theatre Info */}
                <div className="space-y-2 max-w-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-rose-400" />
                    <h2 className="text-base font-bold text-white tracking-wide">
                      {theatre.name}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-400">{theatre.address}</p>
                  
                  {theatre.amenities && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {theatre.amenities.map((am: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] text-gray-300">
                          {am}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Showtimes Pills */}
                <div className="flex-1 flex flex-wrap items-center gap-3">
                  {theatre.shows.map((show: any) => {
                    const startTime = new Date(show.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isEnded = show.show_status === 'ENDED' || new Date(show.end_time) <= new Date();

                    if (isEnded) {
                      return (
                        <div
                          key={show.id}
                          className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center min-w-[110px] opacity-40 cursor-not-allowed select-none"
                          title="Screening has already concluded (Archived in database)"
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

                    return (
                      <Link
                        key={show.id}
                        href={`/shows/${show.id}/seats`}
                        className="p-3 rounded-2xl glass-card border border-white/10 hover:border-rose-400 hover:bg-rose-500/15 transition-all text-center min-w-[110px] group shadow-sm hover:scale-105"
                      >
                        <span className="text-sm font-black text-white group-hover:text-rose-300 block">
                          {startTime}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">
                          ₹{show.base_price}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">
                          {show.screen_name} ({show.screen_type})
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
