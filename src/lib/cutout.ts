import { loadImage } from "./image";

/**
 * Turns product shots on a plain background into transparent cut-outs.
 *
 * No model, no network: the background of a studio shot is a single flat colour that
 * touches the border, so a flood fill inwards from the edges finds it exactly. Interior
 * whites (a label, a stripe) survive because they are not connected to the edge.
 */

export interface BackgroundReport {
  /** The image already has meaningful transparency, so there is nothing to do. */
  hasTransparency: boolean;
  /** The border is one consistent colour — the signature of a studio shot. */
  isPlain: boolean;
  /** Share of sampled border pixels matching that colour, 0-1. */
  coverage: number;
  color: [number, number, number];
}

export interface CutoutResult {
  blob: Blob;
  width: number;
  height: number;
  /** Share of the original pixels turned transparent, 0-1. */
  removed: number;
  /** Whether the canvas was cropped to the remaining content. */
  trimmed: boolean;
}

export interface CutoutOptions {
  /** Colour distance counted as background. Higher removes more. */
  tolerance?: number;
  /** Longest edge of the output, in pixels. Keeps stored blobs sane. */
  maxEdge?: number;
  /** Crop away the empty margin once the background is gone. */
  trim?: boolean;
}

const DEFAULTS: Required<CutoutOptions> = { tolerance: 32, maxEdge: 2000, trim: true };

/** Border pixels are sampled rather than walked in full; studio shots are very uniform. */
const BORDER_SAMPLES = 1200;
const ALPHA_SAMPLES = 4000;

