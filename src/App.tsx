import React, { useState, useRef, useCallback } from 'react';
import {
  Crop,
  Layers,
  Sparkles,
  Download,
  UploadCloud,
  Sliders,
  CheckCircle2,
  Info,
  Maximize,
  FileImage,
  RefreshCw,
} from 'lucide-react';
import { DropZone } from './components/DropZone';
import { BatchToolbar } from './components/BatchToolbar';
import { ImageCard } from './components/ImageCard';
import { ReframeModal } from './components/ReframeModal';
import { ZipProgressModal } from './components/ZipProgressModal';
import { COMMON_ASPECT_RATIOS, getAspectRatioById } from './constants/aspectRatios';
import { SAMPLE_IMAGES } from './constants/sampleImages';
import { BatchGlobalSettings, ImageItem, OutputFormat, ResizeMode } from './types';
import {
  downloadAllAsZip,
  downloadSingleImage,
  getDefaultCropBox,
  loadImage,
  updateCropBoxForRatio,
} from './utils/imageProcessor';

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeModalItem, setActiveModalItem] = useState<ImageItem | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStatusText, setZipStatusText] = useState('');
  const fileInputTriggerRef = useRef<HTMLInputElement>(null);

  // Global settings for batch operations
  const [globalSettings, setGlobalSettings] = useState<BatchGlobalSettings>({
    aspectRatioId: '1:1',
    outputFormat: 'original',
    quality: 0.92,
    resizeMode: 'native',
    scalePercent: 100,
    targetWidth: undefined,
  });

  // Process raw File instances into ImageItems
  const processFiles = useCallback(
    async (files: File[]) => {
      const newItems: ImageItem[] = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;

        const dataUrl = URL.createObjectURL(file);
        try {
          const img = await loadImage(dataUrl);
          const origW = img.naturalWidth || 1920;
          const origH = img.naturalHeight || 1080;
          const targetRatioOpt = getAspectRatioById(globalSettings.aspectRatioId);
          const initialCropBox = getDefaultCropBox(origW, origH, targetRatioOpt.ratio);

          const item: ImageItem = {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file,
            name: file.name,
            originalWidth: origW,
            originalHeight: origH,
            originalSize: file.size,
            originalFormat: file.type || 'image/jpeg',
            dataUrl,
            aspectRatioId: globalSettings.aspectRatioId,
            reframe: {
              cropBox: initialCropBox,
              offsetX: 0,
              offsetY: 0,
              zoom: 1,
              rotation: 0,
              flipH: false,
              flipV: false,
            },
            resize: {
              mode: globalSettings.resizeMode,
              scalePercent: globalSettings.scalePercent,
              targetWidth: globalSettings.targetWidth,
            },
            outputFormat: globalSettings.outputFormat,
            quality: globalSettings.quality,
            status: 'idle',
          };
          newItems.push(item);
        } catch (err) {
          console.error(`Failed to load image metadata for ${file.name}:`, err);
        }
      }

      if (newItems.length > 0) {
        setImages((prev) => [...prev, ...newItems]);
      }
    },
    [globalSettings]
  );

  // Fallback procedural image generator if remote fetch fails or is offline
  const createProceduralImageFile = (
    name: string,
    width: number,
    height: number,
    theme: 'sunset' | 'architecture' | 'portrait'
  ): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      if (theme === 'sunset') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.4, '#db2777');
        grad.addColorStop(0.7, '#f59e0b');
        grad.addColorStop(1, '#065f46');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Sun
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.55, width * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();

        // Mountain silhouettes
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(width * 0.25, height * 0.65);
        ctx.lineTo(width * 0.5, height * 0.8);
        ctx.lineTo(width * 0.75, height * 0.55);
        ctx.lineTo(width, height);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
      } else if (theme === 'architecture') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Architectural geometric structures
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(width * 0.15, height * 0.2, width * 0.35, height * 0.8);

        ctx.fillStyle = '#64748b';
        ctx.fillRect(width * 0.55, height * 0.35, width * 0.3, height * 0.65);
      } else {
        const grad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.45,
          width * 0.1,
          width * 0.5,
          height * 0.5,
          width * 0.7
        );
        grad.addColorStop(0, '#fed7aa');
        grad.addColorStop(0.6, '#ea580c');
        grad.addColorStop(1, '#431407');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Stylized portrait silhouette
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.4, width * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#7c2d12';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.85, width * 0.35, height * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#451a03';
        ctx.fill();
      }

      // Add descriptive label watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = `bold ${Math.round(width * 0.03)}px sans-serif`;
      ctx.fillText(`Sample: ${name} (${width}×${height})`, width * 0.05, height * 0.95);

      canvas.toBlob(
        (blob) => {
          const file = new File([blob!], name, { type: 'image/jpeg' });
          resolve(file);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  // Load sample photos for rapid testing
  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    const filesToLoad: File[] = [];

    try {
      // Try to fetch remote sample photos, with robust procedural fallback
      for (let i = 0; i < SAMPLE_IMAGES.length; i++) {
        const sample = SAMPLE_IMAGES[i];
        try {
          const res = await fetch(sample.url, { mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            filesToLoad.push(new File([blob], sample.name, { type: sample.format }));
            continue;
          }
        } catch {
          // Fallback to local high-res procedural generation
        }

        const theme = i === 0 ? 'sunset' : i === 1 ? 'architecture' : 'portrait';
        const dims =
          i === 0
            ? { w: 3840, h: 2160 }
            : i === 1
            ? { w: 2400, h: 3000 }
            : { w: 3000, h: 3000 };
        const proceduralFile = await createProceduralImageFile(
          sample.name,
          dims.w,
          dims.h,
          theme
        );
        filesToLoad.push(proceduralFile);
      }
    } catch (err) {
      console.error('Error generating sample images:', err);
    }

    await processFiles(filesToLoad);
    setIsLoadingSamples(false);
  };

  // Batch actions
  const handleApplyRatioToAll = (ratioId: string) => {
    const ratioOption = getAspectRatioById(ratioId);
    setImages((prev) =>
      prev.map((item) => {
        const updatedBox = updateCropBoxForRatio(
          item.reframe.cropBox,
          item.originalWidth,
          item.originalHeight,
          ratioOption.ratio
        );
        return {
          ...item,
          aspectRatioId: ratioId,
          reframe: {
            ...item.reframe,
            cropBox: updatedBox,
          },
        };
      })
    );
  };

  const handleApplyFormatToAll = (format: OutputFormat) => {
    setImages((prev) =>
      prev.map((item) => ({
        ...item,
        outputFormat: format,
      }))
    );
  };

  const handleApplyQualityToAll = (quality: number) => {
    setImages((prev) =>
      prev.map((item) => ({
        ...item,
        quality,
      }))
    );
  };

  const handleApplyResizeToAll = (
    mode: ResizeMode,
    scalePercent: number,
    targetWidth?: number
  ) => {
    setImages((prev) =>
      prev.map((item) => ({
        ...item,
        resize: {
          mode,
          scalePercent,
          targetWidth,
        },
      }))
    );
  };

  // Individual item updates
  const handleUpdateItem = (updated: ImageItem) => {
    setImages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    if (activeModalItem?.id === updated.id) {
      setActiveModalItem(updated);
    }
  };

  const handleUpdateRatio = (id: string, ratioId: string) => {
    const ratioOption = getAspectRatioById(ratioId);
    setImages((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updatedBox = updateCropBoxForRatio(
          item.reframe.cropBox,
          item.originalWidth,
          item.originalHeight,
          ratioOption.ratio
        );
        return {
          ...item,
          aspectRatioId: ratioId,
          reframe: {
            ...item.reframe,
            cropBox: updatedBox,
          },
        };
      })
    );
  };

  const handleUpdateFormat = (id: string, format: OutputFormat) => {
    setImages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, outputFormat: format } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const target = prev.find((item) => item.id === id);
      if (target?.dataUrl) {
        URL.revokeObjectURL(target.dataUrl);
      }
      return filtered;
    });
    if (activeModalItem?.id === id) {
      setActiveModalItem(null);
    }
  };

  const handleClearAll = () => {
    images.forEach((item) => {
      if (item.dataUrl) URL.revokeObjectURL(item.dataUrl);
    });
    setImages([]);
    setActiveModalItem(null);
  };

  // Zip Archive Batch Download
  const handleDownloadZip = async () => {
    if (images.length === 0 || isProcessingZip) return;
    setIsProcessingZip(true);
    setZipProgress(5);
    setZipStatusText('Initializing batch rendering...');

    try {
      await downloadAllAsZip(images, (progress, currentStatus) => {
        setZipProgress(progress);
        setZipStatusText(currentStatus);
      });
      setTimeout(() => {
        setIsProcessingZip(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to generate ZIP archive:', err);
      alert('Failed to generate ZIP archive. Please check console for details.');
      setIsProcessingZip(false);
    }
  };

  const activeIndex = activeModalItem
    ? images.findIndex((img) => img.id === activeModalItem.id)
    : -1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Hidden file picker trigger */}
      <input
        ref={fileInputTriggerRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            processFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Top Navigation / App Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Batch Image Resizer
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Crop, reframe & convert in batch · Full native resolution preservation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {images.length > 0 && (
              <button
                id="header-download-zip-btn"
                type="button"
                disabled={isProcessingZip}
                onClick={handleDownloadZip}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Export {images.length} as ZIP</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* If no images loaded yet: Full Welcome Dropzone */}
        {images.length === 0 ? (
          <div className="py-8 space-y-8">
            <DropZone
              onFilesSelected={processFiles}
              onLoadSamples={handleLoadSamples}
              isLoadingSamples={isLoadingSamples}
            />

            {/* Explanatory cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Common Aspect Ratios
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Batch apply square (1:1), portrait (4:5, 9:16), widescreen (16:9), or classic 35mm
                  (3:2) in one click or customize individually.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Native Crisp Resolution
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Crops are calculated directly from original source pixel coordinates with high
                  smoothing, avoiding unnecessary downsampling or blur.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Multi-Format ZIP Export
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Convert to JPEG, PNG, or WebP with adjustable compression quality, and package
                  all files directly into a single zip archive.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Workspace with loaded batch */
          <div className="space-y-6">
            {/* Batch Controls Toolbar */}
            <BatchToolbar
              totalCount={images.length}
              globalSettings={globalSettings}
              onUpdateGlobalSettings={(newSettings) =>
                setGlobalSettings((prev) => ({ ...prev, ...newSettings }))
              }
              onApplyRatioToAll={handleApplyRatioToAll}
              onApplyFormatToAll={handleApplyFormatToAll}
              onApplyQualityToAll={handleApplyQualityToAll}
              onApplyResizeToAll={handleApplyResizeToAll}
              onDownloadZip={handleDownloadZip}
              onAddMoreClick={() => fileInputTriggerRef.current?.click()}
              onClearAll={handleClearAll}
              isProcessingZip={isProcessingZip}
            />

            {/* Compact DropZone for dragging additional images onto existing batch */}
            <DropZone
              onFilesSelected={processFiles}
              onLoadSamples={handleLoadSamples}
              isLoadingSamples={isLoadingSamples}
              compact
            />

            {/* Image Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {images.map((item) => (
                <ImageCard
                  key={item.id}
                  item={item}
                  onOpenReframeModal={(it) => setActiveModalItem(it)}
                  onUpdateRatio={handleUpdateRatio}
                  onUpdateFormat={handleUpdateFormat}
                  onRemove={handleRemoveItem}
                  onDownloadSingle={downloadSingleImage}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Interactive Reframing & Cropping Modal */}
      {activeModalItem && (
        <ReframeModal
          item={activeModalItem}
          currentIndex={activeIndex !== -1 ? activeIndex : 0}
          totalCount={images.length}
          onClose={() => setActiveModalItem(null)}
          onUpdateItem={handleUpdateItem}
          onNavigate={(newIndex) => {
            if (newIndex >= 0 && newIndex < images.length) {
              setActiveModalItem(images[newIndex]);
            }
          }}
        />
      )}

      {/* Real-time ZIP Compression and Packaging Progress Modal */}
      <ZipProgressModal
        isOpen={isProcessingZip}
        progress={zipProgress}
        statusText={zipStatusText}
        totalImages={images.length}
      />
    </div>
  );
}
