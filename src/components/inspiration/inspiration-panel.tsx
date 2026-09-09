"use client";

import * as React from "react";
import { ExternalLink, ImagePlus, Layers, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useWardrobe } from "@/lib/store";
import { PINTEREST_SEARCHES, type Reference } from "@/lib/types";
import type { ReferenceView } from "@/lib/use-reference";
import { PinterestBoard } from "./pinterest-board";

const BOARD_KEY = "flatly:pinterest-board";

function isImageUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function InspirationPanel({
  reference,
  onUseInStudio,
}: {
  reference: ReferenceView;
  onUseInStudio: () => void;
}) {
  const { references, addReference, removeReference, srcFor } = useWardrobe();
  const [board, setBoard] = React.useState("");
  const [boardDraft, setBoardDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [dropping, setDropping] = React.useState(false);
  const [preview, setPreview] = React.useState<Reference | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(BOARD_KEY);
      if (saved) {
        setBoard(saved);
        setBoardDraft(saved);
      }
    } catch {
      // Private browsing; the board just will not be remembered.
    }
  }, []);

  const take = React.useCallback(
    async (sources: (File | string)[]) => {
      if (!sources.length) return;
      setBusy(true);
      let added = 0;
      let hotlinked = 0;
      for (const source of sources) {
        try {
          const saved = await addReference(source);
          added += 1;
          if (!saved.blobKey) hotlinked += 1;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "That image could not be saved.");
        }
      }
      setBusy(false);
      if (added) {
        toast.success(
          hotlinked
            ? `${added} saved — ${hotlinked} could not be cached and will need the internet.`
            : added === 1
              ? "Reference saved."
              : `${added} references saved.`,
        );
      }
    },
    [addReference],
  );

  // Paste an image or an image URL straight onto the page.
  React.useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length) {
        event.preventDefault();
        void take(files);
        return;
      }
      const text = event.clipboardData?.getData("text/plain")?.trim();
      if (text && isImageUrl(text)) {
        event.preventDefault();
        void take([text]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [take]);

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDropping(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length) {
      void take(files);
      return;
    }
    // Dragging a pin out of another tab hands over a URL rather than a file.
    const url =
      event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    const first = url.split(/[\r\n]+/).find((line) => isImageUrl(line));
    if (first) void take([first]);
  };

  const saveBoard = (event: React.FormEvent) => {
    event.preventDefault();
    const next = boardDraft.trim();
    setBoard(next);
    try {
      if (next) localStorage.setItem(BOARD_KEY, next);
      else localStorage.removeItem(BOARD_KEY);
    } catch {
      // Not remembered, but the board still shows for this session.
    }
  };

  return (
    <div
      className="relative min-h-0 flex-1 overflow-y-auto"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.length) return;
        dragDepth.current += 1;
        setDropping(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDropping(false);
      }}
      onDrop={onDrop}
    >
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Your references</h2>
              <p className="text-xs text-muted-foreground">
                Drag a pin in from another tab, paste an image or a URL, or upload one. Saved on
                this device like everything else.
              </p>
            </div>
            <Button size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
              <ImagePlus /> Add images
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files?.length) void take(Array.from(event.target.files));
                event.target.value = "";
              }}
            />
          </div>

          {references.length ? (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
              {references.map((entry) => {
                const src = srcFor(entry.id);
                const active = reference.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "group relative block break-inside-avoid overflow-hidden rounded-xl border bg-card transition-all hover:shadow-sm",
                      active ? "border-primary ring-2 ring-primary/30" : "hover:border-foreground/25",
                    )}
                  >
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => setPreview(entry)}
                      title="Open"
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={entry.name} className="w-full" loading="lazy" />
                      ) : (
                        <span className="block p-6 text-xs text-muted-foreground">
                          Image unavailable
                        </span>
                      )}
                    </button>

                    <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          reference.select(active ? null : entry.id);
                          if (!active) onUseInStudio();
                        }}
                      >
                        <Layers /> {active ? "In use" : "Trace"}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        aria-label={`Delete ${entry.name}`}
                        onClick={async () => {
                          if (reference.id === entry.id) reference.select(null);
                          await removeReference(entry.id);
                          toast.success("Reference deleted.");
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
              <Sparkles className="size-6 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No references yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Drag a flat lay in from a Pinterest tab, or press <kbd>Ctrl</kbd>+<kbd>V</kbd>{" "}
                  with an image on your clipboard.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">Browse Pinterest</h2>
            <p className="text-xs text-muted-foreground">
              Pinterest has no public search API, so browsing happens on their site. Point this at
              one of your boards to keep it alongside your work.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PINTEREST_SEARCHES.map((query) => (
              <a
                key={query}
                href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {query} <ExternalLink className="size-3" />
              </a>
            ))}
          </div>

          <form onSubmit={saveBoard} className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="pinterest-board" className="text-xs">
                Public board URL
              </Label>
              <Input
                id="pinterest-board"
                placeholder="https://www.pinterest.com/you/flat-lays/"
                value={boardDraft}
                onChange={(event) => setBoardDraft(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              Show board
            </Button>
            {board ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBoard("");
                  setBoardDraft("");
                  try {
                    localStorage.removeItem(BOARD_KEY);
                  } catch {
                    // Nothing to clear.
                  }
                }}
              >
                <X /> Clear
              </Button>
            ) : null}
          </form>

          <PinterestBoard url={board} />
        </section>
      </div>

      {dropping ? (
        <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-background/85 backdrop-blur-sm">
          <div className="text-center">
            <ImagePlus className="mx-auto size-7" />
            <p className="mt-2 text-sm font-medium">Drop to save as a reference</p>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="text-sm font-medium">{preview?.name}</DialogTitle>
          {preview && srcFor(preview.id) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={srcFor(preview.id)}
              alt={preview.name}
              className="max-h-[70dvh] w-full rounded-lg object-contain"
            />
          ) : null}
          {preview?.remoteUrl ? (
            <a
              href={preview.remoteUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="truncate text-xs text-muted-foreground underline"
            >
              {preview.remoteUrl}
            </a>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
