import React, { useMemo } from 'react';
import { Crop, Download, Trash2 } from 'lucide-react';
import { COMMON_ASPECT_RATIOS, getAspectRatioById } from '../constants/aspectRatios';
import { ImageItem, OutputFormat } from '../types';
import {
  calculateCropCoordinates,
  formatBytes,
  getDefaultCropBox,
  getMimeAndExtension,
  getOrientedSize,
} from '../utils/imageProcessor';
import { CroppedImage } from './OrientedImage';

interface ImageCardProps {
  item: ImageItem;
  onOpenReframeModal: (item: ImageItem) => void;
  onUpdateRatio: (id: string, ratioId: string) => void;
  onUpdateFormat: (id: string, format: OutputFormat) => void;
  onRemove: (id: string) => void;
  onDownloadSingle: (item: ImageItem) => void;
}

/** Tallest the framed preview may be inside its 188px well. */
const PREVIEW_MAX_H = 168;

const selectClass =
  'h-9 w-full rounded-lg border border-fiber bg-desk px-2 text-[13px] font-semibold text-ink normal-case tracking-normal focus:border-cinnabar focus:outline-none';

/** One print on the contact sheet: a matted proof mounted on a cream carrier. */
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
    const oriented = getOrientedSize(item.originalWidth, item.originalHeight, item.reframe.rotation);
    return (
      item.reframe.cropBox ||
      getDefaultCropBox(oriented.width, oriented.height, currentRatio.ratio)
    );
  }, [item.reframe.cropBox, item.reframe.rotation, item.originalWidth, item.originalHeight, currentRatio.ratio]);

  // Frame the preview at the crop's real pixel aspect so it matches the export exactly.
  const cropAspect = cropCoords.cropWidth / cropCoords.cropHeight;

  return (
    <article
      id={`image-card-${item.id}`}
      className="bg-sheet border border-hairline rounded-lg p-2.5 flex flex-col gap-3 shadow-sheet transition-shadow hover:shadow-lifted"
    >
      {/* Matted print */}
      <div className="relative bg-white border border-hairline rounded p-1">
        <button
          type="button"
          onClick={() => onOpenReframeModal(item)}
          aria-label={`Reframe ${item.name}`}
          className="group w-full h-[188px] rounded-sm well flex items-center justify-center"
        >
          <span
            className="relative block overflow-hidden shadow-[0_2px_6px_-1px_rgba(46,38,32,0.2)]"
            style={{
              aspectRatio: `${cropAspect}`,
              width: `min(calc(100% - 20px), ${Math.round(PREVIEW_MAX_H * cropAspect)}px)`,
            }}
          >
            <CroppedImage item={item} cropBox={cropBox} alt="" />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition group-hover:bg-ink/35 group-hover:opacity-100 group-focus-visible:bg-ink/35 group-focus-visible:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-desk px-3 py-1.5 text-xs font-semibold text-ink shadow-lifted">
                <Crop className="size-3.5" aria-hidden="true" />
                Reframe
              </span>
            </span>
          </span>
        </button>
        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-ink px-2.5 text-[11px] leading-[18px] font-semibold tracking-[0.05em] text-desk">
          {currentRatio.name}
        </span>
      </div>

      {/* Name and archival metadata */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="m-0 min-w-0 truncate text-[15px] leading-[22px] font-semibold" title={item.name}>
            {item.name}
          </h3>
          <span className="archival whitespace-nowrap">{formatBytes(item.originalSize)}</span>
        </div>
        <span className="archival">
          {item.originalWidth} × {item.originalHeight} →{' '}
          <span className="text-stamp">
            {cropCoords.outputWidth} × {cropCoords.outputHeight} px
          </span>
        </span>
      </div>

      {/* Per-print stock and format */}
      <div className="flex gap-2 px-0.5">
        <label className="label-caps flex-1 min-w-0 flex flex-col gap-1">
          Stock
          <select
            value={item.aspectRatioId}
            onChange={(e) => {
              if (e.target.value === 'custom_dialog') {
                onOpenReframeModal(item);
              } else {
                onUpdateRatio(item.id, e.target.value);
              }
            }}
            className={selectClass}
          >
            {item.aspectRatioId.startsWith('custom:') && (
              <option value={item.aspectRatioId}>{currentRatio.name} (custom)</option>
            )}
            {COMMON_ASPECT_RATIOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.description.split('·')[0].trim()}
              </option>
            ))}
            <option value="custom_dialog">Custom ratio…</option>
          </select>
        </label>
        <label className="label-caps flex-1 min-w-0 flex flex-col gap-1">
          Format
          <select
            value={item.outputFormat}
            onChange={(e) => onUpdateFormat(item.id, e.target.value as OutputFormat)}
            className={selectClass}
          >
            <option value="original">Original ({extension.toUpperCase()})</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-hairline pt-2.5">
        <button
          type="button"
          onClick={() => onOpenReframeModal(item)}
          className="btn-quiet flex-1 min-h-10 text-[13px]"
        >
          <Crop className="size-[15px]" strokeWidth={1.75} aria-hidden="true" />
          Reframe
        </button>
        <button
          type="button"
          onClick={() => onDownloadSingle(item)}
          aria-label={`Download ${item.name}`}
          title="Download this proof"
          className="btn-icon"
        >
          <Download className="size-[17px]" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name} from the table`}
          title="Remove from the table"
          className="btn-icon text-ink-muted hover:text-stamp"
        >
          <Trash2 className="size-[17px]" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};
