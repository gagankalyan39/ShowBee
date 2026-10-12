'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { movieAPI } from '@/lib/api';
import { Movie } from '@/types';
import { HeroCarousel } from '@/components/HeroCarousel';
import { FilterBar } from '@/components/FilterBar';
import { MovieSection } from '@/components/MovieSection';
import { MovieCard } from '@/components/MovieCard';
import { FeatureHighlights } from '@/components/FeatureHighlights';
import { TrailerModal } from '@/components/TrailerModal';
import { Film, AlertCircle, FilterX } from 'lucide-react';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams?.get('q') || '';

  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState(qParam);

  // Trailer Modal
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);

  // Sync searchQuery when URL param changes
  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    async function loadMovies() {
      try {
        setIsLoading(true);
        const res = await movieAPI.getAll({ limit: 50 });
        if (res.success && res.data) {
          setMovies(res.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch movies:', err);
        setError(err.message || 'Failed to connect to backend server');
      } finally {
        setIsLoading(false);
      }
    }
    loadMovies();
  }, []);

  const handleResetFilters = () => {
    setSelectedLanguage('');
    setSelectedGenre('');
    setSelectedPrice('');
    setSearchQuery('');
    router.replace('/', { scroll: false });
  };

  const isFilterActive = Boolean(selectedLanguage || selectedGenre || selectedPrice || searchQuery);

  // Filtered movies logic
  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesDirector = m.director?.toLowerCase().includes(q);
        const matchesCast = Array.isArray(m.cast) ? m.cast.some((c) => String(c).toLowerCase().includes(q)) : false;
        const matchesGenre = Array.isArray(m.genres) ? m.genres.some((g) => String(g).toLowerCase().includes(q)) : false;
        if (!matchesTitle && !matchesDirector && !matchesCast && !matchesGenre) return false;
      }

      if (selectedLanguage) {
        if (m.language_code !== selectedLanguage) return false;
      }

      if (selectedGenre) {
        const hasGenre = Array.isArray(m.genres) ? m.genres.some((g) => String(g).toLowerCase() === selectedGenre.toLowerCase()) : false;
        if (!hasGenre) return false;
      }

      return true;
    });
  }, [movies, searchQuery, selectedLanguage, selectedGenre]);

  // Categorized lists
  const trendingMovies = useMemo(() => {
    return filteredMovies.filter((m) => m.is_trending || Number(m.rating) >= 8.0);
  }, [filteredMovies]);

  const nowShowingMovies = useMemo(() => {
    return filteredMovies.filter((m) => m.status === 'NOW_SHOWING');
  }, [filteredMovies]);

  const comingSoonMovies = useMemo(() => {
    return filteredMovies.filter((m) => m.status === 'COMING_SOON');
  }, [filteredMovies]);

  const teluguMovies = useMemo(() => {
    return filteredMovies.filter((m) => m.language_code === 'tel');
  }, [filteredMovies]);

  const otherLanguagesMovies = useMemo(() => {
    return filteredMovies.filter((m) => m.language_code !== 'tel');
  }, [filteredMovies]);

  return (
    <div className="w-full pb-16">
      {/* 1. HERO BANNER 3D COVERFLOW (Matches Reference Image) */}
      <HeroCarousel
        movies={movies.filter((m) => m.is_trending)}
        onWatchTrailer={(movie) => setActiveTrailerMovie(movie)}
      />

      {/* 2. GLASS FILTER BAR (Matches Reference Image) */}
      <FilterBar
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedPrice={selectedPrice}
        onSelectPrice={setSelectedPrice}
        onReset={handleResetFilters}
      />

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-400">Loading cinema catalog from PostgreSQL...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="max-w-xl mx-auto my-8 p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Connection notice:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC CONTENT: FILTERED GRID OR CURATED SECTIONS */}
      {!isLoading && isFilterActive ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 my-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2.5">
                <Film className="w-6 h-6 text-rose-500" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'Filtered Results'} ({filteredMovies.length} {filteredMovies.length === 1 ? 'Movie' : 'Movies'})
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Showing matching titles for your active search &amp; filter criteria
              </p>
            </div>

            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-rose-300 self-start sm:self-auto transition-colors flex items-center gap-1.5"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>

          {filteredMovies.length === 0 ? (
            <div className="py-16 p-8 rounded-3xl glass-panel text-center space-y-3">
              <Film className="w-10 h-10 text-gray-500 mx-auto" />
              <p className="text-base font-bold text-gray-200">No movies match &quot;{searchQuery || 'selected filters'}&quot;</p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Try searching for another movie title, actor, or clearing active filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-5 py-2 rounded-full brand-btn text-xs font-bold text-white shadow-md"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onWatchTrailer={(m) => setActiveTrailerMovie(m)}
                />
              ))}
            </div>
          )}
        </div>
      ) : !isLoading ? (
        <>
          {/* TRENDING MOVIES */}
          {trendingMovies.length > 0 && (
            <MovieSection
              title="🔥 Trending Movies"
              movies={trendingMovies}
              onWatchTrailer={(movie) => setActiveTrailerMovie(movie)}
            />
          )}

          {/* NOW SHOWING IN CINEMAS */}
          {nowShowingMovies.length > 0 && (
            <MovieSection
              title="🎬 Now Showing in Theatres"
              movies={nowShowingMovies}
              onWatchTrailer={(movie) => setActiveTrailerMovie(movie)}
            />
          )}

          {/* TELUGU BLOCKBUSTERS */}
          {teluguMovies.length > 0 && (
            <MovieSection
              title="⭐ Telugu Cinema Highlights"
              movies={teluguMovies}
              onWatchTrailer={(movie) => setActiveTrailerMovie(movie)}
            />
          )}

          {/* MULTI-LANGUAGE HIGHLIGHTS */}
          {otherLanguagesMovies.length > 0 && (
            <MovieSection
              title="🌐 Multi-Language Premieres (Tamil, Kannada, Hindi)"
              movies={otherLanguagesMovies}
              onWatchTrailer={(movie) => setActiveTrailerMovie(movie)}
            />
          )}

          {/* COMING SOON */}
          {comingSoonMovies.length > 0 && (
            <MovieSection
              title="✨ Coming Soon"
              movies={comingSoonMovies}
              onWatchTrailer={(movie) => setActiveTrailerMovie(movie)}
            />
          )}
        </>
      ) : null}

      {/* 8. FEATURE HIGHLIGHTS (4 Bottom Cards matching Reference Image) */}
      <FeatureHighlights />

      {/* TRAILER MODAL (YouTube Player) */}
      <TrailerModal
        movie={activeTrailerMovie}
        onClose={() => setActiveTrailerMovie(null)}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Loading SHOWBEE Cinema Platform...</p>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
