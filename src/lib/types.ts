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

export const BACKGROUNDS = [
  { id: "paper", label: "Paper", value: "#ffffff" },
  { id: "bone", label: "Bone", value: "#f4f1ec" },
  { id: "sand", label: "Sand", value: "#e9e2d8" },
  { id: "sage", label: "Sage", value: "#dfe5dd" },
  { id: "sky", label: "Sky", value: "#dee6ef" },
  { id: "ink", label: "Ink", value: "#17171a" },
] as const;
