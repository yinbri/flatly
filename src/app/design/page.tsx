"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES } from "@/lib/categories";
import { BACKGROUNDS, CANVAS_H, CANVAS_W } from "@/lib/types";

/**
 * The live style guide, at /design.
 *
 * Everything here renders through the real components and the real tokens — the swatches
 * come from BACKGROUNDS, the button heights from the Button variants, the radii from the
 * `--radius` chain in globals.css. Change a token and this page changes with it, which is
 * the whole reason it exists in the app rather than in a markdown file.
 */

const TYPE_SCALE = [
  { className: "text-[10px]", size: "10px", specimen: "missing image", where: "Canvas fallback label" },
  {
    className: "text-[11px]",
    size: "11px",
    specimen: "Double-click to auto-place by category",
    where: "Palette captions, hint bar",
  },
  { className: "text-xs", size: "12px", specimen: "8 pieces · 2 outfits", where: "Secondary text everywhere" },
  {
    className: "text-[0.8rem] font-medium",
    size: "12.8px",
    specimen: "Auto-arrange",
    where: "Small button label",
  },
  { className: "text-sm", size: "14px", specimen: "Baggy washed jeans", where: "Interface default" },
  {
    className: "text-[15px] font-semibold tracking-[-0.045em]",
    size: "15px",
    specimen: "flatly",
    where: "Wordmark only",
  },
  { className: "text-base", size: "16px", specimen: "Your wardrobe is empty", where: "Dialog titles, empty states" },
];

const ICON_SIZES = [
  { className: "size-3", size: "12px", where: "badges, chips" },
  { className: "size-3.5", size: "14px", where: "inline labels" },
  { className: "size-4", size: "16px", where: "the default" },
  { className: "size-5", size: "20px", where: "rare" },
  { className: "size-6", size: "24px", where: "empty states" },
  { className: "size-7", size: "28px", where: "drop overlays" },
];

const SPACING = [
  { className: "w-1", size: "4px", token: "gap-1", where: "icon to label, small buttons" },
  { className: "w-1.5", size: "6px", token: "gap-1.5", where: "icon to label, default buttons" },
  { className: "w-2", size: "8px", token: "gap-2", where: "the workhorse gap" },
  { className: "w-2.5", size: "10px", token: "px-2.5", where: "button side padding" },
  { className: "w-3", size: "12px", token: "p-3", where: "panel padding, card gutters" },
  { className: "w-4", size: "16px", token: "px-4", where: "page edge, small screens" },
  { className: "w-6", size: "24px", token: "px-6", where: "page edge, large screens" },
];

const RADII = [
  { className: "rounded-sm", token: "sm", size: "6px" },
  { className: "rounded-md", token: "md", size: "8px" },
  { className: "rounded-lg", token: "lg", size: "10px" },
  { className: "rounded-xl", token: "xl", size: "14px" },
  { className: "rounded-2xl", token: "2xl", size: "18px" },
  { className: "rounded-3xl", token: "3xl", size: "22px" },
  { className: "rounded-full", token: "full", size: "chips" },
];

const BUTTON_SIZES = [
  { size: "xs" as const, height: "24px", text: "12px", icon: "12px" },
  { size: "sm" as const, height: "28px", text: "12.8px", icon: "14px" },
  { size: "default" as const, height: "32px", text: "14px", icon: "16px" },
  { size: "lg" as const, height: "36px", text: "14px", icon: "16px" },
];

const DIMENSIONS = [
  { value: `${CANVAS_W} × ${CANVAS_H}`, label: "Artboard", note: "board coordinate space" },
  { value: `${CANVAS_W * 2} × ${CANVAS_H * 2}`, label: "PNG export", note: "rendered at 2×" },
  {
    value: `${Math.round(CANVAS_W * 0.28)} × ${Math.round(CANVAS_H * 0.28)}`,
    label: "Outfit thumbnail",
    note: "rendered at 0.28×",
  },
  { value: "56", label: "Header height", note: "h-14" },
  { value: "208 / 240", label: "Palette width", note: "13rem, 15rem at lg" },
  { value: "256", label: "Inspector width", note: "16rem, hidden below 1024" },
  { value: "1024", label: "Layout breakpoint", note: "inspector collapses below" },
  { value: "14", label: "Checkerboard", note: "transparency squares" },
];

