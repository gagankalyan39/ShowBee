'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { adminAPI } from '@/lib/api';
import { UploadCloud, Plus, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface GalleryDropzoneProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function GalleryDropzone({ images, onChange }: GalleryDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorMsg('Please select valid image files');
      return;
    }
    setErrorMsg(null);
    setIsUploading(true);

    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        if (dataUrl) {
          try {
            const res = await adminAPI.uploadImage(dataUrl, file.name);
            if (res.success && res.url) {
              uploadedUrls.push(res.url);
            } else {
              uploadedUrls.push(dataUrl);
            }
          } catch {
            uploadedUrls.push(dataUrl);
          }
        }
      } catch (err: any) {
        console.error('File read error:', err);
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
    }
    setIsUploading(false);
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
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    onChange([...images, newUrl.trim()]);
    setNewUrl('');
  };

  const handleRemove = (index: number) => {
    const updated = [...images];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Movie Visual Gallery ({images.length} Images)
          </label>
          <p className="text-[11px] text-slate-400">
            Drag multiple high-res stills or promotional scene images
          </p>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Multi-Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-dropzone cursor-pointer rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2 border-dashed transition-all ${
          isDragging ? 'active-drag' : ''
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-200">
            {isDragging ? (
              <span className="text-rose-400 font-bold">Drop your image files here</span>
            ) : (
              <span>
                <strong className="text-rose-400 underline decoration-rose-400/40">
                  Click to select multiple images
                </strong>{' '}
                or drag & drop files
              </span>
            )}
          </p>
          <p className="text-[10px] text-slate-400">PNG, JPG, WebP supported • Multiple files allowed</p>
        </div>
      </div>

      {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

      {/* URL Quick-Add Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Or paste external gallery image URL..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            className="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-white placeholder-slate-500"
          />
        </div>
        <button
          type="button"
          onClick={handleAddUrl}
          className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add URL</span>
        </button>
      </div>

      {/* Gallery Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-video shadow-md hover:border-rose-500/50 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Still ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-mono text-slate-300">
                #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
