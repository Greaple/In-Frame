import React, { useMemo } from 'react';
import {
  Crop,
  Download,
  Trash2,
  Maximize,
  Sliders,
  FileText,
  RotateCw,
  Eye,
} from 'lucide-react';
import { COMMON_ASPECT_RATIOS, getAspectRatioById } from '../constants/aspectRatios';
import { ImageItem, OutputFormat } from '../types';
import {
  calculateCropCoordinates,
  formatBytes,
  getDefaultCropBox,
  getMimeAndExtension,
} from '../utils/imageProcessor';

interface ImageCardProps {
  item: ImageItem;
  onOpenReframeModal: (item: ImageItem) => void;
  onUpdateRatio: (id: string, ratioId: string) => void;
  onUpdateFormat: (id: string, format: OutputFormat) => void;
  onRemove: (id: string) => void;
  onDownloadSingle: (item: ImageItem) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  onOpenReframeModal,
  onUpdateRatio,
  onUpdateFormat,
  onRemove,
  onDownloadSingle,
}) => {
  const cropCoords = useMemo(() => calculateCropCoordinates(item), [item]);
  const currentRatio = getAspectRatioById(item.aspectRatioId);
  const { extension } = getMimeAndExtension(item.outputFormat, item.originalFormat, item.name);

  const cropBox = useMemo(() => {
    return (
      item.reframe.cropBox ||
      getDefaultCropBox(item.originalWidth, item.originalHeight, currentRatio.ratio)
    );
  }, [item.reframe.cropBox, item.originalWidth, item.originalHeight, currentRatio.ratio]);

  const targetRatio = currentRatio.ratio ?? item.originalWidth / item.originalHeight;

  return (
    <div
      id={`image-card-${item.id}`}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
    >
      {/* Top Preview Area with interactive framing hover */}
      <div
        className="relative bg-slate-950/90 overflow-hidden cursor-pointer flex items-center justify-center min-h-[220px]"
        onClick={() => onOpenReframeModal(item)}
      >
        {/* Frame container matching target aspect ratio */}
        <div
          className="relative max-w-full max-h-52 overflow-hidden rounded-lg shadow-md border border-slate-700 bg-slate-900"
          style={{
            aspectRatio: `${targetRatio}`,
            width: targetRatio >= 1 ? 'min(100%, 280px)' : `${Math.round(180 * targetRatio)}px`,
          }}
        >
          {/* Framed Image positioned according to cropBox */}
          <img
            src={item.dataUrl}
            alt={item.name}
            className="absolute max-w-none transition-all duration-150 pointer-events-none select-none"
            style={{
              width: `${(1 / cropBox.width) * 100}%`,
              height: `${(1 / cropBox.height) * 100}%`,
              left: `-${(cropBox.x / cropBox.width) * 100}%`,
              top: `-${(cropBox.y / cropBox.height) * 100}%`,
              transform: `rotate(${item.reframe.rotation}deg) scaleX(${
                item.reframe.flipH ? -1 : 1
              }) scaleY(${item.reframe.flipV ? -1 : 1})`,
            }}
          />

          {/* Rule of thirds grid hint */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-white/15" />
            <div className="border-r border-white/15" />
            <div />
          </div>
        </div>

        {/* Aspect Ratio Badge Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-black/70 backdrop-blur text-white border border-white/20 shadow">
            {currentRatio.name}
          </span>
        </div>

        {/* Hover overlay hint: click to reframe */}
        <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all flex items-center justify-center gap-2 text-white">
          <div className="px-4 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-xs font-semibold shadow-lg flex items-center gap-1.5">
            <Crop className="w-4 h-4" />
            Click to Reframe & Adjust
          </div>
        </div>
      </div>

      {/* Card Content & Adjustments */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        {/* Title & File Info */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4
              className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex-1"
              title={item.name}
            >
              {item.name}
            </h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {formatBytes(item.originalSize)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Source: {item.originalWidth} × {item.originalHeight} px
            </span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              → {cropCoords.outputWidth} × {cropCoords.outputHeight} px
            </span>
          </div>
        </div>

        {/* Controls: Ratio selector & Output Format */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Aspect Ratio:
            </label>
            <select
              value={item.aspectRatioId}
              onChange={(e) => {
                if (e.target.value === 'custom_dialog') {
                  onOpenReframeModal(item);
                } else {
                  onUpdateRatio(item.id, e.target.value);
                }
              }}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {item.aspectRatioId.startsWith('custom:') && (
                <option value={item.aspectRatioId}>
                  {currentRatio.name} (Custom)
                </option>
              )}
              {COMMON_ASPECT_RATIOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.description.split('·')[0].trim()})
                </option>
              ))}
              <option value="custom_dialog">+ Custom Ratio...</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Format:
            </label>
            <select
              value={item.outputFormat}
              onChange={(e) => onUpdateFormat(item.id, e.target.value as OutputFormat)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
            >
              <option value="original">Original ({extension.toUpperCase()})</option>
              <option value="jpeg">JPEG (.jpg)</option>
              <option value="png">PNG (.png)</option>
              <option value="webp">WebP (.webp)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onOpenReframeModal(item)}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center justify-center gap-1.5 transition"
          >
            <Crop className="w-3.5 h-3.5" />
            Reframe
          </button>

          <button
            type="button"
            onClick={() => onDownloadSingle(item)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition"
            title="Download this single reframed image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            title="Remove from batch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
