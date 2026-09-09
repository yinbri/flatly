"use client";

import * as React from "react";
import {
  Download,
  FilePlus2,
  Loader2,
  Redo2,
  Save,
  SlidersHorizontal,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { canvasToBlob, downloadBlob, renderOutfit, slugify } from "@/lib/image";
import { useWardrobe } from "@/lib/store";
import type { Outfit } from "@/lib/types";
import type { Board } from "@/lib/use-board";
import { useViewport } from "@/lib/use-viewport";
import { AddItemDialog } from "@/components/wardrobe/add-item-dialog";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { Palette } from "./palette";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function Studio({ board }: { board: Board }) {
  const { items, itemsById, srcFor, saveOutfit, outfits } = useWardrobe();
  const viewport = useViewport();
  const [busy, setBusy] = React.useState<"save" | "export" | null>(null);
  const [adding, setAdding] = React.useState(false);

  const usedItemIds = React.useMemo(
    () => new Set(board.layers.map((layer) => layer.itemId)),
    [board.layers],
  );

  const resolve = React.useCallback(
    (itemId: string) => {
      const item = itemsById.get(itemId);
      const src = item ? srcFor(item.id) : undefined;
      return item && src ? { item, src } : null;
    },
    [itemsById, srcFor],
  );

  const save = React.useCallback(async () => {
    if (!board.layers.length) {
      toast.error("Put something on the board first.");
      return;
    }
    setBusy("save");
    try {
      const existing = board.outfitId
        ? outfits.find((outfit) => outfit.id === board.outfitId)
        : undefined;
      let thumbnail: string | undefined;
      try {
        const canvas = await renderOutfit({
          layers: board.layers,
          resolve,
          background: board.background,
          scale: 0.28,
        });
        thumbnail = canvas.toDataURL("image/jpeg", 0.78);
      } catch {
        thumbnail = undefined;
      }
      const outfit: Outfit = {
        id: board.outfitId ?? uid(),
        name: board.name.trim() || "Untitled flat lay",
        layers: board.layers,
        background: board.background,
        thumbnail,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      await saveOutfit(outfit);
      board.markSaved(outfit.id, outfit.name);
      toast.success(existing ? "Outfit updated." : "Outfit saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this outfit.");
    } finally {
      setBusy(null);
    }
  }, [board, outfits, resolve, saveOutfit]);

  const exportPng = React.useCallback(async () => {
    if (!board.layers.length) {
      toast.error("Nothing to export yet.");
      return;
    }
    setBusy("export");
    try {
      const canvas = await renderOutfit({
        layers: board.layers,
        resolve,
        background: board.background,
        scale: 2,
      });
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, `${slugify(board.name)}.png`);
      toast.success("PNG exported.");
    } catch {
      toast.error(
        "Export failed. A hotlinked image blocked the download — re-add it as an upload.",
      );
    } finally {
      setBusy(null);
    }
  }, [board.layers, board.background, board.name, resolve]);

  // Keyboard shortcuts for the board.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      const selected = board.selectedId;

      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
        return;
      }
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) board.redo();
        else board.undo();
        return;
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        board.redo();
        return;
      }
      if (mod && event.key === "0") {
        event.preventDefault();
        viewport.fitToFrame();
        return;
      }
      if (mod && event.key === "1") {
        event.preventDefault();
        viewport.actualSize();
        return;
      }
      if (!selected) return;

      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        board.duplicateLayer(selected, itemsById);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        board.removeLayer(selected);
        return;
      }
      if (event.key === "Escape") {
        board.select(null);
        return;
      }
      if (event.key === "]") {
        board.reorder(selected, event.shiftKey ? "front" : "up");
        return;
      }
      if (event.key === "[") {
        board.reorder(selected, event.shiftKey ? "back" : "down");
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const layer = board.layers.find((entry) => entry.id === selected);
      if (!layer) return;
      const moves: Record<string, { x?: number; y?: number }> = {
        ArrowLeft: { x: layer.x - step },
        ArrowRight: { x: layer.x + step },
        ArrowUp: { y: layer.y - step },
        ArrowDown: { y: layer.y + step },
      };
      const patch = moves[event.key];
      if (patch) {
        event.preventDefault();
        board.updateLayer(selected, patch);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [board, itemsById, save, viewport]);

  const zoomPercent = Math.round(viewport.scale * 100);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Input
          value={board.name}
          onChange={(event) => board.setName(event.target.value)}
          aria-label="Outfit name"
          className="h-8 w-52 border-transparent bg-transparent font-medium shadow-none hover:border-border focus-visible:border-border"
        />
        {board.dirty ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">Unsaved</span>
        ) : null}

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton label="Undo (Ctrl+Z)" onClick={board.undo} disabled={!board.canUndo}>
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton label="Redo (Ctrl+Shift+Z)" onClick={board.redo} disabled={!board.canRedo}>
          <Redo2 />
        </ToolbarButton>

        <Button
          size="sm"
          variant="outline"
          onClick={() => board.arrange(itemsById)}
          disabled={board.layers.length < 2}
        >
          <Wand2 /> Auto-arrange
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-1">
          <ToolbarButton label="Zoom out" onClick={() => viewport.zoomBy(1 / 1.25)}>
            <ZoomOut />
          </ToolbarButton>
          <button
            type="button"
            onClick={viewport.fitToFrame}
            onDoubleClick={viewport.actualSize}
            className="w-12 rounded px-1 font-mono text-xs tabular-nums text-muted-foreground hover:text-foreground"
            title="Fit to window (Ctrl+0) — double-click for 100% (Ctrl+1)"
          >
            {zoomPercent}%
          </button>
          <ToolbarButton label="Zoom in" onClick={() => viewport.zoomBy(1.25)}>
            <ZoomIn />
          </ToolbarButton>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="lg:hidden">
                <SlidersHorizontal /> Panel
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="h-[70dvh] w-72 overflow-hidden p-0">
              <Inspector board={board} itemsById={itemsById} srcFor={srcFor} />
            </PopoverContent>
          </Popover>

          <Button size="sm" variant="ghost" onClick={board.startNew}>
            <FilePlus2 /> New
          </Button>
          <Button size="sm" variant="outline" onClick={exportPng} disabled={busy !== null}>
            {busy === "export" ? <Loader2 className="animate-spin" /> : <Download />} PNG
          </Button>
          <Button size="sm" onClick={save} disabled={busy !== null}>
            {busy === "save" ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[13rem_1fr] lg:grid-cols-[15rem_1fr_16rem]">
        <Palette
          items={items}
          srcFor={srcFor}
          usedItemIds={usedItemIds}
          onPlace={(item) => board.addItem(item, itemsById)}
          onAddPieces={() => setAdding(true)}
        />

        <Canvas
          layers={board.layers}
          itemsById={itemsById}
          srcFor={srcFor}
          background={board.background}
          selectedId={board.selectedId}
          viewport={viewport}
          onSelect={board.select}
          onBeginGesture={board.beginGesture}
          onUpdateLayer={board.updateLayer}
          onDropItem={(itemId, at) => {
            const item = itemsById.get(itemId);
            if (item) board.addItem(item, itemsById, at);
          }}
        />

        <div className="hidden min-h-0 lg:block">
          <Inspector board={board} itemsById={itemsById} srcFor={srcFor} />
        </div>
      </div>

      <AddItemDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
