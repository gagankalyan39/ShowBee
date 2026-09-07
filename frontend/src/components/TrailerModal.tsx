'use client';

import React, { useEffect } from 'react';
import { X, Play, Film } from 'lucide-react';
import { Movie } from '@/types';

interface TrailerModalProps {
  movie: Movie | null;
  onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ movie, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!movie || !movie.trailer_url) return null;

  // Extract YouTube ID from url
  const getEmbedUrl = (url: string) => {
    try {
      let videoId = '';
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
    } catch {
      return url;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-[#130f24] rounded-3xl overflow-hidden border border-white/15 shadow-2xl shadow-rose-950/50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1a1433]/80">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-rose-400" />
            <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              {movie.title} – Official Trailer
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close trailer"
            className="p-1.5 rounded-full bg-white/10 hover:bg-rose-600 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player (16:9 ratio) */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={getEmbedUrl(movie.trailer_url)}
            title={`${movie.title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Footer info */}
        <div className="p-4 sm:p-5 flex items-center justify-between bg-[#110c22]">
          <div className="text-xs text-gray-300">
            <span className="font-semibold text-white">{movie.director ? `Director: ${movie.director}` : ''}</span>
            {movie.genres && <span className="text-gray-400 ml-2">• {movie.genres.join(', ')}</span>}
          </div>

          <a
            href={`/movies/${movie.id}/book`}
            className="px-5 py-2 rounded-full brand-btn text-white text-xs font-bold uppercase tracking-wider shadow-md hover:scale-105 transition-all"
          >
            Book Tickets Now
          </a>
        </div>
      </div>
    </div>
  );
};
