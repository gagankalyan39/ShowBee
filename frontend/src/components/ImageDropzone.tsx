'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { adminAPI } from '@/lib/api';

interface ImageDropzoneProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: 'poster' | 'banner' | 'square';
  placeholder?: string;
}

export default function ImageDropzone({
  label,
  sublabel,
  value,
  onChange,
  aspectRatio = 'poster',
  placeholder = 'https://...',
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<'drop' | 'url'>('drop');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClass =
    aspectRatio === 'poster'
      ? 'aspect-[2/3] max-w-[210px]'
      : aspectRatio === 'banner'
      ? 'aspect-[16/9] w-full max-w-[420px]'
      : 'aspect-square max-w-[180px]';

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, etc.)');
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          setIsUploading(false);
          return;
        }

        try {
          const res = await adminAPI.uploadImage(dataUrl, file.name);
          if (res.success && res.url) {
            onChange(res.url);
          } else {
            // Fallback directly to the base64 dataUrl
            onChange(dataUrl);
          }
        } catch {
          // If network error, still allow dataUrl preview
          onChange(dataUrl);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read image file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
          {sublabel && <p className="text-[11px] text-slate-400">{sublabel}</p>}
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-slate-900/60 rounded-lg border border-slate-700/50 text-[11px]">
          <button
            type="button"
            onClick={() => setMode('drop')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              mode === 'drop'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Drag / Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              mode === 'url'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct URL
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <div className="space-y-2">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-slate-500"
          />
          {value && (
            <div className="relative group rounded-xl overflow-hidden border border-slate-700/60 bg-black/40 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Preview"
                className={`object-cover rounded-xl ${aspectClass}`}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white text-xs backdrop-blur-md transition-colors"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {value ? (
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <div className={`relative group rounded-xl overflow-hidden border border-rose-500/30 bg-black/50 shadow-lg ${aspectClass}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt={label}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md transition-all"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('')}
                    className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-red-600/80 text-white text-xs font-medium backdrop-blur-sm transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Image Loaded & Ready
                </div>
                <p className="text-[11px] text-slate-400 break-all line-clamp-2 font-mono bg-black/30 p-2 rounded-lg border border-white/5">
                  {value}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-xs text-slate-200 transition-all font-medium"
                  >
                    Replace Image
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('')}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs transition-all font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-dropzone cursor-pointer rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3 transition-all ${
                isDragging ? 'active-drag' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                {isUploading ? (
                  <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '📷'
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  {isDragging ? (
                    <span className="text-rose-400">Release image to upload</span>
                  ) : (
                    <span>
                      <strong className="text-rose-400 underline decoration-rose-400/50">Click to browse</strong> or drag & drop image here
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  PNG, JPG, WEBP, or SVG accepted (auto-saved)
                </p>
              </div>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-rose-400 mt-1 font-medium">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
