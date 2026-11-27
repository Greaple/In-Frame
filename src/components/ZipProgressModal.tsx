import React from 'react';
import { Check, Lock } from 'lucide-react';
import { ImageItem } from '../types';

interface ZipProgressModalProps {
  isOpen: boolean;
  /** 0–100. Up to 80 covers developing each print; 85–99 packaging; 100 done. */
  progress: number;
  statusText: string;
  images: ImageItem[];
}

/** Progress share reserved for rendering prints (see downloadAllAsZip). */
const DEVELOP_SHARE = 80;
/** How many frames the contact strip shows before summarising the rest. */
const STRIP_LIMIT = 12;

type FrameState = 'done' | 'developing' | 'queued';

/** The ZIP export, shown as a contact strip of prints being developed and bound. */
export const ZipProgressModal: React.FC<ZipProgressModalProps> = ({
  isOpen,
  progress,
  statusText,
  images,
}) => {
  if (!isOpen) return null;

  const total = images.length;
  const isCompleted = progress >= 100;
  const isPackaging = progress >= DEVELOP_SHARE;
  const developed = isPackaging
    ? total
    : Math.min(total, Math.floor((progress / DEVELOP_SHARE) * total));

  const stateOf = (index: number): FrameState =>
    index < developed ? 'done' : index === developed && !isPackaging ? 'developing' : 'queued';

  const shown = images.slice(0, STRIP_LIMIT);
  const hidden = total - shown.length;
  const segments = Math.min(total, STRIP_LIMIT) || 1;
  const developedShare = isPackaging ? 1 : developed / Math.max(total, 1);

  return (
    <div
      id="zip-progress-backdrop"
      className="fixed inset-0 z-50 bg-scrim/30 backdrop-blur-[2px] flex items-center justify-center p-4"
    >
      <section
        id="zip-progress-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="binding-title"
        className="w-full max-w-[600px] box-border rounded-2xl border border-hairline bg-desk p-7 flex flex-col gap-[22px] text-ink shadow-tray"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="label-caps">Binding</span>
            <h2
              id="binding-title"
              className="m-0 font-serif text-[26px] leading-[34px] font-medium tracking-[-0.01em]"
            >
              {isCompleted ? (
                <>
                  Your <em>archive</em> is ready
                </>
              ) : isPackaging ? (
                <>
                  Binding the <em>archive</em>
                </>
              ) : (
                <>
                  Developing <em>{total} {total === 1 ? 'print' : 'prints'}</em>
                </>
              )}
            </h2>
          </div>
          <span className="font-serif text-4xl leading-[44px] tracking-[-0.015em] text-sage">
            {progress}%
          </span>
        </div>

        <ol
          aria-label="Contact strip"
          className="well m-0 list-none rounded-lg p-3 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5"
        >
          {shown.map((img, i) => {
            const state = stateOf(i);
            return (
              <li
                key={img.id}
                aria-label={`${img.name}: ${state === 'done' ? 'developed' : state}`}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`relative w-full aspect-square box-border rounded-[3px] p-[3px] ${
                    state === 'done'
                      ? 'bg-white border border-hairline'
                      : state === 'developing'
                        ? 'bg-white border-[1.5px] border-sienna shadow-lifted'
                        : 'bg-sheet border-[1.5px] border-dashed border-dash'
                  }`}
                >
                  <img
                    src={img.dataUrl}
                    alt=""
                    className={`absolute inset-[3px] w-[calc(100%-6px)] h-[calc(100%-6px)] object-cover ${state === 'queued' ? 'opacity-35' : ''} ${
                      state === 'developing' ? 'animate-pulse' : ''
                    }`}
                  />
                  {state === 'done' && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-1.5 size-[18px] rounded-full bg-sage text-desk flex items-center justify-center ring-2 ring-well"
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <span className="archival">{String(i + 1).padStart(2, '0')}</span>
              </li>
            );
          })}
          {hidden > 0 && (
            <li className="flex items-center justify-center archival text-center">+{hidden} more</li>
          )}
        </ol>

        <div className="flex flex-col gap-2">
          <div
            role="progressbar"
            aria-label="Binding progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: segments }, (_, i) => {
              // Each segment fills as its share of the developing pass completes.
              const fill = Math.max(0, Math.min(1, developedShare * segments - i));
              return (
                <span
                  key={i}
                  className="h-2 rounded-full bg-well shadow-[inset_0_0_0_1px_var(--color-fiber)] overflow-hidden"
                >
                  <span
                    className="block h-full bg-sage transition-[width] duration-300"
                    style={{ width: `${fill * 100}%` }}
                  />
                </span>
              );
            })}
          </div>
          <div className="flex justify-between gap-3 text-xs leading-4 font-semibold tracking-[0.03em]">
            <span className="text-sage">
              {Math.min(developed, total)} of {total} developed
            </span>
            <span className="truncate text-ink-muted">{statusText || 'Working…'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-hairline pt-4 text-xs leading-4 font-semibold text-sage">
          <Lock className="size-3.5" aria-hidden="true" />
          {isCompleted
            ? 'Saved to your downloads — developed entirely in your browser'
            : 'Developed in your browser — nothing is uploaded'}
        </div>
      </section>
    </div>
  );
};
