import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FlipHorizontal,
  FlipVertical,
  Grid,
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import {
  COMMON_ASPECT_RATIOS,
  createCustomRatioId,
  getAspectRatioById,
  parseCustomRatio,
} from '../constants/aspectRatios';
import { CropBox, ImageItem, OutputFormat } from '../types';
import {
  calculateCropCoordinates,
  downloadSingleImage,
  flipReframe,
  getDefaultCropBox,
  getMimeAndExtension,
  getOrientedSize,
  rotateReframeClockwise,
  updateCropBoxForRatio,
} from '../utils/imageProcessor';
import { isEditableTarget } from '../utils/keyboard';
import { CroppedImage, OrientedImage } from './OrientedImage';

interface ReframeModalProps {
  item: ImageItem;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onUpdateItem: (updatedItem: ImageItem) => void;
  onNavigate: (newIndex: number) => void;
}

type DragMode = 'move' | 'tl' | 'tr' | 'bl' | 'br' | null;

export const ReframeModal: React.FC<ReframeModalProps> = ({
  item,
  currentIndex,
  totalCount,
  onClose,
  onUpdateItem,
  onNavigate,
}) => {
  const [showGrid, setShowGrid] = useState(true);
  const [dragMode, setDragMode] = useState<DragMode>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startBox: CropBox;
  }>({
    clientX: 0,
    clientY: 0,
    startBox: { x: 0, y: 0, width: 1, height: 1 },
  });

  // The crop box lives in displayed (rotated) image space, so all frame maths uses this size.
  const { width: W, height: H } = getOrientedSize(
    item.originalWidth,
    item.originalHeight,
    item.reframe.rotation
  );
  const currentRatio = getAspectRatioById(item.aspectRatioId);
  const targetRatio = currentRatio.ratio ?? W / H;

  // Active cropBox in normalized [0, 1] coordinates
  const activeCropBox: CropBox = useMemo(() => {
    if (item.reframe.cropBox) {
      return item.reframe.cropBox;
    }
    return getDefaultCropBox(W, H, currentRatio.ratio);
  }, [item.reframe.cropBox, W, H, currentRatio.ratio]);

  const cropCoords = useMemo(() => calculateCropCoordinates(item), [item]);
  const cropAspect = cropCoords.cropWidth / cropCoords.cropHeight;
  const exportsAsPng =
    getMimeAndExtension(item.outputFormat, item.originalFormat, item.name).mimeType === 'image/png';

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Sliders, number fields and selects use the arrow keys themselves.
      if (isEditableTarget(e.target as HTMLElement | null)) return;
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < totalCount - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalCount, onClose, onNavigate]);

  const updateCropBox = useCallback(
    (newBox: CropBox) => {
      onUpdateItem({
        ...item,
        reframe: {
          ...item.reframe,
          cropBox: newBox,
        },
      });
    },
    [item, onUpdateItem]
  );

  const handleRatioSelect = useCallback(
    (ratioId: string) => {
      const newRatioOption = getAspectRatioById(ratioId);
      const updatedBox = updateCropBoxForRatio(activeCropBox, W, H, newRatioOption.ratio);

      onUpdateItem({
        ...item,
        aspectRatioId: ratioId,
        reframe: {
          ...item.reframe,
          cropBox: updatedBox,
        },
      });
    },
    [activeCropBox, item, onUpdateItem, W, H]
  );

  const parsedCustom = useMemo(() => parseCustomRatio(item.aspectRatioId), [item.aspectRatioId]);
  const isCustomRatio = Boolean(parsedCustom);

  const [customW, setCustomW] = useState<string>(
    parsedCustom ? String(parsedCustom.width) : '5'
  );
  const [customH, setCustomH] = useState<string>(
    parsedCustom ? String(parsedCustom.height) : '7'
  );

  useEffect(() => {
    const pc = parseCustomRatio(item.aspectRatioId);
    if (pc) {
      setCustomW(String(pc.width));
      setCustomH(String(pc.height));
    }
  }, [item.aspectRatioId]);

  const applyCustomRatio = useCallback(
    (wStr: string, hStr: string) => {
      const w = parseFloat(wStr);
      const h = parseFloat(hStr);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        const customId = createCustomRatioId(w, h);
        handleRatioSelect(customId);
      }
    },
    [handleRatioSelect]
  );

  const handleCustomWChange = (val: string) => {
    setCustomW(val);
    applyCustomRatio(val, customH);
  };

  const handleCustomHChange = (val: string) => {
    setCustomH(val);
    applyCustomRatio(customW, val);
  };

  const handleSwapCustom = () => {
    const nextW = customH;
    const nextH = customW;
    setCustomW(nextW);
    setCustomH(nextH);
    applyCustomRatio(nextW, nextH);
  };

  const handleSelectPreset = (presetW: number, presetH: number) => {
    const nextW = String(presetW);
    const nextH = String(presetH);
    setCustomW(nextW);
    setCustomH(nextH);
    applyCustomRatio(nextW, nextH);
  };

  const handleFormatSelect = (format: OutputFormat) => {
    onUpdateItem({
      ...item,
      outputFormat: format,
    });
  };

  const handleResetReframe = () => {
    const defaultBox = getDefaultCropBox(item.originalWidth, item.originalHeight, currentRatio.ratio);
    onUpdateItem({
      ...item,
      reframe: {
        cropBox: defaultBox,
        offsetX: 0,
        offsetY: 0,
        zoom: 1,
        rotation: 0,
        flipH: false,
        flipV: false,
      },
      resize: {
        mode: 'native',
        scalePercent: 100,
      },
    });
  };

  const handleRotate = () => {
    onUpdateItem({ ...item, reframe: rotateReframeClockwise(item) });
  };

  const handleFlipH = () => {
    onUpdateItem({ ...item, reframe: flipReframe(item, 'h') });
  };

  const handleFlipV = () => {
    onUpdateItem({ ...item, reframe: flipReframe(item, 'v') });
  };

  // Quick alignment positions (Center, Top, Bottom, Left, Right)
  const handleQuickAlign = (align: 'center' | 'top' | 'bottom' | 'left' | 'right') => {
    let newX = activeCropBox.x;
    let newY = activeCropBox.y;

    if (align === 'center') {
      newX = (1 - activeCropBox.width) / 2;
      newY = (1 - activeCropBox.height) / 2;
    } else if (align === 'top') {
      newY = 0;
    } else if (align === 'bottom') {
      newY = 1 - activeCropBox.height;
    } else if (align === 'left') {
      newX = 0;
    } else if (align === 'right') {
      newX = 1 - activeCropBox.width;
    }

    updateCropBox({
      ...activeCropBox,
      x: Math.max(0, Math.min(1 - activeCropBox.width, newX)),
      y: Math.max(0, Math.min(1 - activeCropBox.height, newY)),
    });
  };

  // Scale frame size slider (from 20% to 100% of maximum possible fit)
  const currentScale = useMemo(() => {
    const maxBox = getDefaultCropBox(W, H, targetRatio);
    const scaleRatio = activeCropBox.width / maxBox.width;
    return Math.round(Math.max(20, Math.min(100, scaleRatio * 100)));
  }, [activeCropBox.width, W, H, targetRatio]);

  const handleScaleSliderChange = (newScalePercent: number) => {
    const maxBox = getDefaultCropBox(W, H, targetRatio);
    const factor = Math.max(0.15, Math.min(1.0, newScalePercent / 100));
    const newW = maxBox.width * factor;
    const newH = maxBox.height * factor;

    // Keep the current center
    const centerX = activeCropBox.x + activeCropBox.width / 2;
    const centerY = activeCropBox.y + activeCropBox.height / 2;

    const newX = Math.max(0, Math.min(1 - newW, centerX - newW / 2));
    const newY = Math.max(0, Math.min(1 - newH, centerY - newH / 2));

    updateCropBox({
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    });
  };

  // Drag start handler (for move or corner resize)
  const startDrag = (
    e: React.MouseEvent | React.TouchEvent,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      clientX,
      clientY,
      startBox: { ...activeCropBox },
    };
    setDragMode(mode);
  };

  // Mouse / Touch Move
  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragMode || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = (clientX - dragStartRef.current.clientX) / rect.width;
      const deltaY = (clientY - dragStartRef.current.clientY) / rect.height;
      const { startBox } = dragStartRef.current;

      if (dragMode === 'move') {
        // Direct 1:1 motion: dragging right increases X, dragging down increases Y
        const newX = Math.max(0, Math.min(1 - startBox.width, startBox.x + deltaX));
        const newY = Math.max(0, Math.min(1 - startBox.height, startBox.y + deltaY));

        updateCropBox({
          ...startBox,
          x: newX,
          y: newY,
        });
      } else if (dragMode === 'br') {
        // Bottom-Right corner: top-left (startBox.x, startBox.y) is fixed
        let newWidth = startBox.width + deltaX;
        let newHeight = (newWidth * W) / (H * targetRatio);

        // Limit to bounds and min size
        const maxW = 1 - startBox.x;
        const maxH = 1 - startBox.y;

        if (newWidth > maxW) {
          newWidth = maxW;
          newHeight = (newWidth * W) / (H * targetRatio);
        }
        if (newHeight > maxH) {
          newHeight = maxH;
          newWidth = (newHeight * H * targetRatio) / W;
        }

        if (newWidth >= 0.1 && newHeight >= 0.1) {
          updateCropBox({
            x: startBox.x,
            y: startBox.y,
            width: newWidth,
            height: newHeight,
          });
        }
      } else if (dragMode === 'tl') {
        // Top-Left corner: bottom-right (fixedX, fixedY) is fixed
        const fixedX = startBox.x + startBox.width;
        const fixedY = startBox.y + startBox.height;

        let newWidth = startBox.width - deltaX;
        let newHeight = (newWidth * W) / (H * targetRatio);

        if (newWidth > fixedX) {
          newWidth = fixedX;
          newHeight = (newWidth * W) / (H * targetRatio);
        }
        if (newHeight > fixedY) {
          newHeight = fixedY;
          newWidth = (newHeight * H * targetRatio) / W;
        }

        if (newWidth >= 0.1 && newHeight >= 0.1) {
          updateCropBox({
            x: fixedX - newWidth,
            y: fixedY - newHeight,
            width: newWidth,
            height: newHeight,
          });
        }
      } else if (dragMode === 'tr') {
        // Top-Right corner: bottom-left (startBox.x, fixedY) is fixed
        const fixedY = startBox.y + startBox.height;
        let newWidth = startBox.width + deltaX;
        let newHeight = (newWidth * W) / (H * targetRatio);

        const maxW = 1 - startBox.x;
        if (newWidth > maxW) {
          newWidth = maxW;
          newHeight = (newWidth * W) / (H * targetRatio);
        }
        if (newHeight > fixedY) {
          newHeight = fixedY;
          newWidth = (newHeight * H * targetRatio) / W;
        }

        if (newWidth >= 0.1 && newHeight >= 0.1) {
          updateCropBox({
            x: startBox.x,
            y: fixedY - newHeight,
            width: newWidth,
            height: newHeight,
          });
        }
      } else if (dragMode === 'bl') {
        // Bottom-Left corner: top-right (fixedX, startBox.y) is fixed
        const fixedX = startBox.x + startBox.width;
        let newWidth = startBox.width - deltaX;
        let newHeight = (newWidth * W) / (H * targetRatio);

        if (newWidth > fixedX) {
          newWidth = fixedX;
          newHeight = (newWidth * W) / (H * targetRatio);
        }
        const maxH = 1 - startBox.y;
        if (newHeight > maxH) {
          newHeight = maxH;
          newWidth = (newHeight * H * targetRatio) / W;
        }

        if (newWidth >= 0.1 && newHeight >= 0.1) {
          updateCropBox({
            x: fixedX - newWidth,
            y: startBox.y,
            width: newWidth,
            height: newHeight,
          });
        }
      }
    },
    [dragMode, W, H, targetRatio, updateCropBox]
  );

  const handlePointerUp = useCallback(() => {
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragMode, handlePointerMove, handlePointerUp]);

  const qualityFill = `${(((item.quality ?? 0.92) - 0.5) / 0.5) * 100}%`;
  const frameFill = `${((currentScale - 20) / 80) * 100}%`;
  const proofWidth = cropAspect >= 1 ? 132 : Math.round(150 * cropAspect);
  const isNative = item.resize.mode === 'native' || (item.resize.mode === 'scale' && item.resize.scalePercent === 100);

  const toolButton = (pressed?: boolean) =>
    `btn-icon ${pressed ? 'bg-ink text-desk hover:bg-ink' : ''}`;

  return (
    <div
      id="reframe-modal-backdrop"
      className="fixed inset-0 z-50 bg-scrim/40 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4"
    >
      <div
        id="reframe-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reframe-title"
        className="w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden rounded-2xl border border-hairline bg-desk text-ink shadow-tray"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 border-b border-hairline">
          <div className="flex items-baseline gap-3 min-w-0">
            <h3
              id="reframe-title"
              className="m-0 min-w-0 truncate font-serif text-xl leading-7 font-medium tracking-[-0.01em] sm:text-[22px]"
            >
              Reframe · <em>{item.name}</em>
            </h3>
            <span className="archival whitespace-nowrap">
              Print {currentIndex + 1} of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div role="group" aria-label="Move between prints" className="segmented grid-cols-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => onNavigate(currentIndex - 1)}
                aria-label="Previous print"
                title="Previous print (←)"
                className="btn-icon size-9 hover:bg-desk"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={currentIndex === totalCount - 1}
                onClick={() => onNavigate(currentIndex + 1)}
                aria-label="Next print"
                title="Next print (→)"
                className="btn-icon size-9 hover:bg-desk"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <button
              id="close-reframe-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Close and return to the contact sheet"
              title="Close (Esc)"
              className="btn-icon size-11"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)] overflow-hidden">
          {/* Proofing stage */}
          <div className="lg:col-span-2 p-4 md:p-6 flex flex-col items-center justify-center gap-3 relative select-none overflow-hidden">
            {/* Fits the stage into whatever space the controls leave (like object-fit: contain). */}
            <div
              className="well w-full flex-1 min-h-[220px] max-h-[58vh] box-border rounded-2xl p-4 flex items-center justify-center"
              style={{ containerType: 'size' }}
            >
              <div className="shrink-0 bg-white p-1.5 rounded shadow-tray">
                <div
                  ref={containerRef}
                  id="original-image-crop-canvas"
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: `${W} / ${H}`,
                    width: `min(calc(100cqw - 12px), calc((100cqh - 12px) * ${W / H}))`,
                  }}
                >
                  {/* Full image, rotated and mirrored as it will be exported */}
                  <OrientedImage item={item} alt={item.name} />

                  {/* Dimmed surround outside the crop frame */}
                  <div
                    className="absolute top-0 left-0 right-0 bg-ink/50 pointer-events-none"
                    style={{ height: `${activeCropBox.y * 100}%` }}
                  />
                  <div
                    className="absolute left-0 right-0 bottom-0 bg-ink/50 pointer-events-none"
                    style={{ top: `${(activeCropBox.y + activeCropBox.height) * 100}%` }}
                  />
                  <div
                    className="absolute left-0 bg-ink/50 pointer-events-none"
                    style={{
                      top: `${activeCropBox.y * 100}%`,
                      height: `${activeCropBox.height * 100}%`,
                      width: `${activeCropBox.x * 100}%`,
                    }}
                  />
                  <div
                    className="absolute right-0 bg-ink/50 pointer-events-none"
                    style={{
                      top: `${activeCropBox.y * 100}%`,
                      height: `${activeCropBox.height * 100}%`,
                      left: `${(activeCropBox.x + activeCropBox.width) * 100}%`,
                    }}
                  />

                  {/* Interactive crop frame */}
                  <div
                    id="interactive-crop-frame"
                    onMouseDown={(e) => startDrag(e, 'move')}
                    onTouchStart={(e) => startDrag(e, 'move')}
                    className={`absolute border-2 border-cinnabar ${
                      dragMode === 'move' ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{
                      left: `${activeCropBox.x * 100}%`,
                      top: `${activeCropBox.y * 100}%`,
                      width: `${activeCropBox.width * 100}%`,
                      height: `${activeCropBox.height * 100}%`,
                    }}
                  >
                    {showGrid && (
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }, (_, i) => (
                          <span
                            key={i}
                            className={`border-desk/55 ${i % 3 !== 2 ? 'border-r' : ''} ${i < 6 ? 'border-b' : ''}`}
                          />
                        ))}
                      </div>
                    )}

                    <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-ink/80 px-2.5 text-[11px] leading-[18px] font-semibold tracking-[0.05em] text-desk whitespace-nowrap">
                      {currentRatio.name} · {cropCoords.outputWidth} × {cropCoords.outputHeight}
                    </span>

                    {(
                      [
                        ['tl', '-top-[7px] -left-[7px] cursor-nwse-resize'],
                        ['tr', '-top-[7px] -right-[7px] cursor-nesw-resize'],
                        ['bl', '-bottom-[7px] -left-[7px] cursor-nesw-resize'],
                        ['br', '-bottom-[7px] -right-[7px] cursor-nwse-resize'],
                      ] as const
                    ).map(([corner, pos]) => (
                      <div
                        key={corner}
                        onMouseDown={(e) => startDrag(e, corner)}
                        onTouchStart={(e) => startDrag(e, corner)}
                        className={`absolute size-3 rounded-[3px] bg-desk ring-2 ring-cinnabar transition-transform hover:scale-125 ${pos}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Frame tools */}
            <div
              role="toolbar"
              aria-label="Frame tools"
              className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 rounded-full border border-hairline bg-sheet px-2.5 py-1.5 shadow-lifted"
            >
              <label className="label-field flex items-center gap-2.5 px-2">
                Frame size
                <input
                  id="modal-frame-size-slider"
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={currentScale}
                  onChange={(e) => handleScaleSliderChange(parseInt(e.target.value, 10))}
                  className="lp-range w-24 md:w-32"
                  style={{ '--fill': frameFill } as React.CSSProperties}
                />
                <span className="font-serif text-[13px] text-ink w-9 text-right tracking-normal">
                  {currentScale}%
                </span>
              </label>
              <span aria-hidden="true" className="w-px h-6 bg-fiber" />
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                aria-label="Composition grid"
                aria-pressed={showGrid}
                title="Composition grid"
                className={toolButton(showGrid)}
              >
                <Grid className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                aria-label="Rotate 90° clockwise"
                title="Rotate 90°"
                className={toolButton()}
              >
                <RotateCw className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleFlipH}
                aria-label="Mirror horizontally"
                aria-pressed={item.reframe.flipH}
                title="Flip Horizontally"
                className={toolButton(item.reframe.flipH)}
              >
                <FlipHorizontal className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleFlipV}
                aria-label="Mirror vertically"
                aria-pressed={item.reframe.flipV}
                title="Flip Vertically"
                className={toolButton(item.reframe.flipV)}
              >
                <FlipVertical className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleResetReframe}
                aria-label="Reset framing and orientation"
                title="Reset frame position and orientation"
                className={`${toolButton()} text-ink-muted`}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </div>

            <p className="archival m-0 text-center">
              Drag the frame to reposition · drag a corner to resize · ← → move between prints
            </p>
          </div>

          {/* Inspector */}
          <div className="bg-sheet border-t lg:border-t-0 lg:border-l border-hairline p-5 overflow-y-auto flex flex-col gap-[22px]">
            {/* Proof */}
            <div className="flex items-center gap-4">
              <div className="shrink-0 bg-white border border-hairline rounded p-1 shadow-lifted">
                <div
                  className="relative overflow-hidden"
                  style={{ width: `${proofWidth}px`, aspectRatio: `${cropAspect}` }}
                >
                  <CroppedImage item={item} cropBox={activeCropBox} alt="Cropped proof" />
                </div>
              </div>
              <div className="min-w-0 flex flex-col gap-1.5">
                <span className="label-caps">Proof</span>
                <div className="flex flex-col">
                  <span className="archival leading-[18px]">
                    Source {item.originalWidth} × {item.originalHeight} px
                  </span>
                  <span className="font-serif text-lg leading-6 font-semibold text-stamp">
                    Export {cropCoords.outputWidth} × {cropCoords.outputHeight} px
                  </span>
                </div>
                <span
                  className={`self-start rounded-full px-2.5 text-[11px] leading-[18px] font-semibold tracking-[0.05em] ${
                    isNative ? 'bg-sage-soft text-sage-ink' : 'bg-well text-ink-muted'
                  }`}
                >
                  {isNative ? 'Native pixels' : 'Resized on export'}
                </span>
              </div>
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-2.5">
              <span id="modal-stock-label" className="label-field">
                Stock
              </span>
              <div role="radiogroup" aria-labelledby="modal-stock-label" className="flex flex-wrap gap-1.5">
                {COMMON_ASPECT_RATIOS.map((ratio) => {
                  const checked = item.aspectRatioId === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      title={ratio.description}
                      onClick={() => handleRatioSelect(ratio.id)}
                      className={`chip ${checked ? 'chip-on' : 'chip-off'}`}
                    >
                      {ratio.name}
                    </button>
                  );
                })}
              </div>

              <div
                id="custom-ratio-editor-card"
                className={`rounded-lg border p-3 flex flex-col gap-2.5 transition-colors ${
                  isCustomRatio ? 'border-ink bg-white' : 'border-hairline bg-desk'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold flex items-center gap-1.5">
                    Custom ratio
                    {isCustomRatio && <Check className="size-3.5 text-stamp" aria-hidden="true" />}
                  </span>
                  <span className="archival">Any width : height</span>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex-1 min-w-0 flex flex-col gap-1 label-field">
                    Width
                    <input
                      id="custom-ratio-modal-width"
                      type="number"
                      min="0.1"
                      step="any"
                      value={customW}
                      onChange={(e) => handleCustomWChange(e.target.value)}
                      className="field"
                    />
                  </label>
                  <span aria-hidden="true" className="font-serif text-xl leading-10 text-ink-muted">
                    :
                  </span>
                  <label className="flex-1 min-w-0 flex flex-col gap-1 label-field">
                    Height
                    <input
                      id="custom-ratio-modal-height"
                      type="number"
                      min="0.1"
                      step="any"
                      value={customH}
                      onChange={(e) => handleCustomHChange(e.target.value)}
                      className="field"
                    />
                  </label>
                  <button
                    id="swap-custom-ratio-button"
                    type="button"
                    onClick={handleSwapCustom}
                    aria-label="Swap width and height"
                    title="Swap width and height"
                    className="btn-quiet size-10 min-h-0 px-0 shrink-0"
                  >
                    <ArrowLeftRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5" aria-label="Custom presets">
                  {[
                    { label: '5:7', w: 5, h: 7 },
                    { label: '7:5', w: 7, h: 5 },
                    { label: '18:9', w: 18, h: 9 },
                    { label: '1:2', w: 1, h: 2 },
                    { label: '2:1', w: 2, h: 1 },
                    { label: '2.39:1', w: 2.39, h: 1 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectPreset(preset.w, preset.h)}
                      className="chip chip-off min-h-8 px-3 text-xs font-serif"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick position */}
            <div className="flex flex-col gap-2.5">
              <span id="quick-position-label" className="label-field">
                Quick position
              </span>
              <div role="group" aria-labelledby="quick-position-label" className="segmented grid-cols-5">
                {(
                  [
                    ['left', 'Left'],
                    ['center', 'Centre'],
                    ['right', 'Right'],
                    ['top', 'Top'],
                    ['bottom', 'Bottom'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleQuickAlign(id)}
                    className="segment text-xs hover:bg-desk"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format and quality */}
            <div className="flex flex-col gap-2.5">
              <label className="label-field flex flex-col gap-1.5">
                Output format
                <select
                  value={item.outputFormat}
                  onChange={(e) => handleFormatSelect(e.target.value as OutputFormat)}
                  className="field h-11 tracking-normal"
                >
                  <option value="original">Keep original</option>
                  <option value="jpeg">JPEG — universal</option>
                  <option value="png">PNG — lossless</option>
                  <option value="webp">WebP — smallest files</option>
                </select>
              </label>
              {!exportsAsPng && (
                <>
                  <div className="flex items-baseline justify-between mt-1">
                    <label htmlFor="modal-quality-slider" className="label-field">
                      Compression quality
                    </label>
                    <span className="font-serif text-lg leading-6 font-semibold text-stamp">
                      {Math.round((item.quality ?? 0.92) * 100)}%
                    </span>
                  </div>
                  <input
                    id="modal-quality-slider"
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.02"
                    value={item.quality ?? 0.92}
                    onChange={(e) => onUpdateItem({ ...item, quality: parseFloat(e.target.value) })}
                    className="lp-range"
                    style={{ '--fill': qualityFill } as React.CSSProperties}
                  />
                </>
              )}
            </div>

            {/* Actions */}
            <div className="mt-auto border-t border-fiber pt-[18px] flex flex-col gap-2.5">
              <button type="button" onClick={onClose} className="btn-stamp min-h-12 text-[15px]">
                <Check className="size-[17px]" aria-hidden="true" />
                Done — back to the sheet
              </button>
              <button type="button" onClick={() => downloadSingleImage(item)} className="btn-quiet">
                <Download className="size-4" aria-hidden="true" />
                Download this proof
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
