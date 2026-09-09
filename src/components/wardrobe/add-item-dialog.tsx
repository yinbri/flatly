"use client";

import * as React from "react";
import { ImagePlus, Link2, Loader2, Upload } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { useWardrobe } from "@/lib/store";
import type { CategoryId } from "@/lib/types";

const AUTO = "auto";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  const { addFromFile, addFromUrl } = useWardrobe();
  const [tab, setTab] = React.useState("upload");
  const [categoryChoice, setCategoryChoice] = React.useState<string>(AUTO);
  const [url, setUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [autoCutout, setAutoCutout] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const override = categoryChoice === AUTO ? undefined : (categoryChoice as CategoryId);

  const reset = () => {
    setUrl("");
    setName("");
    setBrand("");
    setCategoryChoice(AUTO);
  };

  const ingest = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!list.length) {
      toast.error("No images found in that drop.");
      return;
    }
    setBusy(true);
    let added = 0;
    let cutouts = 0;
    for (const file of list) {
      try {
        const item = await addFromFile(file, {
          category: override,
          name: list.length === 1 ? name : undefined,
          brand: brand || undefined,
          autoCutout,
        });
        added += 1;
        if (item.cutout) cutouts += 1;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not add ${file.name}.`);
      }
    }
    setBusy(false);
    if (added) {
      const headline = added === 1 ? "Piece added to your wardrobe." : `${added} pieces added.`;
      toast.success(
        cutouts ? `${headline} Background removed from ${cutouts}.` : headline,
      );
      reset();
      onOpenChange(false);
    }
  };

  const submitUrl = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const item = await addFromUrl(url, {
        category: override,
        name: name || undefined,
        brand: brand || undefined,
        autoCutout,
      });
      toast.success(
        !item.blobKey
          ? "Added, but the image could not be cached — it will need the internet."
          : item.cutout
            ? "Piece added, background removed."
            : "Piece added to your wardrobe.",
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That link could not be added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to wardrobe</DialogTitle>
          <DialogDescription>
            Transparent PNGs look best in a flat lay, but any image works.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              <Upload /> Upload
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1">
              <Link2 /> From link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") fileInput.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void ingest(event.dataTransfer.files);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-primary bg-muted" : "hover:bg-muted/60",
              )}
            >
              {busy ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Drop images here</p>
                <p className="text-xs text-muted-foreground">
                  or click to browse — several at once is fine
                </p>
              </div>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files?.length) void ingest(event.target.files);
                event.target.value = "";
              }}
            />
          </TabsContent>

          <TabsContent value="link" className="mt-4">
            <form id="add-by-link" onSubmit={submitUrl} className="space-y-2">
              <Label htmlFor="item-url">Image URL</Label>
              <Input
                id="item-url"
                placeholder="https://…/sneaker.png"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                autoComplete="off"
                required
              />
              <p className="text-xs text-muted-foreground">
                Link straight to the image file. It is downloaded and stored on this device when the
                host allows it.
              </p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-category">Category</Label>
            <Select value={categoryChoice} onValueChange={setCategoryChoice}>
              <SelectTrigger id="item-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Auto-detect</SelectItem>
                {CATEGORIES.map((meta) => (
                  <SelectItem key={meta.id} value={meta.id}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-brand">Brand (optional)</Label>
            <Input
              id="item-brand"
              placeholder="Margiela"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="auto-cutout">Cut out plain backgrounds</Label>
              <p className="text-xs text-muted-foreground">
                White or single-colour backdrops are made transparent and the empty margin
                trimmed. The original is kept, so this can be undone.
              </p>
            </div>
            <Switch id="auto-cutout" checked={autoCutout} onCheckedChange={setAutoCutout} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="item-name">Name (optional)</Label>
            <Input
              id="item-name"
              placeholder="Left blank, the file name is used"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>

        {tab === "link" ? (
          <DialogFooter>
            <Button type="submit" form="add-by-link" disabled={busy || !url.trim()}>
              {busy ? <Loader2 className="animate-spin" /> : <Link2 />} Add piece
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
