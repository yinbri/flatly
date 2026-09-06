"use client";

import * as React from "react";
import { autoArrange, autoPlace } from "./layout";
import { aspectOf } from "./image";
import { BACKGROUNDS, type Layer, type Outfit, type WardrobeItem } from "./types";

interface BoardSnapshot {
  layers: Layer[];
  background: string;
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Array order is stacking order; `z` mirrors the index so saved boards render the same. */
function normalize(layers: Layer[]): Layer[] {
  return layers.map((layer, index) => (layer.z === index ? layer : { ...layer, z: index }));
}

export interface Board {
  outfitId: string | null;
  name: string;
  layers: Layer[];
  background: string;
  selectedId: string | null;
  selected: Layer | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  select: (id: string | null) => void;
  setName: (name: string) => void;
  setBackground: (value: string) => void;
  addItem: (
    item: WardrobeItem,
    items: Map<string, WardrobeItem>,
    at?: { x: number; y: number },
  ) => Layer;
  updateLayer: (id: string, patch: Partial<Layer>, options?: { history?: boolean }) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string, items: Map<string, WardrobeItem>) => void;
  reorder: (id: string, to: "up" | "down" | "front" | "back") => void;
  arrange: (items: Map<string, WardrobeItem>) => void;
  snapLayer: (id: string, items: Map<string, WardrobeItem>) => void;
  clear: () => void;
  /** Snapshots current state before a continuous gesture (drag, resize, rotate). */
  beginGesture: () => void;
  undo: () => void;
  redo: () => void;
  load: (outfit: Outfit) => void;
  startNew: () => void;
  markSaved: (outfitId: string, name: string) => void;
}

const DEFAULT_BACKGROUND = BACKGROUNDS[0].value;

