import type { Brand } from "./types";

/**
 * The stores you can follow.
 *
 * `newArrivals` is only filled in where the store keeps that page at a stable URL —
 * everything else opens at the front door. None of these five publish a public feed, so
 * releases arrive by clipping or by a feed URL attached in the store's own settings.
 */
export const BRANDS: Brand[] = [
  {
    id: "aritzia",
    name: "Aritzia",
    ticker: "ARTZ",
    site: "https://www.aritzia.com/us/en",
    newArrivals: "https://www.aritzia.com/us/en/new",
    tags: ["minimal", "tailored", "going-out"],
    price: "premium",
  },
  {
    id: "hollister",
    name: "Hollister",
    ticker: "HCO",
    site: "https://www.hollisterco.com/shop/us",
    newArrivals: "https://www.hollisterco.com/shop/us/new-641669241",
    tags: ["basics", "streetwear", "vintage"],
    price: "value",
  },
  {
    id: "uniqlo",
    name: "Uniqlo",
    ticker: "UNQL",
    site: "https://www.uniqlo.com/us/en",
    newArrivals: "https://www.uniqlo.com/us/en/feature/new/men",
    tags: ["basics", "minimal"],
    price: "value",
  },
  {
    id: "abercrombie",
    name: "Abercrombie & Fitch",
    ticker: "ANF",
    site: "https://www.abercrombie.com/shop/us",
    newArrivals: "https://www.abercrombie.com/shop/us/new",
    tags: ["basics", "preppy", "tailored"],
    price: "mid",
  },
  {
    id: "zara",
    name: "Zara",
    ticker: "ZARA",
    site: "https://www.zara.com/us/",
    tags: ["tailored", "going-out", "minimal"],
    price: "mid",
  },
  {
    id: "cos",
    name: "COS",
    ticker: "COS",
    site: "https://www.cos.com",
    tags: ["minimal", "tailored"],
    price: "premium",
  },
  {
    id: "everlane",
    name: "Everlane",
    ticker: "EVLN",
    site: "https://www.everlane.com",
    tags: ["minimal", "basics"],
    price: "mid",
  },
  {
    id: "muji",
    name: "Muji",
    ticker: "MUJI",
    site: "https://www.muji.us",
    tags: ["minimal", "basics"],
    price: "value",
  },
  {
    id: "jcrew",
    name: "J.Crew",
    ticker: "JCRW",
    site: "https://www.jcrew.com",
    tags: ["preppy", "tailored"],
    price: "mid",
  },
  {
    id: "madewell",
    name: "Madewell",
    ticker: "MDWL",
    site: "https://www.madewell.com",
    tags: ["basics", "vintage"],
    price: "mid",
  },
  {
    id: "reformation",
    name: "Reformation",
    ticker: "REF",
    site: "https://www.thereformation.com",
    tags: ["going-out", "vintage", "tailored"],
    price: "premium",
  },
  {
    id: "levis",
    name: "Levi's",
    ticker: "LEVI",
    site: "https://www.levi.com",
    tags: ["vintage", "basics", "workwear"],
    price: "mid",
  },
  {
    id: "carhartt-wip",
    name: "Carhartt WIP",
    ticker: "CWIP",
    site: "https://us.carhartt-wip.com",
    tags: ["workwear", "streetwear"],
    price: "mid",
  },
  {
    id: "stussy",
    name: "Stüssy",
    ticker: "STSY",
    site: "https://www.stussy.com",
    tags: ["streetwear", "vintage"],
    price: "mid",
  },
  {
    id: "nike",
    name: "Nike",
    ticker: "NIKE",
    site: "https://www.nike.com",
    tags: ["athleisure", "streetwear"],
    price: "mid",
  },
  {
    id: "adidas",
    name: "Adidas",
    ticker: "ADS",
    site: "https://www.adidas.com/us",
    tags: ["athleisure", "streetwear"],
    price: "mid",
  },
  {
    id: "lululemon",
    name: "Lululemon",
    ticker: "LULU",
    site: "https://shop.lululemon.com",
    tags: ["athleisure", "minimal"],
    price: "premium",
  },
  {
    id: "arcteryx",
    name: "Arc'teryx",
    ticker: "ARC",
    site: "https://arcteryx.com",
    tags: ["outdoor", "minimal"],
    price: "luxury",
  },
  {
    id: "patagonia",
    name: "Patagonia",
    ticker: "PTGA",
    site: "https://www.patagonia.com",
    tags: ["outdoor", "workwear"],
    price: "premium",
  },
  {
    id: "hm",
    name: "H&M",
    ticker: "HM",
    site: "https://www2.hm.com/en_us",
    tags: ["basics", "going-out"],
    price: "value",
  },
];

const BY_ID = new Map(BRANDS.map((brand) => [brand.id, brand]));

export function brand(id: string): Brand | undefined {
  return BY_ID.get(id);
}

/** A store that is only referenced by a clipped drop still needs a name and a ticker. */
export function brandOrPlaceholder(id: string): Brand {
  return (
    BY_ID.get(id) ?? {
      id,
      name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      ticker: id.slice(0, 4).toUpperCase(),
      site: "",
      tags: [],
      price: "mid",
    }
  );
}

/** Matches a hostname back to a catalogue store, for clipping a product URL. */
export function brandFromUrl(url: string): Brand | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\d?\./, "");
  } catch {
    return undefined;
  }
  return BRANDS.find((entry) => {
    try {
      const site = new URL(entry.site).hostname.toLowerCase().replace(/^www\d?\./, "");
      const root = site.split(".").slice(-2).join(".");
      return host === site || host.endsWith(`.${root}`) || host === root;
    } catch {
      return false;
    }
  });
}
