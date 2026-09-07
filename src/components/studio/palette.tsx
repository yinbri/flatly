"use client";

import * as React from "react";
import { Plus, Search, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORIES, category } from "@/lib/categories";
import type { CategoryId, WardrobeItem } from "@/lib/types";
import { ITEM_DRAG_TYPE } from "./canvas";

interface PaletteProps {
  items: WardrobeItem[];
  srcFor: (itemId: string) => string | undefined;
  usedItemIds: Set<string>;
  onPlace: (item: WardrobeItem) => void;
  onAddPieces: () => void;
}

export function Palette({ items, srcFor, usedItemIds, onPlace, onAddPieces }: PaletteProps) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<CategoryId | "all">("all");

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.category !== filter) return false;
      if (!needle) return true;
      return `${item.name} ${item.brand ?? ""} ${item.category}`.toLowerCase().includes(needle);
    });
  }, [items, query, filter]);

  const available = React.useMemo(
    () => CATEGORIES.filter((meta) => items.some((item) => item.category === meta.id)),
    [items],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r bg-card/40">
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Wardrobe</h2>
          <Button size="icon-sm" variant="ghost" onClick={onAddPieces} aria-label="Add pieces">
            <Plus />
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-8 pl-8"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as CategoryId | "all")}>
          <SelectTrigger size="sm" className="w-full" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {available.map((meta) => (
              <SelectItem key={meta.id} value={meta.id}>
                {meta.plural}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {visible.length ? (
          <div className="grid grid-cols-2 gap-2">
            {visible.map((item) => {
              const src = srcFor(item.id);
              const meta = category(item.category);
              const used = usedItemIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(ITEM_DRAG_TYPE, item.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onDoubleClick={() => onPlace(item)}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border text-left transition-all hover:border-foreground/30 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    used ? "border-primary/40 bg-primary/5" : "bg-background",
                  )}
                  title={`${item.name} — double-click to place, or drag onto the board`}
                >
                  <div className="checker aspect-square">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={item.name}
                        draggable={false}
                        className="size-full object-contain p-2"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <meta.icon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="truncate border-t px-2 py-1 text-[11px] text-muted-foreground group-hover:text-foreground">
                    {item.name}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Shirt className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {items.length ? "No pieces match." : "Add pieces to your wardrobe first."}
            </p>
            {items.length ? null : (
              <Button size="sm" variant="outline" onClick={onAddPieces}>
                <Plus /> Add pieces
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="border-t px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Double-click</span> to auto-place by category,
        or <span className="font-medium text-foreground">drag</span> onto the board.
      </p>
    </div>
  );
}
