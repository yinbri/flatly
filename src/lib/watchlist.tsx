"use client";

import * as React from "react";
import { dropsStore, prefsStore, subscriptionsStore } from "./db";
import { brandFromUrl, brand as brandById } from "./brands";
import { fetchFeed } from "./feeds";
import { guessCategory } from "./categories";
import { paletteOf, type Palette } from "./palette";
import { sampleDrops } from "./sample-drops";
import { useWardrobe } from "./store";
import { buildProfile, colorsFromText, scoreDrop, type Score, type TasteProfile } from "./taste";
import {
  DEFAULT_TASTE,
  type CategoryId,
  type Drop,
  type FeedStatus,
  type Subscription,
  type TasteSettings,
} from "./types";

const SETTINGS_KEY = "taste";
const SEEDED_KEY = "watchlist-seeded";
const SEED_STORES = ["aritzia", "uniqlo", "zara", "abercrombie", "hollister"];

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface ClipInput {
  url: string;
  brandId?: string;
  title?: string;
  imageUrl?: string;
  price?: number;
  category?: CategoryId;
}

interface WatchlistContextValue {
  ready: boolean;
  subscriptions: Subscription[];
  followed: Set<string>;
  /** Everything visible: what is stored, plus samples while they are switched on. */
  drops: Drop[];
  settings: TasteSettings;
  profile: TasteProfile;
  /** True while images are still being read for the palette. */
  reading: boolean;
  refreshing: Set<string>;
  follow: (brandId: string) => Promise<void>;
  unfollow: (brandId: string) => Promise<void>;
  updateSubscription: (brandId: string, patch: Partial<Subscription>) => Promise<void>;
  refresh: (brandId?: string) => Promise<void>;
  clip: (input: ClipInput) => Promise<Drop>;
  setDropFlags: (id: string, patch: Pick<Drop, "saved" | "dismissed">) => Promise<void>;
  removeDrop: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<TasteSettings>) => Promise<void>;
  scoreOf: (drop: Drop) => Score;
}

