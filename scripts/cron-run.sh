#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.bun/bin:$PATH"
cd "$HOME/projects/hud-reo-finder"

FLAG="$HOME/.config/hud-reo-finder/.june-reset-done"
LOG="$HOME/.config/hud-reo-finder/cron.log"

# June 1 2026: one-time reset to purge stale cache, then enrich
if [ "$(date +%Y-%m)" = "2026-06" ] && [ ! -f "$FLAG" ]; then
    echo "[$(date)] June reset: clearing stale cache..." >> "$LOG"
    bun run src/cli.ts --reset-cache >> "$LOG" 2>&1
    touch "$FLAG"
fi

# Normal run: enriches only new/unchanged/unenriched properties (cached = free)
echo "[$(date)] Starting enrichment run..." >> "$LOG"
bun run src/cli.ts >> "$LOG" 2>&1

# Extract summary from log for Slack
tail -n 20 "$LOG" > "$HOME/.config/hud-reo-finder/last-summary.txt"
