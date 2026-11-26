import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, SlidersHorizontal, Download, Layers } from 'lucide-react';
import { SAMPLE_IMAGES } from '../constants/sampleImages';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamples: () => Promise<void>;
  isLoadingSamples: boolean;
  compact?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSamples,
  isLoadingSamples,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      // Reset input value so same files can be re-selected if deleted
      e.target.value = '';
    }
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <div
        id="compact-dropzone"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerPicker}
        className={`border-2 border-dashed rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
          isDragOver
            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/20'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-100/60 dark:border-slate-700 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Drag & drop more images here or <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500">Supports JPEG, PNG, WebP & more</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerPicker();
          }}
          className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Add Images
        </button>
      </div>
    );
  }

  return (
    <div
      id="main-dropzone"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerPicker}
      className={`relative border-2 border-dashed rounded-2xl p-10 md:p-14 text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-indigo-600 bg-indigo-50/70 scale-[1.008] shadow-lg shadow-indigo-100 dark:bg-indigo-950/30'
          : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/70 shadow-sm dark:border-slate-700 dark:bg-slate-900/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="max-w-xl mx-auto flex flex-col items-center">
        <div className="w-16 h-16 mb-5 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm dark:bg-indigo-950/50 dark:border-indigo-900/40">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
          Drop your images here, or <span className="text-indigo-600 underline">browse files</span>
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md">
          Batch crop, reframe, and convert multiple photos to common aspect ratios while keeping 100% native resolution.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Full Native Resolution
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            1:1, 4:5, 9:16, 16:9 & more
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
            JPEG · PNG · WebP Output
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Download className="w-3.5 h-3.5 text-sky-500" />
            Single-click ZIP Export
          </span>
        </div>

        {/* Primary Action Button and Sample Loader */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            id="choose-files-button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerPicker();
            }}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-sm transition hover:shadow flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Select Images to Resize
          </button>

          <button
            id="load-sample-images-button"
            type="button"
            disabled={isLoadingSamples}
            onClick={(e) => {
              e.stopPropagation();
              onLoadSamples();
            }}
            className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            {isLoadingSamples ? (
              <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-500" />
            )}
            Load Demo Images
          </button>
        </div>
      </div>
    </div>
  );
};
