# HUD REO Finder

Florida HUD-owned (REO) property tracker. Pulls inventory from HUD's official ArcGIS REST API, enriches with RentCast for estimated values/rent, scores by investment potential, and serves a browsable tracker.

## Stack
- Bun + TypeScript strict (ESM)
- `bun:sqlite` for persistence
- Tailscale for private access

## Setup

```bash
bun install
```

Create `.env` in the repo root:
```env
RENTCAST_API_KEY=your_key_here
# or RAPIDAPI_KEY=your_key_here
RENTCAST_MAX_CALLS=40
TARGET_ZIPS=33012,33054,33055
```

## CLI

```bash
# Fetch, enrich, score, render tracker (default FL)
bun run src/cli.ts

# Run for a different state
bun run src/cli.ts --state=CA

# Enter a manual list price for a case
bun run src/cli.ts --price 095-089430 285000

# List manually entered prices
bun run src/cli.ts --list-prices

# Clear dev-run null cache + reset quota window
bun run src/cli.ts --reset-cache
```

## HTTP Server

```bash
PORT=8765 bun run src/server.ts
```

Tracker at `http://localhost:8765/`. Serve over Tailscale for shared access.

## Files

| File | Role |
|---|---|
| `src/arcgis-client.ts` | Paginated fetch from HUD ArcGIS |
| `src/mercator.ts` | Web Mercator → WGS84 conversion |
| `src/rentcast.ts` | RentCast/RapidAPI enrichment bridge |
| `src/quota-guard.ts` | Budget-aware enrichment with cache |
| `src/scoring.ts` | Tier A/B/C scoring + equity spread |
| `src/renderer.ts` | Dark-mode HTML tracker generator |
| `src/server.ts` | Bun HTTP server |
| `src/cache.ts` | SQLite cache + inventory tracking |
| `src/manual-prices.ts` | JSON-backed manual price input |
| `src/cli.ts` | Entry point |

## Environment Variables

| Var | Default | Purpose |
|---|---|---|
| `RENTCAST_API_KEY` | — | RentCast direct API key |
| `RENTCAST_RAPIDAPI_KEY` | — | RapidAPI key (alternative) |
| `RENTCAST_MAX_CALLS` | 40 | Monthly API call cap |
| `TARGET_ZIPS` | — | Priority ZIPs for enrichment |
| `HUD_DB_DIR` | `~/.config/hud-reo-finder` | SQLite directory |
| `MANUAL_PRICES_PATH` | `~/.config/hud-reo-finder/manual-prices.json` | Price store |

## Data Flow

```
ArcGIS → normalize → SQLite inventory (first_seen/last_seen)
  → quota-aware RentCast enrichment → SQLite cache
    → scoring (tier A/B/C, equity spread)
      → HTML tracker + Bun server
```

## Tiers

- **Tier A** (≥60 pts): revite + liquid SFR config + estimated value
- **Tier B** (≥30 pts): revite or liquid config
- **Tier C** (<30 pts): everything else

## License

MIT
