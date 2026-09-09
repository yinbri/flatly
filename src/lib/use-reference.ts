"use client";

import * as React from "react";

/**
 * Which inspiration image is pinned behind the board, and how strongly it shows through.
 * View state, not board data — it is a tracing aid, so it never gets saved with an outfit.
 */
export interface ReferenceView {
  id: string | null;
  opacity: number;
  select: (id: string | null) => void;
  setOpacity: (value: number) => void;
}

export function useReference(): ReferenceView {
  const [id, setId] = React.useState<string | null>(null);
  const [opacity, setOpacity] = React.useState(0.35);

  return React.useMemo(
    () => ({ id, opacity, select: setId, setOpacity }),
    [id, opacity],
  );
}
