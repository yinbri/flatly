import {
  Crown,
  Footprints,
  Gem,
  Glasses,
  Headphones,
  Layers,
  Package,
  PanelBottom,
  Shirt,
  ShoppingBag,
  SprayCan,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  plural: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "top", label: "Top", plural: "Tops", icon: Shirt },
  { id: "outerwear", label: "Outerwear", plural: "Outerwear", icon: Layers },
  { id: "bottom", label: "Bottom", plural: "Bottoms", icon: PanelBottom },
  { id: "dress", label: "Dress", plural: "Dresses", icon: Waves },
  { id: "shoes", label: "Shoes", plural: "Shoes", icon: Footprints },
  { id: "bag", label: "Bag", plural: "Bags", icon: ShoppingBag },
  { id: "eyewear", label: "Eyewear", plural: "Eyewear", icon: Glasses },
  { id: "jewelry", label: "Jewelry", plural: "Jewelry", icon: Gem },
  { id: "headwear", label: "Headwear", plural: "Headwear", icon: Crown },
  { id: "fragrance", label: "Fragrance", plural: "Fragrance", icon: SprayCan },
  { id: "tech", label: "Tech", plural: "Tech", icon: Headphones },
  { id: "other", label: "Other", plural: "Other", icon: Package },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function category(id: CategoryId): CategoryMeta {
  return BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Best-effort guess from a file name or URL, so uploads land in a sane bucket. */
export function guessCategory(name: string): CategoryId {
  const n = name.toLowerCase();
  const rules: [RegExp, CategoryId][] = [
    [/jacket|coat|blazer|hoodie|cardigan|parka|vest|zip/, "outerwear"],
    [/jean|denim|pant|trouser|short|skirt|cargo|sweat(pant)?|chino/, "bottom"],
    [/dress|gown/, "dress"],
    [/shoe|sneaker|boot|loafer|sandal|trainer|heel|mule/, "shoes"],
    [/bag|tote|purse|wallet|cardholder|card-holder|backpack|pouch/, "bag"],
    [/glass|sunnies|shade|specs|eyewear/, "eyewear"],
    [/ring|necklace|chain|bracelet|earring|watch|pendant/, "jewelry"],
    [/hat|cap|beanie|bucket|scarf|beret/, "headwear"],
    [/perfume|fragrance|cologne|eau de|replica/, "fragrance"],
    [/airpod|earphone|headphone|ipod|phone|camera|earbud/, "tech"],
    [/shirt|tee|top|sweater|knit|polo|blouse|jumper|long ?sleeve/, "top"],
  ];
  for (const [re, id] of rules) if (re.test(n)) return id;
  return "other";
}
