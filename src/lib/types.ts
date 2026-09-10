export type CategoryId =
  | "top"
  | "outerwear"
  | "bottom"
  | "dress"
  | "shoes"
  | "bag"
  | "eyewear"
  | "jewelry"
  | "headwear"
  | "fragrance"
  | "tech"
  | "other";

export interface WardrobeItem {
  id: string;
  name: string;
  category: CategoryId;
  brand?: string;
  notes?: string;
  favorite?: boolean;
  /** How the image got here. Linked images are cached locally when CORS allows. */
  source: "upload" | "link";
  /** Original remote URL. Kept for reference, and used directly if caching failed. */
  remoteUrl?: string;
  /** Key into the blob store when the image bytes live in IndexedDB. */
  blobKey?: string;
  /** The untouched upload, kept so a background cut-out can be undone. */
  originalBlobKey?: string;
  /** True once the plain background has been cut away. */
  cutout?: boolean;
  width: number;
  height: number;
  createdAt: number;
}

export interface Layer {
  id: string;
  itemId: string;
  /** Center point, in canvas units. */
  x: number;
  y: number;
  /** Rendered width in canvas units. Height is derived from the item aspect ratio. */
  w: number;
  rotation: number;
  flipX: boolean;
  z: number;
}

/** A saved inspiration image: someone else's flat lay, kept to work from. */
export interface Reference {
  id: string;
  name: string;
  source: "upload" | "link";
  remoteUrl?: string;
  blobKey?: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface Outfit {
  id: string;
  name: string;
  layers: Layer[];
  background: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

/** The flat-lay artboard is a fixed coordinate space; the view scales to fit. */
export const CANVAS_W = 1000;
export const CANVAS_H = 1400;

/** Starting points for browsing, opened on Pinterest itself. */
export const PINTEREST_SEARCHES = [
  "outfit flat lay",
  "mens outfit flat lay",
  "streetwear flat lay",
  "capsule wardrobe flat lay",
  "knolling clothes",
] as const;

export const BACKGROUNDS = [
  { id: "paper", label: "Paper", value: "#ffffff" },
  { id: "bone", label: "Bone", value: "#f4f1ec" },
  { id: "sand", label: "Sand", value: "#e9e2d8" },
  { id: "sage", label: "Sage", value: "#dfe5dd" },
  { id: "sky", label: "Sky", value: "#dee6ef" },
  { id: "ink", label: "Ink", value: "#17171a" },
] as const;

/** Broad aesthetic buckets. A store carries a few; so does a taste profile. */
export type StyleTagId =
  | "minimal"
  | "basics"
  | "streetwear"
  | "preppy"
  | "workwear"
  | "athleisure"
  | "outdoor"
  | "tailored"
  | "vintage"
  | "going-out";

export const STYLE_TAGS: { id: StyleTagId; label: string }[] = [
  { id: "minimal", label: "Minimal" },
  { id: "basics", label: "Basics" },
  { id: "streetwear", label: "Streetwear" },
  { id: "preppy", label: "Preppy" },
  { id: "workwear", label: "Workwear" },
  { id: "athleisure", label: "Athleisure" },
  { id: "outdoor", label: "Outdoor" },
  { id: "tailored", label: "Tailored" },
  { id: "vintage", label: "Vintage" },
  { id: "going-out", label: "Going out" },
];

export type PriceBand = "value" | "mid" | "premium" | "luxury";

export const PRICE_BANDS: { id: PriceBand; label: string }[] = [
  { id: "value", label: "$" },
  { id: "mid", label: "$$" },
  { id: "premium", label: "$$$" },
  { id: "luxury", label: "$$$$" },
];

/** A store you can follow. Static catalogue data — see `brands.ts`. */
export interface Brand {
  id: string;
  name: string;
  /** Short handle, the way a ticker reads down a watchlist. */
  ticker: string;
  site: string;
  /** The store's own new-arrivals page, where one exists at a stable URL. */
  newArrivals?: string;
  tags: StyleTagId[];
  price: PriceBand;
  /** An RSS/Atom or Shopify products.json endpoint, where the store publishes one. */
  feed?: string;
}

/** A store the wardrobe owner follows. */
export interface Subscription {
  brandId: string;
  addedAt: number;
  muted?: boolean;
  /** A feed URL attached by hand, which wins over the catalogue one. */
  feedUrl?: string;
  lastFetchedAt?: number;
  lastStatus?: FeedStatus;
}

export type FeedStatus = "ok" | "blocked" | "empty" | "error" | "none";

/** One release in the feed, however it got there. */
export interface Drop {
  id: string;
  brandId: string;
  title: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  category: CategoryId;
  /** Hex swatches, read off the image or named in the title. */
  colors: string[];
  tags: string[];
  publishedAt: number;
  addedAt: number;
  /** How it arrived: pulled from a feed, clipped by hand, or shipped as a demo. */
  origin: "feed" | "clip" | "sample";
  saved?: boolean;
  dismissed?: boolean;
}

/** The dials over the derived taste profile. Everything here is the owner's own answer. */
export interface TasteSettings {
  /** How loudly the wardrobe speaks, 0-1. */
  fromWardrobe: number;
  /** How loudly the inspiration board speaks, 0-1. */
  fromInspiration: number;
  /** Categories being shopped for. Empty means all of them. */
  wants: CategoryId[];
  /** Favour categories the wardrobe is thin on over more of the same. */
  fillGaps: boolean;
  styles: StyleTagId[];
  colors: string[];
  maxPrice?: number;
  /** Read-through URL template for feeds that refuse the browser. Empty means direct only. */
  relay?: string;
  showSamples: boolean;
}

export const DEFAULT_TASTE: TasteSettings = {
  fromWardrobe: 0.75,
  fromInspiration: 0.5,
  wants: [],
  fillGaps: true,
  styles: [],
  colors: [],
  showSamples: true,
};

/** Anchor colours for the "what do you actually wear" picker. */
export const COLOR_FAMILIES: { id: string; label: string; hex: string }[] = [
  { id: "black", label: "Black", hex: "#111114" },
  { id: "grey", label: "Grey", hex: "#8b8d92" },
  { id: "white", label: "White", hex: "#f6f5f3" },
  { id: "cream", label: "Cream", hex: "#e8dfcc" },
  { id: "tan", label: "Tan", hex: "#c8a37a" },
  { id: "brown", label: "Brown", hex: "#6f4f38" },
  { id: "olive", label: "Olive", hex: "#6b6f45" },
  { id: "green", label: "Green", hex: "#3f6b4f" },
  { id: "navy", label: "Navy", hex: "#26334f" },
  { id: "blue", label: "Blue", hex: "#4a7ab0" },
  { id: "red", label: "Red", hex: "#a63a35" },
  { id: "pink", label: "Pink", hex: "#d99aa6" },
  { id: "purple", label: "Purple", hex: "#6d5a8c" },
  { id: "yellow", label: "Yellow", hex: "#d9b64a" },
];
