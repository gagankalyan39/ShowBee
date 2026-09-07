'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, Heart, Play } from 'lucide-react';
import { Movie } from '@/types';

interface MovieCardProps {
  movie: Movie;
  onWatchTrailer?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onWatchTrailer }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWatchTrailer) {
      onWatchTrailer(movie);
    }
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-card flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-rose-950/30">
      
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
        <img
          src={movie.poster_url}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />

        {/* Dark gradient on bottom of image for seamless text blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#140f28] via-transparent to-black/20" />

        {/* Play Trailer Overlay Button */}
        {movie.trailer_url && (
          <button
            onClick={handleTrailerClick}
            aria-label="Play Trailer"
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]"
          >
            <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </button>
        )}

        {/* Trending / Status Tag */}
        {movie.is_trending && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/90 text-white shadow-md">
            Trending
          </span>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={toggleFavorite}
          aria-label="Add to favorites"
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white transition-colors"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-300 hover:text-white'
            }`}
          />
        </button>
      </div>

      {/* Movie Details Footer */}
      <Link href={`/movies/${movie.id}`} className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide truncate group-hover:text-rose-400 transition-colors">
            {movie.title}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {movie.language || 'Telugu'}
          </p>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {movie.genres && movie.genres.length > 0 ? movie.genres.join(', ') : 'Action, Drama'}
          </p>
        </div>

        {/* Rating & Action */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold text-gray-100">
              {movie.rating ? Number(movie.rating).toFixed(1) : '8.0'}
            </span>
          </div>

          <span className="text-[11px] font-bold text-rose-400 group-hover:underline">
            Book →
          </span>
        </div>
      </Link>

    </div>
  );
};
