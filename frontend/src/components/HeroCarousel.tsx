'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Ticket, Star, Clock, Flame } from 'lucide-react';
import { Movie } from '@/types';

interface HeroCarouselProps {
  movies: Movie[];
  onWatchTrailer: (movie: Movie) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ movies, onWatchTrailer }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const featured = movies.length > 0 ? movies.slice(0, 8) : [];

  const goTo = useCallback((idx: number, dir: 'left' | 'right' = 'right') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setCurrentIndex(idx);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  useEffect(() => {
    if (featured.length === 0) return;
    const interval = setInterval(() => {
      goTo((currentIndex + 1) % featured.length, 'right');
    }, 6000);
    return () => clearInterval(interval);
  }, [featured.length, currentIndex, goTo]);

  if (featured.length === 0) {
    return (
      <div className="w-full h-[500px] rounded-3xl hero-skeleton my-6 mx-auto max-w-7xl px-4" />
    );
  }

  const currentMovie = featured[currentIndex];
  const prevIndex = (currentIndex - 1 + featured.length) % featured.length;
  const nextIndex = (currentIndex + 1) % featured.length;
  const prevMovie = featured[prevIndex];
  const nextMovie = featured[nextIndex];

  // Always use banner_url first, then fallback to poster_url
  const getImageUrl = (movie: Movie) => movie.banner_url || movie.poster_url;

  const handlePrev = () => {
    goTo(prevIndex, 'left');
  };

  const handleNext = () => {
    goTo(nextIndex, 'right');
  };

  return (
    <div className="relative w-full my-6 select-none overflow-hidden">
      {/* Ambient background glow that matches current movie */}
      <div
        className="absolute inset-0 opacity-20 blur-3xl scale-110 transition-all duration-1000 pointer-events-none"
        style={{
          backgroundImage: `url(${getImageUrl(currentMovie)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-center min-h-[480px] sm:min-h-[540px]">

        {/* LEFT NAV BUTTON */}
        <button
          onClick={handlePrev}
          aria-label="Previous featured movie"
          className="absolute left-2 sm:left-4 z-40 p-3 rounded-2xl hero-nav-btn text-white transition-all duration-300 hover:scale-110 group"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* RIGHT NAV BUTTON */}
        <button
          onClick={handleNext}
          aria-label="Next featured movie"
          className="absolute right-2 sm:right-4 z-40 p-3 rounded-2xl hero-nav-btn text-white transition-all duration-300 hover:scale-110 group"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* LEFT SIDE CARD — uses banner_url first */}
        <div
          onClick={handlePrev}
          className="hero-side-card hero-side-card-left hidden lg:block absolute left-6 xl:left-12 w-56 xl:w-64 h-[380px] xl:h-[420px] rounded-3xl overflow-hidden cursor-pointer"
          style={{ transform: 'perspective(1200px) rotateY(18deg) scale(0.82)', transformOrigin: 'right center' }}
        >
          <img
            src={getImageUrl(prevMovie)}
            alt={prevMovie.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs font-bold text-white/90 uppercase tracking-wider truncate drop-shadow-lg">{prevMovie.title}</p>
          </div>
          {/* Edge fade */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#09071480] pointer-events-none" />
        </div>

        {/* CENTER ACTIVE CARD */}
        <div className="relative z-20 w-full max-w-[860px] h-[440px] sm:h-[500px] rounded-3xl overflow-hidden hero-main-card">
          {/* Background Image */}
          <img
            key={currentMovie.id}
            src={getImageUrl(currentMovie)}
            alt={currentMovie.title}
            className={`w-full h-full object-cover object-center transition-all duration-700 ${isAnimating ? 'scale-110 opacity-80' : 'scale-105 opacity-100'}`}
            style={{ transformOrigin: direction === 'right' ? 'left center' : 'right center' }}
          />

          {/* Cinematic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0710]/98 via-[#0a0710]/65 to-[#0a0710]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0710]/95 via-transparent to-black/25" />

          {/* Decorative glass orbs */}
          <div className="absolute top-6 right-8 w-32 h-32 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-10 right-16 w-40 h-40 rounded-full bg-purple-500/8 blur-3xl pointer-events-none" />

          {/* Content */}
          <div className="absolute inset-0 p-7 sm:p-10 flex flex-col justify-between z-10">
            {/* Top: Badges row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-widest uppercase hero-trending-badge">
                  <Flame className="w-3 h-3" />
                  Trending
                </span>
                {currentMovie.status === 'NOW_SHOWING' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase hero-showing-badge">
                    Now Showing
                  </span>
                )}
                {currentMovie.status === 'COMING_SOON' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase hero-soon-badge">
                    Coming Soon
                  </span>
                )}
              </div>
              {currentMovie.rating && (
                <div className="hero-rating-badge flex items-center gap-1.5 px-3 py-1.5 rounded-xl">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-amber-300 text-sm font-black">{Number(currentMovie.rating).toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Middle: Title & meta */}
            <div className="space-y-3 max-w-[560px]">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none hero-title-glow">
                {currentMovie.title}
              </h1>

              {currentMovie.cast && currentMovie.cast.length > 0 && (
                <p className="text-sm sm:text-base text-gray-200/90 font-medium tracking-wide">
                  {currentMovie.cast.slice(0, 3).join(' · ')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-1">
                {currentMovie.genres && currentMovie.genres.slice(0, 3).map((g: string, i: number) => (
                  <span key={i} className="hero-genre-chip px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    {g}
                  </span>
                ))}
                {currentMovie.duration_mins && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {Math.floor(currentMovie.duration_mins / 60)}h {currentMovie.duration_mins % 60}m
                  </span>
                )}
              </div>
            </div>

            {/* Bottom: Actions + dots */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/movies/${currentMovie.id}/book`}
                  className="hero-book-btn px-6 sm:px-8 py-3 rounded-2xl text-white text-sm font-black tracking-wider uppercase flex items-center gap-2.5 shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Book Tickets</span>
                </Link>

                <button
                  onClick={() => onWatchTrailer(currentMovie)}
                  className="hero-trailer-btn px-5 sm:px-7 py-3 rounded-2xl text-white text-sm font-semibold flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Trailer</span>
                </button>
              </div>

              {/* Dots */}
              <div className="flex items-center gap-2 hero-dots-container px-3 py-2 rounded-2xl">
                {featured.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goTo(idx, idx > currentIndex ? 'right' : 'left')}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`rounded-full transition-all duration-400 ${
                      idx === currentIndex
                        ? 'w-7 h-2.5 bg-rose-500 shadow-lg shadow-rose-500/60'
                        : 'w-2.5 h-2.5 bg-white/25 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE CARD — uses banner_url first */}
        <div
          onClick={handleNext}
          className="hero-side-card hero-side-card-right hidden lg:block absolute right-6 xl:right-12 w-56 xl:w-64 h-[380px] xl:h-[420px] rounded-3xl overflow-hidden cursor-pointer"
          style={{ transform: 'perspective(1200px) rotateY(-18deg) scale(0.82)', transformOrigin: 'left center' }}
        >
          <img
            src={getImageUrl(nextMovie)}
            alt={nextMovie.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/50" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs font-bold text-white/90 uppercase tracking-wider truncate drop-shadow-lg">{nextMovie.title}</p>
          </div>
          {/* Edge fade */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#09071480] pointer-events-none" />
        </div>

      </div>
    </div>
  );
};
