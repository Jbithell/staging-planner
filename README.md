# Tour Stage Planner

> This project was generated entirely by AI: every line of code, config and documentation was written by Claude (Anthropic) using [Claude Code](https://claude.com/claude-code).

A small browser app for planning how to lay out a **Stairville Tour Stage** deck (sold by [Thomann](https://www.thomann.co.uk)) from the parts you own.

- **Parts I own**: the whole Tour Stage range is listed, with Thomann photos and links. Quantities start from the original order (Thomann invoice 90373565) and everything else is 0. Plans can only use what you own, unless you turn on *Plan beyond what I own*; anything extra then goes on a shopping list.
- **Design**: drag platforms (2x1, 1x1, 1.5x1, half-depth, triangles, quarter circle) around a grid or a scaled floor plan of the room. Pick legs per platform (fixed 20–100cm, telescopic, leg wheels, Rollrisers) to set the stage height.
- **Handrails**: open upstage edges must be railed (red); open sides are flagged (amber); above 80cm every open edge must be railed, as the Tour Stage manual says. Click an edge to add a 2m or 1m handrail. Stairs can be added too.
- **Build sheet**: a printable pick list plus numbered set-out, joins (assembly clamps, self-levelling wedges, leg clamps) and handrail drawings for whoever puts the stage up.
- **Parts**: everything the plan needs, what you own, and what to buy (with approximate Thomann prices).

Everything is saved in the browser (localStorage). Use **Download file** / **Open file** in the plan menu to back up or move your plans, floor plans and parts list as a single `.tourstage.json` file. To see debug logs, open the console and filter by `[TSP]`.

Connector counts are estimates; always follow the Tour Stage assembly instructions. This project is not affiliated with Thomann or Stairville.

See [AGENTS.md](AGENTS.md) for an in-depth guide to the architecture and conventions.

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build into dist/
```

## Deployment

`.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on every push to `main`.
In the repo settings, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
