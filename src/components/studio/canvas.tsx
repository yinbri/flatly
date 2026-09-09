"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { aspectOf } from "@/lib/image";
import { CANVAS_H, CANVAS_W, type Layer, type WardrobeItem } from "@/lib/types";
import type { Viewport } from "@/lib/use-viewport";

export const ITEM_DRAG_TYPE = "application/x-flatly-item";

/** Capture throws if the pointer is already gone; losing it is not worth an exception. */
function capture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // The gesture still works through the frame's own handlers.
  }
}

interface Point {
  x: number;
  y: number;
}

interface Gesture {
  kind: "move" | "scale" | "rotate";
  layerId: string;
  start: Point;
  origin: Layer;
  rect: DOMRect;
}

interface CanvasProps {
  layers: Layer[];
  itemsById: Map<string, WardrobeItem>;
  srcFor: (itemId: string) => string | undefined;
  background: string;
  selectedId: string | null;
  viewport: Viewport;
  /** An inspiration image laid under the pieces, to work from. */
  reference?: { src?: string; opacity: number };
  onSelect: (id: string | null) => void;
  onBeginGesture: () => void;
  onUpdateLayer: (id: string, patch: Partial<Layer>, options?: { history?: boolean }) => void;
  onDropItem: (itemId: string, at: Point) => void;
}

const MIN_WIDTH = 48;
const MAX_WIDTH = 2200;
const SNAP_TOLERANCE = 7;

