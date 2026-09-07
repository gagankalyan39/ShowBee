'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '@/types';
import { MovieCard } from './MovieCard';

interface MovieSectionProps {
  title: string;
  movies: Movie[];
  seeAllHref?: string;
  onWatchTrailer?: (movie: Movie) => void;
}

export const MovieSection: React.FC<MovieSectionProps> = ({
  title,
  movies,
  seeAllHref,
  onWatchTrailer,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -450 : 450;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 my-8">
      {/* Header with Title and Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            {title}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-gray-300 text-xs font-semibold">
            {movies.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              See All <span className="text-[10px]">›</span>
            </Link>
          )}

          {/* Left/Right scroll buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="p-1.5 sm:p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-gray-300 hover:text-white transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="p-1.5 sm:p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-gray-300 hover:text-white transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 scroll-smooth scrollbar-none"
      >
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="w-[180px] sm:w-[210px] shrink-0"
          >
            <MovieCard movie={movie} onWatchTrailer={onWatchTrailer} />
          </div>
        ))}
      </div>
    </section>
  );
};
