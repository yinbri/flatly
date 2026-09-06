"use client";

import * as React from "react";
import { ImagePlus, Plus, Search, Shirt, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { CATEGORIES } from "@/lib/categories";
import { useWardrobe } from "@/lib/store";
import type { CategoryId, WardrobeItem } from "@/lib/types";
import { AddItemDialog } from "./add-item-dialog";
import { EditItemDialog } from "./edit-item-dialog";
import { ItemCard } from "./item-card";

type SortKey = "recent" | "name" | "category";

export function WardrobePanel({ onPlace }: { onPlace: (item: WardrobeItem) => void }) {
  const { items, ready, srcFor, removeItem, addFromFile } = useWardrobe();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<CategoryId | "all">("all");
  const [sort, setSort] = React.useState<SortKey>("recent");
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<WardrobeItem | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<WardrobeItem | null>(null);
  const [dropping, setDropping] = React.useState(false);
  const dragDepth = React.useRef(0);

  const counts = React.useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const item of items) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, [items]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (filter !== "all" && item.category !== filter) return false;
      if (!needle) return true;
      return [item.name, item.brand, item.notes, item.category]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
    const sorted = [...filtered];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "category")
      sorted.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    else sorted.sort((a, b) => b.createdAt - a.createdAt);
    return sorted;
  }, [items, query, filter, sort]);

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDropping(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!files.length) return;
    let added = 0;
    for (const file of files) {
      try {
        await addFromFile(file);
        added += 1;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not add ${file.name}.`);
      }
    }
    if (added) toast.success(added === 1 ? "Piece added." : `${added} pieces added.`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await removeItem(pendingDelete.id);
    toast.success(`Removed ${pendingDelete.name}.`);
    setPendingDelete(null);
  };

  return (
    <div
      className="relative flex h-full flex-col"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepth.current += 1;
        setDropping(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDropping(false);
      }}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pieces, brands, notes…"
            className="pl-8"
          />
          {query ? (
            <Button
              size="icon-xs"
              variant="ghost"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X />
            </Button>
          ) : null}
        </div>

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-36" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Newest first</SelectItem>
            <SelectItem value="name">By name</SelectItem>
            <SelectItem value="category">By category</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setAdding(true)}>
          <Plus /> Add pieces
        </Button>
      </div>

      <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b px-4 py-2 sm:px-6">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={items.length}>
          Everything
        </FilterChip>
        {CATEGORIES.filter((meta) => counts.get(meta.id)).map((meta) => (
          <FilterChip
            key={meta.id}
            active={filter === meta.id}
            onClick={() => setFilter(meta.id)}
            count={counts.get(meta.id) ?? 0}
          >
            <meta.icon className="size-3.5" />
            {meta.plural}
          </FilterChip>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {!ready ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : visible.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                src={srcFor(item.id)}
                onPlace={onPlace}
                onEdit={setEditing}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        ) : items.length ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title="Nothing matches"
            body="Try another search term, or switch back to Everything."
          />
        ) : (
          <EmptyState
            icon={<Shirt className="size-6" />}
            title="Your wardrobe is empty"
            body="Add cut-out PNGs of your clothes, then style them into flat lays in the Studio."
            action={
              <Button onClick={() => setAdding(true)}>
                <ImagePlus /> Add your first piece
              </Button>
            }
          />
        )}
      </div>

      {dropping ? (
        <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-background/85 backdrop-blur-sm">
          <div className="text-center">
            <ImagePlus className="mx-auto size-7" />
            <p className="mt-2 text-sm font-medium">Drop to add to your wardrobe</p>
          </div>
        </div>
      ) : null}

      <AddItemDialog open={adding} onOpenChange={setAdding} />
      <EditItemDialog item={editing} onOpenChange={(open) => !open && setEditing(null)} />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The image is removed from this device and from any saved outfits that used it. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      <span className={cn("tabular-nums", active ? "opacity-70" : "opacity-60")}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
