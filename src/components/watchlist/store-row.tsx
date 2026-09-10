"use client";

import * as React from "react";
import { BellOff, ExternalLink, MoreHorizontal, Rss, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brandOrPlaceholder } from "@/lib/brands";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/lib/watchlist";
import { PRICE_BANDS, type Drop, type Subscription } from "@/lib/types";

const WEEK = 7 * 86_400_000;
const WEEKS = 6;

/** Drops per week, oldest first. Just counts — nothing is smoothed or invented. */
function weekly(drops: Drop[]): number[] {
  const now = Date.now();
  const buckets = new Array<number>(WEEKS).fill(0);
  for (const drop of drops) {
    const index = WEEKS - 1 - Math.floor((now - drop.publishedAt) / WEEK);
    if (index >= 0 && index < WEEKS) buckets[index] += 1;
  }
  return buckets;
}

function Sparkline({ values }: { values: number[] }) {
  const peak = Math.max(1, ...values);
  return (
    <span className="flex h-4 items-end gap-px" aria-hidden>
      {values.map((value, index) => (
        <span
          key={index}
          className={cn("w-1 rounded-xs", value ? "bg-foreground/40" : "bg-muted-foreground/25")}
          style={{ height: `${Math.max(12, (value / peak) * 100)}%`, minHeight: 2 }}
        />
      ))}
    </span>
  );
}

function statusLabel(subscription: Subscription, hasFeed: boolean): string {
  if (!hasFeed) return "no feed";
  switch (subscription.lastStatus) {
    case "ok":
      return "live";
    case "blocked":
      return "blocked";
    case "empty":
      return "empty";
    case "error":
      return "unreadable";
    default:
      return "not pulled";
  }
}

export function StoreRow({
  subscription,
  drops,
  active,
  onSelect,
}: {
  subscription: Subscription;
  drops: Drop[];
  active: boolean;
  onSelect: () => void;
}) {
  const { unfollow, updateSubscription, refresh, refreshing } = useWatchlist();
  const store = brandOrPlaceholder(subscription.brandId);
  const [attaching, setAttaching] = React.useState(false);
  const [draft, setDraft] = React.useState(subscription.feedUrl ?? "");

  const mine = React.useMemo(
    () => drops.filter((drop) => drop.brandId === subscription.brandId),
    [drops, subscription.brandId],
  );
  const counts = React.useMemo(() => weekly(mine), [mine]);
  const feedUrl = subscription.feedUrl ?? store.feed;
  const band = PRICE_BANDS.find((entry) => entry.id === store.price)?.label ?? "";

  const saveFeed = async () => {
    await updateSubscription(subscription.brandId, { feedUrl: draft.trim() || undefined });
    setAttaching(false);
    if (draft.trim()) {
      await refresh(subscription.brandId);
      toast.success(`Pulled ${store.name}.`);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60",
        subscription.muted && "opacity-55",
      )}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium tracking-tight">{store.ticker}</span>
          <span className="truncate text-sm">{store.name}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{mine.length}</span>
          <span>{mine.length === 1 ? "drop" : "drops"}</span>
          <span>·</span>
          <span>{band}</span>
          <span>·</span>
          <span>{statusLabel(subscription, Boolean(feedUrl))}</span>
        </span>
      </button>

      <Sparkline values={counts} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-xs"
            variant="ghost"
            className="lg:opacity-0 lg:group-hover:opacity-100 lg:aria-expanded:opacity-100"
            aria-label={`Options for ${store.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {store.newArrivals ? (
            <DropdownMenuItem asChild>
              <a href={store.newArrivals} target="_blank" rel="noreferrer noopener">
                <ExternalLink /> New arrivals
              </a>
            </DropdownMenuItem>
          ) : null}
          {store.site ? (
            <DropdownMenuItem asChild>
              <a href={store.site} target="_blank" rel="noreferrer noopener">
                <ExternalLink /> Open store
              </a>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setAttaching(true)}>
            <Rss /> {subscription.feedUrl ? "Change feed" : "Attach a feed"}
          </DropdownMenuItem>
          {feedUrl ? (
            <DropdownMenuItem
              disabled={refreshing.has(subscription.brandId)}
              onSelect={() => void refresh(subscription.brandId)}
            >
              <Rss /> Pull now
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              void updateSubscription(subscription.brandId, { muted: !subscription.muted })
            }
          >
            <BellOff /> {subscription.muted ? "Unmute" : "Mute"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void unfollow(subscription.brandId);
              toast.success(`Unfollowed ${store.name}.`);
            }}
          >
            <Trash2 /> Unfollow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={attaching} onOpenChange={setAttaching}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach a feed to {store.name}</DialogTitle>
            <DialogDescription>
              An RSS or Atom URL, or a Shopify <code>products.json</code> endpoint. Most large
              retailers publish neither and block the browser from reading their pages, so this
              works best for smaller stores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`feed-${store.id}`} className="text-xs">
              Feed URL
            </Label>
            <Input
              id={`feed-${store.id}`}
              value={draft}
              placeholder="https://store.example/collections/new/products.json"
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAttaching(false)}>
              Cancel
            </Button>
            <Button onClick={saveFeed}>Save and pull</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
