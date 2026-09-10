import { loadImage } from "./image";

/**
 * Reads the colours out of an image.
 *
 * The wardrobe is full of cut-outs, so transparent pixels are skipped and what is left is
 * the garment itself — no backdrop to average in. Colours are bucketed coarsely, merged
 * when they land close together in Lab, and returned biggest-first.
 */

export interface Swatch {
  hex: string;
  /** Share of the counted pixels, 0-1. */
  weight: number;
}

export interface Palette {
  swatches: Swatch[];
  /** Share of pixels with almost no saturation: black, white, grey, cream. */
  neutrality: number;
}

/** Longest edge the sample is drawn at. Colour does not need resolution. */
const SAMPLE_EDGE = 64;
/** Levels per channel when bucketing. 6^3 = 216 buckets. */
const LEVELS = 6;
/** Two swatches closer than this in Lab read as the same colour. */
const MERGE_DISTANCE = 14;

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** CIE Lab, so "how different are these two colours" matches how they look. */
export function rgbToLab([r, g, b]: Rgb): [number, number, number] {
  const linear = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
  });
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Plain CIE76 distance. Good enough to say "that is the same navy". */
export function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = rgbToLab(hexToRgb(a));
  const [l2, a2, b2] = rgbToLab(hexToRgb(b));
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

function saturationOf([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * Pulls a palette out of an image. Returns null when the pixels cannot be read — a
 * hotlinked image from a host that refuses CORS taints the canvas.
 */
export async function paletteOf(src: string, max = 5): Promise<Palette | null> {
  const image = await loadImage(src).catch(() => null);
  if (!image) return null;

  const w = image.naturalWidth || 1;
  const h = image.naturalHeight || 1;
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null;
  }

  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  let counted = 0;
  let neutral = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rgb: Rgb = [data[i], data[i + 1], data[i + 2]];
    counted += 1;
    if (saturationOf(rgb) < 0.18) neutral += 1;
    const key = rgb
      .map((c) => Math.min(LEVELS - 1, Math.floor((c / 256) * LEVELS)))
      .reduce((acc, level) => acc * LEVELS + level, 0);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += rgb[0];
    bucket.g += rgb[1];
    bucket.b += rgb[2];
    buckets.set(key, bucket);
  }

  if (!counted) return null;

  const ranked = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((bucket) => ({
      hex: rgbToHex([bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count]),
      weight: bucket.count / counted,
    }));

  const merged: Swatch[] = [];
  for (const swatch of ranked) {
    const near = merged.find((entry) => colorDistance(entry.hex, swatch.hex) < MERGE_DISTANCE);
    if (near) near.weight += swatch.weight;
    else if (merged.length < max) merged.push({ ...swatch });
  }

  return { swatches: merged, neutrality: neutral / counted };
}
