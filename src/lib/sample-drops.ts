import type { CategoryId, Drop } from "./types";

/**
 * Placeholder releases, so a fresh watchlist has something in it.
 *
 * These are not real products — they are invented, they carry no image, and they are badged
 * "Sample" everywhere they appear. They exist to show what the feed does with a drop, and
 * they can be switched off in the taste settings. Real releases arrive by clipping a product
 * URL or by attaching a feed to a store.
 */

interface Seed {
  brandId: string;
  title: string;
  category: CategoryId;
  colors: string[];
  price: number;
  tags: string[];
  /** Days back from now. */
  age: number;
}

const SEEDS: Seed[] = [
  {
    brandId: "aritzia",
    title: "Wool-blend car coat",
    category: "outerwear",
    colors: ["#3b3a36", "#c8b79c"],
    price: 298,
    tags: ["tailored", "minimal"],
    age: 0.4,
  },
  {
    brandId: "aritzia",
    title: "Cropped ribbed knit",
    category: "top",
    colors: ["#e8dfcc"],
    price: 78,
    tags: ["minimal"],
    age: 2.1,
  },
  {
    brandId: "uniqlo",
    title: "Heattech crew neck long sleeve",
    category: "top",
    colors: ["#111114", "#f6f5f3"],
    price: 19.9,
    tags: ["basics"],
    age: 1.2,
  },
  {
    brandId: "uniqlo",
    title: "Wide straight pleated trousers",
    category: "bottom",
    colors: ["#4a4b4f", "#26334f"],
    price: 49.9,
    tags: ["minimal", "basics"],
    age: 3.6,
  },
  {
    brandId: "zara",
    title: "Faux leather bomber",
    category: "outerwear",
    colors: ["#2a2320"],
    price: 129,
    tags: ["going-out"],
    age: 0.8,
  },
  {
    brandId: "zara",
    title: "Barrel-leg denim",
    category: "bottom",
    colors: ["#5b7a9c"],
    price: 69.9,
    tags: ["vintage"],
    age: 5.2,
  },
  {
    brandId: "abercrombie",
    title: "Linen-blend camp shirt",
    category: "top",
    colors: ["#dfe5dd", "#f4f1ec"],
    price: 70,
    tags: ["preppy", "basics"],
    age: 1.9,
  },
  {
    brandId: "abercrombie",
    title: "Sloane tailored trouser",
    category: "bottom",
    colors: ["#26334f"],
    price: 89,
    tags: ["tailored"],
    age: 4.4,
  },
  {
    brandId: "hollister",
    title: "Baggy carpenter jean",
    category: "bottom",
    colors: ["#6f7d94"],
    price: 59.95,
    tags: ["streetwear", "vintage"],
    age: 2.7,
  },
  {
    brandId: "hollister",
    title: "Sherpa-lined hooded jacket",
    category: "outerwear",
    colors: ["#8b8d92", "#e8dfcc"],
    price: 89.95,
    tags: ["basics"],
    age: 6.1,
  },
];

const DAY = 86_400_000;

export function sampleDrops(): Drop[] {
  const now = Date.now();
  return SEEDS.map((seed, index) => ({
    id: `sample:${seed.brandId}:${index}`,
    brandId: seed.brandId,
    title: seed.title,
    category: seed.category,
    colors: seed.colors,
    price: seed.price,
    currency: "USD",
    tags: seed.tags,
    publishedAt: now - seed.age * DAY,
    addedAt: now,
    origin: "sample" as const,
  }));
}
