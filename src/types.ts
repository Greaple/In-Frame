export type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp';

export interface AspectRatioOption {
  id: string;
  name: string;
  ratio: number | null; // width / height, null for original
  widthRatio?: number;
  heightRatio?: number;
  description: string;
  badge?: string;
  category: 'standard' | 'portrait' | 'landscape' | 'other';
}

export interface CropBox {
  x: number; // 0 to 1 normalized left relative to original width
  y: number; // 0 to 1 normalized top relative to original height
  width: number; // 0 to 1 normalized width
  height: number; // 0 to 1 normalized height
}

export interface ReframeSettings {
  cropBox?: CropBox;
  offsetX: number; // percentage offset from center (-0.5 to 0.5)
  offsetY: number; // percentage offset from center (-0.5 to 0.5)
  zoom: number; // 1 to 3
  rotation: number; // 0, 90, 180, 270 degrees
  flipH: boolean;
  flipV: boolean;
}

export type ResizeMode = 'native' | 'width' | 'height' | 'scale';

export interface ResizeSettings {
  mode: ResizeMode;
  targetWidth?: number;
  targetHeight?: number;
  scalePercent: number; // 10 to 200, default 100
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  originalFormat: string;
  dataUrl: string;
  aspectRatioId: string;
  reframe: ReframeSettings;
  resize: ResizeSettings;
  outputFormat: OutputFormat;
  quality: number; // 0.1 to 1.0 (e.g. 0.92)
  status: 'idle' | 'processing' | 'done' | 'error';
  processedBlob?: Blob;
  processedUrl?: string;
  processedWidth?: number;
  processedHeight?: number;
  processedSize?: number;
  errorMessage?: string;
}

export interface BatchGlobalSettings {
  aspectRatioId: string;
  outputFormat: OutputFormat;
  quality: number;
  resizeMode: ResizeMode;
  scalePercent: number;
  targetWidth?: number;
}
