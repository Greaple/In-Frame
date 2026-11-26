import JSZip from 'jszip';
import { getAspectRatioById } from '../constants/aspectRatios';
import { ImageItem, OutputFormat } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getMimeAndExtension(
  targetFormat: OutputFormat,
  originalFormat: string,
  fileName: string
): { mimeType: string; extension: string } {
  let format = targetFormat;
  if (format === 'original') {
    const origLower = originalFormat.toLowerCase();
    if (origLower.includes('png') || fileName.toLowerCase().endsWith('.png')) {
      format = 'png';
    } else if (origLower.includes('webp') || fileName.toLowerCase().endsWith('.webp')) {
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

export function getOutputFilename(
  originalName: string,
  ratioId: string,
  targetFormat: OutputFormat,
  originalFormat: string
): string {
  const { extension } = getMimeAndExtension(targetFormat, originalFormat, originalName);
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  const ratioStr = ratioId.replace(/^custom:/, '');
  const cleanRatio = ratioId === 'original' ? '' : `_${ratioStr.replace(':', 'x')}`;
  return `${baseName}${cleanRatio}.${extension}`;
}

export interface CropCoordinates {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
}

import { CropBox } from '../types';

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
 * Updates a crop box when switching aspect ratio while keeping its center location
 */
export function updateCropBoxForRatio(
  currentBox: CropBox | undefined,
  W: number,
  H: number,
  newRatio: number | null
): CropBox {
  const targetRatio = newRatio ?? W / H;
  const current = currentBox || getDefaultCropBox(W, H, newRatio);

  // Preserve the center of the existing crop box
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;

  // Compute maximum fitting box at targetRatio
  let maxCropW: number;
  let maxCropH: number;

  if (W / H > targetRatio) {
    maxCropH = H;
    maxCropW = H * targetRatio;
  } else {
    maxCropW = W;
    maxCropH = W / targetRatio;
  }

  const normW = Math.max(0.05, Math.min(1, maxCropW / W));
  const normH = Math.max(0.05, Math.min(1, maxCropH / H));

  // Re-center
  let newX = centerX - normW / 2;
  let newY = centerY - normH / 2;

  // Clamp within image bounds [0, 1]
  newX = Math.max(0, Math.min(1 - normW, newX));
  newY = Math.max(0, Math.min(1 - normH, newY));

  return {
    x: newX,
    y: newY,
    width: normW,
    height: normH,
  };
}

/**
 * Calculates high-precision unscaled crop coordinates in original source image space
 */
export function calculateCropCoordinates(item: ImageItem): CropCoordinates {
  const { originalWidth: W, originalHeight: H, aspectRatioId, reframe, resize } = item;
  const ratioOption = getAspectRatioById(aspectRatioId);
  const targetRatio = ratioOption.ratio ?? W / H;

  let cropW: number;
  let cropH: number;
  let cropX: number;
  let cropY: number;

  if (reframe.cropBox) {
    const box = reframe.cropBox;
    cropW = Math.max(10, Math.min(W, box.width * W));
    cropH = Math.max(10, Math.min(H, box.height * H));
    cropX = Math.max(0, Math.min(W - cropW, box.x * W));
    cropY = Math.max(0, Math.min(H - cropH, box.y * H));
  } else {
    // Fallback if cropBox is not yet initialized
    const defaultBox = getDefaultCropBox(W, H, ratioOption.ratio);
    cropW = Math.max(10, Math.min(W, defaultBox.width * W));
    cropH = Math.max(10, Math.min(H, defaultBox.height * H));
    cropX = Math.max(0, Math.min(W - cropW, defaultBox.x * W));
    cropY = Math.max(0, Math.min(H - cropH, defaultBox.y * H));
  }

  // Determine final output resolution
  let outW = Math.round(cropW);
  let outH = Math.round(cropH);

  if (resize.mode === 'scale' && resize.scalePercent && resize.scalePercent !== 100) {
    const factor = Math.max(0.1, resize.scalePercent / 100);
    outW = Math.max(1, Math.round(outW * factor));
    outH = Math.max(1, Math.round(outH * factor));
  } else if (resize.mode === 'width' && resize.targetWidth && resize.targetWidth > 0) {
    outW = Math.round(resize.targetWidth);
    outH = Math.max(1, Math.round(resize.targetWidth / targetRatio));
  } else if (resize.mode === 'height' && resize.targetHeight && resize.targetHeight > 0) {
    outH = Math.round(resize.targetHeight);
    outW = Math.max(1, Math.round(resize.targetHeight * targetRatio));
  }

  return {
    sourceX: cropX,
    sourceY: cropY,
    sourceWidth: cropW,
    sourceHeight: cropH,
    outputWidth: outW,
    outputHeight: outH,
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
  dataUrl: string;
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

  ctx.save();

  // Handle Rotation and Flipping if applied
  const rotation = (item.reframe.rotation || 0) % 360;
  const flipH = item.reframe.flipH ? -1 : 1;
  const flipV = item.reframe.flipV ? -1 : 1;

  if (rotation !== 0 || flipH === -1 || flipV === -1) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    ctx.scale(flipH, flipV);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  }

  // Draw crop region directly to canvas
  ctx.drawImage(
    img,
    coords.sourceX,
    coords.sourceY,
    coords.sourceWidth,
    coords.sourceHeight,
    0,
    0,
    coords.outputWidth,
    coords.outputHeight
  );

  ctx.restore();

  const quality = customQuality !== undefined ? customQuality : item.quality ?? 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image Blob from canvas'));
          return;
        }
        const dataUrl = URL.createObjectURL(blob);
        resolve({
          blob,
          dataUrl,
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
      item.originalFormat
    );

    zip.file(filename, blob);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 80), `Prepared: ${filename}`);
    }
  }

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
    item.originalFormat
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