function Section({
  index,
  title,
  note,
  children,
}: {
  index: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-2">
        <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {index}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{note}</span>
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="h-dvh overflow-y-auto bg-background">
      <div className="mx-auto max-w-4xl space-y-12 px-6 py-10">
        <header className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to the app
          </Link>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">UI scale</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Every size the interface uses, rendered through the real components and tokens. If a
            token changes, this page changes with it.
          </p>
        </header>

        <Section index="01 / Type" title="Type scale" note="7 sizes">
          <div className="divide-y">
            {TYPE_SCALE.map((entry) => (
              <div
                key={entry.className}
                className="grid grid-cols-[minmax(0,1fr)_120px_56px] items-center gap-4 py-3"
              >
                <span className={`${entry.className} truncate`}>{entry.specimen}</span>
                <span className="font-mono text-xs text-muted-foreground">{entry.className}</span>
                <span className="text-right font-mono text-xs tabular-nums">{entry.size}</span>
                <span className="col-span-3 -mt-2 text-xs text-muted-foreground">{entry.where}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section index="02 / Icons" title="Icon scale" note="one glyph, six sizes">
          <div className="flex flex-wrap items-end gap-10 pt-2">
            {ICON_SIZES.map((entry) => (
              <div key={entry.className} className="flex flex-col items-center gap-3">
                <Shirt className={entry.className} />
                <div className="text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
                  <span className="block text-foreground">{entry.size}</span>
                  {entry.className}
                  <span className="block">{entry.where}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section index="03 / Controls" title="Button sizes" note="the real component">
          <div className="divide-y">
            {BUTTON_SIZES.map((entry) => (
              <div key={entry.size} className="grid grid-cols-[200px_80px_1fr] items-center gap-4 py-4">
                <div>
                  <Button size={entry.size}>
                    <Plus /> Add pieces
                  </Button>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{entry.size}</span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {entry.height} tall · {entry.text} text · {entry.icon} icon
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[200px_80px_1fr] items-center gap-4 py-4">
              <div className="flex items-center gap-2.5">
                <Button size="icon-xs" variant="outline" aria-label="Extra small">
                  <Plus />
                </Button>
                <Button size="icon-sm" variant="outline" aria-label="Small">
                  <Plus />
                </Button>
                <Button size="icon" variant="outline" aria-label="Default">
                  <Plus />
                </Button>
                <Button size="icon-lg" variant="outline" aria-label="Large">
                  <Plus />
                </Button>
              </div>
              <span className="font-mono text-xs text-muted-foreground">icon-*</span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                24 · 28 · 32 · 36px square
              </span>
            </div>
          </div>
        </Section>

        <Section index="04 / Spacing" title="Spacing steps" note="4px base unit, drawn at true width">
          <div className="space-y-2.5 pt-1">
            {SPACING.map((entry) => (
              <div key={entry.token} className="flex items-center gap-3.5">
                <span className={`${entry.className} h-5 bg-primary`} />
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {entry.size} · {entry.token}
                </span>
                <span className="text-xs text-muted-foreground">{entry.where}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section index="05 / Radius" title="Corner radii" note="all derived from --radius: 0.625rem">
          <div className="flex flex-wrap gap-6 pt-1">
            {RADII.map((entry) => (
              <div key={entry.token} className="flex flex-col items-center gap-2.5">
                <div className={`size-16 border-2 border-primary bg-muted ${entry.className}`} />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {entry.token} · {entry.size}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section index="06 / Colour" title="Board backgrounds" note="from types.ts">
          <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3 lg:grid-cols-6">
            {BACKGROUNDS.map((option) => (
              <div key={option.id} className="space-y-2">
                <div
                  className="h-16 rounded-lg border"
                  style={{ background: option.value }}
                />
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{option.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section index="07 / Categories" title="Category icons" note="from categories.ts, drives auto-placement">
          <div className="flex flex-wrap gap-2 pt-1">
            {CATEGORIES.map((meta) => (
              <Badge key={meta.id} variant="secondary" className="gap-1">
                <meta.icon className="size-3" />
                {meta.plural}
              </Badge>
            ))}
          </div>
        </Section>

        <Section index="08 / Fixed" title="Dimensions that never scale" note="layout constants, in px">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
            {DIMENSIONS.map((entry) => (
              <div key={entry.label} className="bg-card p-4">
                <p className="font-mono text-base tabular-nums">{entry.value}</p>
                <p className="mt-1 text-xs">{entry.label}</p>
                <p className="text-[11px] text-muted-foreground">{entry.note}</p>
              </div>
            ))}
          </div>
        </Section>

        <Separator />
        <p className="pb-6 text-xs text-muted-foreground">
          Tailwind v4 · shadcn/ui (radix) · Inter Tight · Geist Mono for figures
        </p>
      </div>
    </main>
  );
}
