"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, category } from "@/lib/categories";
import { SUGGESTED_RELAY } from "@/lib/feeds";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/lib/watchlist";
import { COLOR_FAMILIES, STYLE_TAGS, type CategoryId, type StyleTagId } from "@/lib/types";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function TasteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { settings, updateSettings, profile, reading } = useWatchlist();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your taste</DialogTitle>
          <DialogDescription>
            Match scores come from the colours in your own pieces and boards, what your wardrobe is
            short of, and the answers below. Nothing leaves this device.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-6 max-h-[60dvh] px-6">
          <div className="space-y-6 pb-1">
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">What it reads</h3>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {reading
                    ? "reading images…"
                    : `${profile.read.items} pieces · ${profile.read.references} references`}
                </p>
              </div>

              {profile.palette.length ? (
                <div className="flex h-8 overflow-hidden rounded-lg border">
                  {profile.palette.map((swatch) => (
                    <span
                      key={swatch.hex}
                      style={{ background: swatch.hex, flexGrow: swatch.weight }}
                      title={swatch.hex}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  Add pieces to the wardrobe or images to inspiration and your palette appears here.
                </p>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Weight of your wardrobe</Label>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {Math.round(settings.fromWardrobe * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.fromWardrobe * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([value]) => void updateSettings({ fromWardrobe: value / 100 })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Weight of your inspiration board</Label>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {Math.round(settings.fromInspiration * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.fromInspiration * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([value]) => void updateSettings({ fromInspiration: value / 100 })}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-medium">What you are after</h3>

              <div className="space-y-2">
                <Label className="text-xs">Shopping for</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((meta) => (
                    <Chip
                      key={meta.id}
                      active={settings.wants.includes(meta.id)}
                      onClick={() =>
                        void updateSettings({
                          wants: toggle<CategoryId>(settings.wants, meta.id),
                        })
                      }
                    >
                      {meta.label}
                    </Chip>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty and everything is fair game.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <Label htmlFor="fill-gaps" className="text-sm">
                    Favour the gaps
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {profile.gaps.length
                      ? `Right now that means ${profile.gaps
                          .map((id) => category(id).plural.toLowerCase())
                          .join(", ")}.`
                      : "Lift categories your wardrobe is short of."}
                  </p>
                </div>
                <Switch
                  id="fill-gaps"
                  checked={settings.fillGaps}
                  onCheckedChange={(checked) => void updateSettings({ fillGaps: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Styles</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAGS.map((tag) => (
                    <Chip
                      key={tag.id}
                      active={settings.styles.includes(tag.id)}
                      onClick={() =>
                        void updateSettings({
                          styles: toggle<StyleTagId>(settings.styles, tag.id),
                        })
                      }
                    >
                      {tag.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Colours you actually wear</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_FAMILIES.map((family) => (
                    <Chip
                      key={family.id}
                      active={settings.colors.includes(family.hex)}
                      onClick={() =>
                        void updateSettings({
                          colors: toggle<string>(settings.colors, family.hex),
                        })
                      }
                    >
                      <span
                        className="size-3 rounded-full border border-black/10"
                        style={{ background: family.hex }}
                      />
                      {family.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-price" className="text-xs">
                  Ceiling per piece <span className="text-muted-foreground">optional</span>
                </Label>
                <Input
                  id="max-price"
                  inputMode="decimal"
                  className="w-32 tabular-nums"
                  value={settings.maxPrice ?? ""}
                  placeholder="150"
                  onChange={(event) => {
                    const value = Number(event.target.value.replace(/[^0-9.]/g, ""));
                    void updateSettings({
                      maxPrice: Number.isFinite(value) && value > 0 ? value : undefined,
                    });
                  }}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-medium">Feeds</h3>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <Label htmlFor="samples" className="text-sm">
                    Show sample drops
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ten invented releases, badged as such, so an empty feed still shows what it
                    does.
                  </p>
                </div>
                <Switch
                  id="samples"
                  checked={settings.showSamples}
                  onCheckedChange={(checked) => void updateSettings({ showSamples: checked })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="relay" className="text-xs">
                  Relay for feeds that block the browser
                </Label>
                <Input
                  id="relay"
                  value={settings.relay ?? ""}
                  placeholder={SUGGESTED_RELAY}
                  onChange={(event) => void updateSettings({ relay: event.target.value.trim() })}
                />
                <p className="text-xs text-muted-foreground">
                  Off by default. A relay is somebody else&apos;s server: turn it on and the feed
                  URLs you pull travel through them. <code>{"{url}"}</code> is replaced with the
                  encoded feed address.
                </p>
                {settings.relay ? null : (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => void updateSettings({ relay: SUGGESTED_RELAY })}
                  >
                    Use the suggested one
                  </Button>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
