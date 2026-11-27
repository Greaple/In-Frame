import React from 'react';
import { Archive, Lock } from 'lucide-react';
import { BatchGlobalSettings, OutputFormat, ResizeMode } from '../types';

const FORMATS: { id: OutputFormat; name: string; desc: string }[] = [
  { id: 'original', name: 'Keep original', desc: 'Each print keeps its own format' },
  { id: 'jpeg', name: 'JPEG', desc: 'Universal · .jpg' },
  { id: 'png', name: 'PNG', desc: 'Lossless, keeps transparency' },
  { id: 'webp', name: 'WebP', desc: 'Smallest files for the web' },
];

const WIDTH_PRESETS: { label: string; width?: number }[] = [
  { label: 'Original max' },
  { label: '1080 px', width: 1080 },
  { label: '1920 px', width: 1920 },
  { label: '2560 px', width: 2560 },
  { label: '3840 px', width: 3840 },
];

interface DevelopingPanelProps {
  totalCount: number;
  globalSettings: BatchGlobalSettings;
  onUpdateGlobalSettings: (settings: Partial<BatchGlobalSettings>) => void;
  onApplyFormatToAll: (format: OutputFormat) => void;
  onApplyQualityToAll: (quality: number) => void;
  onApplyResizeToAll: (mode: ResizeMode, scalePercent: number, targetWidth?: number) => void;
  onDownloadZip: () => void;
  isProcessingZip: boolean;
}

/** Right inspector: output format, quality, resolution and the ZIP "binding" action. */
export const DevelopingPanel: React.FC<DevelopingPanelProps> = ({
  totalCount,
  globalSettings,
  onUpdateGlobalSettings,
  onApplyFormatToAll,
  onApplyQualityToAll,
  onApplyResizeToAll,
  onDownloadZip,
  isProcessingZip,
}) => {
  const { outputFormat, quality, resizeMode, scalePercent, targetWidth } = globalSettings;

  const setFormat = (format: OutputFormat) => {
    onUpdateGlobalSettings({ outputFormat: format });
    onApplyFormatToAll(format);
  };

  const setQuality = (value: number) => {
    onUpdateGlobalSettings({ quality: value });
    onApplyQualityToAll(value);
  };

  const setMode = (mode: ResizeMode) => {
    onUpdateGlobalSettings({ resizeMode: mode });
    onApplyResizeToAll(mode, scalePercent, targetWidth);
  };

  const setScale = (value: number) => {
    // Keep the mode in step with what the images get (and what new images inherit).
    onUpdateGlobalSettings({ resizeMode: 'scale', scalePercent: value });
    onApplyResizeToAll('scale', value, targetWidth);
  };

  const setWidthPreset = (width?: number) => {
    if (!width) {
      setMode('native');
      return;
    }
    onUpdateGlobalSettings({ resizeMode: 'width', targetWidth: width });
    onApplyResizeToAll('width', scalePercent, width);
  };

  const qualityFill = `${((quality - 0.5) / 0.5) * 100}%`;
  const scaleFill = `${((scalePercent - 20) / 130) * 100}%`;
  const isNative = resizeMode === 'native';

  return (
    <aside
      id="batch-controls-panel"
      aria-labelledby="developing-heading"
      className="sheet flex-[1_1_300px] min-w-0 p-5 flex flex-col gap-[22px]"
    >
      <div className="flex flex-col gap-1">
        <span className="label-caps">Developing</span>
        <h2 id="developing-heading" className="m-0 font-serif text-xl leading-7 font-medium">
          Format &amp; resolution
        </h2>
      </div>

      <div role="radiogroup" aria-labelledby="format-label" className="flex flex-col gap-1">
        <span id="format-label" className="label-field mb-1">
          Output format
        </span>
        {FORMATS.map((f) => {
          const checked = outputFormat === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setFormat(f.id)}
              className={`radio-row ${checked ? 'radio-row-on' : 'radio-row-off'}`}
            >
              <span className={`radio-ring ${checked ? 'radio-ring-on' : ''}`} />
              <span className="flex flex-col">
                <span className="text-sm leading-5 font-semibold">{f.name}</span>
                <span className="text-xs leading-4 text-ink-muted">{f.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="batch-quality-slider" className="label-field">
            Compression quality
          </label>
          <span className="font-serif text-lg leading-6 font-semibold text-stamp">
            {outputFormat === 'png' ? 'Lossless' : `${Math.round(quality * 100)}%`}
          </span>
        </div>
        <input
          id="batch-quality-slider"
          type="range"
          min="0.5"
          max="1"
          step="0.02"
          value={quality}
          disabled={outputFormat === 'png'}
          onChange={(e) => setQuality(parseFloat(e.target.value))}
          className="lp-range"
          style={{ '--fill': qualityFill } as React.CSSProperties}
        />
        <div className="archival flex justify-between">
          <span>Balanced 70</span>
          <span>Recommended 92</span>
          <span>Max 100</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span id="resolution-label" className="label-field">
          Resolution
        </span>
        <div role="group" aria-labelledby="resolution-label" className="segmented grid-cols-2">
          <button
            id="resize-mode-native"
            type="button"
            aria-pressed={isNative}
            onClick={() => setMode('native')}
            className={`segment ${isNative ? 'segment-on' : ''}`}
          >
            Native
          </button>
          <button
            id="resize-mode-scale"
            type="button"
            aria-pressed={!isNative}
            onClick={() => setMode('scale')}
            className={`segment ${!isNative ? 'segment-on' : ''}`}
          >
            Custom scale
          </button>
        </div>

        {isNative ? (
          <p className="m-0 text-[13px] leading-[19px] text-ink-muted">
            Crops are cut straight from the original pixels. Native keeps every one of them.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5" aria-label="Target width">
              {WIDTH_PRESETS.map((p) => {
                const on = p.width
                  ? resizeMode === 'width' && targetWidth === p.width
                  : false;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setWidthPreset(p.width)}
                    className={`chip ${on ? 'chip-on' : 'chip-off'}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="batch-scale-slider" className="label-field">
                  Scale
                </label>
                <span className="font-serif text-[15px] font-semibold">
                  {resizeMode === 'scale' ? `${scalePercent}%` : '—'}
                </span>
              </div>
              <input
                id="batch-scale-slider"
                type="range"
                min="20"
                max="150"
                step="5"
                value={scalePercent}
                onChange={(e) => setScale(parseInt(e.target.value, 10))}
                className="lp-range"
                style={{ '--fill': scaleFill } as React.CSSProperties}
              />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-fiber pt-[18px] flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-lg leading-6 font-semibold">Binding</span>
          <span className="archival">
            {totalCount} {totalCount === 1 ? 'proof' : 'proofs'} · one ZIP
          </span>
        </div>
        <button
          id="download-all-zip-button"
          type="button"
          disabled={totalCount === 0 || isProcessingZip}
          onClick={onDownloadZip}
          className="btn-stamp min-h-12 text-[15px]"
        >
          <Archive className="size-[17px]" aria-hidden="true" />
          {isProcessingZip ? 'Binding…' : `Bind ${totalCount} ${totalCount === 1 ? 'proof' : 'proofs'} as ZIP`}
        </button>
        <span className="flex items-center gap-2 text-xs leading-4 font-semibold text-sage">
          <Lock className="size-3.5" aria-hidden="true" />
          Developed in your browser — nothing is uploaded
        </span>
      </div>
    </aside>
  );
};
