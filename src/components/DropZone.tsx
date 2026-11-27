import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamples: () => Promise<void>;
  isLoadingSamples: boolean;
  compact?: boolean;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/*';

/** A small flat landscape used as a decorative stand-in for a photograph. */
const PrintScene: React.FC<{ sky: string; sun: string; hill: string; ground: string; sunX: number }> = ({
  sky,
  sun,
  hill,
  ground,
  sunX,
}) => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="block">
    <rect width="100" height="100" fill={sky} />
    <circle cx={sunX} cy="32" r="9" fill={sun} />
    <path d="M0 68 L20 54 L38 63 L60 45 L100 64 L100 100 L0 100 Z" fill={hill} />
    <path d="M0 84 L28 76 L56 82 L100 73 L100 100 L0 100 Z" fill={ground} />
  </svg>
);

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSamples,
  isLoadingSamples,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const files = (Array.from(e.dataTransfer.files ?? []) as File[]).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length > 0) onFilesSelected(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset so the same files can be picked again after removal
      e.target.value = '';
    }
  };

  const triggerPicker = () => fileInputRef.current?.click();

  const dropHandlers = {
    onDragEnter: handleDragOver,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const surface = isDragOver
    ? 'border-cinnabar bg-white shadow-lifted'
    : 'border-dash bg-sheet hover:bg-[#f8f3ee]';

  const input = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept={ACCEPT}
      className="hidden"
      onChange={handleFileInput}
    />
  );

  if (compact) {
    return (
      <div
        id="compact-dropzone"
        {...dropHandlers}
        onClick={triggerPicker}
        className={`w-full box-border flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-2xl border-[1.5px] border-dashed cursor-pointer transition-colors shadow-[inset_0_1px_3px_rgba(31,26,22,0.05)] ${surface}`}
      >
        {input}
        <div className="flex items-center gap-3.5">
          <span className="size-10 rounded-full bg-well text-sienna flex items-center justify-center">
            <Upload className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] leading-[22px] font-semibold">
              {isDragOver ? 'Let go to lay them down' : 'Lay more prints on the table'}
            </span>
            <span className="text-[13px] leading-[19px] text-ink-muted">
              Drop JPEG, PNG or WebP files here, or browse
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerPicker();
          }}
          className="btn-quiet min-h-10 bg-desk text-[13px]"
        >
          Browse files
        </button>
      </div>
    );
  }

  return (
    <div
      id="main-dropzone"
      {...dropHandlers}
      onClick={triggerPicker}
      className={`relative box-border rounded-2xl border-[1.5px] border-dashed px-8 py-10 flex flex-col items-center gap-5 text-center cursor-pointer transition-colors shadow-[inset_0_1px_3px_rgba(31,26,22,0.06)] ${surface}`}
    >
      {input}

      <div aria-hidden="true" className="relative w-[260px] h-[170px]">
        <div className="absolute left-1.5 top-[26px] size-[120px] p-[5px] box-border bg-white border border-hairline rounded-[3px] -rotate-[7deg] shadow-lifted">
          <PrintScene sky="#E7D3BC" sun="#F3B48E" hill="#9A8C7A" ground="#5E6953" sunX={68} />
        </div>
        <div className="absolute right-1 top-2 w-[104px] h-[140px] p-[5px] box-border bg-white border border-hairline rounded-[3px] rotate-6 shadow-lifted">
          <PrintScene sky="#D9DFCF" sun="#F5BA92" hill="#7E5231" ground="#404A36" sunX={40} />
        </div>
        <div
          className={`absolute left-16 top-11 w-[136px] h-[118px] p-[5px] box-border bg-white border border-hairline rounded-[3px] shadow-tray transition-transform duration-300 ${
            isDragOver ? '-translate-y-1.5' : ''
          }`}
        >
          <PrintScene sky="#F1D9C3" sun="#C85A32" hill="#C99A72" ground="#9A6A47" sunX={62} />
          <span className="absolute inset-3.5 border-[1.5px] border-cinnabar rounded-[1px]" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 font-serif text-[26px] leading-[34px] font-medium tracking-[-0.01em]">
          {isDragOver ? 'Let go to lay them down' : 'Lay your prints on the table'}
        </h2>
        <p className="m-0 text-ink-muted">Drag images here — JPEG, PNG, WebP, AVIF or GIF.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        <button
          id="choose-files-button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerPicker();
          }}
          className="btn-stamp min-h-12 px-6 text-[15px]"
        >
          <Upload className="size-[17px]" strokeWidth={1.75} aria-hidden="true" />
          Choose images
        </button>
        <button
          id="load-sample-images-button"
          type="button"
          disabled={isLoadingSamples}
          onClick={(e) => {
            e.stopPropagation();
            onLoadSamples();
          }}
          className="btn-quiet min-h-12 px-[22px] text-[15px]"
        >
          {isLoadingSamples && (
            <span
              aria-hidden="true"
              className="size-4 rounded-full border-2 border-ink-muted border-t-transparent animate-spin"
            />
          )}
          {isLoadingSamples ? 'Developing demo prints…' : 'Load demo prints'}
        </button>
      </div>
    </div>
  );
};
