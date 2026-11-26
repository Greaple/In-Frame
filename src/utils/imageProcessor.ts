import JSZip from 'jszip';
import { getAspectRatioById } from '../constants/aspectRatios';
import { CropBox, ImageItem, OutputFormat, ReframeSettings } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Sources that may carry transparency or are lossless graphics: keep them lossless.
const PNG_SOURCE_TYPES = ['png', 'gif', 'bmp', 'icon', 'svg'];
const PNG_SOURCE_EXTENSIONS = ['png', 'apng', 'gif', 'bmp', 'ico', 'svg'];

export function getMimeAndExtension(
  targetFormat: OutputFormat,
  originalFormat: string,
  fileName: string
): { mimeType: string; extension: string } {
  let format = targetFormat;
  if (format === 'original') {
    const origLower = originalFormat.toLowerCase();
    const fileExt = fileName.toLowerCase().split('.').pop() ?? '';
    if (
      PNG_SOURCE_TYPES.some((t) => origLower.includes(t)) ||
      PNG_SOURCE_EXTENSIONS.includes(fileExt)
    ) {
      format = 'png';
    } else if (origLower.includes('webp') || fileExt === 'webp') {
      format = 'webp';
    } else {
      format = 'jpeg';
    }
  }

  switch (format) {
    case 'png':
      return { mimeType: 'image/png', extension: 'png' };
    case 'webp':
      return { mimeType: 'image/webp', extension: 'webp' };
    case 'jpeg':
    default:
      return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
}

const EXTENSION_FOR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

/**
 * Builds the output filename. Pass `encodedMime` (the Blob's type) so the extension matches
 * what the browser really produced: canvas encoders fall back to PNG for unsupported types.
 */
export function getOutputFilename(
  originalName: string,
  ratioId: string,
  targetFormat: OutputFormat,
  originalFormat: string,
  encodedMime?: string
): string {
  const planned = getMimeAndExtension(targetFormat, originalFormat, originalName).extension;
  const extension = (encodedMime && EXTENSION_FOR_MIME[encodedMime]) || planned;
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  const ratioStr = ratioId.replace(/^custom:/, '');
  const cleanRatio = ratioId === 'original' ? '' : `_${ratioStr.replace(':', 'x')}`;
  return `${baseName}${cleanRatio}.${extension}`;
}

/**
 * Makes every name unique (case-insensitively, as on macOS/Windows file systems) by adding
 * `_2`, `_3`, … before the extension, so ZIP entries never overwrite each other.
 */
export function makeUniqueFilenames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let candidate = name;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) {
      candidate = `${base}_${n}${ext}`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

// ---------------------------------------------------------------------------
// Orientation
//
// The crop box is stored in *displayed* image space: the source image after it has been
// rotated (clockwise, in 90° steps) and then mirrored on screen. Previews and export both
// derive their transform from getOrientationMatrix, so what you frame is what you get.
// ---------------------------------------------------------------------------

/** 2D affine matrix in canvas `setTransform(a, b, c, d, e, f)` order. */
export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

type Orientation = Pick<ReframeSettings, 'rotation' | 'flipH' | 'flipV'>;

const quarterTurns = (rotation: number) => (((Math.round((rotation || 0) / 90) % 4) + 4) % 4);
const COS = [1, 0, -1, 0];
const SIN = [0, 1, 0, -1];

/** Size of the image as displayed, after rotation. */
export function getOrientedSize(W: number, H: number, rotation: number) {
  return quarterTurns(rotation) % 2 === 1 ? { width: H, height: W } : { width: W, height: H };
}

/** Maps source pixel coordinates to displayed-image pixel coordinates. */
export function getOrientationMatrix(W: number, H: number, orientation: Orientation): Matrix {
  const q = quarterTurns(orientation.rotation);
  const fh = orientation.flipH ? -1 : 1;
  const fv = orientation.flipV ? -1 : 1;
  // Rotate about the centre, then mirror in screen space: p' = F·R·(p − c) + c'
  const a = fh * COS[q];
  const c = -fh * SIN[q];
  const b = fv * SIN[q];
  const d = fv * COS[q];
  const { width: TW, height: TH } = getOrientedSize(W, H, orientation.rotation);
  return { a, b, c, d, e: TW / 2 - (a * W) / 2 - (c * H) / 2, f: TH / 2 - (b * W) / 2 - (d * H) / 2 };
}

/** CSS transform for an element showing the source image centred in its displayed box. */
export function getOrientationCss(orientation: Orientation): string {
  const { a, b, c, d } = getOrientationMatrix(1, 1, orientation);
  return `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
}

/**
 * Layout (in % of the displayed image box) for an <img> holding the unrotated source, so that
 * applying getOrientationCss around its centre fills the displayed box exactly.
 */
export function getOrientedImageLayout(W: number, H: number, rotation: number) {
  const { width: TW, height: TH } = getOrientedSize(W, H, rotation);
  const widthPct = (W / TW) * 100;
  const heightPct = (H / TH) * 100;
  return {
    width: `${widthPct}%`,
    height: `${heightPct}%`,
    left: `${(100 - widthPct) / 2}%`,
    top: `${(100 - heightPct) / 2}%`,
  };
}

// ---------------------------------------------------------------------------
// Crop box
// ---------------------------------------------------------------------------

/** Largest normalized box of the given pixel aspect ratio that fits a W x H image. */
function maxBoxFor(W: number, H: number, ratio: number) {
  return W / H > ratio
    ? { width: (H * ratio) / W, height: 1 }
    : { width: 1, height: W / (ratio * H) };
}

/**
 * Returns a normalized crop box fitting within source dimensions for a given target ratio
 */
export function getDefaultCropBox(
  W: number,
  H: number,
  ratio: number | null
): CropBox {
  const targetRatio = ratio ?? W / H;

  let maxCropW: number;
  let maxCropH: number;

  if (W / H > targetRatio) {
    maxCropH = H;
    maxCropW = H * targetRatio;
  } else {
    maxCropW = W;
    maxCropH = W / targetRatio;
  }

  const normW = Math.max(0.01, Math.min(1, maxCropW / W));
  const normH = Math.max(0.01, Math.min(1, maxCropH / H));
  const normX = Math.max(0, (1 - normW) / 2);
  const normY = Math.max(0, (1 - normH) / 2);

  return {
    x: normX,
    y: normY,
    width: normW,
    height: normH,
  };
}

/**
 * Fits a crop box to a new aspect ratio, keeping its centre and its size relative to the
 * largest possible frame. Re-applying the same ratio leaves a box unchanged.
 */
export function updateCropBoxForRatio(
  currentBox: CropBox | undefined,
  W: number,
  H: number,
  newRatio: number | null
): CropBox {
  if (!currentBox || !(currentBox.width > 0) || !(currentBox.height > 0)) {
    return getDefaultCropBox(W, H, newRatio);
  }

  const centerX = currentBox.x + currentBox.width / 2;
  const centerY = currentBox.y + currentBox.height / 2;

  const currentAspect = (currentBox.width * W) / (currentBox.height * H);
  const scale = Math.max(
    0.05,
    Math.min(1, currentBox.width / maxBoxFor(W, H, currentAspect).width)
  );

  const target = maxBoxFor(W, H, newRatio ?? W / H);
  const width = Math.min(1, target.width * scale);
  const height = Math.min(1, target.height * scale);

  return {
    x: Math.max(0, Math.min(1 - width, centerX - width / 2)),
    y: Math.max(0, Math.min(1 - height, centerY - height / 2)),
    width,
    height,
  };
}

function currentCropBox(item: ImageItem): CropBox {
  if (item.reframe.cropBox) return item.reframe.cropBox;
  const { width, height } = getOrientedSize(
    item.originalWidth,
    item.originalHeight,
    item.reframe.rotation
  );
  return getDefaultCropBox(width, height, getAspectRatioById(item.aspectRatioId).ratio);
}

/**
 * Turns the displayed image a quarter turn clockwise. The frame turns with the image (so it
 * stays on the same content) and is then re-fitted to the selected aspect ratio.
 */
export function rotateReframeClockwise(item: ImageItem): ReframeSettings {
  const box = currentCropBox(item);
  // Clockwise quarter turn of the displayed image: (u, v) -> (1 - v, u)
  const turned: CropBox = {
    x: 1 - box.y - box.height,
    y: box.x,
    width: box.height,
    height: box.width,
  };

  // Flips are applied on screen after rotation. With exactly one flip active, a further
  // +90° in source space looks counter-clockwise, so step the other way.
  const oneFlip = Boolean(item.reframe.flipH) !== Boolean(item.reframe.flipV);
  const rotation = ((quarterTurns(item.reframe.rotation) + (oneFlip ? 3 : 1)) % 4) * 90;

  const { width, height } = getOrientedSize(item.originalWidth, item.originalHeight, rotation);
  const ratio = getAspectRatioById(item.aspectRatioId).ratio;
  return {
    ...item.reframe,
    rotation,
    cropBox: updateCropBoxForRatio(turned, width, height, ratio),
  };
}

/** Mirrors the displayed image; the frame is mirrored too, so it stays on the same content. */
export function flipReframe(item: ImageItem, axis: 'h' | 'v'): ReframeSettings {
  const box = currentCropBox(item);
  return axis === 'h'
    ? { ...item.reframe, flipH: !item.reframe.flipH, cropBox: { ...box, x: 1 - box.x - box.width } }
    : { ...item.reframe, flipV: !item.reframe.flipV, cropBox: { ...box, y: 1 - box.y - box.height } };
}

export interface CropCoordinates {
  /** Crop rectangle in displayed (rotated and mirrored) image pixels. */
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
}

/**
 * Calculates the crop rectangle (in displayed-image pixels) and the final output size.
 */
export function calculateCropCoordinates(item: ImageItem): CropCoordinates {
  const { width: W, height: H } = getOrientedSize(
    item.originalWidth,
    item.originalHeight,
    item.reframe.rotation
  );
  const { resize } = item;
  const box = currentCropBox(item);

  const cropW = Math.max(10, Math.min(W, box.width * W));
  const cropH = Math.max(10, Math.min(H, box.height * H));
  const cropX = Math.max(0, Math.min(W - cropW, box.x * W));
  const cropY = Math.max(0, Math.min(H - cropH, box.y * H));

  // Determine final output resolution
  let outW = Math.round(cropW);
  let outH = Math.round(cropH);

  if (resize.mode === 'scale' && resize.scalePercent && resize.scalePercent !== 100) {
    const factor = Math.max(0.1, resize.scalePercent / 100);
    outW = Math.max(1, Math.round(outW * factor));
    outH = Math.max(1, Math.round(outH * factor));
  } else if (resize.mode === 'width' && resize.targetWidth && resize.targetWidth > 0) {
    outW = Math.round(resize.targetWidth);
    outH = Math.max(1, Math.round((resize.targetWidth * cropH) / cropW));
  } else if (resize.mode === 'height' && resize.targetHeight && resize.targetHeight > 0) {
    outH = Math.round(resize.targetHeight);
    outW = Math.max(1, Math.round((resize.targetHeight * cropW) / cropH));
  }

  return {
    cropX,
    cropY,
    cropWidth: cropW,
    cropHeight: cropH,
    outputWidth: outW,
    outputHeight: outH,
  };
}

/** Maps source pixel coordinates straight to output canvas pixels (orient, crop, scale). */
export function getExportTransform(item: ImageItem): Matrix {
  const coords = calculateCropCoordinates(item);
  const m = getOrientationMatrix(item.originalWidth, item.originalHeight, item.reframe);
  const sx = coords.outputWidth / coords.cropWidth;
  const sy = coords.outputHeight / coords.cropHeight;
  return {
    a: sx * m.a,
    b: sy * m.b,
    c: sx * m.c,
    d: sy * m.d,
    e: sx * (m.e - coords.cropX),
    f: sy * (m.f - coords.cropY),
  };
}

/**
 * Loads an HTMLImageElement safely from URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Renders the reframed and cropped image to high-resolution canvas and exports as Blob
 */
export async function processImageItem(
  item: ImageItem,
  customQuality?: number
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  size: number;
}> {
  const coords = calculateCropCoordinates(item);
  const img = await loadImage(item.dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = coords.outputWidth;
  canvas.height = coords.outputHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not obtain 2D canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const { mimeType } = getMimeAndExtension(
    item.outputFormat,
    item.originalFormat,
    item.name
  );

  // If exporting to JPEG, provide a clean white background in case source had alpha transparency
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Orient, crop and scale in one transform; the canvas clips everything outside the crop.
  const m = getExportTransform(item);
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.drawImage(img, 0, 0, item.originalWidth, item.originalHeight);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const quality = customQuality !== undefined ? customQuality : item.quality ?? 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image Blob from canvas'));
          return;
        }
        resolve({
          blob,
          width: coords.outputWidth,
          height: coords.outputHeight,
          size: blob.size,
        });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Creates a zip archive with all processed images and triggers download
 */
export async function downloadAllAsZip(
  items: ImageItem[],
  onProgress?: (progress: number, currentFileName: string) => void
): Promise<void> {
  if (items.length === 0) return;

  const zip = new JSZip();
  const total = items.length;
  const rendered: { name: string; blob: Blob }[] = [];

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(Math.round(((i + 0.1) / total) * 80), `Processing: ${item.name}`);
    }

    let blob = item.processedBlob;
    if (!blob) {
      const processed = await processImageItem(item);
      blob = processed.blob;
    }

    const filename = getOutputFilename(
      item.name,
      item.aspectRatioId,
      item.outputFormat,
      item.originalFormat,
      blob.type
    );
    rendered.push({ name: filename, blob });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 80), `Prepared: ${filename}`);
    }
  }

  const uniqueNames = makeUniqueFilenames(rendered.map((r) => r.name));
  rendered.forEach((r, i) => zip.file(uniqueNames[i], r.blob));

  if (onProgress) {
    onProgress(85, 'Compressing archive...');
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        const pct = 85 + Math.round((metadata.percent / 100) * 14);
        onProgress(pct, `Packaging archive: ${Math.round(metadata.percent)}%`);
      }
    }
  );

  if (onProgress) {
    onProgress(100, 'Ready to download!');
  }

  // Trigger browser download
  const dateStr = new Date().toISOString().slice(0, 10);
  const downloadUrl = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `batch_resized_images_${dateStr}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
}

/**
 * Helper to download a single processed image directly
 */
export async function downloadSingleImage(item: ImageItem): Promise<void> {
  let blob = item.processedBlob;
  if (!blob) {
    const res = await processImageItem(item);
    blob = res.blob;
  }

  const filename = getOutputFilename(
    item.name,
    item.aspectRatioId,
    item.outputFormat,
    item.originalFormat,
    blob.type
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
