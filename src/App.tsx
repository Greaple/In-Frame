import React, { useState, useRef, useCallback } from 'react';
import { Aperture, Archive, Layers, Lock, Plus, Scan } from 'lucide-react';
import { DropZone } from './components/DropZone';
import { StockRail } from './components/StockRail';
import { DevelopingPanel } from './components/DevelopingPanel';
import { ImageCard } from './components/ImageCard';
import { ReframeModal } from './components/ReframeModal';
import { ZipProgressModal } from './components/ZipProgressModal';
import { getAspectRatioById } from './constants/aspectRatios';
import { SAMPLE_IMAGES } from './constants/sampleImages';
import { BatchGlobalSettings, ImageItem, OutputFormat, ResizeMode } from './types';
import {
  downloadAllAsZip,
  downloadSingleImage,
  formatBytes,
  getDefaultCropBox,
  getOrientedSize,
  loadImage,
  updateCropBoxForRatio,
} from './utils/imageProcessor';

const FEATURES = [
  {
    icon: Layers,
    title: 'Common',
    emphasis: 'stock',
    rest: 'ratios',
    body: 'Square, portrait, story, widescreen or classic 35 mm — set once for the batch, then adjust any print on its own.',
    note: '10 stocks · or any W : H',
  },
  {
    icon: Aperture,
    title: 'Native',
    emphasis: 'resolution',
    rest: '',
    body: 'Each crop is cut from the original pixels with high-quality smoothing. Nothing is shrunk unless you ask for a smaller size.',
    note: 'Full source pixels · what you frame is what you get',
  },
  {
    icon: Archive,
    title: 'Bound as',
    emphasis: 'one ZIP',
    rest: '',
    body: 'Convert to JPEG, PNG or WebP at the quality you choose, then take the whole batch home in a single archive.',
    note: 'JPEG · PNG · WebP · one download',
  },
];


