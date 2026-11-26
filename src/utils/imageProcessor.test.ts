import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ImageItem, ReframeSettings } from '../types';
import {
  Matrix,
  calculateCropCoordinates,
  flipReframe,
  getExportTransform,
  getMimeAndExtension,
  getOrientationMatrix,
  getOrientedSize,
  getOutputFilename,
  makeUniqueFilenames,
  rotateReframeClockwise,
  updateCropBoxForRatio,
} from './imageProcessor';

type Pt = [number, number];

const apply = (m: Matrix, [x, y]: Pt): Pt => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];

const invert = (m: Matrix): Matrix => {
  const det = m.a * m.d - m.b * m.c;
  const a = m.d / det;
  const b = -m.b / det;
  const c = -m.c / det;
  const d = m.a / det;
  return { a, b, c, d, e: -(a * m.e + c * m.f), f: -(b * m.e + d * m.f) };
};

const assertPoint = (actual: Pt, expected: Pt, label = '') => {
  const ok = Math.abs(actual[0] - expected[0]) < 1e-6 && Math.abs(actual[1] - expected[1]) < 1e-6;
  assert.ok(ok, `${label} expected (${expected}) but got (${actual})`);
};

const assertClose = (actual: number, expected: number, label = '') => {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${label} expected ${expected} but got ${actual}`);
};

type ItemOverrides = Omit<Partial<ImageItem>, 'reframe'> & { reframe?: Partial<ReframeSettings> };

function makeItem(overrides: ItemOverrides = {}): ImageItem {
  const base: ImageItem = {
    id: 'test',
    file: new File([], 'photo.jpg'),
    name: 'photo.jpg',
    originalWidth: 400,
    originalHeight: 200,
    originalSize: 0,
    originalFormat: 'image/jpeg',
    dataUrl: '',
    aspectRatioId: 'original',
    reframe: {
      cropBox: { x: 0, y: 0, width: 1, height: 1 },
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
    resize: { mode: 'native', scalePercent: 100 },
    outputFormat: 'original',
    quality: 0.92,
    status: 'idle',
  };
  return { ...base, ...overrides, reframe: { ...base.reframe, ...overrides.reframe } };
}

/** The point of the source image that sits under the given displayed point. */
const sourcePointUnder = (item: ImageItem, displayed: Pt): Pt => {
  const m = getOrientationMatrix(item.originalWidth, item.originalHeight, item.reframe);
  return apply(invert(m), displayed);
};

const boxCentre = (item: ImageItem): Pt => {
  const { width: TW, height: TH } = getOrientedSize(
    item.originalWidth,
    item.originalHeight,
    item.reframe.rotation
  );
  const box = item.reframe.cropBox!;
  return [(box.x + box.width / 2) * TW, (box.y + box.height / 2) * TH];
};

describe('orientation', () => {
  test('oriented size swaps width and height at 90° and 270°', () => {
    assert.deepEqual(getOrientedSize(400, 200, 0), { width: 400, height: 200 });
    assert.deepEqual(getOrientedSize(400, 200, 90), { width: 200, height: 400 });
    assert.deepEqual(getOrientedSize(400, 200, 180), { width: 400, height: 200 });
    assert.deepEqual(getOrientedSize(400, 200, 270), { width: 200, height: 400 });
  });

  test('export size swaps for a 90° rotated full frame', () => {
    const coords = calculateCropCoordinates(makeItem({ reframe: { rotation: 90 } }));
    assert.equal(coords.outputWidth, 200);
    assert.equal(coords.outputHeight, 400);
  });

  // Independent oracle: where the source's top-left corner should land on screen.
  type Corner = 'TL' | 'TR' | 'BR' | 'BL';
  const clockwise: Corner[] = ['TL', 'TR', 'BR', 'BL'];
  const mirrorH: Record<Corner, Corner> = { TL: 'TR', TR: 'TL', BL: 'BR', BR: 'BL' };
  const mirrorV: Record<Corner, Corner> = { TL: 'BL', BL: 'TL', TR: 'BR', BR: 'TR' };
  const opposite: Record<Corner, Corner> = { TL: 'BR', BR: 'TL', TR: 'BL', BL: 'TR' };
  const cornerPoint = (c: Corner, w: number, h: number): Pt =>
    ({ TL: [0, 0], TR: [w, 0], BR: [w, h], BL: [0, h] })[c] as Pt;

  for (const rotation of [0, 90, 180, 270]) {
    for (const flipH of [false, true]) {
      for (const flipV of [false, true]) {
        test(`full-frame export puts source corners where the screen shows them (rot ${rotation}, flipH ${flipH}, flipV ${flipV})`, () => {
          const item = makeItem({ reframe: { rotation, flipH, flipV } });
          const coords = calculateCropCoordinates(item);
          const m = getExportTransform(item);

          let tl: Corner = clockwise[rotation / 90];
          if (flipH) tl = mirrorH[tl];
          if (flipV) tl = mirrorV[tl];

          const W = coords.outputWidth;
          const H = coords.outputHeight;
          assertPoint(apply(m, [0, 0]), cornerPoint(tl, W, H), 'source top-left');
          assertPoint(apply(m, [400, 200]), cornerPoint(opposite[tl], W, H), 'source bottom-right');
        });
      }
    }
  }

  test('unrotated, unflipped export keeps the existing crop geometry', () => {
    const item = makeItem({
      aspectRatioId: '1:1',
      reframe: { cropBox: { x: 0.25, y: 0, width: 0.5, height: 1 } },
    });
    const coords = calculateCropCoordinates(item);
    assert.equal(coords.outputWidth, 200);
    assert.equal(coords.outputHeight, 200);
    const m = getExportTransform(item);
    assertPoint(apply(m, [100, 0]), [0, 0]);
    assertPoint(apply(m, [300, 200]), [200, 200]);
  });

  test('flipped off-centre crop exports the region the frame covers on screen', () => {
    // Frame over the right half of the mirrored image = the left half of the source.
    const item = makeItem({
      aspectRatioId: '1:1',
      reframe: { flipH: true, cropBox: { x: 0.5, y: 0, width: 0.5, height: 1 } },
    });
    const m = getExportTransform(item);
    assertPoint(apply(m, [0, 0]), [200, 0], 'source top-left');
    assertPoint(apply(m, [200, 200]), [0, 200], 'source bottom-centre');
  });

  test('rotated off-centre crop exports the region the frame covers on screen', () => {
    // After a clockwise turn the bottom half of the screen shows the source's right half.
    const item = makeItem({
      aspectRatioId: '1:1',
      reframe: { rotation: 90, cropBox: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    });
    const m = getExportTransform(item);
    assertPoint(apply(m, [200, 200]), [0, 0], 'source bottom-centre');
    assertPoint(apply(m, [400, 0]), [200, 200], 'source top-right');
  });
});

describe('rotate and flip edits', () => {
  test('rotating keeps the crop at the selected aspect ratio', () => {
    const item = makeItem({
      aspectRatioId: '16:9',
      reframe: { cropBox: { x: 0.05, y: 0, width: 0.8889, height: 1 } },
    });
    const next = rotateReframeClockwise(item);
    assert.equal(next.rotation, 90);
    const box = next.cropBox!;
    // Oriented image is now 200 x 400.
    assertClose((box.width * 200) / (box.height * 400), 16 / 9, 'pixel aspect');
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 1 + 1e-9 && box.y + box.height <= 1 + 1e-9);
  });

  test('rotating keeps the same content under the centre of the frame', () => {
    // Deliberately asymmetric (x ≠ y), so a frame that fails to turn lands somewhere else.
    const item = makeItem({
      aspectRatioId: '1:1',
      reframe: { cropBox: { x: 0.1, y: 0.2, width: 0.2, height: 0.4 } },
    });
    const before = sourcePointUnder(item, boxCentre(item));
    const rotated = makeItem({ ...item, reframe: rotateReframeClockwise(item) });
    const after = sourcePointUnder(rotated, boxCentre(rotated));
    assertPoint(after, before);
  });

  for (const [flipH, flipV] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ]) {
    test(`rotate button turns the view clockwise (flipH ${flipH}, flipV ${flipV})`, () => {
      const item = makeItem({ reframe: { flipH, flipV } });
      // Whatever was shown at the bottom-left must now be shown at the top-left.
      const shownBottomLeft = sourcePointUnder(item, [0, 200]);
      const rotated = makeItem({ ...item, reframe: rotateReframeClockwise(item) });
      const m = getOrientationMatrix(400, 200, rotated.reframe);
      assertPoint(apply(m, shownBottomLeft), [0, 0]);
    });
  }

  test('flipping mirrors the frame so it stays on the same content', () => {
    const item = makeItem({
      aspectRatioId: '1:1',
      reframe: { cropBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.6 } },
    });
    for (const axis of ['h', 'v'] as const) {
      const before = sourcePointUnder(item, boxCentre(item));
      const flipped = makeItem({ ...item, reframe: flipReframe(item, axis) });
      const after = sourcePointUnder(flipped, boxCentre(flipped));
      assertPoint(after, before, `flip ${axis}`);
    }
  });
});

describe('changing aspect ratio', () => {
  const userBox = { x: 0.1, y: 0.2, width: 0.3, height: 0.6 }; // 120 x 120 px on 400 x 200

  test('re-applying the same ratio keeps a user-sized frame', () => {
    const box = updateCropBoxForRatio(userBox, 400, 200, 1);
    assertClose(box.x, userBox.x, 'x');
    assertClose(box.y, userBox.y, 'y');
    assertClose(box.width, userBox.width, 'width');
    assertClose(box.height, userBox.height, 'height');
  });

  test('switching ratio keeps the frame at the same relative size', () => {
    // userBox is 60% of the largest 1:1 frame (200 px wide); the largest 16:9 frame is 355.6 px wide.
    const box = updateCropBoxForRatio(userBox, 400, 200, 16 / 9);
    assertClose(box.width * 400, 0.6 * 200 * (16 / 9), 'width px');
    assertClose((box.width * 400) / (box.height * 200), 16 / 9, 'pixel aspect');
  });

  test('applying a ratio twice is the same as applying it once', () => {
    const once = updateCropBoxForRatio(userBox, 400, 200, 16 / 9);
    const twice = updateCropBoxForRatio(once, 400, 200, 16 / 9);
    assertClose(twice.x, once.x, 'x');
    assertClose(twice.y, once.y, 'y');
    assertClose(twice.width, once.width, 'width');
    assertClose(twice.height, once.height, 'height');
  });
});

describe('ZIP filenames and formats', () => {
  test('duplicate names get a numeric suffix until free', () => {
    assert.deepEqual(makeUniqueFilenames(['a.jpg', 'a.jpg', 'a_2.jpg']), [
      'a.jpg',
      'a_2.jpg',
      'a_2_2.jpg',
    ]);
  });

  test('names that differ only by case count as duplicates', () => {
    assert.deepEqual(makeUniqueFilenames(['Photo.JPG', 'photo.jpg']), ['Photo.JPG', 'photo_2.jpg']);
  });

  test('"Keep Original" exports GIF and BMP sources as PNG, not JPEG', () => {
    assert.equal(getMimeAndExtension('original', 'image/gif', 'anim.gif').extension, 'png');
    assert.equal(getMimeAndExtension('original', 'image/bmp', 'scan.bmp').extension, 'png');
  });

  test('filename follows the type the browser actually encoded', () => {
    // Browsers that cannot encode WebP silently fall back to PNG.
    assert.equal(getOutputFilename('a.jpg', 'original', 'webp', 'image/jpeg', 'image/png'), 'a.png');
  });
});
