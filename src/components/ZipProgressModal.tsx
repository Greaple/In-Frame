import React from 'react';
import { Archive, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface ZipProgressModalProps {
  isOpen: boolean;
  progress: number;
  statusText: string;
  totalImages: number;
}

export const ZipProgressModal: React.FC<ZipProgressModalProps> = ({
  isOpen,
  progress,
  statusText,
  totalImages,
}) => {
  if (!isOpen) return null;

  const isCompleted = progress >= 100;

  return (
    <div
      id="zip-progress-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="zip-progress-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full text-center space-y-5"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
          {isCompleted ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in" />
          ) : (
            <Archive className="w-8 h-8 animate-bounce" />
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isCompleted ? 'Archive Ready!' : 'Preparing Your ZIP Archive'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isCompleted
              ? `All ${totalImages} images processed with full resolution and saved to your downloads.`
              : `Processing ${totalImages} high-resolution image crops...`}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="truncate pr-2">{statusText || 'Working...'}</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Processed client-side in your browser for maximum privacy</span>
        </div>
      </div>
    </div>
  );
};
