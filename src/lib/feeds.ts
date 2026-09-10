import { guessCategory } from "./categories";
import { colorsFromText } from "./taste";
import type { Drop, FeedStatus } from "./types";

/**
 * Pulling releases out of a store's own feed.
 *
 * There is no server here, so a feed either allows cross-origin reads or it does not.
 * RSS, Atom and Shopify's `products.json` all parse; anything else comes back `error`, and
 * a store with no feed at all stays link-only until someone clips a drop by hand.
 *
 * A relay is opt-in and off by default: it is somebody else's server, and turning it on
 * means the feed URL you are reading travels through them.
 */

export const SUGGESTED_RELAY = "https://api.allorigins.win/raw?url={url}";

export interface FeedResult {
  status: FeedStatus;
  drops: Drop[];
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function relayed(url: string, relay: string): string {
  return relay.includes("{url}")
    ? relay.replace("{url}", encodeURIComponent(url))
    : `${relay}${encodeURIComponent(url)}`;
}

function priceFrom(text: string): number | undefined {
  const match = text.match(/\$\s?(\d[\d,]*(?:\.\d{2})?)/);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

function imageFrom(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

function textOf(node: Element | null | undefined): string {
  return node?.textContent?.trim() ?? "";
}

function makeDrop(
  brandId: string,
  seed: string,
  fields: Partial<Drop> & { title: string; publishedAt: number },
): Drop {
  const colors = fields.colors?.length ? fields.colors : colorsFromText(fields.title);
  return {
    id: `${brandId}:${hash(seed)}`,
    brandId,
    url: fields.url,
    imageUrl: fields.imageUrl,
    price: fields.price,
    currency: fields.currency,
    category: fields.category ?? guessCategory(fields.title),
    colors,
    tags: fields.tags ?? [],
    origin: "feed",
    addedAt: Date.now(),
    title: fields.title,
    publishedAt: fields.publishedAt,
  };
}

interface ShopifyProduct {
  id: number | string;
  title: string;
  handle?: string;
  published_at?: string;
  created_at?: string;
  product_type?: string;
  tags?: string[] | string;
  images?: { src: string }[];
  variants?: { price: string | number }[];
}

function fromShopify(brandId: string, feedUrl: string, body: string): Drop[] | null {
  let parsed: { products?: ShopifyProduct[] };
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.products)) return null;

  const origin = (() => {
    try {
      return new URL(feedUrl).origin;
    } catch {
      return "";
    }
  })();

  return parsed.products.map((product) => {
    const price = Number(product.variants?.[0]?.price);
    const tags = Array.isArray(product.tags)
      ? product.tags
      : String(product.tags ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
    return makeDrop(brandId, String(product.id), {
      title: product.title,
      url: product.handle && origin ? `${origin}/products/${product.handle}` : undefined,
      imageUrl: product.images?.[0]?.src,
      price: Number.isFinite(price) ? price : undefined,
      category: guessCategory(`${product.product_type ?? ""} ${product.title}`),
      tags,
      publishedAt: Date.parse(product.published_at ?? product.created_at ?? "") || Date.now(),
    });
  });
}

function fromXml(brandId: string, body: string): Drop[] | null {
  const doc = new DOMParser().parseFromString(body, "application/xml");
  if (doc.querySelector("parsererror")) return null;
  const entries = [...doc.querySelectorAll("item, entry")];
  if (!entries.length) return null;

  return entries.map((entry) => {
    const title = textOf(entry.querySelector("title")) || "Untitled";
    const linkEl = entry.querySelector("link");
    const url = textOf(linkEl) || linkEl?.getAttribute("href") || undefined;
    const description =
      textOf(entry.querySelector("description")) || textOf(entry.querySelector("content"));
    const media = entry.querySelector("enclosure, [url]");
    const published =
      textOf(entry.querySelector("pubDate")) ||
      textOf(entry.querySelector("published")) ||
      textOf(entry.querySelector("updated"));
    return makeDrop(brandId, textOf(entry.querySelector("guid, id")) || url || title, {
      title,
      url,
      imageUrl: media?.getAttribute("url") ?? imageFrom(description),
      price: priceFrom(`${title} ${description}`),
      publishedAt: Date.parse(published) || Date.now(),
      tags: [...entry.querySelectorAll("category")].map((node) => textOf(node)).filter(Boolean),
    });
  });
}

export async function fetchFeed(
  brandId: string,
  url: string,
  relay?: string,
): Promise<FeedResult> {
  let body: string | null = null;

  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (response.ok) body = await response.text();
  } catch {
    // Almost always CORS. A relay is the only way through from a page with no server.
  }

  if (body === null && relay) {
    try {
      const response = await fetch(relayed(url, relay), { credentials: "omit" });
      if (response.ok) body = await response.text();
    } catch {
      body = null;
    }
  }

  if (body === null) return { status: "blocked", drops: [] };

  const drops = fromShopify(brandId, url, body) ?? fromXml(brandId, body);
  if (!drops) return { status: "error", drops: [] };
  if (!drops.length) return { status: "empty", drops: [] };
  return { status: "ok", drops };
}
