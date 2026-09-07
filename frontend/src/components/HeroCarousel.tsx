'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Ticket } from 'lucide-react';
import { Movie } from '@/types';

interface HeroCarouselProps {
  movies: Movie[];
  onWatchTrailer: (movie: Movie) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ movies, onWatchTrailer }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Take the first 6 movies or trending ones
  const featured = movies.length > 0 ? movies.slice(0, 6) : [];

  useEffect(() => {
    if (featured.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (featured.length === 0) {
    return (
      <div className="w-full h-80 sm:h-96 rounded-3xl bg-white/[0.03] animate-pulse my-6" />
    );
  }

  const currentMovie = featured[currentIndex];
  const prevIndex = (currentIndex - 1 + featured.length) % featured.length;
  const nextIndex = (currentIndex + 1) % featured.length;
  const prevMovie = featured[prevIndex];
  const nextMovie = featured[nextIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  return (
    <div className="relative w-full my-6 overflow-hidden select-none px-2 sm:px-4">
      {/* 3D Coverflow Container */}
      <div className="relative max-w-7xl mx-auto flex items-center justify-center min-h-[360px] sm:min-h-[420px]">
        
        {/* Left Arrow Button */}
        <button
          onClick={handlePrev}
          aria-label="Previous featured movie"
          className="absolute left-2 sm:left-4 z-30 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-rose-600/80 backdrop-blur-md border border-white/20 text-white transition-all shadow-xl hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={handleNext}
          aria-label="Next featured movie"
          className="absolute right-2 sm:right-4 z-30 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-rose-600/80 backdrop-blur-md border border-white/20 text-white transition-all shadow-xl hover:scale-110"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* LEFT PREVIEW CARD (Tilted 3D look) */}
        <div 
          onClick={handlePrev}
          className="hidden lg:block absolute left-8 w-64 h-[340px] rounded-3xl overflow-hidden opacity-40 hover:opacity-75 transition-all duration-500 cursor-pointer transform -rotate-y-12 scale-90 border border-white/10 shadow-2xl"
          style={{ transform: 'perspective(1000px) rotateY(15deg) scale(0.85)' }}
        >
          <img
            src={prevMovie.poster_url}
            alt={prevMovie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-sm font-bold text-white uppercase tracking-wider truncate">{prevMovie.title}</p>
          </div>
        </div>

        {/* CENTER ACTIVE MAIN CARD */}
        <div className="relative z-20 w-full max-w-4xl h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-white/15 shadow-2xl shadow-rose-950/40 group">
          {/* Background Poster Image */}
          <img
            src={currentMovie.banner_url || currentMovie.poster_url}
            alt={currentMovie.title}
            className="w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-700"
          />

          {/* Cinematic Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0a17]/95 via-[#0d0a17]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a17] via-transparent to-black/30" />

          {/* Movie Details Content */}
          <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-between z-10">
            {/* Top Badge */}
            <div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md">
                🔥 Trending
              </span>
            </div>

            {/* Middle Title & Cast */}
            <div className="space-y-2 max-w-xl">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase drop-shadow-md">
                {currentMovie.title}
              </h1>

              {currentMovie.cast && currentMovie.cast.length > 0 && (
                <p className="text-sm sm:text-base text-gray-200 font-medium">
                  {currentMovie.cast.slice(0, 3).join(' | ')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 font-normal">
                {currentMovie.genres && (
                  <span>{currentMovie.genres.join(' • ')}</span>
                )}
                {currentMovie.duration_mins && (
                  <>
                    <span>•</span>
                    <span>{Math.floor(currentMovie.duration_mins / 60)}h {currentMovie.duration_mins % 60}m</span>
                  </>
                )}
                {currentMovie.rating && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">★ {Number(currentMovie.rating).toFixed(1)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Action Buttons & Dots */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <Link
                  href={`/movies/${currentMovie.id}/book`}
                  className="px-6 py-2.5 rounded-full brand-btn text-white text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-rose-600/40 hover:scale-105 transition-all"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Book Tickets</span>
                </Link>

                <button
                  onClick={() => onWatchTrailer(currentMovie)}
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Watch Trailer</span>
                </button>
              </div>

              {/* Dots Pagination */}
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {featured.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex ? 'w-6 bg-rose-500' : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW CARD (Tilted 3D look) */}
        <div 
          onClick={handleNext}
          className="hidden lg:block absolute right-8 w-64 h-[340px] rounded-3xl overflow-hidden opacity-40 hover:opacity-75 transition-all duration-500 cursor-pointer transform rotate-y-12 scale-90 border border-white/10 shadow-2xl"
          style={{ transform: 'perspective(1000px) rotateY(-15deg) scale(0.85)' }}
        >
          <img
            src={nextMovie.poster_url}
            alt={nextMovie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-sm font-bold text-white uppercase tracking-wider truncate">{nextMovie.title}</p>
          </div>
        </div>

      </div>
    </div>
  );
};
