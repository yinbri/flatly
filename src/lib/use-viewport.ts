"use client";

import * as React from "react";
import { CANVAS_H, CANVAS_W } from "./types";

/**
 * Pan and zoom for the studio board, Photoshop style.
 *
 * `fit` is the scale that just fits the artboard in the frame; `zoom` is the multiplier the
 * user drives on top of it, and `offset` slides the board around in screen pixels from its
 * centred resting place.
 */

interface Point {
  x: number;
  y: number;
}

interface ViewportState {
  fit: number;
  zoom: number;
  offset: Point;
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 12;

/** Keep at least this much of the board reachable, so it can never be lost off-screen. */
const KEEP_VISIBLE = 90;

export interface Viewport {
  fit: number;
  zoom: number;
  /** Board pixels to screen pixels. */
  scale: number;
  offset: Point;
  /** Called by the canvas when the frame is measured. */
  setFrame: (width: number, height: number) => void;
  /** Multiply the zoom, holding `anchor` (relative to the frame centre) still. */
  zoomBy: (factor: number, anchor?: Point) => void;
  /** Jump to an absolute zoom, holding `anchor` still. */
  zoomTo: (zoom: number, anchor?: Point) => void;
  panBy: (dx: number, dy: number) => void;
  /** Back to fitting the window, centred. */
  fitToFrame: () => void;
  /** 100%: one board pixel per screen pixel. */
  actualSize: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useViewport(): Viewport {
  const [state, setState] = React.useState<ViewportState>({
    fit: 0.4,
    zoom: 1,
    offset: { x: 0, y: 0 },
  });
  const stateRef = React.useRef(state);
  const frameRef = React.useRef({ width: 0, height: 0 });

  const commit = React.useCallback((next: ViewportState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** Stops the board being dragged entirely out of view. */
  const clampOffset = React.useCallback((offset: Point, scale: number): Point => {
    const frame = frameRef.current;
    if (!frame.width || !frame.height) return offset;
    const limitX = Math.max(0, (CANVAS_W * scale + frame.width) / 2 - KEEP_VISIBLE);
    const limitY = Math.max(0, (CANVAS_H * scale + frame.height) / 2 - KEEP_VISIBLE);
    return { x: clamp(offset.x, -limitX, limitX), y: clamp(offset.y, -limitY, limitY) };
  }, []);

  const setFrame = React.useCallback(
    (width: number, height: number) => {
      frameRef.current = { width, height };
      const next = Math.max(
        0.05,
        Math.min((width - 48) / CANVAS_W, (height - 48) / CANVAS_H),
      );
      const current = stateRef.current;
      if (Math.abs(next - current.fit) < 0.0005) return;
      commit({ ...current, fit: next });
    },
    [commit],
  );

  const zoomBy = React.useCallback(
    (factor: number, anchor: Point = { x: 0, y: 0 }) => {
      const current = stateRef.current;
      const zoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = zoom / current.zoom;
      if (ratio === 1) return;
      // Holding a point still while scaling: offset' = offset * k + anchor * (1 - k).
      const offset = {
        x: current.offset.x * ratio + anchor.x * (1 - ratio),
        y: current.offset.y * ratio + anchor.y * (1 - ratio),
      };
      commit({ ...current, zoom, offset: clampOffset(offset, current.fit * zoom) });
    },
    [clampOffset, commit],
  );

  const zoomTo = React.useCallback(
    (zoom: number, anchor?: Point) => zoomBy(zoom / stateRef.current.zoom, anchor),
    [zoomBy],
  );

  const panBy = React.useCallback(
    (dx: number, dy: number) => {
      const current = stateRef.current;
      const offset = { x: current.offset.x + dx, y: current.offset.y + dy };
      commit({ ...current, offset: clampOffset(offset, current.fit * current.zoom) });
    },
    [clampOffset, commit],
  );

  const fitToFrame = React.useCallback(() => {
    commit({ ...stateRef.current, zoom: 1, offset: { x: 0, y: 0 } });
  }, [commit]);

  const actualSize = React.useCallback(() => {
    const current = stateRef.current;
    commit({
      ...current,
      zoom: clamp(1 / current.fit, MIN_ZOOM, MAX_ZOOM),
      offset: { x: 0, y: 0 },
    });
  }, [commit]);

  return React.useMemo(
    () => ({
      fit: state.fit,
      zoom: state.zoom,
      scale: state.fit * state.zoom,
      offset: state.offset,
      setFrame,
      zoomBy,
      zoomTo,
      panBy,
      fitToFrame,
      actualSize,
    }),
    [state, setFrame, zoomBy, zoomTo, panBy, fitToFrame, actualSize],
  );
}
