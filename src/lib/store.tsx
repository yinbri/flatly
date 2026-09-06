"use client";

import * as React from "react";
import { blobsStore, itemsStore, outfitsStore } from "./db";
import { cacheRemote, measure } from "./image";
import { guessCategory } from "./categories";
import type { CategoryId, Outfit, WardrobeItem } from "./types";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function prettyName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? raw;
  const withoutQuery = base.split("?")[0];
  const withoutExt = withoutQuery.replace(/\.[a-z0-9]{2,5}$/i, "");
  const words = withoutExt.replace(/[-_+.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "Untitled piece";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface NewItemInput {
  name?: string;
  category?: CategoryId;
  brand?: string;
  notes?: string;
}

interface WardrobeContextValue {
  ready: boolean;
  items: WardrobeItem[];
  outfits: Outfit[];
  /** Displayable source for an item: a local object URL, or the remote URL. */
  srcFor: (itemId: string) => string | undefined;
  itemsById: Map<string, WardrobeItem>;
  addFromFile: (file: File, input?: NewItemInput) => Promise<WardrobeItem>;
  addFromUrl: (url: string, input?: NewItemInput) => Promise<WardrobeItem>;
  updateItem: (id: string, patch: Partial<WardrobeItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  saveOutfit: (outfit: Outfit) => Promise<void>;
  removeOutfit: (id: string) => Promise<void>;
}

const WardrobeContext = React.createContext<WardrobeContextValue | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [items, setItems] = React.useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = React.useState<Outfit[]>([]);
  const [sources, setSources] = React.useState<Record<string, string>>({});
  const objectUrls = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    const urls = objectUrls.current;

    (async () => {
      try {
        const [storedItems, storedOutfits] = await Promise.all([
          itemsStore.all(),
          outfitsStore.all(),
        ]);
        if (cancelled) return;
        const next: Record<string, string> = {};
        await Promise.all(
          storedItems.map(async (item) => {
            if (!item.blobKey) {
              if (item.remoteUrl) next[item.id] = item.remoteUrl;
              return;
            }
            const blob = await blobsStore.get(item.blobKey).catch(() => undefined);
            if (blob) {
              const url = URL.createObjectURL(blob);
              urls[item.id] = url;
              next[item.id] = url;
            } else if (item.remoteUrl) {
              next[item.id] = item.remoteUrl;
            }
          }),
        );
        if (cancelled) return;
        setItems(storedItems.sort((a, b) => b.createdAt - a.createdAt));
        setOutfits(storedOutfits.sort((a, b) => b.updatedAt - a.updatedAt));
        setSources(next);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const store = React.useCallback(
    async (
      blob: Blob,
      src: string,
      origin: { source: "upload" | "link"; remoteUrl?: string },
      label: string,
      input?: NewItemInput,
    ) => {
      const { width, height } = await measure(src);
      const blobKey = uid();
      await blobsStore.put(blobKey, blob);
      const item: WardrobeItem = {
        id: uid(),
        name: input?.name?.trim() || prettyName(label),
        category: input?.category ?? guessCategory(label),
        brand: input?.brand?.trim() || undefined,
        notes: input?.notes?.trim() || undefined,
        source: origin.source,
        remoteUrl: origin.remoteUrl,
        blobKey,
        width,
        height,
        createdAt: Date.now(),
      };
      await itemsStore.put(item);
      objectUrls.current[item.id] = src;
      setSources((prev) => ({ ...prev, [item.id]: src }));
      setItems((prev) => [item, ...prev]);
      return item;
    },
    [],
  );

  const addFromFile = React.useCallback(
    async (file: File, input?: NewItemInput) => {
      if (!file.type.startsWith("image/")) {
        throw new Error(`${file.name} is not an image file.`);
      }
      const src = URL.createObjectURL(file);
      try {
        return await store(file, src, { source: "upload" }, file.name, input);
      } catch (error) {
        URL.revokeObjectURL(src);
        throw error;
      }
    },
    [store],
  );

  const addFromUrl = React.useCallback(
    async (url: string, input?: NewItemInput) => {
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        throw new Error("Paste a full image URL starting with http:// or https://");
      }
      const blob = await cacheRemote(trimmed);
      if (blob) {
        const src = URL.createObjectURL(blob);
        try {
          return await store(blob, src, { source: "link", remoteUrl: trimmed }, trimmed, input);
        } catch (error) {
          URL.revokeObjectURL(src);
          throw error;
        }
      }
      // The host blocked the fetch, so hotlink it instead and remember it is not cached.
      const { width, height } = await measure(trimmed);
      const item: WardrobeItem = {
        id: uid(),
        name: input?.name?.trim() || prettyName(trimmed),
        category: input?.category ?? guessCategory(trimmed),
        brand: input?.brand?.trim() || undefined,
        notes: input?.notes?.trim() || undefined,
        source: "link",
        remoteUrl: trimmed,
        width,
        height,
        createdAt: Date.now(),
      };
      await itemsStore.put(item);
      setSources((prev) => ({ ...prev, [item.id]: trimmed }));
      setItems((prev) => [item, ...prev]);
      return item;
    },
    [store],
  );

  const updateItem = React.useCallback(async (id: string, patch: Partial<WardrobeItem>) => {
    let updated: WardrobeItem | null = null;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, ...patch, id: item.id };
        return updated;
      }),
    );
    if (updated) await itemsStore.put(updated);
  }, []);

  const removeItem = React.useCallback(
    async (id: string) => {
      const item = items.find((entry) => entry.id === id);
      setItems((prev) => prev.filter((entry) => entry.id !== id));
      setSources((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const url = objectUrls.current[id];
      if (url) {
        URL.revokeObjectURL(url);
        delete objectUrls.current[id];
      }
      await itemsStore.remove(id);
      if (item?.blobKey) await blobsStore.remove(item.blobKey).catch(() => undefined);

      // Drop the piece from any saved outfit that used it.
      const affected = outfits.filter((outfit) => outfit.layers.some((l) => l.itemId === id));
      if (affected.length) {
        const cleaned = affected.map((outfit) => ({
          ...outfit,
          layers: outfit.layers.filter((l) => l.itemId !== id),
        }));
        await Promise.all(cleaned.map((outfit) => outfitsStore.put(outfit)));
        const byId = new Map(cleaned.map((outfit) => [outfit.id, outfit]));
        setOutfits((prev) => prev.map((outfit) => byId.get(outfit.id) ?? outfit));
      }
    },
    [items, outfits],
  );

  const saveOutfit = React.useCallback(async (outfit: Outfit) => {
    await outfitsStore.put(outfit);
    setOutfits((prev) => {
      const rest = prev.filter((entry) => entry.id !== outfit.id);
      return [outfit, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  const removeOutfit = React.useCallback(async (id: string) => {
    setOutfits((prev) => prev.filter((outfit) => outfit.id !== id));
    await outfitsStore.remove(id);
  }, []);

  const itemsById = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const srcFor = React.useCallback((itemId: string) => sources[itemId], [sources]);

  const value = React.useMemo<WardrobeContextValue>(
    () => ({
      ready,
      items,
      outfits,
      itemsById,
      srcFor,
      addFromFile,
      addFromUrl,
      updateItem,
      removeItem,
      saveOutfit,
      removeOutfit,
    }),
    [
      ready,
      items,
      outfits,
      itemsById,
      srcFor,
      addFromFile,
      addFromUrl,
      updateItem,
      removeItem,
      saveOutfit,
      removeOutfit,
    ],
  );

  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe(): WardrobeContextValue {
  const context = React.useContext(WardrobeContext);
  if (!context) throw new Error("useWardrobe must be used inside <WardrobeProvider>.");
  return context;
}
