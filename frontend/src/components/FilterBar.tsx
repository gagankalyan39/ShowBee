'use client';

import React, { useState } from 'react';
import { Calendar, Globe2, Clapperboard, IndianRupee, SlidersHorizontal, ChevronDown, X, Check } from 'lucide-react';
import { getBookingDates } from '@/lib/dateUtils';

interface FilterBarProps {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPrice: string;
  onSelectPrice: (price: string) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedLanguage,
  onSelectLanguage,
  selectedGenre,
  onSelectGenre,
  selectedDate,
  onSelectDate,
  selectedPrice,
  onSelectPrice,
  onReset,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const languages = [
    { label: 'All Languages', value: '' },
    { label: 'Telugu', value: 'tel' },
    { label: 'Tamil', value: 'tam' },
    { label: 'Kannada', value: 'kan' },
    { label: 'Hindi', value: 'hin' },
    { label: 'English', value: 'eng' },
  ];

  const genres = [
    { label: 'All Genres', value: '' },
    { label: 'Action', value: 'action' },
    { label: 'Drama', value: 'drama' },
    { label: 'Comedy', value: 'comedy' },
    { label: 'Romance', value: 'romance' },
    { label: 'Thriller', value: 'thriller' },
    { label: 'Horror', value: 'horror' },
    { label: 'Sports', value: 'sports' },
  ];

  const dynamicDates = getBookingDates();
  const dates = dynamicDates.map((d) => ({
    label: `${d.label}, ${d.dateStr}`,
    value: d.value,
  }));

  const prices = [
    { label: 'All Prices', value: '' },
    { label: 'Under ₹200', value: 'under200' },
    { label: '₹200 - ₹300', value: '200to300' },
    { label: 'Above ₹300', value: 'above300' },
  ];

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const getLanguageLabel = () => languages.find((l) => l.value === selectedLanguage)?.label || 'All Languages';
  const getGenreLabel = () => genres.find((g) => g.value === selectedGenre)?.label || 'All Genres';
  const getDateLabel = () => dates.find((d) => d.value === selectedDate)?.label || dates[0]?.label || 'Today';
  const getPriceLabel = () => prices.find((p) => p.value === selectedPrice)?.label || 'All Prices';

  const hasActiveFilters = Boolean(selectedLanguage || selectedGenre || selectedPrice);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 my-6 relative z-50">
      {/* Click outside backdrop when dropdown is open */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]"
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* Main Filter Bar */}
      <div className="p-3 rounded-2xl glass-panel flex flex-wrap items-center justify-between gap-3 relative z-[65]">
        
        {/* Filter 1: Date */}
        <div className="relative flex-1 min-w-[150px]">
          <button
            type="button"
            onClick={() => toggleDropdown('date')}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              selectedDate !== 'today'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-sm'
                : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/[0.08] text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="text-left truncate">
                <span className="text-[10px] text-gray-400 block">Select Date</span>
                <span className="font-semibold text-white truncate">{getDateLabel()}</span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${openDropdown === 'date' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'date' && (
            <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#130d24] border border-rose-500/30 shadow-2xl py-2 z-[70] animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Day</div>
              {dates.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => {
                    onSelectDate(d.value);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    selectedDate === d.value ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-gray-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{d.label}</span>
                  {selectedDate === d.value && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter 2: Language */}
        <div className="relative flex-1 min-w-[150px]">
          <button
            type="button"
            onClick={() => toggleDropdown('language')}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              selectedLanguage
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/[0.08] text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Globe2 className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="text-left truncate">
                <span className="text-[10px] text-gray-400 block">Language</span>
                <span className="font-semibold text-white truncate">{getLanguageLabel()}</span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${openDropdown === 'language' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'language' && (
            <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#130d24] border border-rose-500/30 shadow-2xl py-2 z-[70] animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Language</div>
              {languages.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => {
                    onSelectLanguage(l.value);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    selectedLanguage === l.value ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-gray-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{l.label}</span>
                  {selectedLanguage === l.value && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter 3: Genre */}
        <div className="relative flex-1 min-w-[150px]">
          <button
            type="button"
            onClick={() => toggleDropdown('genre')}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              selectedGenre
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/[0.08] text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Clapperboard className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-left truncate">
                <span className="text-[10px] text-gray-400 block">Genre</span>
                <span className="font-semibold text-white truncate">{getGenreLabel()}</span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${openDropdown === 'genre' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'genre' && (
            <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#130d24] border border-rose-500/30 shadow-2xl py-2 z-[70] animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
              <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Genre</div>
              {genres.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => {
                    onSelectGenre(g.value);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    selectedGenre === g.value ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-gray-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{g.label}</span>
                  {selectedGenre === g.value && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter 4: Price Range */}
        <div className="relative flex-1 min-w-[150px]">
          <button
            type="button"
            onClick={() => toggleDropdown('price')}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              selectedPrice
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/[0.08] text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <IndianRupee className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left truncate">
                <span className="text-[10px] text-gray-400 block">Price Range</span>
                <span className="font-semibold text-white truncate">{getPriceLabel()}</span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'price' && (
            <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#130d24] border border-rose-500/30 shadow-2xl py-2 z-[70] animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filter Price</div>
              {prices.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    onSelectPrice(p.value);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    selectedPrice === p.value ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{p.label}</span>
                  {selectedPrice === p.value && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Active Filter Badges - Shows clearly what is selected! */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-400 text-[11px] font-semibold">Active filters:</span>
          {selectedLanguage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-medium">
              Language: {getLanguageLabel()}
              <button onClick={() => onSelectLanguage('')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedGenre && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium">
              Genre: {getGenreLabel()}
              <button onClick={() => onSelectGenre('')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedPrice && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium">
              Price: {getPriceLabel()}
              <button onClick={() => onSelectPrice('')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button
            onClick={onReset}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 ml-2 underline underline-offset-2"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
