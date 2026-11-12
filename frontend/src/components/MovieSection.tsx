'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
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
      const scrollAmount = direction === 'left' ? -480 : 480;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 my-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight section-title">
            {title}
          </h2>
          <span className="section-count-badge px-2.5 py-0.5 rounded-full text-xs font-bold">
            {movies.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="section-see-all-btn text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:scale-105"
            >
              See All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="section-scroll-btn p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="section-scroll-btn p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="w-[165px] sm:w-[195px] shrink-0"
          >
            <MovieCard movie={movie} onWatchTrailer={onWatchTrailer} />
          </div>
        ))}
      </div>
    </section>
  );
};
