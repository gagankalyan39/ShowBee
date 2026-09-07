'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { theatreAPI } from '@/lib/api';
import { Building2, MapPin, ArrowLeft, Clock, Ticket, Film, Sparkles } from 'lucide-react';

export default function TheatreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [theatre, setTheatre] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    theatreAPI
      .getById(id)
      .then((res) => {
        if (res.success) setTheatre(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400">Loading theatre information &amp; screenings...</p>
      </div>
    );
  }

  if (!theatre) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl glass-panel text-center">
        <p className="text-rose-400 font-bold mb-4">Theatre not found</p>
        <Link href="/theatres" className="px-5 py-2 rounded-full brand-btn text-xs font-bold text-white">
          Back to Theatres
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-24 space-y-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to theatres
      </button>

      {/* Theatre Profile Card */}
      <div className="p-8 rounded-3xl glass-panel space-y-4 border border-white/15">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {theatre.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase mt-1 inline-block">
                {theatre.city}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-300 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{theatre.address}</span>
        </p>

        {theatre.amenities && (
          <div className="flex flex-wrap gap-2 pt-2">
            {theatre.amenities.map((a: string, i: number) => (
              <span key={i} className="px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-gray-200">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Shows Currently Playing */}
      {theatre.shows && theatre.shows.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Film className="w-5 h-5 text-rose-500" />
            <span>Now Showing at this Multiplex</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {theatre.shows.map((show: any) => {
              const startTime = new Date(show.start_time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={show.id}
                  className="p-5 rounded-3xl glass-card flex items-center justify-between gap-4 border border-white/10 hover:border-rose-500/40 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    {show.poster_url && (
                      <img
                        src={show.poster_url}
                        alt={show.movie_title}
                        className="w-14 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                    )}
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white uppercase">{show.movie_title}</h3>
                      <p className="text-xs text-rose-400 font-semibold">{show.screen_name}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(show.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • <strong className="text-white">{startTime}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-400 block mb-2">₹{show.base_price}</span>
                    {show.show_status === 'ENDED' || new Date(show.end_time) <= new Date() ? (
                      <span className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-500 text-xs font-bold block select-none cursor-not-allowed">
                        Concluded
                      </span>
                    ) : (
                      <Link
                        href={`/shows/${show.id}/seats`}
                        className="px-4 py-2 rounded-xl brand-btn text-white text-xs font-bold flex items-center gap-1 shadow-md hover:scale-105 transition-all"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Book Seats</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Screens list */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">
          Auditoriums &amp; Screens ({theatre.screens?.length || 0})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {theatre.screens?.map((screen: any) => (
            <div key={screen.id} className="p-5 rounded-2xl glass-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white uppercase">{screen.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  {screen.screen_type}
                </span>
              </div>
              <p className="text-xs text-gray-400">Total Capacity: <strong>{screen.capacity} seats</strong></p>
              <p className="text-xs text-gray-400">Audio: <strong>{screen.sound_system || 'Dolby Atmos 7.1'}</strong></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
