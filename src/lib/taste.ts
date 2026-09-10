import { colorDistance, type Palette, type Swatch } from "./palette";
import { brand } from "./brands";
import { CATEGORIES, category } from "./categories";
import {
  COLOR_FAMILIES,
  type CategoryId,
  type Drop,
  type Reference,
  type TasteSettings,
  type WardrobeItem,
} from "./types";

/**
 * What the app thinks you like, and why.
 *
 * Everything here is derived from data already on the device: the colours of your cut-outs,
 * what you own a lot and a little of, the brands on your pieces, the words you name things
 * with, and the same colour read off your inspiration board. No model, no network — which
 * also means every score can be explained in a sentence, and it is.
 */

export interface TasteProfile {
  palette: Swatch[];
  /** Weighted share of near-grey pixels across everything read, 0-1. */
  neutrality: number;
  categoryShare: Record<CategoryId, number>;
  /** Core categories the wardrobe is thin on. */
  gaps: CategoryId[];
  /** Brand name, lowercased, to affinity 0-1. */
  brands: Record<string, number>;
  keywords: string[];
  read: { items: number; references: number };
}

/** The categories an outfit needs before it is an outfit. Gaps are measured against these. */
const CORE: CategoryId[] = ["top", "outerwear", "bottom", "shoes"];

/** Two swatches closer than this across images count as one colour. */
const MERGE_DISTANCE = 16;
/** Lab distance at which a colour stops reading as one of yours at all. */
const COLOR_REACH = 60;

const STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "new",
  "img",
  "image",
  "photo",
  "png",
  "jpg",
  "jpeg",
  "screenshot",
  "untitled",
  "piece",
  "copy",
  "final",
  "front",
  "back",
  "size",
  "this",
  "that",
]);

function mergeSwatches(input: { hex: string; weight: number }[], max: number): Swatch[] {
  const merged: Swatch[] = [];
  for (const swatch of [...input].sort((a, b) => b.weight - a.weight)) {
    const near = merged.find((entry) => colorDistance(entry.hex, swatch.hex) < MERGE_DISTANCE);
    if (near) near.weight += swatch.weight;
    else merged.push({ ...swatch });
  }
  const total = merged.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  return merged
    .map((entry) => ({ hex: entry.hex, weight: entry.weight / total }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max);
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

export interface ProfileInput {
  items: WardrobeItem[];
  references: Reference[];
  /** Palettes already read off the images, keyed by item or reference id. */
  palettes: Map<string, Palette>;
  settings: TasteSettings;
}

export function buildProfile({ items, references, palettes, settings }: ProfileInput): TasteProfile {
  const swatches: { hex: string; weight: number }[] = [];
  let neutralSum = 0;
  let neutralWeight = 0;
  let itemsRead = 0;
  let referencesRead = 0;

  for (const item of items) {
    const palette = palettes.get(item.id);
    if (!palette) continue;
    itemsRead += 1;
    // A favourite is a louder statement of taste than something bought once and forgotten.
    const weight = settings.fromWardrobe * (item.favorite ? 1.6 : 1);
    for (const swatch of palette.swatches) {
      swatches.push({ hex: swatch.hex, weight: swatch.weight * weight });
    }
    neutralSum += palette.neutrality * weight;
    neutralWeight += weight;
  }

  for (const reference of references) {
    const palette = palettes.get(reference.id);
    if (!palette) continue;
    referencesRead += 1;
    const weight = settings.fromInspiration;
    for (const swatch of palette.swatches) {
      swatches.push({ hex: swatch.hex, weight: swatch.weight * weight });
    }
    neutralSum += palette.neutrality * weight;
    neutralWeight += weight;
  }

  // Colours picked by hand are taste stated outright, so they join the palette directly.
  for (const hex of settings.colors) swatches.push({ hex, weight: 0.5 });

  const counts = new Map<CategoryId, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const total = items.length || 1;
  const categoryShare = Object.fromEntries(
    CATEGORIES.map((meta) => [meta.id, (counts.get(meta.id) ?? 0) / total]),
  ) as Record<CategoryId, number>;

  const coreTotal = CORE.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
  const expected = coreTotal / CORE.length;
  const gaps = items.length ? CORE.filter((id) => (counts.get(id) ?? 0) < expected * 0.6) : [];

  const brandCounts = new Map<string, number>();
  for (const item of items) {
    if (!item.brand) continue;
    const key = item.brand.trim().toLowerCase();
    brandCounts.set(key, (brandCounts.get(key) ?? 0) + 1);
  }
  const topBrand = Math.max(1, ...brandCounts.values());
  const brands = Object.fromEntries([...brandCounts].map(([name, n]) => [name, n / topBrand]));

  const words = new Map<string, number>();
  for (const item of items) {
    for (const word of tokenize(`${item.name} ${item.notes ?? ""}`)) {
      words.set(word, (words.get(word) ?? 0) + 1);
    }
  }
  const keywords = [...words]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([word]) => word);

  return {
    palette: mergeSwatches(swatches, 8),
    neutrality: neutralWeight ? neutralSum / neutralWeight : 0,
    categoryShare,
    gaps,
    brands,
    keywords,
    read: { items: itemsRead, references: referencesRead },
  };
}

/** Nearest named colour, for writing a reason a person can read. */
export function colorName(hex: string): string {
  let best = COLOR_FAMILIES[0];
  let bestDistance = Infinity;
  for (const family of COLOR_FAMILIES) {
    const distance = colorDistance(hex, family.hex);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = family;
    }
  }
  return best.label.toLowerCase();
}

