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
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/categories";
import { useWardrobe } from "@/lib/store";
import type { CategoryId, WardrobeItem } from "@/lib/types";

interface EditItemDialogProps {
  item: WardrobeItem | null;
  onOpenChange: (open: boolean) => void;
}

export function EditItemDialog({ item, onOpenChange }: EditItemDialogProps) {
  const { updateItem, srcFor } = useWardrobe();
  const [name, setName] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<CategoryId>("other");

  React.useEffect(() => {
    if (!item) return;
    setName(item.name);
    setBrand(item.brand ?? "");
    setNotes(item.notes ?? "");
    setCategoryId(item.category);
  }, [item]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;
    await updateItem(item.id, {
      name: name.trim() || item.name,
      brand: brand.trim() || undefined,
      notes: notes.trim() || undefined,
      category: categoryId,
    });
    toast.success("Piece updated.");
    onOpenChange(false);
  };

  const src = item ? srcFor(item.id) : undefined;

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit piece</DialogTitle>
          <DialogDescription>
            Category decides where a double click drops it on the board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="flex gap-4">
            <div className="checker size-24 shrink-0 overflow-hidden rounded-lg border">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="size-full object-contain p-2" />
              ) : null}
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {item ? `${item.width} × ${item.height} px` : null}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value as CategoryId)}>
                <SelectTrigger id="edit-category" className="w-full">
                  <SelectValue />
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
            <div className="space-y-2">
              <Label htmlFor="edit-brand">Brand</Label>
              <Input
                id="edit-brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              rows={3}
              placeholder="Fit, styling, where it came from…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
