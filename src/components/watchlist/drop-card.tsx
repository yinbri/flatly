"use client";

import * as React from "react";
import { Bookmark, ExternalLink, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brandOrPlaceholder } from "@/lib/brands";
import { category } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Score } from "@/lib/taste";
import type { Drop } from "@/lib/types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function ago(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < HOUR) return `${Math.max(1, Math.round(delta / MINUTE))}m`;
  if (delta < DAY) return `${Math.round(delta / HOUR)}h`;
  if (delta < 7 * DAY) return `${Math.round(delta / DAY)}d`;
  return `${Math.round(delta / (7 * DAY))}w`;
}

function price(drop: Drop): string | null {
  if (drop.price == null) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: drop.currency ?? "USD",
    maximumFractionDigits: drop.price % 1 ? 2 : 0,
  }).format(drop.price);
}

/** The match number carries the eye, so it earns colour only once it is worth acting on. */
function matchTone(value: number): string {
  if (value >= 75) return "bg-foreground text-background";
  if (value >= 55) return "bg-secondary text-secondary-foreground";
  return "bg-muted text-muted-foreground";
}

export function DropCard({
  drop,
  score,
  onSave,
  onDismiss,
  onAdd,
  adding,
}: {
  drop: Drop;
  score: Score;
  onSave: () => void;
  onDismiss: () => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const store = brandOrPlaceholder(drop.brandId);
  const meta = category(drop.category);
  const Icon = meta.icon;
  const amount = price(drop);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-foreground/25 hover:shadow-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {drop.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={drop.imageUrl}
            alt={drop.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          // No photograph, so the swatches read off the drop stand in for one.
          <div className="flex size-full">
            {(drop.colors.length ? drop.colors : ["#d8d5d0"]).map((hex, index) => (
              <span key={`${hex}-${index}`} className="flex-1" style={{ background: hex }} />
            ))}
            <Icon className="absolute inset-0 m-auto size-7 text-background/70 mix-blend-overlay" />
          </div>
        )}

        <span
          className={cn(
            "absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            matchTone(score.value),
          )}
          title="How well this matches your taste profile"
        >
          {score.value}
        </span>

        {drop.origin === "sample" ? (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Sample
          </Badge>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex translate-y-2 gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          {drop.url ? (
            <Button size="sm" className="flex-1" asChild>
              <a href={drop.url} target="_blank" rel="noreferrer noopener">
                <ExternalLink /> Open
              </a>
            </Button>
          ) : null}
          {drop.imageUrl ? (
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={onAdd}
              disabled={adding}
              aria-label="Add to wardrobe"
              title="Add to wardrobe"
            >
              <Plus />
            </Button>
          ) : null}
          <Button
            size="icon-sm"
            variant={drop.saved ? "default" : "secondary"}
            onClick={onSave}
            aria-label={drop.saved ? "Unsave" : "Save"}
            title={drop.saved ? "Saved" : "Save"}
          >
            <Bookmark />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={onDismiss}
            aria-label="Not for me"
            title="Not for me"
          >
            <X />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 border-t p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono font-medium tracking-tight text-foreground">
            {store.ticker}
          </span>
          <span>·</span>
          <span className="tabular-nums">{ago(drop.publishedAt)}</span>
          {amount ? (
            <>
              <span>·</span>
              <span className="tabular-nums">{amount}</span>
            </>
          ) : null}
        </div>
        <p className="truncate text-sm font-medium" title={drop.title}>
          {drop.title}
        </p>
        {score.reasons.length ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {score.reasons.slice(0, 2).join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
