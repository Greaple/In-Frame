import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Grid,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Check,
  Maximize2,
  Minimize2,
  Move,
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';
import {
  COMMON_ASPECT_RATIOS,
  createCustomRatioId,
  getAspectRatioById,
  parseCustomRatio,
} from '../constants/aspectRatios';
import { CropBox, ImageItem, OutputFormat, ResizeSettings } from '../types';
import {
  calculateCropCoordinates,
  downloadSingleImage,
  getDefaultCropBox,
  updateCropBoxForRatio,
} from '../utils/imageProcessor';

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

  const currentRatio = getAspectRatioById(item.aspectRatioId);
  const targetRatio = currentRatio.ratio ?? item.originalWidth / item.originalHeight;

  // Active cropBox in normalized [0, 1] coordinates
  const activeCropBox: CropBox = useMemo(() => {
    if (item.reframe.cropBox) {
      return item.reframe.cropBox;
    }
    return getDefaultCropBox(item.originalWidth, item.originalHeight, currentRatio.ratio);
  }, [item.reframe.cropBox, item.originalWidth, item.originalHeight, currentRatio.ratio]);

  const cropCoords = useMemo(() => calculateCropCoordinates(item), [item]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
      const updatedBox = updateCropBoxForRatio(
        activeCropBox,
        item.originalWidth,
        item.originalHeight,
        newRatioOption.ratio
      );

      onUpdateItem({
        ...item,
        aspectRatioId: ratioId,
        reframe: {
          ...item.reframe,
          cropBox: updatedBox,
        },
      });
    },
    [activeCropBox, item, onUpdateItem]
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
    onUpdateItem({
      ...item,
      reframe: {
        ...item.reframe,
        rotation: ((item.reframe.rotation || 0) + 90) % 360,
      },
    });
  };

  const handleFlipH = () => {
    onUpdateItem({
      ...item,
      reframe: {
        ...item.reframe,
        flipH: !item.reframe.flipH,
      },
    });
  };

  const handleFlipV = () => {
    onUpdateItem({
      ...item,
      reframe: {
        ...item.reframe,
        flipV: !item.reframe.flipV,
      },
    });
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
    const maxBox = getDefaultCropBox(item.originalWidth, item.originalHeight, targetRatio);
    const scaleRatio = activeCropBox.width / maxBox.width;
    return Math.round(Math.max(20, Math.min(100, scaleRatio * 100)));
  }, [activeCropBox.width, item.originalWidth, item.originalHeight, targetRatio]);

  const handleScaleSliderChange = (newScalePercent: number) => {
    const maxBox = getDefaultCropBox(item.originalWidth, item.originalHeight, targetRatio);
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
      const W = item.originalWidth;
      const H = item.originalHeight;

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
    [dragMode, item.originalWidth, item.originalHeight, targetRatio, updateCropBox]
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

  return (
    <div
      id="reframe-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="reframe-modal-dialog"
        className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Reframe & Crop:</span>
              <span className="text-indigo-400 font-semibold truncate max-w-xs">{item.name}</span>
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
              {currentIndex + 1} of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next Nav */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => onNavigate(currentIndex - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
                title="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentIndex === totalCount - 1}
                onClick={() => onNavigate(currentIndex + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
                title="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              id="close-reframe-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          {/* Main Stage: Full Image in original aspect ratio with overlay crop frame */}
          <div className="lg:col-span-2 bg-slate-950 p-4 md:p-6 flex flex-col items-center justify-center relative select-none overflow-hidden">
            {/* Container for original image and crop overlay */}
            <div
              ref={containerRef}
              id="original-image-crop-canvas"
              className="relative max-h-[58vh] max-w-full rounded-xl overflow-hidden shadow-2xl border border-slate-800"
              style={{
                aspectRatio: `${item.originalWidth} / ${item.originalHeight}`,
              }}
            >
              {/* Full Original Image */}
              <img
                src={item.dataUrl}
                alt={item.name}
                draggable={false}
                className="w-full h-full object-contain pointer-events-none select-none"
                style={{
                  transform: `rotate(${item.reframe.rotation}deg) scaleX(${
                    item.reframe.flipH ? -1 : 1
                  }) scaleY(${item.reframe.flipV ? -1 : 1})`,
                }}
              />

              {/* Darkened Mask Panels outside the crop frame */}
              {/* Top Mask */}
              <div
                className="absolute top-0 left-0 right-0 bg-slate-950/65 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                style={{ height: `${activeCropBox.y * 100}%` }}
              />
              {/* Bottom Mask */}
              <div
                className="absolute left-0 right-0 bottom-0 bg-slate-950/65 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                style={{
                  top: `${(activeCropBox.y + activeCropBox.height) * 100}%`,
                }}
              />
              {/* Left Mask */}
              <div
                className="absolute left-0 bg-slate-950/65 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                style={{
                  top: `${activeCropBox.y * 100}%`,
                  height: `${activeCropBox.height * 100}%`,
                  width: `${activeCropBox.x * 100}%`,
                }}
              />
              {/* Right Mask */}
              <div
                className="absolute right-0 bg-slate-950/65 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                style={{
                  top: `${activeCropBox.y * 100}%`,
                  height: `${activeCropBox.height * 100}%`,
                  left: `${(activeCropBox.x + activeCropBox.width) * 100}%`,
                }}
              />

              {/* Interactive Crop Box */}
              <div
                id="interactive-crop-frame"
                onMouseDown={(e) => startDrag(e, 'move')}
                onTouchStart={(e) => startDrag(e, 'move')}
                className={`absolute border-2 border-indigo-400 shadow-[0_0_0_1px_rgba(255,255,255,0.4)] cursor-move ${
                  dragMode === 'move' ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                style={{
                  left: `${activeCropBox.x * 100}%`,
                  top: `${activeCropBox.y * 100}%`,
                  width: `${activeCropBox.width * 100}%`,
                  height: `${activeCropBox.height * 100}%`,
                }}
              >
                {/* Rule of Thirds Grid */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div className="border-r border-b border-white/25" />
                    <div />
                  </div>
                )}

                {/* Aspect Ratio Badge attached to crop frame */}
                <div className="absolute top-1.5 left-1.5 pointer-events-none">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-black/80 backdrop-blur text-white border border-white/20 shadow">
                    {currentRatio.name} · {cropCoords.outputWidth}×{cropCoords.outputHeight}
                  </span>
                </div>

                {/* Corner Resize Handles */}
                {/* Top-Left */}
                <div
                  onMouseDown={(e) => startDrag(e, 'tl')}
                  onTouchStart={(e) => startDrag(e, 'tl')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow cursor-nwse-resize hover:scale-125 transition-transform"
                />
                {/* Top-Right */}
                <div
                  onMouseDown={(e) => startDrag(e, 'tr')}
                  onTouchStart={(e) => startDrag(e, 'tr')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow cursor-nesw-resize hover:scale-125 transition-transform"
                />
                {/* Bottom-Left */}
                <div
                  onMouseDown={(e) => startDrag(e, 'bl')}
                  onTouchStart={(e) => startDrag(e, 'bl')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow cursor-nesw-resize hover:scale-125 transition-transform"
                />
                {/* Bottom-Right */}
                <div
                  onMouseDown={(e) => startDrag(e, 'br')}
                  onTouchStart={(e) => startDrag(e, 'br')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow cursor-nwse-resize hover:scale-125 transition-transform"
                />
              </div>
            </div>

            {/* Viewport Floating Controls Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-2xl px-4 py-2 shadow-lg">
              {/* Frame Size Slider */}
              <div className="flex items-center gap-2">
                <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                <input
                  id="modal-frame-size-slider"
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={currentScale}
                  onChange={(e) => handleScaleSliderChange(parseInt(e.target.value, 10))}
                  className="w-24 md:w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono text-slate-300 w-10 text-right">
                  {currentScale}%
                </span>
              </div>

              <div className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" />

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                  showGrid ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Toggle composition grid"
              >
                <Grid className="w-4 h-4" />
              </button>

              {/* Rotate 90° */}
              <button
                type="button"
                onClick={handleRotate}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Flip Horizontal */}
              <button
                type="button"
                onClick={handleFlipH}
                className={`p-2 rounded-xl transition ${
                  item.reframe.flipH
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>

              {/* Flip Vertical */}
              <button
                type="button"
                onClick={handleFlipV}
                className={`p-2 rounded-xl transition ${
                  item.reframe.flipV
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Flip Vertically"
              >
                <FlipVertical className="w-4 h-4" />
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={handleResetReframe}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Reset frame position and orientation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
              <Move className="w-3 h-3 text-indigo-400" />
              <span>Drag frame to reposition · Drag corners to resize · Adjust slider for scale</span>
            </p>
          </div>

          {/* Right Panel: Settings, Live Preview & Ratios */}
          <div className="p-5 md:p-6 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-y-auto space-y-5">
            {/* Live Cropped Result Preview */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Cropped Output Preview
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                  Native 100% Quality
                </span>
              </div>

              {/* Live Preview Container matching target aspect ratio */}
              <div className="flex items-center justify-center py-2">
                <div
                  className="relative overflow-hidden rounded-lg shadow-md border border-slate-700 bg-slate-900"
                  style={{
                    aspectRatio: `${targetRatio}`,
                    width: targetRatio >= 1 ? 'min(100%, 220px)' : `${Math.round(180 * targetRatio)}px`,
                  }}
                >
                  <img
                    src={item.dataUrl}
                    alt="Cropped Preview"
                    className="absolute max-w-none transition-all duration-75 pointer-events-none select-none"
                    style={{
                      width: `${(1 / activeCropBox.width) * 100}%`,
                      height: `${(1 / activeCropBox.height) * 100}%`,
                      left: `-${(activeCropBox.x / activeCropBox.width) * 100}%`,
                      top: `-${(activeCropBox.y / activeCropBox.height) * 100}%`,
                      transform: `rotate(${item.reframe.rotation}deg) scaleX(${
                        item.reframe.flipH ? -1 : 1
                      }) scaleY(${item.reframe.flipV ? -1 : 1})`,
                    }}
                  />
                </div>
              </div>

              {/* Dimensions Readout */}
              <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Source Original:</span>
                  <span className="font-mono text-slate-300">
                    {item.originalWidth} × {item.originalHeight} px
                  </span>
                </div>
                <div className="flex justify-between font-bold text-white">
                  <span>Export Crop:</span>
                  <span className="font-mono text-indigo-400">
                    {cropCoords.outputWidth} × {cropCoords.outputHeight} px
                  </span>
                </div>
              </div>
            </div>

            {/* Aspect Ratio Selector with Custom Ratio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Aspect Ratio
                </label>
                {isCustomRatio && (
                  <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/70 border border-indigo-700/60 px-2 py-0.5 rounded-md">
                    Custom {parsedCustom?.width}:{parsedCustom?.height}
                  </span>
                )}
              </div>

              {/* Custom Ratio Input Card */}
              <div
                id="custom-ratio-editor-card"
                className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                  isCustomRatio
                    ? 'bg-indigo-950/30 border-indigo-500 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => applyCustomRatio(customW, customH)}
                    className="flex items-center gap-2 text-left w-full"
                  >
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Custom Ratio</span>
                      {isCustomRatio && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      Enter any Width : Height
                    </span>
                  </button>
                </div>

                {/* Input Fields & Swap Button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                      <span className="text-[10px] text-slate-500 font-bold mr-1.5 uppercase select-none">
                        W
                      </span>
                      <input
                        id="custom-ratio-modal-width"
                        type="number"
                        min="0.1"
                        step="any"
                        value={customW}
                        onChange={(e) => handleCustomWChange(e.target.value)}
                        placeholder="5"
                        className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <span className="text-slate-500 font-bold text-sm">:</span>

                  <div className="flex-1">
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                      <span className="text-[10px] text-slate-500 font-bold mr-1.5 uppercase select-none">
                        H
                      </span>
                      <input
                        id="custom-ratio-modal-height"
                        type="number"
                        min="0.1"
                        step="any"
                        value={customH}
                        onChange={(e) => handleCustomHChange(e.target.value)}
                        placeholder="7"
                        className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    id="swap-custom-ratio-button"
                    type="button"
                    onClick={handleSwapCustom}
                    title="Swap Width and Height (Flip orientation)"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-medium">Quick presets:</span>
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
                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard presets grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {COMMON_ASPECT_RATIOS.map((ratio) => {
                  const isSelected = item.aspectRatioId === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => handleRatioSelect(ratio.id)}
                      className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">{ratio.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-1">
                        {ratio.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Reframe Anchors */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick Reframe Position
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Left', id: 'left' as const },
                  { label: 'Center', id: 'center' as const },
                  { label: 'Right', id: 'right' as const },
                  { label: 'Top', id: 'top' as const },
                  { label: 'Bottom', id: 'bottom' as const },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => handleQuickAlign(pos.id)}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 transition text-center"
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Format and Quality */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Output Format
                </label>
                <select
                  value={item.outputFormat}
                  onChange={(e) => handleFormatSelect(e.target.value as OutputFormat)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="original">Keep Original</option>
                  <option value="jpeg">JPEG (.jpg) — Universal</option>
                  <option value="png">PNG (.png) — Lossless</option>
                  <option value="webp">WebP (.webp) — Optimized web</option>
                </select>
              </div>

              {item.outputFormat !== 'png' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Compression Quality
                    </label>
                    <span className="text-xs font-bold text-indigo-400">
                      {Math.round((item.quality ?? 0.92) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.02"
                    value={item.quality ?? 0.92}
                    onChange={(e) => onUpdateItem({ ...item, quality: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => downloadSingleImage(item)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Download This Image
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Check className="w-4 h-4" />
                Done & Return to Batch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
