import React from 'react';
import { CropBox, ImageItem } from '../types';
import { getOrientationCss, getOrientedImageLayout } from '../utils/imageProcessor';

/**
 * The source image rotated and mirrored exactly as it will be exported.
 * Fills its positioned parent, which must have the displayed image's aspect ratio.
 */
export const OrientedImage: React.FC<{ item: ImageItem; alt?: string }> = ({ item, alt = '' }) => (
  <img
    src={item.dataUrl}
    alt={alt}
    draggable={false}
    className="absolute max-w-none pointer-events-none select-none"
    style={{
      ...getOrientedImageLayout(item.originalWidth, item.originalHeight, item.reframe.rotation),
      transform: getOrientationCss(item.reframe),
    }}
  />
);

/**
 * The cropped region of the oriented image.
 * Fills its positioned parent, which must have the crop's aspect ratio.
 */
export const CroppedImage: React.FC<{ item: ImageItem; cropBox: CropBox; alt?: string }> = ({
  item,
  cropBox,
  alt,
}) => (
  <div
    className="absolute pointer-events-none"
    style={{
      width: `${100 / cropBox.width}%`,
      height: `${100 / cropBox.height}%`,
      left: `${(-cropBox.x / cropBox.width) * 100}%`,
      top: `${(-cropBox.y / cropBox.height) * 100}%`,
    }}
  >
    <OrientedImage item={item} alt={alt} />
  </div>
);
