import React, { useState } from 'react';
import {
  Archive,
  Download,
  Trash2,
  Plus,
  Settings2,
  Sliders,
  Check,
  Maximize2,
  FileImage,
  Percent,
  ArrowLeftRight,
} from 'lucide-react';
import {
  COMMON_ASPECT_RATIOS,
  createCustomRatioId,
  parseCustomRatio,
} from '../constants/aspectRatios';
import { BatchGlobalSettings, OutputFormat, ResizeMode } from '../types';

interface BatchToolbarProps {
  totalCount: number;
  globalSettings: BatchGlobalSettings;
  onUpdateGlobalSettings: (settings: Partial<BatchGlobalSettings>) => void;
  onApplyRatioToAll: (ratioId: string) => void;
  onApplyFormatToAll: (format: OutputFormat) => void;
  onApplyQualityToAll: (quality: number) => void;
  onApplyResizeToAll: (mode: ResizeMode, scalePercent: number, targetWidth?: number) => void;
  onDownloadZip: () => void;
  onAddMoreClick: () => void;
  onClearAll: () => void;
  isProcessingZip: boolean;
}

export const BatchToolbar: React.FC<BatchToolbarProps> = ({
  totalCount,
  globalSettings,
  onUpdateGlobalSettings,
  onApplyRatioToAll,
  onApplyFormatToAll,
  onApplyQualityToAll,
  onApplyResizeToAll,
  onDownloadZip,
  onAddMoreClick,
  onClearAll,
  isProcessingZip,
}) => {
  const [showAdvancedResize, setShowAdvancedResize] = useState(false);

  const isCustomRatio = globalSettings.aspectRatioId.startsWith('custom:');
  const parsedCustom = parseCustomRatio(globalSettings.aspectRatioId);

  const [showCustomRatio, setShowCustomRatio] = useState<boolean>(isCustomRatio);
  const [customW, setCustomW] = useState<string>(
    parsedCustom ? String(parsedCustom.width) : '5'
  );
  const [customH, setCustomH] = useState<string>(
    parsedCustom ? String(parsedCustom.height) : '7'
  );

  const handleRatioChange = (ratioId: string) => {
    onUpdateGlobalSettings({ aspectRatioId: ratioId });
    onApplyRatioToAll(ratioId);
  };

  const handleApplyCustomRatio = (wStr: string, hStr: string) => {
    const w = parseFloat(wStr);
    const h = parseFloat(hStr);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const customId = createCustomRatioId(w, h);
      handleRatioChange(customId);
    }
  };

  const handleSwapBatchCustom = () => {
    const nextW = customH;
    const nextH = customW;
    setCustomW(nextW);
    setCustomH(nextH);
    handleApplyCustomRatio(nextW, nextH);
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fmt = e.target.value as OutputFormat;
    onUpdateGlobalSettings({ outputFormat: fmt });
    onApplyFormatToAll(fmt);
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateGlobalSettings({ quality: val });
    onApplyQualityToAll(val);
  };

  const handleResizeModeChange = (mode: ResizeMode) => {
    onUpdateGlobalSettings({ resizeMode: mode });
    onApplyResizeToAll(mode, globalSettings.scalePercent, globalSettings.targetWidth);
  };

  const handleScalePercentChange = (val: number) => {
    onUpdateGlobalSettings({ scalePercent: val });
    onApplyResizeToAll('scale', val, globalSettings.targetWidth);
  };

  const handlePresetWidth = (width: number) => {
    onUpdateGlobalSettings({ resizeMode: 'width', targetWidth: width });
    onApplyResizeToAll('width', globalSettings.scalePercent, width);
  };

  const isLossyFormat =
    globalSettings.outputFormat === 'jpeg' ||
    globalSettings.outputFormat === 'webp' ||
    globalSettings.outputFormat === 'original';

  return (
    <div
      id="batch-controls-panel"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
    >
      {/* Header bar: Count, Quick Actions & Download ZIP CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold text-sm">
            {totalCount}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Batch Workspace
            </h2>
            <p className="text-xs text-slate-500">
              {totalCount} {totalCount === 1 ? 'image' : 'images'} ready for batch crop & conversion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="add-more-images-button"
            type="button"
            onClick={onAddMoreClick}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add More
          </button>

          <button
            id="clear-all-images-button"
            type="button"
            onClick={onClearAll}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5 transition"
            title="Clear all uploaded images"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            id="download-all-zip-button"
            type="button"
            disabled={totalCount === 0 || isProcessingZip}
            onClick={onDownloadZip}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            {isProcessingZip ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing ZIP...</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span>Download All as ZIP</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Aspect Ratio Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Batch Aspect Ratio (Apply to All)
          </span>
          <span className="text-xs text-indigo-600 font-medium">
            Click any ratio to apply to all images
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COMMON_ASPECT_RATIOS.map((ratio) => {
            const isSelected = globalSettings.aspectRatioId === ratio.id;
            return (
              <button
                key={ratio.id}
                id={`ratio-pill-${ratio.id.replace(':', '-')}`}
                type="button"
                onClick={() => handleRatioChange(ratio.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={ratio.description}
              >
                {isSelected && <Check className="w-3 h-3" />}
                <span>{ratio.name}</span>
                {ratio.badge && ratio.id !== 'original' && (
                  <span
                    className={`text-[10px] px-1 rounded ${
                      isSelected
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {ratio.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom Ratio Pill */}
          <button
            id="batch-custom-ratio-pill"
            type="button"
            onClick={() => {
              setShowCustomRatio(!showCustomRatio);
              if (!isCustomRatio) {
                handleApplyCustomRatio(customW, customH);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isCustomRatio
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Enter a custom aspect ratio to apply to all images"
          >
            {isCustomRatio && <Check className="w-3 h-3" />}
            <span>
              {isCustomRatio
                ? `Custom: ${parsedCustom?.width}:${parsedCustom?.height}`
                : '+ Custom Ratio'}
            </span>
            <span
              className={`text-[10px] px-1 rounded ${
                isCustomRatio
                  ? 'bg-indigo-700 text-indigo-100'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              W:H
            </span>
          </button>
        </div>

        {/* Custom Aspect Ratio Inputs Strip */}
        {(showCustomRatio || isCustomRatio) && (
          <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Custom Ratio (W : H):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  id="batch-custom-width-input"
                  type="number"
                  min="0.1"
                  step="any"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                  placeholder="5"
                  className="w-16 px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                />
                <span className="text-slate-400 font-bold">:</span>
                <input
                  id="batch-custom-height-input"
                  type="number"
                  min="0.1"
                  step="any"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  placeholder="7"
                  className="w-16 px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                />
                <button
                  type="button"
                  onClick={handleSwapBatchCustom}
                  title="Swap Width and Height"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <button
                  id="apply-custom-ratio-batch-btn"
                  type="button"
                  onClick={() => handleApplyCustomRatio(customW, customH)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                >
                  Apply to All
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px]">Quick presets:</span>
              {[
                { label: '5:7', w: 5, h: 7 },
                { label: '7:5', w: 7, h: 5 },
                { label: '18:9', w: 18, h: 9 },
                { label: '1:2', w: 1, h: 2 },
                { label: '2:1', w: 2, h: 1 },
                { label: '2.39:1', w: 2.39, h: 1 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setCustomW(String(p.w));
                    setCustomH(String(p.h));
                    handleApplyCustomRatio(String(p.w), String(p.h));
                  }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-400 font-mono text-[10px] text-slate-700 dark:text-slate-200 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Batch Format & Resolution Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Output Format Selector */}
        <div>
          <label
            htmlFor="batch-output-format"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
          >
            Output Format
          </label>
          <div className="relative">
            <select
              id="batch-output-format"
              value={globalSettings.outputFormat}
              onChange={handleFormatChange}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="original">Keep Original Formats (Auto)</option>
              <option value="jpeg">JPEG (.jpg) — Universal compatibility</option>
              <option value="png">PNG (.png) — Lossless with transparency</option>
              <option value="webp">WebP (.webp) — Modern small file size</option>
            </select>
          </div>
        </div>

        {/* Quality Slider (for WebP and JPEG) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="batch-quality-slider"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Compression Quality
            </label>
            <span className="text-xs font-bold text-indigo-600">
              {Math.round(globalSettings.quality * 100)}%
            </span>
          </div>
          <input
            id="batch-quality-slider"
            type="range"
            min="0.5"
            max="1.0"
            step="0.02"
            disabled={globalSettings.outputFormat === 'png'}
            value={globalSettings.quality}
            onChange={handleQualityChange}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Balanced (70%)</span>
            <span>Recommended (92%)</span>
            <span>Max (100%)</span>
          </div>
        </div>

        {/* Resize Resolution Mode */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Resolution Mode
            </label>
            <button
              type="button"
              onClick={() => setShowAdvancedResize(!showAdvancedResize)}
              className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              {showAdvancedResize ? 'Hide presets' : 'Change scale'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="resize-mode-native"
              type="button"
              onClick={() => handleResizeModeChange('native')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                globalSettings.resizeMode === 'native'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
              title="Preserve maximum native source pixel resolution"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
              Native Resolution
            </button>

            <button
              id="resize-mode-scale"
              type="button"
              onClick={() => {
                setShowAdvancedResize(true);
                handleResizeModeChange('scale');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                globalSettings.resizeMode !== 'native'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-indigo-500" />
              Custom Scale
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Resize Presets (expandable) */}
      {showAdvancedResize && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Quick Target Width Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Original Max', width: undefined },
                { label: '1080p (FHD / Social)', width: 1080 },
                { label: '1920p (Desktop)', width: 1920 },
                { label: '2560p (2K)', width: 2560 },
                { label: '3840p (4K UHD)', width: 3840 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if (preset.width) {
                      handlePresetWidth(preset.width);
                    } else {
                      handleResizeModeChange('native');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    globalSettings.resizeMode === 'width' &&
                    globalSettings.targetWidth === preset.width
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Scale Percentage:
            </span>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={globalSettings.scalePercent}
              onChange={(e) => handleScalePercentChange(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-12 text-right">
              {globalSettings.scalePercent}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
