import { aspectOf } from "./image";
import { CANVAS_H, CANVAS_W, type CategoryId, type Layer, type WardrobeItem } from "./types";

/**
 * A slot is a center-anchored box the item is fitted inside (contain, aspect kept).
 * Each category has an ordered preference list; the first free slot wins, which is
 * what makes a double click land in the "right" part of the flat lay.
 */
interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The board is zoned: garments own the wide left column, small goods own the right rail.
 * Slots stay inside their category's zone, so placing a ring first never costs the shirt
 * its spot, whatever order pieces get added in.
 */
const GARMENT_ZONE: Rect = { x: 330, y: 700, w: 620, h: 1360 };
const RAIL_ZONE: Rect = { x: 800, y: 700, w: 380, h: 1360 };

const SLOTS: Record<CategoryId, Slot[]> = {
  top: [
    { x: 330, y: 360, w: 560, h: 500 },
    { x: 330, y: 960, w: 540, h: 540 },
    { x: 790, y: 330, w: 380, h: 360 },
  ],
  outerwear: [
    { x: 330, y: 350, w: 600, h: 540 },
    { x: 330, y: 980, w: 560, h: 600 },
    { x: 790, y: 340, w: 380, h: 400 },
  ],
  bottom: [
    { x: 330, y: 980, w: 560, h: 700 },
    { x: 330, y: 360, w: 540, h: 480 },
    { x: 790, y: 1010, w: 380, h: 480 },
  ],
  dress: [
    { x: 340, y: 660, w: 620, h: 1080 },
    { x: 800, y: 680, w: 340, h: 700 },
  ],
  shoes: [
    { x: 770, y: 1190, w: 420, h: 320 },
    { x: 780, y: 860, w: 380, h: 300 },
    { x: 780, y: 530, w: 360, h: 280 },
  ],
  bag: [
    { x: 810, y: 720, w: 340, h: 300 },
    { x: 810, y: 1030, w: 320, h: 300 },
    { x: 800, y: 400, w: 320, h: 300 },
  ],
  eyewear: [
    { x: 790, y: 130, w: 360, h: 180 },
    { x: 800, y: 330, w: 320, h: 150 },
    { x: 850, y: 560, w: 260, h: 150 },
  ],
  jewelry: [
    { x: 905, y: 880, w: 150, h: 150 },
    { x: 905, y: 1030, w: 150, h: 150 },
    { x: 700, y: 880, w: 150, h: 150 },
    { x: 700, y: 1030, w: 150, h: 150 },
  ],
  headwear: [
    { x: 790, y: 190, w: 340, h: 280 },
    { x: 810, y: 560, w: 300, h: 240 },
  ],
  fragrance: [
    { x: 690, y: 960, w: 200, h: 300 },
    { x: 900, y: 760, w: 180, h: 280 },
    { x: 890, y: 1160, w: 180, h: 280 },
  ],
  tech: [
    { x: 830, y: 450, w: 300, h: 320 },
    { x: 690, y: 470, w: 260, h: 300 },
    { x: 850, y: 1060, w: 260, h: 280 },
  ],
  other: [
    { x: 810, y: 560, w: 260, h: 260 },
    { x: 810, y: 1220, w: 260, h: 260 },
    { x: 890, y: 200, w: 200, h: 200 },
  ],
};

/** The half of the board a category falls back into when all its slots are taken. */
const ZONES: Record<CategoryId, Rect> = {
  top: GARMENT_ZONE,
  outerwear: GARMENT_ZONE,
  bottom: GARMENT_ZONE,
  dress: GARMENT_ZONE,
  shoes: RAIL_ZONE,
  bag: RAIL_ZONE,
  eyewear: RAIL_ZONE,
  jewelry: RAIL_ZONE,
  headwear: RAIL_ZONE,
  fragrance: RAIL_ZONE,
  tech: RAIL_ZONE,
  other: RAIL_ZONE,
};

/** Order used when arranging a whole board: anchors first, trinkets last. */
const ARRANGE_ORDER: CategoryId[] = [
  "dress",
  "outerwear",
  "top",
  "bottom",
  "shoes",
  "bag",
  "headwear",
  "eyewear",
  "tech",
  "fragrance",
  "jewelry",
  "other",
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function fit(slot: Slot, aspect: number): Rect {
  const w = Math.min(slot.w, slot.h * aspect);
  return { x: slot.x, y: slot.y, w, h: w / aspect };
}

/**
 * Cut-outs carry a lot of transparent padding, so touching boxes are fine — only a
 * meaningful overlap counts as "this slot is taken".
 */
function overlaps(a: Rect, b: Rect, tolerance = 0.22): boolean {
  const overlapW = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
  const overlapH = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2);
  if (overlapW <= 0 || overlapH <= 0) return false;
  const smaller = Math.min(a.w * a.h, b.w * b.h);
  return smaller > 0 && (overlapW * overlapH) / smaller > tolerance;
}

