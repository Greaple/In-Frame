import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  COMMON_ASPECT_RATIOS,
  createCustomRatioId,
  parseCustomRatio,
} from '../constants/aspectRatios';

const CUSTOM_PRESETS = [
  { label: '5:7', w: 5, h: 7 },
  { label: '7:5', w: 7, h: 5 },
  { label: '18:9', w: 18, h: 9 },
  { label: '1:2', w: 1, h: 2 },
  { label: '2:1', w: 2, h: 1 },
  { label: '2.39:1', w: 2.39, h: 1 },
];

interface StockRailProps {
  /** The batch-wide aspect ratio id ('original', '1:1', 'custom:5:7', …). */
  aspectRatioId: string;
  /** Sets the batch ratio and re-frames every print on the table. */
  onRatioChange: (ratioId: string) => void;
}

/** Left rail: the batch-wide aspect ratio ("stock"), standard or custom. */
export const StockRail: React.FC<StockRailProps> = ({ aspectRatioId, onRatioChange }) => {
  const parsedCustom = parseCustomRatio(aspectRatioId);
  const [customW, setCustomW] = useState(parsedCustom ? String(parsedCustom.width) : '5');
  const [customH, setCustomH] = useState(parsedCustom ? String(parsedCustom.height) : '7');

  const applyCustom = (wStr: string, hStr: string) => {
    const w = parseFloat(wStr);
    const h = parseFloat(hStr);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      onRatioChange(createCustomRatioId(w, h));
    }
  };

  const swap = () => {
    setCustomW(customH);
    setCustomH(customW);
    applyCustom(customH, customW);
  };

  return (
    <aside
      aria-labelledby="stock-heading"
      className="sheet flex-[1_1_240px] min-w-0 p-5 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <span className="label-caps">Stock</span>
        <h2 id="stock-heading" className="m-0 font-serif text-xl leading-7 font-medium">
          Aspect ratio
        </h2>
        <p className="m-0 text-[13px] leading-[19px] text-ink-muted">
          Choosing one re-frames every print on the table. Each keeps its own framing.
        </p>
      </div>

      <div role="radiogroup" aria-labelledby="stock-heading" className="flex flex-col gap-1">
        {COMMON_ASPECT_RATIOS.map((ratio) => {
          const checked = aspectRatioId === ratio.id;
          return (
            <button
              key={ratio.id}
              id={`ratio-pill-${ratio.id.replace(':', '-')}`}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onRatioChange(ratio.id)}
              className={`radio-row ${checked ? 'radio-row-on' : 'radio-row-off'}`}
            >
              <span className={`radio-ring ${checked ? 'radio-ring-on' : ''}`} />
              <span className="flex flex-col min-w-0">
                <span className="text-sm leading-5 font-semibold">{ratio.name}</span>
                <span className="archival">{ratio.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-fiber pt-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="label-caps">Custom stock</span>
          {parsedCustom && (
            <span className="chip chip-on min-h-6 px-2.5 text-[11px]">
              {parsedCustom.width}:{parsedCustom.height} in use
            </span>
          )}
        </div>
        <div className="flex items-end gap-2">
          <label className="flex-1 min-w-0 flex flex-col gap-1 label-field">
            Width
            <input
              id="batch-custom-width-input"
              type="number"
              min="0.1"
              step="any"
              value={customW}
              onChange={(e) => setCustomW(e.target.value)}
              className="field"
            />
          </label>
          <span aria-hidden="true" className="font-serif text-xl leading-10 text-ink-muted">
            :
          </span>
          <label className="flex-1 min-w-0 flex flex-col gap-1 label-field">
            Height
            <input
              id="batch-custom-height-input"
              type="number"
              min="0.1"
              step="any"
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              className="field"
            />
          </label>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap width and height"
            className="btn-quiet size-10 min-h-0 px-0 shrink-0"
          >
            <ArrowLeftRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <button
          id="apply-custom-ratio-batch-btn"
          type="button"
          onClick={() => applyCustom(customW, customH)}
          className="btn-quiet"
        >
          Apply {customW || '?'} : {customH || '?'} to all
        </button>
        <div className="flex flex-wrap gap-1.5" aria-label="Custom presets">
          {CUSTOM_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setCustomW(String(p.w));
                setCustomH(String(p.h));
                applyCustom(String(p.w), String(p.h));
              }}
              className="chip chip-off min-h-8 px-3 text-xs font-serif"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
