import type { Drop, Outfit, Reference, Subscription, WardrobeItem } from "./types";

const DB_NAME = "flatly";
const DB_VERSION = 3;
const ITEMS = "items";
const OUTFITS = "outfits";
const BLOBS = "blobs";
const REFERENCES = "references";
const SUBSCRIPTIONS = "subscriptions";
const DROPS = "drops";
const PREFS = "prefs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(OUTFITS)) db.createObjectStore(OUTFITS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
        // Added in v2; existing wardrobes upgrade in place.
        if (!db.objectStoreNames.contains(REFERENCES)) {
          db.createObjectStore(REFERENCES, { keyPath: "id" });
        }
        // Added in v3, for the watchlist.
        if (!db.objectStoreNames.contains(SUBSCRIPTIONS)) {
          db.createObjectStore(SUBSCRIPTIONS, { keyPath: "brandId" });
        }
        if (!db.objectStoreNames.contains(DROPS)) {
          db.createObjectStore(DROPS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(PREFS)) {
          db.createObjectStore(PREFS, { keyPath: "key" });
        }
      };
      // An older tab holding the database open blocks the upgrade, so ask it to let go.
      request.onblocked = () =>
        reject(new Error("flatly is open in another tab. Close it and reload to upgrade."));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = body(tx.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export const itemsStore = {
  all: () => run<WardrobeItem[]>(ITEMS, "readonly", (s) => s.getAll() as IDBRequest<WardrobeItem[]>),
  put: (item: WardrobeItem) => run(ITEMS, "readwrite", (s) => s.put(item)),
  remove: (id: string) => run(ITEMS, "readwrite", (s) => s.delete(id)),
};

export const outfitsStore = {
  all: () => run<Outfit[]>(OUTFITS, "readonly", (s) => s.getAll() as IDBRequest<Outfit[]>),
  put: (outfit: Outfit) => run(OUTFITS, "readwrite", (s) => s.put(outfit)),
  remove: (id: string) => run(OUTFITS, "readwrite", (s) => s.delete(id)),
};

export const referencesStore = {
  all: () =>
    run<Reference[]>(REFERENCES, "readonly", (s) => s.getAll() as IDBRequest<Reference[]>),
  put: (reference: Reference) => run(REFERENCES, "readwrite", (s) => s.put(reference)),
  remove: (id: string) => run(REFERENCES, "readwrite", (s) => s.delete(id)),
};

export const subscriptionsStore = {
  all: () =>
    run<Subscription[]>(SUBSCRIPTIONS, "readonly", (s) => s.getAll() as IDBRequest<Subscription[]>),
  put: (subscription: Subscription) => run(SUBSCRIPTIONS, "readwrite", (s) => s.put(subscription)),
  remove: (brandId: string) => run(SUBSCRIPTIONS, "readwrite", (s) => s.delete(brandId)),
};

export const dropsStore = {
  all: () => run<Drop[]>(DROPS, "readonly", (s) => s.getAll() as IDBRequest<Drop[]>),
  put: (drop: Drop) => run(DROPS, "readwrite", (s) => s.put(drop)),
  remove: (id: string) => run(DROPS, "readwrite", (s) => s.delete(id)),
};

/** A tiny key-value corner for settings that are not worth their own store. */
export const prefsStore = {
  get: <T>(key: string) =>
    run<{ key: string; value: T } | undefined>(
      PREFS,
      "readonly",
      (s) => s.get(key) as IDBRequest<{ key: string; value: T } | undefined>,
    ).then((row) => row?.value),
  put: <T>(key: string, value: T) => run(PREFS, "readwrite", (s) => s.put({ key, value })),
};

export const blobsStore = {
  get: (key: string) => run<Blob | undefined>(BLOBS, "readonly", (s) => s.get(key) as IDBRequest<Blob | undefined>),
  put: (key: string, blob: Blob) => run(BLOBS, "readwrite", (s) => s.put(blob, key)),
  remove: (key: string) => run(BLOBS, "readwrite", (s) => s.delete(key)),
};

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
