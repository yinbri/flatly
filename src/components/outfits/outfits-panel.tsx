"use client";

import * as React from "react";
import { Copy, Download, Frame, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canvasToBlob, downloadBlob, renderOutfit, slugify } from "@/lib/image";
import { useWardrobe } from "@/lib/store";
import type { Outfit } from "@/lib/types";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function OutfitsPanel({
  onOpen,
  onStartNew,
}: {
  onOpen: (outfit: Outfit) => void;
  onStartNew: () => void;
}) {
  const { outfits, itemsById, srcFor, saveOutfit, removeOutfit } = useWardrobe();
  const [pendingDelete, setPendingDelete] = React.useState<Outfit | null>(null);

  const resolve = React.useCallback(
    (itemId: string) => {
      const item = itemsById.get(itemId);
      const src = item ? srcFor(item.id) : undefined;
      return item && src ? { item, src } : null;
    },
    [itemsById, srcFor],
  );

  const exportOutfit = async (outfit: Outfit) => {
    try {
      const canvas = await renderOutfit({
        layers: outfit.layers,
        resolve,
        background: outfit.background,
        scale: 2,
      });
      downloadBlob(await canvasToBlob(canvas), `${slugify(outfit.name)}.png`);
      toast.success("PNG exported.");
    } catch {
      toast.error("Export failed — one of the images could not be read.");
    }
  };

  const duplicate = async (outfit: Outfit) => {
    const copy: Outfit = {
      ...outfit,
      id: uid(),
      name: `${outfit.name} copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveOutfit(copy);
    toast.success("Outfit duplicated.");
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      {outfits.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {outfits.map((outfit) => (
            <div
              key={outfit.id}
              className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-foreground/25 hover:shadow-sm"
            >
              <button
                type="button"
                onClick={() => onOpen(outfit)}
                className="relative block aspect-[5/7] w-full overflow-hidden"
                style={{ background: outfit.background }}
                title="Open in the studio"
              >
                {outfit.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={outfit.thumbnail}
                    alt={outfit.name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-xs text-neutral-500">
                    No preview
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2 border-t p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{outfit.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {outfit.layers.length} {outfit.layers.length === 1 ? "piece" : "pieces"} ·{" "}
                    {formatter.format(outfit.updatedAt)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label={`Options for ${outfit.name}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpen(outfit)}>
                      <Pencil /> Open in studio
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void exportOutfit(outfit)}>
                      <Download /> Export PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void duplicate(outfit)}>
                      <Copy /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setPendingDelete(outfit)}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Frame className="size-6" />
          </div>
          <div>
            <p className="font-medium">No outfits yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Build a flat lay in the Studio and save it — it will show up here.
            </p>
          </div>
          <Button onClick={onStartNew}>Open the studio</Button>
        </div>
      )}

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The layout is deleted. The pieces stay in your wardrobe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                await removeOutfit(pendingDelete.id);
                setPendingDelete(null);
                toast.success("Outfit deleted.");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