export function useBoard(): Board {
  const [state, setState] = React.useState<BoardSnapshot>({
    layers: [],
    background: DEFAULT_BACKGROUND,
  });
  const [name, setNameState] = React.useState("Untitled flat lay");
  const [outfitId, setOutfitId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [, bump] = React.useReducer((n: number) => n + 1, 0);

  const stateRef = React.useRef(state);
  const past = React.useRef<BoardSnapshot[]>([]);
  const future = React.useRef<BoardSnapshot[]>([]);

  const commit = React.useCallback((next: BoardSnapshot) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const pushHistory = React.useCallback(() => {
    past.current.push(stateRef.current);
    if (past.current.length > 80) past.current.shift();
    future.current = [];
  }, []);

  const apply = React.useCallback(
    (updater: (prev: BoardSnapshot) => BoardSnapshot, options?: { history?: boolean }) => {
      const prev = stateRef.current;
      const next = updater(prev);
      if (next === prev) return;
      if (options?.history !== false) pushHistory();
      commit(next);
      setDirty(true);
      bump();
    },
    [commit, pushHistory],
  );

  const select = React.useCallback((id: string | null) => setSelectedId(id), []);

  const setName = React.useCallback((value: string) => {
    setNameState(value);
    setDirty(true);
  }, []);

  const setBackground = React.useCallback(
    (value: string) => apply((prev) => ({ ...prev, background: value })),
    [apply],
  );

  const addItem = React.useCallback(
    (item: WardrobeItem, items: Map<string, WardrobeItem>, at?: { x: number; y: number }) => {
      const prev = stateRef.current;
      const spot = at
        ? { ...at, w: defaultWidth(item) }
        : autoPlace(item, prev.layers, items);
      const layer: Layer = {
        id: uid(),
        itemId: item.id,
        x: spot.x,
        y: spot.y,
        w: spot.w,
        rotation: 0,
        flipX: false,
        z: prev.layers.length,
      };
      apply((current) => ({ ...current, layers: normalize([...current.layers, layer]) }));
      setSelectedId(layer.id);
      return layer;
    },
    [apply],
  );

  const updateLayer = React.useCallback(
    (id: string, patch: Partial<Layer>, options?: { history?: boolean }) =>
      apply(
        (prev) => ({
          ...prev,
          layers: prev.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
        }),
        options,
      ),
    [apply],
  );

  const removeLayer = React.useCallback(
    (id: string) => {
      apply((prev) => ({ ...prev, layers: normalize(prev.layers.filter((l) => l.id !== id)) }));
      setSelectedId((current) => (current === id ? null : current));
    },
    [apply],
  );

  const duplicateLayer = React.useCallback(
    (id: string, items: Map<string, WardrobeItem>) => {
      const source = stateRef.current.layers.find((layer) => layer.id === id);
      if (!source) return;
      const item = items.get(source.itemId);
      const offset = item ? Math.min(60, source.w * 0.15) : 40;
      const copy: Layer = {
        ...source,
        id: uid(),
        x: source.x + offset,
        y: source.y + offset,
        z: stateRef.current.layers.length,
      };
      apply((prev) => ({ ...prev, layers: normalize([...prev.layers, copy]) }));
      setSelectedId(copy.id);
    },
    [apply],
  );

  const reorder = React.useCallback(
    (id: string, to: "up" | "down" | "front" | "back") =>
      apply((prev) => {
        const index = prev.layers.findIndex((layer) => layer.id === id);
        if (index === -1) return prev;
        const layers = [...prev.layers];
        const [layer] = layers.splice(index, 1);
        const target =
          to === "up"
            ? Math.min(layers.length, index + 1)
            : to === "down"
              ? Math.max(0, index - 1)
              : to === "front"
                ? layers.length
                : 0;
        layers.splice(target, 0, layer);
        return { ...prev, layers: normalize(layers) };
      }),
    [apply],
  );

  const arrange = React.useCallback(
    (items: Map<string, WardrobeItem>) =>
      apply((prev) => ({ ...prev, layers: normalize(autoArrange(prev.layers, items)) })),
    [apply],
  );

  const snapLayer = React.useCallback(
    (id: string, items: Map<string, WardrobeItem>) =>
      apply((prev) => {
        const layer = prev.layers.find((entry) => entry.id === id);
        const item = layer && items.get(layer.itemId);
        if (!layer || !item) return prev;
        const others = prev.layers.filter((entry) => entry.id !== id);
        const spot = autoPlace(item, others, items);
        return {
          ...prev,
          layers: prev.layers.map((entry) =>
            entry.id === id ? { ...entry, ...spot, rotation: 0 } : entry,
          ),
        };
      }),
    [apply],
  );

  const clear = React.useCallback(() => {
    apply((prev) => ({ ...prev, layers: [] }));
    setSelectedId(null);
  }, [apply]);

  const undo = React.useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(stateRef.current);
    commit(previous);
    setDirty(true);
    setSelectedId(null);
    bump();
  }, [commit]);

  const redo = React.useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(stateRef.current);
    commit(next);
    setDirty(true);
    setSelectedId(null);
    bump();
  }, [commit]);

  const load = React.useCallback(
    (outfit: Outfit) => {
      past.current = [];
      future.current = [];
      commit({
        layers: normalize([...outfit.layers].sort((a, b) => a.z - b.z)),
        background: outfit.background,
      });
      setNameState(outfit.name);
      setOutfitId(outfit.id);
      setSelectedId(null);
      setDirty(false);
      bump();
    },
    [commit],
  );

  const startNew = React.useCallback(() => {
    past.current = [];
    future.current = [];
    commit({ layers: [], background: DEFAULT_BACKGROUND });
    setNameState("Untitled flat lay");
    setOutfitId(null);
    setSelectedId(null);
    setDirty(false);
    bump();
  }, [commit]);

  const markSaved = React.useCallback((id: string, savedName: string) => {
    setOutfitId(id);
    setNameState(savedName);
    setDirty(false);
  }, []);

  const selected = React.useMemo(
    () => state.layers.find((layer) => layer.id === selectedId) ?? null,
    [state.layers, selectedId],
  );

  return {
    outfitId,
    name,
    layers: state.layers,
    background: state.background,
    selectedId,
    selected,
    dirty,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    select,
    setName,
    setBackground,
    addItem,
    updateLayer,
    removeLayer,
    duplicateLayer,
    reorder,
    arrange,
    snapLayer,
    clear,
    beginGesture: pushHistory,
    undo,
    redo,
    load,
    startNew,
    markSaved,
  };
}

/** A sensible on-drop size: roughly a third of the board, capped for tiny accessories. */
export function defaultWidth(item: WardrobeItem): number {
  const aspect = aspectOf(item);
  const base = 320;
  return Math.round(Math.min(base * Math.max(aspect, 0.6), 460));
}