function distance(
  data: Uint8ClampedArray,
  index: number,
  r: number,
  g: number,
  b: number,
): number {
  const dr = data[index] - r;
  const dg = data[index + 1] - g;
  const db = data[index + 2] - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(values: number[]): number {
  if (!values.length) return 255;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Reads the border and alpha channel to decide whether a cut-out is worth attempting. */
export function inspect(image: ImageData, tolerance = DEFAULTS.tolerance): BackgroundReport {
  const { data, width, height } = image;

  let transparent = 0;
  let checked = 0;
  const alphaStride = Math.max(1, Math.floor((width * height) / ALPHA_SAMPLES));
  for (let pixel = 0; pixel < width * height; pixel += alphaStride) {
    if (data[pixel * 4 + 3] < 250) transparent += 1;
    checked += 1;
  }
  const hasTransparency = checked > 0 && transparent / checked > 0.01;

  const border: number[] = [];
  const perimeter = 2 * (width + height);
  const borderStride = Math.max(1, Math.floor(perimeter / BORDER_SAMPLES));
  for (let x = 0; x < width; x += borderStride) {
    border.push((0 * width + x) * 4, ((height - 1) * width + x) * 4);
  }
  for (let y = 0; y < height; y += borderStride) {
    border.push((y * width + 0) * 4, (y * width + width - 1) * 4);
  }

  const reds = border.map((index) => data[index]);
  const greens = border.map((index) => data[index + 1]);
  const blues = border.map((index) => data[index + 2]);
  const color: [number, number, number] = [median(reds), median(greens), median(blues)];

  let matching = 0;
  for (const index of border) {
    if (distance(data, index, color[0], color[1], color[2]) <= tolerance) matching += 1;
  }
  const coverage = border.length ? matching / border.length : 0;

  return { hasTransparency, isPlain: coverage >= 0.9, coverage, color };
}

function context(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable.");
  return { canvas, ctx };
}

/**
 * Clears the background in place and reports how much went.
 *
 * Two passes: a flood fill from every border pixel takes the surrounding background, then
 * enclosed pockets of the same colour (the gap between two trouser legs, say) go too, as
 * long as they are big enough not to be a highlight on the garment itself.
 */
function clearBackground(image: ImageData, color: [number, number, number], tolerance: number) {
  const { data, width, height } = image;
  const total = width * height;
  const [r, g, b] = color;
  const soft = tolerance * 1.9;

  // 0 = keep, 1 = background candidate, 2 = inside the soft edge band.
  const kind = new Uint8Array(total);
  for (let pixel = 0; pixel < total; pixel++) {
    const d = distance(data, pixel * 4, r, g, b);
    kind[pixel] = d <= tolerance ? 1 : d <= soft ? 2 : 0;
  }

  // Erode the candidate mask before flooding. A pale patch inside the garment often
  // touches the backdrop through a hairline of anti-aliased pixels; without this the fill
  // slips through and eats it. The dilation afterwards puts the lost 1px rim back.
  const seed = new Uint8Array(total);
  for (let pixel = 0; pixel < total; pixel++) {
    if (kind[pixel] !== 1) continue;
    const x = pixel % width;
    const y = (pixel - x) / width;
    const left = x === 0 || kind[pixel - 1] === 1;
    const right = x === width - 1 || kind[pixel + 1] === 1;
    const up = y === 0 || kind[pixel - width] === 1;
    const down = y === height - 1 || kind[pixel + width] === 1;
    if (left && right && up && down) seed[pixel] = 1;
  }

  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const push = (pixel: number) => {
    if (seed[pixel] !== 1 || removed[pixel]) return;
    removed[pixel] = 1;
    queue[tail++] = pixel;
  };

  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x > 0) push(pixel - 1);
    if (x < width - 1) push(pixel + 1);
    if (y > 0) push(pixel - width);
    if (y < height - 1) push(pixel + width);
  }

  // Dilate back over the eroded rim, staying within the candidate mask.
  for (let pass = 0; pass < 2; pass++) {
    const grow: number[] = [];
    for (let pixel = 0; pixel < total; pixel++) {
      if (kind[pixel] !== 1 || removed[pixel]) continue;
      const x = pixel % width;
      const y = (pixel - x) / width;
      if (
        (x > 0 && removed[pixel - 1]) ||
        (x < width - 1 && removed[pixel + 1]) ||
        (y > 0 && removed[pixel - width]) ||
        (y < height - 1 && removed[pixel + width])
      ) {
        grow.push(pixel);
      }
    }
    for (const pixel of grow) removed[pixel] = 1;
  }

  // Enclosed pockets: same colour, never reached from the border.
  const minPocket = Math.max(64, Math.floor(total * 0.0004));
  const seen = new Uint8Array(total);
  for (let start = 0; start < total; start++) {
    if (kind[start] !== 1 || removed[start] || seen[start]) continue;
    const pocket: number[] = [];
    seen[start] = 1;
    let cursor = 0;
    pocket.push(start);
    while (cursor < pocket.length) {
      const pixel = pocket[cursor++];
      const x = pixel % width;
      const y = (pixel - x) / width;
      const neighbours = [
        x > 0 ? pixel - 1 : -1,
        x < width - 1 ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y < height - 1 ? pixel + width : -1,
      ];
      for (const next of neighbours) {
        if (next < 0 || seen[next] || kind[next] !== 1) continue;
        seen[next] = 1;
        pocket.push(next);
      }
    }
    if (pocket.length >= minPocket) {
      for (const pixel of pocket) removed[pixel] = 1;
    }
  }

  let cleared = 0;
  for (let pixel = 0; pixel < total; pixel++) {
    if (removed[pixel]) {
      data[pixel * 4 + 3] = 0;
      cleared += 1;
    }
  }

  // How intact is what is left? A garment survives as one blob (or a few, for a pair of
  // shoes). A pale-striped shirt on a pale backdrop comes out as confetti — dozens of
  // slivers — and that is the signal to leave the image alone rather than wreck it.
  const kept = total - cleared;
  let largest = 0;
  let fragments = 0;
  if (kept > 0) {
    const seen = new Uint8Array(total);
    const stack = new Int32Array(kept);
    for (let start = 0; start < total; start++) {
      if (removed[start] || seen[start]) continue;
      let top = 0;
      let size = 0;
      seen[start] = 1;
      stack[top++] = start;
      while (top > 0) {
        const pixel = stack[--top];
        size += 1;
        const x = pixel % width;
        const y = (pixel - x) / width;
        if (x > 0 && !removed[pixel - 1] && !seen[pixel - 1]) { seen[pixel - 1] = 1; stack[top++] = pixel - 1; }
        if (x < width - 1 && !removed[pixel + 1] && !seen[pixel + 1]) { seen[pixel + 1] = 1; stack[top++] = pixel + 1; }
        if (y > 0 && !removed[pixel - width] && !seen[pixel - width]) { seen[pixel - width] = 1; stack[top++] = pixel - width; }
        if (y < height - 1 && !removed[pixel + width] && !seen[pixel + width]) { seen[pixel + width] = 1; stack[top++] = pixel + width; }
      }
      if (size > largest) largest = size;
      if (size / kept >= 0.01) fragments += 1;
    }
  }

  // Feather the anti-aliased rim so the cut-out has no white halo on a dark board.
  for (let pixel = 0; pixel < total; pixel++) {
    if (removed[pixel] || kind[pixel] !== 2) continue;
    const x = pixel % width;
    const y = (pixel - x) / width;
    const touchesHole =
      (x > 0 && removed[pixel - 1]) ||
      (x < width - 1 && removed[pixel + 1]) ||
      (y > 0 && removed[pixel - width]) ||
      (y < height - 1 && removed[pixel + width]);
    if (!touchesHole) continue;
    const d = distance(data, pixel * 4, r, g, b);
    const ramp = Math.min(1, Math.max(0, (d - tolerance) / (soft - tolerance)));
    data[pixel * 4 + 3] = Math.round(data[pixel * 4 + 3] * ramp);
  }

  return { cleared: cleared / total, intact: kept > 0 ? largest / kept : 0, fragments };
}