/** Colours named in a product title, for drops that arrive without a readable image. */
export function colorsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return COLOR_FAMILIES.filter((family) => lower.includes(family.id)).map((family) => family.hex);
}

export interface Score {
  /** 0-100. */
  value: number;
  /** Why, biggest contribution first. Two or three of these belong on a card. */
  reasons: string[];
}

interface Signal {
  weight: number;
  value: number;
  reason: string;
}

export interface ScoreInput {
  profile: TasteProfile;
  settings: TasteSettings;
  followed: Set<string>;
}

export function scoreDrop(drop: Drop, { profile, settings, followed }: ScoreInput): Score {
  const signals: Signal[] = [];
  const store = brand(drop.brandId);

  if (drop.colors.length && profile.palette.length) {
    // Distance is divided by the swatch weight, so matching a colour you wear constantly
    // counts for more than matching the one shirt you own in that shade.
    let nearest = Infinity;
    let match = drop.colors[0];
    for (const color of drop.colors) {
      for (const swatch of profile.palette) {
        const distance = colorDistance(color, swatch.hex) / (0.5 + swatch.weight);
        if (distance < nearest) {
          nearest = distance;
          match = color;
        }
      }
    }
    const value = Math.max(0, 1 - nearest / COLOR_REACH);
    signals.push({
      weight: 0.3,
      value,
      reason:
        value > 0.55
          ? `That ${colorName(match)} sits in your palette`
          : `A ${colorName(match)} you do not own yet`,
    });
  }

  const share = profile.categoryShare[drop.category] ?? 0;
  const meta = category(drop.category);
  const label = meta.label.toLowerCase();
  const plural = meta.plural.toLowerCase();
  if (settings.wants.length) {
    const wanted = settings.wants.includes(drop.category);
    signals.push({
      weight: 0.26,
      value: wanted ? 1 : 0.1,
      reason: wanted ? `A ${label} — what you are shopping for` : "Not on your shopping list",
    });
  } else if (settings.fillGaps && profile.gaps.includes(drop.category)) {
    signals.push({ weight: 0.24, value: 1, reason: `Your wardrobe is thin on ${plural}` });
  } else {
    signals.push({
      weight: 0.18,
      value: Math.min(1, 0.35 + share * 2),
      reason: share > 0.15 ? `You keep a lot of ${plural}` : `Rounds out your ${plural}`,
    });
  }

  const affinity = profile.brands[store?.name.toLowerCase() ?? drop.brandId] ?? 0;
  const isFollowed = followed.has(drop.brandId);
  signals.push({
    weight: 0.2,
    value: Math.min(1, (isFollowed ? 0.7 : 0.3) + affinity * 0.4),
    // Following the store is why it is in the feed at all, so saying so on every card
    // tells you nothing. Owning the brand already does.
    reason: affinity > 0.4 ? `You already own ${store?.name ?? "this brand"}` : "",
  });

  const tags = new Set([...(store?.tags ?? []), ...drop.tags.map((tag) => tag.toLowerCase())]);
  if (settings.styles.length) {
    const hits = settings.styles.filter((style) => tags.has(style));
    signals.push({
      weight: 0.16,
      value: hits.length ? Math.min(1, 0.6 + hits.length * 0.2) : 0.15,
      reason: hits.length ? `Reads ${hits[0].replace("-", " ")}, like you asked for` : "Off your styles",
    });
  }

  const words = new Set(tokenize(drop.title));
  const shared = profile.keywords.filter((word) => words.has(word));
  if (shared.length) {
    signals.push({
      weight: 0.1,
      value: Math.min(1, 0.5 + shared.length * 0.25),
      reason: `You own other ${shared[0]}s`,
    });
  }

  if (settings.maxPrice && drop.price != null) {
    const ratio = drop.price / settings.maxPrice;
    signals.push({
      weight: 0.14,
      value: ratio <= 1 ? 1 : ratio <= 1.25 ? 0.45 : 0.05,
      reason: ratio <= 1 ? "Under your ceiling" : "Over your ceiling",
    });
  }

  const weight = signals.reduce((sum, signal) => sum + signal.weight, 0) || 1;
  const raw = signals.reduce((sum, signal) => sum + signal.weight * signal.value, 0) / weight;

  const reasons = signals
    .filter((signal) => signal.reason && signal.value >= 0.5)
    .sort((a, b) => b.weight * b.value - a.weight * a.value)
    .slice(0, 3)
    .map((signal) => signal.reason);

  return { value: Math.round(raw * 100), reasons };
}