const WatchlistContext = React.createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { items, references, srcFor } = useWardrobe();
  const [ready, setReady] = React.useState(false);
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [stored, setStored] = React.useState<Drop[]>([]);
  const [settings, setSettings] = React.useState<TasteSettings>(DEFAULT_TASTE);
  const [palettes, setPalettes] = React.useState<Map<string, Palette>>(new Map());
  const [reading, setReading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState<Set<string>>(new Set());
  const attempted = React.useRef(new Set<string>());
  const storedRef = React.useRef<Drop[]>([]);
  const subsRef = React.useRef<Subscription[]>([]);

  /**
   * Subscriptions are read back the moment they are written — attaching a feed pulls it
   * straight away — so the list lives in a ref as well as in state.
   */
  const commitSubscriptions = React.useCallback((next: Subscription[]) => {
    subsRef.current = next;
    setSubscriptions(next);
  }, []);

  React.useEffect(() => {
    storedRef.current = stored;
  }, [stored]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subs, drops, saved] = await Promise.all([
          subscriptionsStore.all().catch(() => [] as Subscription[]),
          dropsStore.all().catch(() => [] as Drop[]),
          prefsStore.get<TasteSettings>(SETTINGS_KEY).catch(() => undefined),
        ]);
        if (cancelled) return;
        setStored(drops);
        if (saved) setSettings({ ...DEFAULT_TASTE, ...saved });

        // A watchlist with nothing on it cannot show what it does, so the first run starts
        // with the high-street stores the samples come from. Unfollowing sticks.
        if (!subs.length && !(await prefsStore.get<boolean>(SEEDED_KEY).catch(() => false))) {
          const seeded = SEED_STORES.map((brandId, index) => ({
            brandId,
            addedAt: Date.now() + index,
          }));
          await Promise.all(seeded.map((sub) => subscriptionsStore.put(sub)));
          await prefsStore.put(SEEDED_KEY, true);
          if (!cancelled) {
            subsRef.current = seeded;
            setSubscriptions(seeded);
          }
          return;
        }
        subsRef.current = subs.sort((a, b) => a.addedAt - b.addedAt);
        setSubscriptions(subsRef.current);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reading colour off the images is the whole taste signal, so it happens once per image
  // and the result is kept. A hotlinked image that taints the canvas simply never lands.
  React.useEffect(() => {
    const pending = [...items, ...references].filter(
      (entry) => !attempted.current.has(entry.id) && srcFor(entry.id),
    );
    if (!pending.length) return;
    let cancelled = false;
    setReading(true);
    (async () => {
      const found = new Map<string, Palette>();
      for (const entry of pending) {
        attempted.current.add(entry.id);
        const src = srcFor(entry.id);
        if (!src) continue;
        const palette = await paletteOf(src);
        if (palette) found.set(entry.id, palette);
      }
      if (cancelled) return;
      if (found.size) setPalettes((prev) => new Map([...prev, ...found]));
      setReading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [items, references, srcFor]);

  const followed = React.useMemo(
    () => new Set(subscriptions.filter((sub) => !sub.muted).map((sub) => sub.brandId)),
    [subscriptions],
  );

  const drops = React.useMemo(() => {
    const byId = new Map(stored.map((drop) => [drop.id, drop]));
    if (settings.showSamples) {
      for (const drop of sampleDrops()) if (!byId.has(drop.id)) byId.set(drop.id, drop);
    }
    return [...byId.values()].sort((a, b) => b.publishedAt - a.publishedAt);
  }, [stored, settings.showSamples]);

  const profile = React.useMemo(
    () => buildProfile({ items, references, palettes, settings }),
    [items, references, palettes, settings],
  );

  const scores = React.useMemo(() => {
    const map = new Map<string, Score>();
    for (const drop of drops) map.set(drop.id, scoreDrop(drop, { profile, settings, followed }));
    return map;
  }, [drops, profile, settings, followed]);

  const scoreOf = React.useCallback(
    (drop: Drop) => scores.get(drop.id) ?? { value: 0, reasons: [] },
    [scores],
  );

  const follow = React.useCallback(
    async (brandId: string) => {
      if (subsRef.current.some((sub) => sub.brandId === brandId)) return;
      const subscription: Subscription = { brandId, addedAt: Date.now() };
      commitSubscriptions([...subsRef.current, subscription]);
      await subscriptionsStore.put(subscription);
    },
    [commitSubscriptions],
  );

  const unfollow = React.useCallback(
    async (brandId: string) => {
      commitSubscriptions(subsRef.current.filter((sub) => sub.brandId !== brandId));
      await subscriptionsStore.remove(brandId);
    },
    [commitSubscriptions],
  );

  const updateSubscription = React.useCallback(
    async (brandId: string, patch: Partial<Subscription>) => {
      const existing = subsRef.current.find((sub) => sub.brandId === brandId);
      if (!existing) return;
      const updated: Subscription = { ...existing, ...patch, brandId };
      commitSubscriptions(subsRef.current.map((sub) => (sub.brandId === brandId ? updated : sub)));
      await subscriptionsStore.put(updated);
    },
    [commitSubscriptions],
  );

  const updateSettings = React.useCallback(
    async (patch: Partial<TasteSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await prefsStore.put(SETTINGS_KEY, next);
    },
    [settings],
  );

  /** Merges freshly fetched drops in without trampling saved or dismissed ones. */
  const absorb = React.useCallback(async (incoming: Drop[]) => {
    const known = new Set(storedRef.current.map((drop) => drop.id));
    const fresh = incoming.filter((drop) => !known.has(drop.id));
    if (!fresh.length) return;
    await Promise.all(fresh.map((drop) => dropsStore.put(drop)));
    storedRef.current = [...storedRef.current, ...fresh];
    setStored(storedRef.current);
  }, []);

  const refresh = React.useCallback(
    async (brandId?: string) => {
      const targets = subsRef.current.filter((sub) => !brandId || sub.brandId === brandId);
      if (!targets.length) return;
      setRefreshing(new Set(targets.map((sub) => sub.brandId)));
      try {
        for (const sub of targets) {
          const url = sub.feedUrl ?? brandById(sub.brandId)?.feed;
          let status: FeedStatus = "none";
          if (url) {
            const result = await fetchFeed(sub.brandId, url, settings.relay);
            status = result.status;
            await absorb(result.drops);
          }
          await updateSubscription(sub.brandId, { lastFetchedAt: Date.now(), lastStatus: status });
        }
      } finally {
        setRefreshing(new Set());
      }
    },
    [settings.relay, absorb, updateSubscription],
  );

  const clip = React.useCallback(async (input: ClipInput) => {
    const url = input.url.trim();
    const guessed = brandFromUrl(url);
    const brandId = input.brandId ?? guessed?.id ?? "other";
    const title = input.title?.trim() || guessed?.name || "Clipped drop";
    let colors = colorsFromText(title);
    if (input.imageUrl) {
      const palette = await paletteOf(input.imageUrl).catch(() => null);
      if (palette?.swatches.length) colors = palette.swatches.slice(0, 3).map((s) => s.hex);
    }
    const drop: Drop = {
      id: `clip:${uid()}`,
      brandId,
      title,
      url: url || undefined,
      imageUrl: input.imageUrl?.trim() || undefined,
      price: input.price,
      currency: "USD",
      category: input.category ?? guessCategory(`${title} ${url}`),
      colors,
      tags: [],
      publishedAt: Date.now(),
      addedAt: Date.now(),
      origin: "clip",
    };
    await dropsStore.put(drop);
    setStored((prev) => [drop, ...prev]);
    return drop;
  }, []);

  const setDropFlags = React.useCallback(
    async (id: string, patch: Pick<Drop, "saved" | "dismissed">) => {
      // A sample only reaches storage once somebody acts on it.
      const existing = stored.find((drop) => drop.id === id) ?? drops.find((drop) => drop.id === id);
      if (!existing) return;
      const updated: Drop = { ...existing, ...patch };
      await dropsStore.put(updated);
      setStored((prev) => {
        const rest = prev.filter((drop) => drop.id !== id);
        return [...rest, updated];
      });
    },
    [stored, drops],
  );

  const removeDrop = React.useCallback(async (id: string) => {
    setStored((prev) => prev.filter((drop) => drop.id !== id));
    await dropsStore.remove(id);
  }, []);

  const value = React.useMemo<WatchlistContextValue>(
    () => ({
      ready,
      subscriptions,
      followed,
      drops,
      settings,
      profile,
      reading,
      refreshing,
      follow,
      unfollow,
      updateSubscription,
      refresh,
      clip,
      setDropFlags,
      removeDrop,
      updateSettings,
      scoreOf,
    }),
    [
      ready,
      subscriptions,
      followed,
      drops,
      settings,
      profile,
      reading,
      refreshing,
      follow,
      unfollow,
      updateSubscription,
      refresh,
      clip,
      setDropFlags,
      removeDrop,
      updateSettings,
      scoreOf,
    ],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistContextValue {
  const context = React.useContext(WatchlistContext);
  if (!context) throw new Error("useWatchlist must be used inside <WatchlistProvider>.");
  return context;
}