function clampToBoard(rect: Rect): Rect {
  const margin = 24;
  const halfW = Math.min(rect.w, CANVAS_W - margin * 2) / 2;
  const halfH = Math.min(rect.h, CANVAS_H - margin * 2) / 2;
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, margin + halfW), CANVAS_W - margin - halfW),
    y: Math.min(Math.max(rect.y, margin + halfH), CANVAS_H - margin - halfH),
  };
}

function occupiedRects(
  layers: Layer[],
  items: Map<string, WardrobeItem>,
  ignoreId?: string,
): Rect[] {
  const rects: Rect[] = [];
  for (const layer of layers) {
    if (layer.id === ignoreId) continue;
    const item = items.get(layer.itemId);
    if (!item) continue;
    rects.push({ x: layer.x, y: layer.y, w: layer.w, h: layer.w / aspectOf(item) });
  }
  return rects;
}

function contains(zone: Rect, rect: Rect): boolean {
  return (
    rect.x - rect.w / 2 >= zone.x - zone.w / 2 - 1 &&
    rect.x + rect.w / 2 <= zone.x + zone.w / 2 + 1 &&
    rect.y - rect.h / 2 >= zone.y - zone.h / 2 - 1 &&
    rect.y + rect.h / 2 <= zone.y + zone.h / 2 + 1
  );
}

/**
 * Sweeps for a gap when every preferred slot is taken: inside the category's own zone
 * first, then anywhere, always working outwards from its preferred spot.
 */
function findGap(aspect: number, taken: Rect[], anchor: Slot, zone: Rect): Rect {
  const base = 240;
  const spots: { x: number; y: number }[] = [];
  for (let y = 140; y <= CANVAS_H - 140; y += 40) {
    for (let x = 140; x <= CANVAS_W - 140; x += 40) spots.push({ x, y });
  }
  spots.sort(
    (a, b) =>
      Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y),
  );

  for (const zoned of [true, false]) {
    for (const size of [base, base * 0.85, base * 0.7, base * 0.55]) {
      const candidate = { w: Math.min(size, size * aspect), h: Math.min(size, size / aspect) };
      for (const spot of spots) {
        const rect = { ...spot, w: candidate.w, h: candidate.h };
        if (zoned && !contains(zone, rect)) continue;
        if (!taken.some((other) => overlaps(rect, other, 0.05))) return rect;
      }
    }
  }
  const jitter = taken.length * 26;
  return clampToBoard({
    x: CANVAS_W / 2 + (jitter % 180) - 90,
    y: CANVAS_H / 2 + (jitter % 260) - 130,
    w: base * aspect,
    h: base,
  });
}

/** Where a newly added item should sit, given what is already on the board. */
export function autoPlace(
  item: WardrobeItem,
  layers: Layer[],
  items: Map<string, WardrobeItem>,
): { x: number; y: number; w: number } {
  const aspect = aspectOf(item);
  const taken = occupiedRects(layers, items);
  const slots = SLOTS[item.category] ?? SLOTS.other;
  for (const slot of slots) {
    const rect = clampToBoard(fit(slot, aspect));
    if (!taken.some((other) => overlaps(rect, other))) {
      return { x: rect.x, y: rect.y, w: rect.w };
    }
  }
  const gap = clampToBoard(findGap(aspect, taken, slots[0], ZONES[item.category] ?? RAIL_ZONE));
  return { x: gap.x, y: gap.y, w: gap.w };
}

/** Re-flows every layer into the template, biggest anchors first. */
export function autoArrange(layers: Layer[], items: Map<string, WardrobeItem>): Layer[] {
  const rank = (layer: Layer) => {
    const item = items.get(layer.itemId);
    const index = item ? ARRANGE_ORDER.indexOf(item.category) : -1;
    return index === -1 ? ARRANGE_ORDER.length : index;
  };
  const ordered = [...layers].sort((a, b) => rank(a) - rank(b) || a.z - b.z);
  const placed: Layer[] = [];
  for (const layer of ordered) {
    const item = items.get(layer.itemId);
    if (!item) {
      placed.push(layer);
      continue;
    }
    const spot = autoPlace(item, placed, items);
    placed.push({ ...layer, ...spot, rotation: 0 });
  }
  const byId = new Map(placed.map((layer) => [layer.id, layer]));
  return layers.map((layer) => byId.get(layer.id) ?? layer);
}

export function nudgeIntoBoard(layer: Layer, item: WardrobeItem): Layer {
  const h = layer.w / aspectOf(item);
  const margin = 40;
  return {
    ...layer,
    x: Math.min(Math.max(layer.x, -layer.w / 2 + margin), CANVAS_W + layer.w / 2 - margin),
    y: Math.min(Math.max(layer.y, -h / 2 + margin), CANVAS_H + h / 2 - margin),
  };
}
