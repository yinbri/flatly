"use client";

import * as React from "react";
import { blobsStore, itemsStore, outfitsStore, referencesStore } from "./db";
import { cacheRemote, measure } from "./image";
import { cutOut, describeBackground } from "./cutout";
import { guessCategory } from "./categories";
import type { CategoryId, Outfit, Reference, WardrobeItem } from "./types";

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
  /** Cut a plain background away on import. Defaults to on. */
  autoCutout?: boolean;
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
  /** Cuts the background out of an item already in the wardrobe. */
  cutOutItem: (id: string) => Promise<"done" | "unchanged" | "transparent" | "failed">;
  /** Puts back the untouched upload. */
  restoreOriginal: (id: string) => Promise<void>;
  saveOutfit: (outfit: Outfit) => Promise<void>;
  removeOutfit: (id: string) => Promise<void>;
  /** Inspiration images kept to work from. */
  references: Reference[];
  addReference: (source: File | string, name?: string) => Promise<Reference>;
  removeReference: (id: string) => Promise<void>;
}

const WardrobeContext = React.createContext<WardrobeContextValue | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [items, setItems] = React.useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = React.useState<Outfit[]>([]);
  const [references, setReferences] = React.useState<Reference[]>([]);
  const [sources, setSources] = React.useState<Record<string, string>>({});
  const objectUrls = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    const urls = objectUrls.current;

    (async () => {
      try {
        const [storedItems, storedOutfits, storedReferences] = await Promise.all([
          itemsStore.all(),
          outfitsStore.all(),
          referencesStore.all().catch(() => [] as Reference[]),
        ]);
        if (cancelled) return;
        const next: Record<string, string> = {};
        const withBlobs = [...storedItems, ...storedReferences];
        await Promise.all(
          withBlobs.map(async (item) => {
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
        setReferences(storedReferences.sort((a, b) => b.createdAt - a.createdAt));
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
      let { width, height } = await measure(src);
      const blobKey = uid();
      let originalBlobKey: string | undefined;
      let cutout = false;
      let displaySrc = src;

      // A studio shot on a plain background becomes a proper cut-out on the way in.
      if (input?.autoCutout !== false) {
        const result = await cutOut(src).catch(() => null);
        if (result) {
          originalBlobKey = uid();
          await blobsStore.put(originalBlobKey, blob);
          await blobsStore.put(blobKey, result.blob);
          width = result.width;
          height = result.height;
          cutout = true;
          displaySrc = URL.createObjectURL(result.blob);
          URL.revokeObjectURL(src);
        }
      }
      if (!cutout) await blobsStore.put(blobKey, blob);

      const item: WardrobeItem = {
        id: uid(),
        name: input?.name?.trim() || prettyName(label),
        category: input?.category ?? guessCategory(label),
        brand: input?.brand?.trim() || undefined,
        notes: input?.notes?.trim() || undefined,
        source: origin.source,
        remoteUrl: origin.remoteUrl,
        blobKey,
        originalBlobKey,
        cutout: cutout || undefined,
        width,
        height,
        createdAt: Date.now(),
      };
      await itemsStore.put(item);
      objectUrls.current[item.id] = displaySrc;
      setSources((prev) => ({ ...prev, [item.id]: displaySrc }));
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
      if (item?.originalBlobKey) {
        await blobsStore.remove(item.originalBlobKey).catch(() => undefined);
      }

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

  /** Swaps an item's image for a new blob and refreshes its object URL. */
  const swapImage = React.useCallback(
    async (item: WardrobeItem, patch: Partial<WardrobeItem>, blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const previous = objectUrls.current[item.id];
      objectUrls.current[item.id] = url;
      if (previous) URL.revokeObjectURL(previous);
      const updated: WardrobeItem = { ...item, ...patch };
      await itemsStore.put(updated);
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? updated : entry)));
      setSources((prev) => ({ ...prev, [item.id]: url }));
    },
    [],
  );

  const cutOutItem = React.useCallback(
    async (id: string): Promise<"done" | "unchanged" | "transparent" | "failed"> => {
      const item = items.find((entry) => entry.id === id);
      const src = sources[id];
      if (!item || !src) return "failed";
      if (item.cutout) return "unchanged";

      const report = await describeBackground(src);
      if (report?.hasTransparency) return "transparent";

      const result = await cutOut(src, { force: true }).catch(() => null);
      if (!result) return "unchanged";

      // The current blob becomes the restore point the first time round.
      let originalBlobKey = item.originalBlobKey;
      if (!originalBlobKey) {
        if (!item.blobKey) return "failed";
        originalBlobKey = item.blobKey;
      }
      const blobKey = uid();
      await blobsStore.put(blobKey, result.blob);
      await swapImage(
        item,
        {
          blobKey,
          originalBlobKey,
          cutout: true,
          width: result.width,
          height: result.height,
        },
        result.blob,
      );
      return "done";
    },
    [items, sources, swapImage],
  );

  const restoreOriginal = React.useCallback(
    async (id: string) => {
      const item = items.find((entry) => entry.id === id);
      if (!item?.originalBlobKey) return;
      const blob = await blobsStore.get(item.originalBlobKey).catch(() => undefined);
      if (!blob) return;
      const cutoutKey = item.blobKey;
      const url = URL.createObjectURL(blob);
      const { width, height } = await measure(url).catch(() => ({
        width: item.width,
        height: item.height,
      }));
      URL.revokeObjectURL(url);
      await swapImage(
        item,
        {
          blobKey: item.originalBlobKey,
          originalBlobKey: undefined,
          cutout: undefined,
          width,
          height,
        },
        blob,
      );
      if (cutoutKey && cutoutKey !== item.originalBlobKey) {
        await blobsStore.remove(cutoutKey).catch(() => undefined);
      }
    },
    [items, swapImage],
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

  /**
   * Inspiration images are stored whole: no cut-out, no trimming. They are somebody
   * else's photograph, kept as a reference to work from.
   */
  const addReference = React.useCallback(async (source: File | string, name?: string) => {
    let blob: Blob | null = null;
    let remoteUrl: string | undefined;
    let label = name ?? "";

    if (typeof source === "string") {
      const trimmed = source.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        throw new Error("Paste a full image URL starting with http:// or https://");
      }
      remoteUrl = trimmed;
      label = label || prettyName(trimmed);
      blob = await cacheRemote(trimmed);
    } else {
      if (!source.type.startsWith("image/")) throw new Error(`${source.name} is not an image.`);
      blob = source;
      label = label || prettyName(source.name);
    }

    const src = blob ? URL.createObjectURL(blob) : remoteUrl;
    if (!src) throw new Error("That image could not be read.");
    const { width, height } = await measure(src);

    let blobKey: string | undefined;
    if (blob) {
      blobKey = uid();
      await blobsStore.put(blobKey, blob);
    }

    const reference: Reference = {
      id: uid(),
      name: label || "Reference",
      source: typeof source === "string" ? "link" : "upload",
      remoteUrl,
      blobKey,
      width,
      height,
      createdAt: Date.now(),
    };
    await referencesStore.put(reference);
    if (blob) objectUrls.current[reference.id] = src;
    setSources((prev) => ({ ...prev, [reference.id]: src }));
    setReferences((prev) => [reference, ...prev]);
    return reference;
  }, []);

  const removeReference = React.useCallback(
    async (id: string) => {
      const reference = references.find((entry) => entry.id === id);
      setReferences((prev) => prev.filter((entry) => entry.id !== id));
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
      await referencesStore.remove(id);
      if (reference?.blobKey) await blobsStore.remove(reference.blobKey).catch(() => undefined);
    },
    [references],
  );

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
      cutOutItem,
      restoreOriginal,
      saveOutfit,
      removeOutfit,
      references,
      addReference,
      removeReference,
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
      cutOutItem,
      restoreOriginal,
      saveOutfit,
      removeOutfit,
      references,
      addReference,
      removeReference,
    ],
  );

  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe(): WardrobeContextValue {
  const context = React.useContext(WardrobeContext);
  if (!context) throw new Error("useWardrobe must be used inside <WardrobeProvider>.");
  return context;
}
