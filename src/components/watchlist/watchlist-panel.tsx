"use client";

import * as React from "react";
import { LineChart, Plus, RefreshCw, Scissors, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { brandOrPlaceholder } from "@/lib/brands";
import { cn } from "@/lib/utils";
import { useWardrobe } from "@/lib/store";
import { useWatchlist } from "@/lib/watchlist";
import type { Drop } from "@/lib/types";
import { AddStoreDialog } from "./add-store-dialog";
import { ClipDropDialog } from "./clip-drop-dialog";
import { DropCard } from "./drop-card";
import { StoreRow } from "./store-row";
import { TasteDialog } from "./taste-dialog";

type View = "for-you" | "newest" | "saved";

export function WatchlistPanel() {
  const { addFromUrl } = useWardrobe();
  const {
    ready,
    subscriptions,
    drops,
    profile,
    reading,
    refresh,
    refreshing,
    scoreOf,
    setDropFlags,
  } = useWatchlist();
  const [view, setView] = React.useState<View>("for-you");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [addingStore, setAddingStore] = React.useState(false);
  const [clipping, setClipping] = React.useState(false);
  const [tasting, setTasting] = React.useState(false);
  const [importing, setImporting] = React.useState<string | null>(null);

  const visible = React.useMemo(() => {
    const filtered = drops.filter((drop) => {
      if (drop.dismissed) return false;
      if (selected && drop.brandId !== selected) return false;
      if (view === "saved") return Boolean(drop.saved);
      return true;
    });
    if (view === "newest") return filtered.sort((a, b) => b.publishedAt - a.publishedAt);
    if (view === "saved") return filtered.sort((a, b) => b.addedAt - a.addedAt);
    return filtered.sort(
      (a, b) => scoreOf(b).value - scoreOf(a).value || b.publishedAt - a.publishedAt,
    );
  }, [drops, selected, view, scoreOf]);

  const addToWardrobe = async (drop: Drop) => {
    if (!drop.imageUrl) return;
    setImporting(drop.id);
    const id = toast.loading(`Adding ${drop.title}…`);
    try {
      await addFromUrl(drop.imageUrl, {
        name: drop.title,
        brand: brandOrPlaceholder(drop.brandId).name,
        category: drop.category,
      });
      toast.success(`${drop.title} is in your wardrobe.`, { id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That image could not be saved.", {
        id,
      });
    } finally {
      setImporting(null);
    }
  };

  const dismiss = async (drop: Drop) => {
    await setDropFlags(drop.id, { dismissed: true, saved: drop.saved });
    toast("Hidden from your feed.", {
      action: {
        label: "Undo",
        onClick: () => void setDropFlags(drop.id, { dismissed: false, saved: drop.saved }),
      },
    });
  };

  return (
    // The store rail sits alongside the feed on a wide screen and above it on a narrow one,
    // rendered once either way.
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b lg:w-72 lg:border-r lg:border-b-0">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
          <span className="text-sm font-medium">Stores</span>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setAddingStore(true)}
            aria-label="Follow a store"
          >
            <Plus />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setTasting(true)}
          className="group hidden flex-col gap-2 border-b p-3 text-left transition-colors hover:bg-muted/50 lg:flex"
        >
          <span className="flex items-center justify-between">
            <span className="text-xs font-medium">Your taste</span>
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          </span>
          {profile.palette.length ? (
            <span className="flex h-6 overflow-hidden rounded-md border">
              {profile.palette.map((swatch) => (
                <span key={swatch.hex} style={{ background: swatch.hex, flexGrow: swatch.weight }} />
              ))}
            </span>
          ) : (
            <span className="rounded-md border border-dashed px-2 py-2 text-xs text-muted-foreground">
              No palette yet
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {reading
              ? "reading images…"
              : `${profile.read.items} pieces · ${profile.read.references} references`}
          </span>
        </button>

        <div className="max-h-40 min-h-0 flex-1 overflow-y-auto p-2 lg:max-h-none">
          {subscriptions.length ? (
            <div className="space-y-0.5">
              {subscriptions.map((subscription) => (
                <StoreRow
                  key={subscription.brandId}
                  subscription={subscription}
                  drops={drops}
                  active={selected === subscription.brandId}
                  onSelect={() =>
                    setSelected((prev) =>
                      prev === subscription.brandId ? null : subscription.brandId,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing followed yet.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={!subscriptions.length || refreshing.size > 0}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn(refreshing.size && "animate-spin")} /> Pull feeds
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(value) => value && setView(value as View)}
          >
            <ToggleGroupItem value="for-you">For you</ToggleGroupItem>
            <ToggleGroupItem value="newest">Newest</ToggleGroupItem>
            <ToggleGroupItem value="saved">Saved</ToggleGroupItem>
          </ToggleGroup>

          {selected ? (
            <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
              {brandOrPlaceholder(selected).name}{" "}
              <span className="text-muted-foreground">clear</span>
            </Button>
          ) : null}

          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {visible.length} {visible.length === 1 ? "drop" : "drops"}
          </span>

          <Button size="sm" variant="outline" className="lg:hidden" onClick={() => setTasting(true)}>
            <SlidersHorizontal /> Taste
          </Button>
          <Button size="sm" onClick={() => setClipping(true)}>
            <Scissors /> Clip a drop
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {visible.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visible.map((drop) => (
                <DropCard
                  key={drop.id}
                  drop={drop}
                  score={scoreOf(drop)}
                  adding={importing === drop.id}
                  onAdd={() => void addToWardrobe(drop)}
                  onSave={() => void setDropFlags(drop.id, { saved: !drop.saved, dismissed: false })}
                  onDismiss={() => void dismiss(drop)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <LineChart className="size-6 text-muted-foreground" />
              <div>
                <p className="text-base font-medium">
                  {ready && !subscriptions.length
                    ? "Follow a store to start the watchlist"
                    : view === "saved"
                      ? "Nothing saved yet"
                      : "No drops in here yet"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Stores sit on the left like tickers. Releases arrive when you clip a product URL,
                  or from a feed you attach to a store.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddingStore(true)}>
                  <Plus /> Follow a store
                </Button>
                <Button size="sm" onClick={() => setClipping(true)}>
                  <Scissors /> Clip a drop
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddStoreDialog open={addingStore} onOpenChange={setAddingStore} />
      <ClipDropDialog open={clipping} onOpenChange={setClipping} />
      <TasteDialog open={tasting} onOpenChange={setTasting} />
    </div>
  );
}
