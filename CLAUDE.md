# flatly

A wardrobe and flat-lay studio. Cut-out PNGs of clothes get arranged into outfit boards. Next.js
App Router, Tailwind v4, shadcn/ui. **No backend, no database, no API keys** — everything lives in
the browser.

## Commands

```bash
npm run dev          # localhost:3000
npm run build        # production build
npm run lint         # eslint
npx tsc --noEmit     # typecheck
```

Both `tsc` and `lint` must pass before a commit.

**Do not run `npm run build` while a dev server is running.** On Windows both write `.next` and the
build dies with `EPERM: operation not permitted, open '.next/trace'`, taking the dev server with it.
Stop the server first.

## The shape of it

State flows one way: IndexedDB → context (`store.tsx`, `watchlist.tsx`) → panels.

| Path | Holds |
| --- | --- |
| `src/lib/db.ts` | IndexedDB wrapper. `items`, `blobs`, `outfits`, `references`, `subscriptions`, `drops`, `prefs` |
| `src/lib/store.tsx` | The wardrobe context. Loads everything on mount, owns object URLs, all CRUD |
| `src/lib/watchlist.tsx` | The watchlist context. Stores followed, drops, taste settings and the profile |
| `src/lib/types.ts` | Every shared shape, plus `CANVAS_W`/`CANVAS_H` and `BACKGROUNDS` |
| `src/lib/layout.ts` | The slot template and auto-placement |
| `src/lib/cutout.ts` | Plain-background removal, flood fill on a canvas |
| `src/lib/use-board.ts` | Studio board state: layers, selection, undo history |
| `src/lib/use-viewport.ts` | Pan and zoom |
| `src/lib/brands.ts` | The store catalogue you can follow |
| `src/lib/palette.ts` | Colour read off an image, plus Lab distance |
| `src/lib/taste.ts` | The taste profile and the match score, with its reasons |
| `src/lib/feeds.ts` | RSS, Atom and Shopify `products.json` parsing |
| `src/components/ui/` | shadcn components — add with the CLI, don't hand-roll |
| `src/app/design/page.tsx` | Live style guide at `/design` |

## Conventions

**Type.** `text-sm` is the interface default, `text-xs` is secondary text. Those two carry almost
everything; reach past them only for a real reason. `text-base` for dialog titles and empty states.

**Icons.** `size-4` is the default and shadcn's Button applies it automatically to a bare SVG —
don't restate it. `size-3` and `size-3.5` for icons sitting inside text, `size-6`/`size-7` for empty
states and overlays.

**Spacing.** 4px base. Steps in use are 4, 6, 8, 10, 12, 16, 24. `gap-2` between controls, `p-3`
inside panels, `px-4 sm:px-6` at page edges.

**Radius.** Everything derives from `--radius: 0.625rem`. Use `rounded-lg`/`rounded-xl`, never a
literal px radius.

**Colour.** Only through tokens — `bg-background`, `text-muted-foreground`, `border`. No literal
hex in components; the exception is `BACKGROUNDS` in `types.ts`, which are artwork, not UI.

**Numerals that change under the cursor** (zoom %, sizes, counts) get `font-mono tabular-nums`.

See `/design` in the running app for all of the above rendered at real size.

## Rules that are easy to get wrong

**Board coordinates are not screen pixels.** Layers store `x`, `y`, `w` in the 1000×1400 artboard
space. Screen position is `value * viewport.scale`. Never store a screen pixel on a layer.

**Undo history is pushed once per gesture.** Call `board.beginGesture()` on pointerdown, then
`updateLayer(..., { history: false })` for every move after that. A slider does the same via its
`sliding` ref. Getting this wrong fills the undo stack with one entry per mouse-move.

**Object URLs are owned by the store.** Created when a blob loads, revoked when the item is removed
or replaced. Never create one in a component.

**Images use `<img>`, not `next/image`.** Sources are object URLs and blobs, which `next/image`
cannot process. Each one carries an `eslint-disable-next-line @next/next/no-img-element`.

**Bumping the IndexedDB version** means adding to `onupgradeneeded` behind a
`if (!db.objectStoreNames.contains(...))` guard, so existing wardrobes upgrade in place rather than
being wiped. Test by seeding an old-version database before loading the app.

**Ctrl/Cmd+1 is unusable** — browsers keep it for tab switching and never pass it to the page.
Shift-based shortcuts reach the page reliably; use `event.code` (`Digit1`), not `event.key`, since
Shift+1 is `"!"`.

**The watchlist has no server, so a feed either allows cross-origin reads or it does not.**
None of the catalogue's high-street stores publish one. Releases arrive by clipping a product
URL, or through a feed URL attached to a store by hand; a relay is opt-in and off by default.
`sample-drops.ts` holds ten invented releases, badged `Sample` wherever they appear — never
present them as real, and keep the switch that turns them off.

**Match scores must stay explainable.** Every signal in `scoreDrop` carries the sentence it
would print. If a signal cannot be said out loud on a card, it does not belong in the score.

**`ResizeObserver` only delivers while the page is painting.** A tab in the background never gets a
callback, so the canvas also measures directly on mount and on window resize.

## Writing code here

Comments explain *why*, not what, and are sparse — match the density of the file you are in. No
`any`. Prefer the existing helper over a new one. Keep public signatures and existing tests working.

When something is verified, say so plainly and say how it was verified; when it isn't, say that
instead.
