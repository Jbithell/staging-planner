# AGENTS.md

A guide for AI coding agents (and humans) working on this repository.

## What this is

**Tour Stage Planner** is a client-only React app for laying out a **Stairville Tour Stage** deck. It is deliberately specific to that one system: the catalogue, leg heights, rail lengths and rules all come from Thomann's Tour Stage range and the Tour Stage assembly instructions. Don't generalise it to other staging systems.

1. **Parts I own** (`InventoryModal`): single pieces owned of every catalogue part. Plans are limited to this unless `allowOverInventory` is on.
2. **Design** (`PlanView`): drag platforms on a grid or on a scaled floor-plan image (a `Venue`), set legs, add handrails and stairs.
3. **Checks** (`lib/analysis.ts`): overlaps, open edges that need handrails, wheels on joined platforms, stairs that don't fit, and so on.
4. **Build sheet** (`BuildSheet`): printable pick list and numbered drawings for the crew.
5. **Parts** (`PartsView`): bill of materials and a shopping list with Thomann links.

Everything runs in the browser. There is no server and no cloud sync, and that is intentional.

## Commands

```sh
npm install        # install deps (package-lock.json is committed; use npm ci in CI)
npm run dev        # Vite dev server
npm run build      # tsc -b (typecheck) + vite build → dist/
npm run preview    # serve dist/ locally
```

There is no test suite or linter configured. `npm run build` must pass before you push, because it is what CI runs. For UI changes, drive the built app in a headless browser (Playwright/Chromium) and look at screenshots. The example plans (`src/samples.ts`) make good test fixtures.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` on pushes to `main`. `vite.config.ts` keeps `base: "./"`, so use only relative asset paths.

The footer shows the short git commit SHA of the build, and hovering it shows the build time (`__COMMIT__`, `__BUILD_TIME__`, injected in `vite.config.ts` from `GITHUB_SHA` or `git rev-parse HEAD`). Keep it.

`public/robots.txt` and the `<meta name="robots" content="noindex, nofollow">` tag in `index.html` keep the site out of search engines. Keep both.

## Tech stack

- React 19 + TypeScript (strict; `noUnusedLocals`/`noUnusedParameters` are on), built with Vite.
- **Mantine 9** for all UI, with `@tabler/icons-react` icons. Theme in `src/theme.ts` (orange primary).
- **zustand** for app state (`src/store.ts`).
- No other runtime dependencies. Geometry is hand-written.

## Layout

```
src/
  catalogue.ts      the Tour Stage range: parts (item no., Thomann page, weight per piece, other pack item numbers,
                    shape/height), DEFAULT_INVENTORY (first-run quantities), V1_PACKS (file migration),
                    STAIRS (stair builds), thomannUrl/imageUrl
  types.ts          data model (read this first)
  samples.ts        example plans (one long stage, thrust, two stages with tiers) and the default project
  store.ts          zustand store: project, undo/redo, view/tool/selection, updatePlan (inventory guard)
  storage.ts        localStorage save/load, download/upload JSON, floor-plan image compression
  lib/
    geometry.ts     footprints (rotation), stage heights, SAT overlap, rails/stairs geometry
    analysis.ts     analyse(plan): edge units, drops, handrail needs, joints, leg clusters, rail joins, issues
    bom.ts          needs/bom: parts per plan (hard vs estimated), shortfalls, `remaining`
    edit.ts         delete / rotate / nudge selections
  components/
    PlanView.tsx    interactive editor: zoom/pan SVG, drag/box-select, rail & stair tools, palette drop target
    Drawing.tsx     pure SVG rendering of a plan in room cm (used by the editor and build sheet)
    Palette.tsx     left panel: tools, platform cards, plan settings
    SidePanel.tsx   right panel: selection editor (legs, rails, stairs), checks, parts summary
    InventoryModal  parts owned (whole catalogue) + override switch
    VenueModal      floor-plan images and scale calibration
    BuildSheet      printable build sheet
    PartsView       BOM + shopping list
    PlanMenu        plan switcher, new/rename/duplicate/delete, download/open file
```

## Data model and conventions

- All lengths are **centimetres** in room coordinates (x right, y down the drawing). A venue image sits at (0,0), scaled by `cmPerPx`.
- `Platform.x/y` is the top-left of the **rotated** footprint's bounding box. Use `footprint()` for the polygon and leg corners; never work them out by hand.
- Stage height = leg height (or chosen tele height), plus 13cm on Rollrisers; 9cm on the floor (`stageHeight`).
- `Rail` is a free segment (`dir` h/v, length from the catalogue `w`), so one rail can span several platforms.
- `Stair` sits on an edge: `(x, y)` is the middle of its top edge and `facing` is the way down.
- `analyse()` breaks every edge into ~10cm `EdgeUnit`s and looks just outside each one to find the neighbour and the drop. Everything else (handrail needs, joints, rails on edges, stairs) is built from these units. The rules:
  - An open (drop > 0) **upstage** edge must be railed (error).
  - An open **side** edge is a warning.
  - Above **80cm**, every open edge must be railed (manual p.13).
  - Stairs exempt the edge they cover.
  - Diagonal or curved edges can't take straight rails, so they only warn.
- Facing comes from `plan.audience` (which side of the drawing the audience is on).
- **Everything is counted in single pieces**, never packs. Thomann sells some parts in sets or packs of several sizes, and pieces get broken and binned, so pack counts don't tell you what someone has. A part's `no` is the item number used for its link and photo; other pack sizes are listed in `Item.also` for links only.
- **No prices.** They go out of date fast; link to Thomann instead.
- Don't add anything that identifies a real order, customer or production (invoice numbers, show names) to the code or docs.
- **Every change to a plan goes through `updatePlan`.** When `allowOverInventory` is off, it refuses any change that makes a hard shortfall worse (platforms, legs, Rollrisers, rails, stairs). Connector estimates never block a change.
- Project-level changes go through `setProject` (undoable by default; text fields pass `false`).
- **Autosave**: `components/Autosave.tsx` saves to localStorage after 800ms idle and immediately on blur/hide/unload. A `QuotaExceededError` shows "Save failed – download your file!". Don't add other save timers.
- **localStorage keys**: `tsp:project`, `tsp:seenHelp`, `tsp:showOtherPlatforms`.
- **Tools**: Platforms (`select`), Rails and Stairs. The Rails and Stairs palettes show cards for the handrail (`railItem`) or stairs (`stairKind`, or `auto`) the tool places; don't hide choices behind modifier keys.
- **File format**: `{ format: "tour-stage-planner", version: 2, exportedAt, project }`. Version 1 counted packs; `readInventory` converts it to pieces using `V1_PACKS` and drops parts no longer in the catalogue. New fields must be optional with defaults in `parseProject`. Only bump `version` for breaking changes.
- **Thomann links and images**: `thomannUrl(item)` uses `Item.page` when known, otherwise a Thomann search for the item number. Photos are hotlinked from `thumbs.static-thomann.de` and never stored. `ItemThumb` falls back to an icon when offline.
- **UI**: Mantine components, not custom CSS. Every tool has a `Tip`, controls have tooltips, and destructive actions use `modals.openConfirmModal` and say whether they can be undone.
- **Logging**: `log(area, …)` from `src/log.ts` (`[TSP]` prefix).
- **Code style**: compact TypeScript, few comments, and comments explain *why*.

## Checklist before pushing

1. `npm run build` passes.
2. For UI changes: `npm run preview`, open the example plans in a headless browser and check screenshots. “One long stage” should have no issues and need 10×2x1, 40 legs 30cm, 7×2m rails.
3. Download → Open file round-trips any new fields.
