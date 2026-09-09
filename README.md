<div align="center">

# flatly

**Keep your clothes as cut-out PNGs, then style them into flat lay outfit boards — entirely in your browser.**

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-radix-111111)](https://ui.shadcn.com)
[![Local first](https://img.shields.io/badge/data-stays%20on%20your%20device-4C9A5E)](#where-your-data-lives)

<!-- TODO: drop a studio screenshot at docs/studio.png and uncomment this line -->
<!-- <img src="docs/studio.png" width="720" alt="The flatly studio: wardrobe palette on the left, flat lay board in the middle, inspector on the right."> -->

<img src="docs/slot-template.svg" width="380" alt="The flat-lay slot template: garments fill the wide left column, accessories the right rail.">

</div>

## Contents

- [Why](#why)
- [Quick start](#quick-start)
- [The three tabs](#the-three-tabs)
- [How auto-placement works](#how-auto-placement-works)
- [Shortcuts](#shortcuts)
- [Where your data lives](#where-your-data-lives)
- [Project structure](#project-structure)
- [Not built yet](#not-built-yet)
- [License](#license)

## Why

Outfit flat lays get rebuilt by hand every time — cut out the pieces, drag them around a canvas
until the spacing looks right, start over tomorrow. flatly keeps the pieces so you only cut them out
once, and does the arranging for you: every piece has a category, every category owns a spot on the
board, and a double click puts it there.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. There is no setup, no `.env`, no account — the first thing to do is
drop some images into the Wardrobe tab.

Transparent cut-out PNGs look best. Any image works, but one with its background still attached will
sit on the board as a rectangle.

## The three tabs

**Wardrobe** — your pieces. Add them by dropping image files anywhere on the panel, by clicking
*Add pieces* (upload one or many), or by pasting an image URL. Linked images are downloaded and
stored locally when the host allows it; if it refuses, the piece is hotlinked instead and marked
with a broken-link badge — it will then need the internet, and can block PNG export. Each piece gets
a category, guessed from the file name and editable at any time.

**Studio** — the board, a fixed 1000 × 1400 artboard that scales to fit the window.

- **Double-click** a piece in the palette and it drops into the slot its category owns.
- **Drag** a piece from the palette onto the board to place it exactly where you drop it.
- On the board: drag to move, corner handle to resize, the handle above a piece to rotate
  (<kbd>Shift</kbd> snaps to 15°). <kbd>Shift</kbd> while moving locks to one axis, and pieces snap
  to the board's center lines.
- *Auto-arrange* re-flows everything into the template, anchors first.
- *Save* stores the outfit; *PNG* exports the board at 2× (2000 × 2800).

**Outfits** — saved layouts with rendered previews. Open one back in the studio, duplicate it,
export it, or delete it.

## How auto-placement works

The board is zoned. Garments own the wide left column, small goods own the right rail, and each
category has an ordered list of slots inside its own zone — the diagram above shows each category's
first choice, drawn from the real numbers in [`src/lib/layout.ts`](src/lib/layout.ts).

Placing a piece walks that list and takes the first slot that is free, where "free" means no
meaningful overlap with what is already down — cut-outs carry a lot of transparent padding, so boxes
that merely touch are fine. If every slot is taken it sweeps for a gap, working outwards from the
category's preferred spot and staying inside its zone.

Zoning is what makes the result independent of the order you add things in: a ring dropped first
cannot squat the spot the shirt wants. Adding eight pieces accessories-first and garments-first
produces the same board.

## Shortcuts

| Key | Action |
| --- | --- |
| <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> / <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | Undo / redo |
| <kbd>Ctrl/⌘</kbd>+<kbd>S</kbd> | Save outfit |
| <kbd>Ctrl/⌘</kbd>+<kbd>D</kbd> | Duplicate selection |
| <kbd>Delete</kbd> | Remove from board |
| Arrow keys | Nudge (<kbd>Shift</kbd> for 10 units) |
| <kbd>[</kbd> / <kbd>]</kbd> | Send back / bring forward (<kbd>Shift</kbd> for all the way) |
| <kbd>Esc</kbd> | Deselect |

## Where your data lives

IndexedDB, in this browser, on this device — three stores: `items` (metadata), `blobs` (the actual
image bytes) and `outfits` (layouts plus preview thumbnails). Nothing is uploaded anywhere.

The flip side: clearing site data clears the wardrobe, and nothing syncs between browsers or
devices. Export a PNG for anything you want to keep outside the app.

## Project structure

| Path | What it holds |
| --- | --- |
| `src/lib/types.ts` | Item, layer and outfit shapes; artboard size; background swatches |
| `src/lib/db.ts` | Thin IndexedDB wrapper (three stores) |
| `src/lib/store.tsx` | React context: loads everything, owns object URLs, CRUD |
| `src/lib/layout.ts` | The slot template and the auto-placement / auto-arrange logic |
| `src/lib/use-board.ts` | Board state for the studio: layers, selection, undo history |
| `src/lib/image.ts` | Image loading, remote caching, canvas rendering and PNG export |
| `src/components/wardrobe` | Wardrobe tab: grid, add dialog, edit dialog |
| `src/components/studio` | Studio tab: palette, canvas, inspector |
| `src/components/outfits` | Saved outfits tab |

Built with [Next.js](https://nextjs.org) (App Router), [Tailwind CSS v4](https://tailwindcss.com)
and [shadcn/ui](https://ui.shadcn.com), set in Inter Tight. No backend, no database, no API keys.

## Not built yet

- No accounts and no sync — one browser, one wardrobe.
- No background removal; bring your own cut-outs.
- The studio is desktop-shaped. Below 1024px the inspector collapses into a popover.
- Export is PNG only, at a fixed 2× board size.

## License

None yet — without one, default copyright applies and nobody else may reuse this. Add a `LICENSE`
file if you want that to change.
