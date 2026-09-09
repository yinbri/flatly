"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FlipHorizontal,
  Layers,
  RotateCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { category } from "@/lib/categories";
import { BACKGROUNDS, type WardrobeItem } from "@/lib/types";
import type { Board } from "@/lib/use-board";
import type { ReferenceView } from "@/lib/use-reference";

interface InspectorProps {
  board: Board;
  itemsById: Map<string, WardrobeItem>;
  srcFor: (itemId: string) => string | undefined;
  reference: ReferenceView;
}

export function Inspector({ board, itemsById, srcFor, reference }: InspectorProps) {
  const sliding = React.useRef(false);
  const selected = board.selected;
  const selectedItem = selected ? itemsById.get(selected.itemId) : undefined;

  const live = (apply: () => void) => {
    if (!sliding.current) {
      sliding.current = true;
      board.beginGesture();
    }
    apply();
  };
  const endSlide = () => {
    sliding.current = false;
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l bg-card/40">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected && selectedItem ? (
          <div className="space-y-4 p-3">
            <div className="flex items-center gap-3">
              <div className="checker size-12 shrink-0 overflow-hidden rounded-md border">
                {srcFor(selectedItem.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={srcFor(selectedItem.id)}
                    alt=""
                    className="size-full object-contain p-1"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selectedItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {category(selectedItem.category).label}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Size</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {Math.round(selected.w)}
                </span>
              </div>
              <Slider
                min={48}
                max={1200}
                step={2}
                value={[selected.w]}
                onValueChange={([value]) =>
                  live(() => board.updateLayer(selected.id, { w: value }, { history: false }))
                }
                onValueCommit={endSlide}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rotation</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {selected.rotation}°
                </span>
              </div>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={[selected.rotation]}
                onValueChange={([value]) =>
                  live(() => board.updateLayer(selected.id, { rotation: value }, { history: false }))
                }
                onValueCommit={endSlide}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => board.updateLayer(selected.id, { flipX: !selected.flipX })}
              >
                <FlipHorizontal /> Flip
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => board.updateLayer(selected.id, { rotation: 0 })}
              >
                <RotateCw /> Straighten
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => board.snapLayer(selected.id, itemsById)}
              >
                <Wand2 /> Snap to slot
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => board.duplicateLayer(selected.id, itemsById)}
              >
                <Copy /> Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => board.reorder(selected.id, "up")}
              >
                <ArrowUp /> Forward
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => board.reorder(selected.id, "down")}
              >
                <ArrowDown /> Back
              </Button>
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => board.removeLayer(selected.id)}
            >
              <Trash2 /> Remove from board
            </Button>
          </div>
        ) : (
          <div className="space-y-1 p-3 text-xs text-muted-foreground">
            <p className="text-sm font-medium text-foreground">Nothing selected</p>
            <p>Click a piece on the board to resize, rotate or restack it.</p>
          </div>
        )}

        <Separator />

        <div className="space-y-3 p-3">
          <Label className="text-xs">Background</Label>
          <div className="flex flex-wrap gap-2">
            {BACKGROUNDS.map((option) => (
              <Tooltip key={option.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={option.label}
                    onClick={() => board.setBackground(option.value)}
                    style={{ background: option.value }}
                    className={cn(
                      "size-7 rounded-full border transition-transform hover:scale-110",
                      board.background === option.value
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "",
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>{option.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {reference.id ? (
          <>
            <Separator />
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="size-3.5" /> Reference
                </Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {Math.round(reference.opacity * 100)}%
                </span>
              </div>
              <div className="checker overflow-hidden rounded-md border">
                {srcFor(reference.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={srcFor(reference.id)} alt="" className="max-h-28 w-full object-contain" />
                ) : null}
              </div>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[reference.opacity]}
                onValueChange={([value]) => reference.setOpacity(value)}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => reference.select(null)}
              >
                Hide reference
              </Button>
            </div>
          </>
        ) : null}

        <Separator />

        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs">
              <Layers className="size-3.5" /> Layers
            </Label>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {board.layers.length}
            </span>
          </div>
          {board.layers.length ? (
            <ul className="space-y-1">
              {[...board.layers]
                .sort((a, b) => b.z - a.z)
                .map((layer) => {
                  const item = itemsById.get(layer.itemId);
                  const src = item ? srcFor(item.id) : undefined;
                  return (
                    <li key={layer.id}>
                      <button
                        type="button"
                        onClick={() => board.select(layer.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                          layer.id === board.selectedId
                            ? "border-primary/50 bg-primary/5"
                            : "border-transparent hover:bg-muted",
                        )}
                      >
                        <span className="checker size-6 shrink-0 overflow-hidden rounded border">
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt="" className="size-full object-contain" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {item?.name ?? "Missing piece"}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No pieces on the board yet.</p>
          )}
        </div>
      </div>

      <div className="border-t p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!board.layers.length}
          onClick={board.clear}
        >
          <Trash2 /> Clear board
        </Button>
      </div>
    </div>
  );
}
