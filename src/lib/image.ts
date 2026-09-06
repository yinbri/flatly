import { CANVAS_H, CANVAS_W, type Layer, type WardrobeItem } from "./types";

export interface Dimensions {
  width: number;
  height: number;
}

/** Loads an image element, preferring an anonymous CORS request so exports stay untainted. */
export function loadImage(src: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin && /^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      crossOrigin && /^https?:/i.test(src)
        ? loadImage(src, false).then(resolve, reject)
        : reject(new Error("That image could not be loaded."));
    img.src = src;
  });
}

export async function measure(src: string): Promise<Dimensions> {
  const img = await loadImage(src);
  return { width: img.naturalWidth || 1, height: img.naturalHeight || 1 };
}

/** Downloads a linked image so it survives offline and never taints the export canvas. */
export async function cacheRemote(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    return blob;
  } catch {
    return null;
  }
}

export function aspectOf(item: Pick<WardrobeItem, "width" | "height">): number {
  return item.height > 0 ? item.width / item.height : 1;
}

export function layerHeight(layer: Layer, item: Pick<WardrobeItem, "width" | "height">): number {
  return layer.w / aspectOf(item);
}

export interface RenderOptions {
  layers: Layer[];
  /** Resolves a layer's item plus a drawable source URL. */
  resolve: (itemId: string) => { item: WardrobeItem; src: string } | null;
  background: string;
  /** Multiplier over the 1000x1400 artboard. */
  scale?: number;
  transparent?: boolean;
}

/** Rasterises the artboard. Used for PNG export and for outfit thumbnails. */
export async function renderOutfit(options: RenderOptions): Promise<HTMLCanvasElement> {
  const scale = options.scale ?? 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CANVAS_W * scale);
  canvas.height = Math.round(CANVAS_H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");

  if (!options.transparent) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = "high";

  const ordered = [...options.layers].sort((a, b) => a.z - b.z);
  for (const layer of ordered) {
    const resolved = options.resolve(layer.itemId);
    if (!resolved) continue;
    const image = await loadImage(resolved.src).catch(() => null);
    if (!image) continue;
    const h = layerHeight(layer, resolved.item);
    ctx.save();
    ctx.translate(layer.x, layer.y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(layer.flipX ? -1 : 1, 1);
    ctx.drawImage(image, -layer.w / 2, -h / 2, layer.w, h);
    ctx.restore();
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed."))),
      "image/png",
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "flat-lay"
  );
}
