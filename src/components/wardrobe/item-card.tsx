"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Sparkles, Trash2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { category } from "@/lib/categories";
import type { WardrobeItem } from "@/lib/types";

interface ItemCardProps {
  item: WardrobeItem;
  src?: string;
  onPlace: (item: WardrobeItem) => void;
  onEdit: (item: WardrobeItem) => void;
  onDelete: (item: WardrobeItem) => void;
}

export function ItemCard({ item, src, onPlace, onEdit, onDelete }: ItemCardProps) {
  const meta = category(item.category);
  const Icon = meta.icon;
  const hotlinked = !item.blobKey && Boolean(item.remoteUrl);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-foreground/25 hover:shadow-sm"
      onDoubleClick={() => onPlace(item)}
      title="Double-click to place on the board"
    >
      <div className="checker relative aspect-square overflow-hidden">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={item.name}
            draggable={false}
            className="absolute inset-0 size-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Icon className="size-6 opacity-40" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center gap-1 p-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <Button size="sm" className="flex-1" onClick={() => onPlace(item)}>
            <Sparkles /> Place
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="secondary" aria-label={`Options for ${item.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onPlace(item)}>
                <Sparkles /> Place on board
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(item)}>
                <Pencil /> Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>
                <Trash2 /> Delete piece
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hotlinked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-md bg-background/80 text-muted-foreground backdrop-blur">
                <Unlink className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Hotlinked — the source blocked caching, so it needs the internet and may not export.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <div className="flex items-start gap-2 border-t p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">{item.brand || meta.label}</p>
        </div>
        <Badge variant="secondary" className={cn("shrink-0 gap-1")}>
          <Icon className="size-3" />
          {meta.label}
        </Badge>
      </div>
    </div>
  );
}
