"use client";

import * as React from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANDS, brandFromUrl } from "@/lib/brands";
import { CATEGORIES, guessCategory } from "@/lib/categories";
import { useWatchlist } from "@/lib/watchlist";
import type { CategoryId } from "@/lib/types";

/**
 * Clipping is how a release actually gets into the feed for a store that publishes nothing:
 * you are on the product page anyway, so paste the URL and it joins the watchlist scored.
 */
export function ClipDropDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { clip, subscriptions, follow } = useWatchlist();
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<CategoryId | "">("");
  const [busy, setBusy] = React.useState(false);

  const detected = React.useMemo(() => (url ? brandFromUrl(url) : undefined), [url]);
  const resolvedBrand = brandId || detected?.id || "";
  const resolvedCategory = categoryId || guessCategory(`${title} ${url}`);

  const reset = () => {
    setUrl("");
    setTitle("");
    setImageUrl("");
    setPrice("");
    setBrandId("");
    setCategoryId("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() && !title.trim()) {
      toast.error("A product URL or a name, at least.");
      return;
    }
    setBusy(true);
    try {
      const amount = Number(price.replace(/[^0-9.]/g, ""));
      await clip({
        url: url.trim(),
        brandId: resolvedBrand || undefined,
        title: title.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        price: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        category: resolvedCategory,
      });
      // A clip from a store you do not follow yet is a strong hint that you want to.
      if (resolvedBrand && !subscriptions.some((sub) => sub.brandId === resolvedBrand)) {
        await follow(resolvedBrand);
      }
      toast.success("Clipped to your feed.");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be clipped.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Clip a drop</DialogTitle>
            <DialogDescription>
              Paste a product URL. Add the image address too and its colours get read into the
              match score.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="clip-url" className="text-xs">
              Product URL
            </Label>
            <Input
              id="clip-url"
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.aritzia.com/us/en/product/..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clip-title" className="text-xs">
              Name
            </Label>
            <Input
              id="clip-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Wool-blend car coat"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clip-image" className="text-xs">
              Image URL <span className="text-muted-foreground">optional</span>
            </Label>
            <Input
              id="clip-image"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://…/product.jpg"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="clip-price" className="text-xs">
                Price
              </Label>
              <Input
                id="clip-price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="128"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Store</Label>
              <Select value={resolvedBrand} onValueChange={setBrandId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={resolvedCategory}
                onValueChange={(value) => setCategoryId(value as CategoryId)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((meta) => (
                    <SelectItem key={meta.id} value={meta.id}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Clip it
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
