'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { theatreAPI } from '@/lib/api';
import { Theatre } from '@/types';
import { Building2, MapPin, Film, Sparkles, ArrowRight, Compass, Loader2 } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';

export default function TheatresPage() {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const { 
    selectedCity, 
    setSelectedCity, 
    cities, 
    isLocating, 
    detectLocation, 
    locationStatus 
  } = useLocation();
  const [filterCity, setFilterCity] = useState(selectedCity);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with global location
  useEffect(() => {
    setFilterCity(selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const tRes = await theatreAPI.getAll(filterCity ? { city: filterCity } : {});
        if (tRes.success) setTheatres(tRes.data);
      } catch (err) {
        console.error('Failed to load theatres:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [filterCity]);

  const handleCityChange = (city: string) => {
    setFilterCity(city);
    if (city) {
      setSelectedCity(city);
    }
  };

  const handleGPSDetect = async () => {
    const detected = await detectLocation();
    if (detected) {
      setFilterCity(detected);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-rose-500" />
            <span>Cinema Theatres &amp; Multiplexes</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse top multiplex chains with IMAX, 4DX, and Dolby Atmos audio in <span className="text-rose-400 font-bold">{filterCity || 'All Cities'}</span>
          </p>
          {locationStatus && (
            <p className="text-[11px] text-amber-300 mt-1.5 flex items-center gap-1 font-medium">
              <span>{locationStatus}</span>
            </p>
          )}
        </div>

        {/* City Filter & GPS Button */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            onClick={handleGPSDetect}
            disabled={isLocating}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Use device GPS to locate nearest cinema city"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-rose-400" />
                <span>Locate via GPS</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.06]">
            <button
              onClick={() => handleCityChange('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filterCity === '' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              All Cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => handleCityChange(city)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterCity === city ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Loading theatres from PostgreSQL...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {theatres.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-3xl glass-card flex flex-col justify-between space-y-4 hover:border-rose-500/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                    {t.city}
                  </span>
                  <span className="text-[11px] text-gray-400 font-semibold">
                    {t.screen_count || 3} Screens
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white tracking-wide">
                  {t.name}
                </h2>

                <p className="text-xs text-gray-400 leading-relaxed flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{t.address}</span>
                </p>

                {t.amenities && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {t.amenities.map((a: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[10px] text-gray-300 font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href={`/theatres/${t.id}`}
                className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-rose-600/80 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all mt-4"
              >
                <span>View Screen Timings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
