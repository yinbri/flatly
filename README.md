# flatly

A wardrobe + flat-lay studio. Upload cut-out PNGs of your clothes, then arrange them into
Instagram-style outfit flat lays on a fixed artboard. Everything lives in your browser — there is
no account and no server.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## The three tabs

**Wardrobe** — your pieces. Add them by dropping image files anywhere on the panel, by clicking
*Add pieces* (upload one or many), or by pasting an image URL. Linked images are downloaded and
stored locally when the host allows it; if it refuses, the piece is hotlinked instead and marked
with a broken-link badge (it will then need the internet, and can block PNG export). Each piece gets
a category — guessed from the file name, editable at any time — which is what drives auto-placement.

**Studio** — the board. The artboard is a fixed 1000 × 1400 coordinate space that scales to fit the
window.

- **Double-click** a piece in the left palette and it drops into the slot its category owns: tops
  upper-left, bottoms below them, shoes bottom-right, eyewear top-right, jewelry and fragrance down
  the right rail. If that slot is taken, it falls through to the next preference, then to the
  nearest free gap.
- **Drag** a piece from the palette onto the board to place it exactly where you drop it.
- On the board, drag to move, drag the corner handle to resize, and drag the handle above a piece to
  rotate (hold <kbd>Shift</kbd> to snap to 15°). Holding <kbd>Shift</kbd> while moving locks to one
  axis, and pieces snap to the board's center lines.
- *Auto-arrange* re-flows everything into the template, anchors first.
- *Save* stores the outfit; *PNG* exports the board at 2× (2000 × 2800).

**Outfits** — saved layouts, with a rendered preview. Open one back in the studio, duplicate it,
export it, or delete it.

### Shortcuts

| Key | Action |
| --- | --- |
| <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> / <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | Undo / redo |
| <kbd>Ctrl/⌘</kbd>+<kbd>S</kbd> | Save outfit |
| <kbd>Ctrl/⌘</kbd>+<kbd>D</kbd> | Duplicate selection |
| <kbd>Delete</kbd> | Remove from board |
| Arrow keys | Nudge (<kbd>Shift</kbd> for 10 units) |
| <kbd>[</kbd> / <kbd>]</kbd> | Send back / bring forward (<kbd>Shift</kbd> for all the way) |
| <kbd>Esc</kbd> | Deselect |

## Where the data lives

IndexedDB, in this browser, on this device: `items` (metadata), `blobs` (the actual image bytes) and
`outfits` (layouts + preview thumbnails). Clearing site data clears the wardrobe, and nothing syncs
between browsers. Export a PNG for anything you want to keep outside the app.

## Layout of the code

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

Built with Next.js (App Router), Tailwind CSS v4 and shadcn/ui.
