"use client";

import * as React from "react";

declare global {
  interface Window {
    PinUtils?: { build: () => void };
  }
}

const SCRIPT = "https://assets.pinterest.com/js/pinit.js";

/**
 * Pinterest's own board embed. This is the sanctioned way to show pins on another site —
 * the widget renders an iframe served by Pinterest, so the images stay theirs, load from
 * their CDN, and link back. There is no public search API, so a board URL is the input.
 */
export function PinterestBoard({ url }: { url: string }) {
  const [status, setStatus] = React.useState<"loading" | "ready" | "failed">("loading");

  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const build = () => {
      if (cancelled) return;
      window.PinUtils?.build();
      setStatus("ready");
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (existing && window.PinUtils) {
      build();
      return () => {
        cancelled = true;
      };
    }

    const script = existing ?? document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.addEventListener("load", build);
    script.addEventListener("error", () => !cancelled && setStatus("failed"));
    if (!existing) document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", build);
    };
  }, [url]);

  if (!url) return null;

  return (
    <div className="rounded-xl border bg-card p-3">
      {status === "failed" ? (
        <p className="text-sm text-muted-foreground">
          Pinterest&apos;s widget could not load — a blocker or an offline connection will do
          that.{" "}
          <a href={url} target="_blank" rel="noreferrer noopener" className="underline">
            Open the board on Pinterest
          </a>
          .
        </p>
      ) : (
        // Keyed so a changed board tears down the old iframe rather than stacking one on it.
        <div key={url} className="min-h-24">
          <a
            data-pin-do="embedBoard"
            data-pin-board-width="600"
            data-pin-scale-height="320"
            data-pin-scale-width="80"
            href={url}
          >
            {url}
          </a>
        </div>
      )}
    </div>
  );
}
