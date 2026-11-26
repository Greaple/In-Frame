import { AspectRatioOption } from '../types';

export const COMMON_ASPECT_RATIOS: AspectRatioOption[] = [
  {
    id: 'original',
    name: 'Original',
    ratio: null,
    description: 'Keep original proportions',
    badge: 'Source',
    category: 'standard',
  },
  {
    id: '1:1',
    name: '1:1',
    ratio: 1,
    widthRatio: 1,
    heightRatio: 1,
    description: 'Square · Instagram & Avatars',
    badge: 'Square',
    category: 'standard',
  },
  {
    id: '4:5',
    name: '4:5',
    ratio: 4 / 5,
    widthRatio: 4,
    heightRatio: 5,
    description: 'Portrait · Instagram Post',
    badge: 'Portrait',
    category: 'portrait',
  },
  {
    id: '9:16',
    name: '9:16',
    ratio: 9 / 16,
    widthRatio: 9,
    heightRatio: 16,
    description: 'Story / Reel / TikTok / Shorts',
    badge: 'Story',
    category: 'portrait',
  },
  {
    id: '2:3',
    name: '2:3',
    ratio: 2 / 3,
    widthRatio: 2,
    heightRatio: 3,
    description: 'Classic Portrait · Pinterest & 4×6',
    badge: 'Classic V',
    category: 'portrait',
  },
  {
    id: '3:4',
    name: '3:4',
    ratio: 3 / 4,
    widthRatio: 3,
    heightRatio: 4,
    description: 'Standard Portrait · iPad & Print',
    badge: 'Portrait',
    category: 'portrait',
  },
  {
    id: '16:9',
    name: '16:9',
    ratio: 16 / 9,
    widthRatio: 16,
    heightRatio: 9,
    description: 'Widescreen · YouTube & Displays',
    badge: 'Widescreen',
    category: 'landscape',
  },
  {
    id: '3:2',
    name: '3:2',
    ratio: 3 / 2,
    widthRatio: 3,
    heightRatio: 2,
    description: 'Classic 35mm · DSLR & 6×4 Print',
    badge: 'Classic H',
    category: 'landscape',
  },
  {
    id: '4:3',
    name: '4:3',
    ratio: 4 / 3,
    widthRatio: 4,
    heightRatio: 3,
    description: 'Standard Landscape · Classic TV & iPad',
    badge: 'Standard',
    category: 'landscape',
  },
  {
    id: '21:9',
    name: '21:9',
    ratio: 21 / 9,
    widthRatio: 21,
    heightRatio: 9,
    description: 'Cinematic Ultrawide Banner',
    badge: 'Ultrawide',
    category: 'landscape',
  },
];

export function parseCustomRatio(id: string): { width: number; height: number; ratio: number } | null {
  if (!id) return null;
  if (id.startsWith('custom:')) {
    const raw = id.substring('custom:'.length);
    const parts = raw.split(':');
    if (parts.length === 2) {
      const w = parseFloat(parts[0]);
      const h = parseFloat(parts[1]);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        return { width: w, height: h, ratio: w / h };
      }
    }
  }
  return null;
}

export function createCustomRatioId(width: number, height: number): string {
  const cleanW = Math.round(width * 100) / 100;
  const cleanH = Math.round(height * 100) / 100;
  return `custom:${cleanW}:${cleanH}`;
}

export function getAspectRatioById(id: string): AspectRatioOption {
  const custom = parseCustomRatio(id);
  if (custom) {
    return {
      id,
      name: `${custom.width}:${custom.height}`,
      ratio: custom.ratio,
      widthRatio: custom.width,
      heightRatio: custom.height,
      description: `Custom ${custom.width}:${custom.height} proportion`,
      badge: 'Custom',
      category: 'other',
    };
  }
  return COMMON_ASPECT_RATIOS.find((r) => r.id === id) || COMMON_ASPECT_RATIOS[0];
}