function contentBox(image: ImageData) {
  const { data, width, height } = image;
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < left || bottom < top) return null;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Cuts the plain background out of an image and returns a transparent PNG.
 * Returns null when the image already has transparency or has no plain background,
 * unless `force` is set.
 */
export async function cutOut(
  src: string,
  options: CutoutOptions & { force?: boolean } = {},
): Promise<CutoutResult | null> {
  const tolerance = options.tolerance ?? DEFAULTS.tolerance;
  const maxEdge = options.maxEdge ?? DEFAULTS.maxEdge;
  const trim = options.trim ?? DEFAULTS.trim;

  const image = await loadImage(src);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return null;

  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const { canvas, ctx } = context(width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);

  const report = inspect(data, tolerance);
  // Transparency means the work is already done; `force` only overrides the plainness test.
  if (report.hasTransparency) return null;
  if (!options.force && !report.isPlain) return null;

  const { cleared, intact, fragments } = clearBackground(data, report.color, tolerance);
  // Nothing meaningful went, or the fill ate the subject: leave the image alone.
  if (cleared < 0.02 || cleared > 0.985) return null;
  // The subject came out shredded — the garment is too close in colour to its backdrop.
  if (fragments > 8 || intact < 0.15) return null;

  ctx.putImageData(data, 0, 0);

  let output = canvas;
  let trimmed = false;
  if (trim) {
    const box = contentBox(data);
    if (box && (box.width !== width || box.height !== height)) {
      const cropped = context(box.width, box.height);
      cropped.ctx.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
      output = cropped.canvas;
      trimmed = true;
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
  if (!blob) return null;

  return { blob, width: output.width, height: output.height, removed: cleared, trimmed };
}

/** Cheap pre-check used to decide whether to offer the action at all. */
export async function describeBackground(src: string): Promise<BackgroundReport | null> {
  try {
    const image = await loadImage(src);
    const width = Math.max(1, Math.min(400, image.naturalWidth || image.width));
    const height = Math.max(
      1,
      Math.round(((image.naturalHeight || image.height) * width) / (image.naturalWidth || width)),
    );
    const { ctx } = context(width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return inspect(ctx.getImageData(0, 0, width, height));
  } catch {
    return null;
  }
}
