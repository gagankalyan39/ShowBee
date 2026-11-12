'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, Heart, Play, Clock, Ticket } from 'lucide-react';
import { Movie } from '@/types';

interface MovieCardProps {
  movie: Movie;
  onWatchTrailer?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onWatchTrailer }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imgError, setImgError] = useState(false);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWatchTrailer) onWatchTrailer(movie);
  };

  const ratingVal = movie.rating ? Number(movie.rating) : null;
  const ratingColor = ratingVal && ratingVal >= 8 ? 'text-emerald-400' : ratingVal && ratingVal >= 6.5 ? 'text-amber-400' : 'text-gray-400';

  return (
    <div className="movie-card group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-400">

      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#120d20]">
        {!imgError ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transform group-hover:scale-108 transition-transform duration-600 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1035] to-[#0d0a1c]">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🎬</div>
              <p className="text-xs text-gray-500 font-medium">{movie.title}</p>
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0714]/95 via-[#0a0714]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0714]/70 via-transparent to-transparent" />

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover:from-white/[0.03] group-hover:via-white/[0.02] group-hover:to-transparent transition-all duration-500 pointer-events-none" />

        {/* Trailer button - center hover overlay */}
        {movie.trailer_url && (
          <button
            onClick={handleTrailerClick}
            aria-label="Play Trailer"
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <div className="movie-card-play-btn w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
          </button>
        )}

        {/* TOP BADGES */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {movie.is_trending && (
            <span className="movie-card-trending-badge px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
              🔥 Hot
            </span>
          )}
          {movie.status === 'COMING_SOON' && (
            <span className="movie-card-soon-badge px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
              Soon
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={toggleFavorite}
          aria-label="Add to favorites"
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl movie-card-fav-btn flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${
              isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white/70'
            }`}
          />
        </button>

        {/* Rating chip - bottom left of image */}
        {ratingVal && (
          <div className="absolute bottom-2.5 left-2.5 movie-card-rating flex items-center gap-1 px-2 py-1 rounded-lg">
            <Star className={`w-3 h-3 fill-current ${ratingColor}`} />
            <span className={`text-[11px] font-black ${ratingColor}`}>{ratingVal.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <Link href={`/movies/${movie.id}`} className="movie-card-footer p-3.5 flex flex-col gap-1.5 flex-1">
        <h2 className="text-sm font-black text-white tracking-wide truncate group-hover:text-rose-300 transition-colors duration-200 leading-tight">
          {movie.title}
        </h2>

        <div className="flex items-center gap-1.5 flex-wrap">
          {movie.language && (
            <span className="movie-card-lang-chip text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
              {movie.language}
            </span>
          )}
          {movie.genres && Array.isArray(movie.genres) && movie.genres.slice(0, 2).map((g: string, i: number) => (
            <span key={i} className="text-[10px] text-gray-500 font-medium">{i > 0 ? '· ' : ''}{g}</span>
          ))}
        </div>

        {movie.duration_mins && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="w-2.5 h-2.5" />
            <span>{Math.floor(movie.duration_mins / 60)}h {movie.duration_mins % 60}m</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.05]">
          <span className="text-[10px] text-gray-500">
            {movie.status === 'NOW_SHOWING' ? '🟢 In Theatres' : movie.status === 'COMING_SOON' ? '🔵 Coming Soon' : ''}
          </span>
          <span className="text-[10px] font-black text-rose-400 group-hover:text-rose-300 flex items-center gap-1 transition-colors">
            <Ticket className="w-2.5 h-2.5" />
            Book
          </span>
        </div>
      </Link>
    </div>
  );
};