/** Re-fits an item's frame to a new ratio in its displayed (rotated) image space. */
function withRatio(item: ImageItem, ratioId: string): ImageItem {
  const { width, height } = getOrientedSize(
    item.originalWidth,
    item.originalHeight,
    item.reframe.rotation
  );
  return {
    ...item,
    aspectRatioId: ratioId,
    reframe: {
      ...item.reframe,
      cropBox: updateCropBoxForRatio(
        item.reframe.cropBox,
        width,
        height,
        getAspectRatioById(ratioId).ratio
      ),
    },
  };
}

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
    setImages((prev) => prev.map((item) => withRatio(item, ratioId)));
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
    setImages((prev) => prev.map((item) => (item.id === id ? withRatio(item, ratioId) : item)));
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

  const updateGlobalSettings = (settings: Partial<BatchGlobalSettings>) =>
    setGlobalSettings((prev) => ({ ...prev, ...settings }));

  const handleBatchRatioChange = (ratioId: string) => {
    updateGlobalSettings({ aspectRatioId: ratioId });
    handleApplyRatioToAll(ratioId);
  };

  const originalsSize = formatBytes(images.reduce((sum, img) => sum + img.originalSize, 0));
  const printCount = `${images.length} ${images.length === 1 ? 'print' : 'prints'}`;
  const proofCount = `${images.length} ${images.length === 1 ? 'proof' : 'proofs'}`;

  return (
    <div className="min-h-screen bg-desk text-ink flex flex-col">
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

      <header className="md:sticky top-0 z-30 bg-desk/90 backdrop-blur-md border-b border-hairline">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8 xl:px-12 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="size-10 rounded-lg bg-ink text-desk flex items-center justify-center">
              <Scan className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-serif text-2xl leading-7 font-medium tracking-[-0.01em]">
                In-Frame
              </span>
              <span className="archival">
                {images.length > 0
                  ? `${printCount} on the table`
                  : 'A small atelier for batch reframing'}
              </span>
            </div>
          </div>

          {images.length > 0 ? (
            <nav aria-label="Batch actions" className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputTriggerRef.current?.click()}
                className="btn-quiet"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add prints
              </button>
              <button
                id="clear-all-images-button"
                type="button"
                onClick={handleClearAll}
                className="btn-ghost"
              >
                Clear table
              </button>
              <button
                id="header-download-zip-btn"
                type="button"
                disabled={isProcessingZip}
                onClick={handleDownloadZip}
                className="btn-stamp"
              >
                <Archive className="size-4" aria-hidden="true" />
                Bind {proofCount} as ZIP
              </button>
            </nav>
          ) : (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage-soft text-sage-ink text-xs leading-4 font-semibold">
              <Lock className="size-3.5" aria-hidden="true" />
              Everything stays in your browser
            </span>
          )}
        </div>
      </header>

      {images.length === 0 ? (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 md:px-8 xl:px-12 pt-10 md:pt-14 pb-16 flex flex-col gap-14">
          <section className="flex flex-wrap items-center gap-12">
            <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-5">
              <span className="label-caps text-sienna">Batch reframing · JPEG · PNG · WebP</span>
              <h1 className="m-0 max-w-[560px] font-serif font-normal text-[34px] leading-[42px] tracking-[-0.015em] md:text-5xl md:leading-[56px] md:tracking-[-0.02em]">
                Crop, reframe and convert <em className="text-stamp">a whole batch</em> — at full
                resolution.
              </h1>
              <p className="m-0 max-w-[520px] text-base leading-[26px] text-ink-muted">
                Lay your photographs out like a contact sheet, choose a stock ratio once, then
                nudge any print by hand. Every crop is cut from the original pixels and bound into
                one ZIP.
              </p>
              <div className="archival flex flex-wrap gap-x-5 gap-y-2">
                <span>1:1 · 4:5 · 9:16 · 16:9 · 3:2 · custom</span>
                <span>Rotate &amp; mirror</span>
                <span>Quality from 50 to 100</span>
              </div>
            </div>
            <div className="flex-[1_1_520px] min-w-0">
              <DropZone
                onFilesSelected={processFiles}
                onLoadSamples={handleLoadSamples}
                isLoadingSamples={isLoadingSamples}
              />
            </div>
          </section>

          <section
            aria-label="What In-Frame does"
            className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5"
          >
            {FEATURES.map(({ icon: Icon, title, emphasis, rest, body, note }) => (
              <article key={emphasis} className="sheet p-6 flex flex-col gap-2.5">
                <span className="size-10 rounded-full bg-well text-sienna flex items-center justify-center">
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="m-0 font-serif text-xl leading-7 font-medium">
                  {title} <em>{emphasis}</em> {rest}
                </h3>
                <p className="m-0 text-ink-muted">{body}</p>
                <span className="mt-auto font-serif text-[13px] leading-4 text-sage">{note}</span>
              </article>
            ))}
          </section>
        </main>
      ) : (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 md:px-8 xl:px-12 pt-7 pb-14 flex flex-wrap items-start gap-7">
          <StockRail
            aspectRatioId={globalSettings.aspectRatioId}
            onRatioChange={handleBatchRatioChange}
          />

          <section
            aria-labelledby="sheet-heading"
            className="flex-[999_1_560px] min-w-0 flex flex-col gap-5 max-md:order-first"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <h1
                id="sheet-heading"
                className="m-0 font-serif font-normal text-[28px] leading-9 tracking-[-0.01em] md:text-4xl md:leading-[44px] md:tracking-[-0.015em]"
              >
                The contact sheet
              </h1>
              <span className="archival">
                {printCount} · {originalsSize} of originals
              </span>
            </div>

            <DropZone
              onFilesSelected={processFiles}
              onLoadSamples={handleLoadSamples}
              isLoadingSamples={isLoadingSamples}
              compact
            />

            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
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
          </section>

          <DevelopingPanel
            totalCount={images.length}
            globalSettings={globalSettings}
            onUpdateGlobalSettings={updateGlobalSettings}
            onApplyFormatToAll={handleApplyFormatToAll}
            onApplyQualityToAll={handleApplyQualityToAll}
            onApplyResizeToAll={handleApplyResizeToAll}
            onDownloadZip={handleDownloadZip}
            isProcessingZip={isProcessingZip}
          />
        </main>
      )}

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

      <ZipProgressModal
        isOpen={isProcessingZip}
        progress={zipProgress}
        statusText={zipStatusText}
        images={images}
      />
    </div>
  );
}
