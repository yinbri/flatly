"use client";

import * as React from "react";
import { Check, ExternalLink, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BRANDS } from "@/lib/brands";
import { useWatchlist } from "@/lib/watchlist";
import { PRICE_BANDS, STYLE_TAGS } from "@/lib/types";

export function AddStoreDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { subscriptions, follow, unfollow } = useWatchlist();
  const [query, setQuery] = React.useState("");
  const following = React.useMemo(
    () => new Set(subscriptions.map((sub) => sub.brandId)),
    [subscriptions],
  );

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return BRANDS;
    return BRANDS.filter((store) =>
      [store.name, store.ticker, ...store.tags].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Follow a store</DialogTitle>
          <DialogDescription>
            Followed stores sit on your watchlist and their releases land in the feed.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stores or a look"
            className="pl-8"
          />
        </div>

        <ScrollArea className="-mx-1 h-80 px-1">
          <div className="space-y-1">
            {visible.map((store) => {
              const active = following.has(store.id);
              return (
                <div
                  key={store.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                >
                  <span className="w-12 shrink-0 font-mono text-xs font-medium tracking-tight">
                    {store.ticker}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{store.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {PRICE_BANDS.find((band) => band.id === store.price)?.label} ·{" "}
                      {store.tags
                        .map((tag) => STYLE_TAGS.find((meta) => meta.id === tag)?.label ?? tag)
                        .join(", ")}
                    </p>
                  </div>
                  {store.newArrivals || store.site ? (
                    <Button size="icon-sm" variant="ghost" asChild>
                      <a
                        href={store.newArrivals ?? store.site}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Open ${store.name}`}
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant={active ? "secondary" : "outline"}
                    onClick={() => void (active ? unfollow(store.id) : follow(store.id))}
                  >
                    {active ? (
                      <>
                        <Check /> Following
                      </>
                    ) : (
                      <>
                        <Plus /> Follow
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
            {visible.length ? null : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No store by that name. Clip a drop from anywhere instead — the store comes along
                with it.
              </p>
            )}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          <Badge variant="outline">Note</Badge> Following a store links to it and groups its
          releases. None of these retailers publish a public feed, so releases arrive by clipping
          or through a feed you attach yourself.
        </p>
      </DialogContent>
    </Dialog>
  );
}