export function Canvas({
  layers,
  itemsById,
  srcFor,
  background,
  selectedId,
  viewport,
  reference,
  onSelect,
  onBeginGesture,
  onUpdateLayer,
  onDropItem,
}: CanvasProps) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const gesture = React.useRef<Gesture | null>(null);
  const pan = React.useRef<Point | null>(null);
  const [panning, setPanning] = React.useState(false);
  const [handTool, setHandTool] = React.useState(false);
  const [guides, setGuides] = React.useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [dropHint, setDropHint] = React.useState(false);

  const { scale, offset, setFrame, zoomBy, panBy } = viewport;

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    // Measure directly as well as observing: a ResizeObserver only delivers while the page
    // is being rendered, so a board mounted in a background tab would never get its fit.
    const measure = () => {
      const rect = frame.getBoundingClientRect();
      const styles = getComputedStyle(frame);
      const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      if (rect.width > padX && rect.height > padY) {
        setFrame(rect.width - padX, rect.height - padY);
      }
    };

    measure();
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setFrame(width, height);
    });
    observer.observe(frame);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [setFrame]);

  // Wheel zooms about the pointer. Registered by hand because React's wheel handler is
  // passive, and stopping the page scrolling underneath needs a non-passive listener.
  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      // A pinch arrives as ctrl+wheel on every platform; a mouse wheel sends chunky,
      // whole-number deltas with no horizontal component; a trackpad swipe sends small,
      // often fractional ones with both axes. So the wheel zooms and the trackpad pans,
      // which is what each of them does in Photoshop.
      const pinch = event.ctrlKey || event.metaKey;
      const lines = event.deltaMode !== 0;
      const wheelNotch =
        event.deltaX === 0 && Math.abs(event.deltaY) >= 40 && Number.isInteger(event.deltaY);

      if (!pinch && !lines && !wheelNotch) {
        panBy(-event.deltaX, -event.deltaY);
        return;
      }

      const rect = frame.getBoundingClientRect();
      const anchor = {
        x: event.clientX - (rect.left + rect.width / 2),
        y: event.clientY - (rect.top + rect.height / 2),
      };
      const delta = lines ? event.deltaY * 16 : event.deltaY;
      const intensity = event.ctrlKey ? 0.012 : 0.0025;
      zoomBy(Math.exp(-delta * intensity), anchor);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [zoomBy, panBy]);

  // Space is the hand tool, as in Photoshop.
  React.useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(
        element &&
          (element.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)),
      );
    };
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat && !typing(event.target)) setHandTool(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setHandTool(false);
    };
    const cancel = () => setHandTool(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", cancel);
    };
  }, []);

  const toCanvas = (event: { clientX: number; clientY: number }, rect: DOMRect): Point => ({
    x: (event.clientX - rect.left) / scale,
    y: (event.clientY - rect.top) / scale,
  });

  const handlePointerDown = (event: React.PointerEvent) => {
    // Middle button, or space held: the hand tool, whatever is under the cursor.
    if (event.button === 1 || (event.button === 0 && handTool)) {
      event.preventDefault();
      pan.current = { x: event.clientX, y: event.clientY };
      setPanning(true);
      capture(event.currentTarget as HTMLElement, event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const layerEl = target.closest<HTMLElement>("[data-layer]");
    if (!layerEl) {
      onSelect(null);
      return;
    }
    const layerId = layerEl.dataset.layer!;
    const layer = layers.find((entry) => entry.id === layerId);
    const board = boardRef.current;
    if (!layer || !board) return;

    const handle = target.closest<HTMLElement>("[data-handle]")?.dataset.handle;
    const kind: Gesture["kind"] =
      handle === "scale" ? "scale" : handle === "rotate" ? "rotate" : "move";

    const rect = board.getBoundingClientRect();
    onSelect(layerId);
    onBeginGesture();
    gesture.current = { kind, layerId, origin: layer, rect, start: toCanvas(event, rect) };
    capture(event.currentTarget as HTMLElement, event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (pan.current) {
      panBy(event.clientX - pan.current.x, event.clientY - pan.current.y);
      pan.current = { x: event.clientX, y: event.clientY };
      return;
    }
    const active = gesture.current;
    if (!active) return;
    const point = toCanvas(event, active.rect);
    const { origin } = active;

    if (active.kind === "move") {
      let x = origin.x + (point.x - active.start.x);
      let y = origin.y + (point.y - active.start.y);
      if (event.shiftKey) {
        // Axis lock: keep the bigger movement, discard the other.
        if (Math.abs(x - origin.x) > Math.abs(y - origin.y)) y = origin.y;
        else x = origin.x;
      }
      const snapV = Math.abs(x - CANVAS_W / 2) < SNAP_TOLERANCE / scale;
      const snapH = Math.abs(y - CANVAS_H / 2) < SNAP_TOLERANCE / scale;
      if (snapV) x = CANVAS_W / 2;
      if (snapH) y = CANVAS_H / 2;
      setGuides({ v: snapV, h: snapH });
      onUpdateLayer(active.layerId, { x: Math.round(x), y: Math.round(y) }, { history: false });
      return;
    }

    const center = { x: origin.x, y: origin.y };

    if (active.kind === "scale") {
      const startDistance = Math.hypot(active.start.x - center.x, active.start.y - center.y);
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      if (startDistance < 1) return;
      const width = Math.round(
        Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, origin.w * (distance / startDistance))),
      );
      onUpdateLayer(active.layerId, { w: width }, { history: false });
      return;
    }

    const startAngle = Math.atan2(active.start.y - center.y, active.start.x - center.x);
    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    let rotation = origin.rotation + ((angle - startAngle) * 180) / Math.PI;
    rotation = ((rotation % 360) + 540) % 360 - 180;
    if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
    onUpdateLayer(active.layerId, { rotation: Math.round(rotation) }, { history: false });
  };

  const endGesture = (event: React.PointerEvent) => {
    const element = event.currentTarget as HTMLElement;
    const release = () => {
      if (element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };
    if (pan.current) {
      pan.current = null;
      setPanning(false);
      release();
      return;
    }
    if (!gesture.current) return;
    gesture.current = null;
    setGuides({ v: false, h: false });
    release();
  };

  const ordered = React.useMemo(() => [...layers].sort((a, b) => a.z - b.z), [layers]);

  return (
    <div
      ref={frameRef}
      className="checker-lg relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6"
      style={{ cursor: panning ? "grabbing" : handTool ? "grab" : undefined }}
      onAuxClick={(event) => event.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(ITEM_DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropHint(true);
      }}
      onDragLeave={() => setDropHint(false)}
      onDrop={(event) => {
        const itemId = event.dataTransfer.getData(ITEM_DRAG_TYPE);
        setDropHint(false);
        if (!itemId) return;
        event.preventDefault();
        const board = boardRef.current;
        if (!board) return;
        const rect = board.getBoundingClientRect();
        onDropItem(itemId, {
          x: Math.round((event.clientX - rect.left) / scale),
          y: Math.round((event.clientY - rect.top) / scale),
        });
      }}
    >
      <div
        ref={boardRef}
        className={cn(
          "relative shrink-0 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)] transition-shadow",
          dropHint && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          background,
          touchAction: "none",
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        }}
      >
        {reference?.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reference.src}
            alt=""
            aria-hidden
            draggable={false}
            style={{ opacity: reference.opacity }}
            className="pointer-events-none absolute inset-0 size-full object-contain"
          />
        ) : null}

        {ordered.map((layer) => {
          const item = itemsById.get(layer.itemId);
          const src = item ? srcFor(item.id) : undefined;
          if (!item) return null;
          const height = layer.w / aspectOf(item);
          const selected = layer.id === selectedId;
          return (
            <div
              key={layer.id}
              data-layer={layer.id}
              className={cn("absolute cursor-move select-none", selected && "z-10")}
              style={{
                left: (layer.x - layer.w / 2) * scale,
                top: (layer.y - height / 2) * scale,
                width: layer.w * scale,
                height: height * scale,
                transform: `rotate(${layer.rotation}deg)`,
                touchAction: "none",
              }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={item.name}
                  draggable={false}
                  className="pointer-events-none size-full object-contain"
                  style={{ transform: layer.flipX ? "scaleX(-1)" : undefined }}
                />
              ) : (
                <div className="grid size-full place-items-center rounded bg-muted text-[10px] text-muted-foreground">
                  missing image
                </div>
              )}

              {selected ? (
                <>
                  <div className="pointer-events-none absolute -inset-px rounded-[2px] border-2 border-primary/80" />
                  <div
                    data-handle="rotate"
                    className="absolute -top-7 left-1/2 size-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-primary bg-background active:cursor-grabbing"
                    title="Drag to rotate — hold Shift to snap"
                  />
                  <div className="pointer-events-none absolute -top-7 left-1/2 h-7 w-px -translate-x-1/2 bg-primary/60" />
                  <div
                    data-handle="scale"
                    className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-sm border-2 border-primary bg-background"
                    title="Drag to resize"
                  />
                </>
              ) : null}
            </div>
          );
        })}

        {guides.v ? (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-sky-500/70" />
        ) : null}
        {guides.h ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-sky-500/70" />
        ) : null}

        {!layers.length ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-8 text-center">
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-medium text-neutral-500">Empty board</p>
              <p className="text-xs text-neutral-400">
                Double-click a piece on the left to drop it into its spot, or drag one anywhere.
              </p>
              <p className="pt-1 text-[11px] text-neutral-400">
                Scroll to zoom · middle-drag or hold space to pan
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
