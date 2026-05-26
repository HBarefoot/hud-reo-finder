// SQLite cache for enrichment results + call quota tracking
// Schema: enrichment_cache (caseNum unique), call_log (run id + summary)

import { Database } from "bun:sqlite";
import { join } from "path";
import { homedir } from "os";

const DB_DIR = process.env.HUD_DB_DIR ?? join(homedir(), ".config", "hud-reo-finder");
const DB_PATH = join(DB_DIR, "hud-reo.db");

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    // Ensure directory exists
    Bun.write(join(DB_DIR, ".keep"), "").catch(() => {});
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS enrichment_cache (
        caseNum TEXT PRIMARY KEY,
        estimatedValue INTEGER,
        estimatedRent INTEGER,
        beds INTEGER,
        baths REAL,
        sqft INTEGER,
        source TEXT NOT NULL,
        fetchedAt TEXT NOT NULL
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS call_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        runAt TEXT NOT NULL,
        callsMade INTEGER NOT NULL DEFAULT 0,
        callsRemaining INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return db;
}

export async function getCachedEnrichment(caseNum: string) {
  const row = getDb().query("SELECT * FROM enrichment_cache WHERE caseNum = ?").get(caseNum);
  if (!row) return null;
  return row as {
    estimatedValue: number | null;
    estimatedRent: number | null;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    source: string;
    fetchedAt: string;
  };
}

export async function setCachedEnrichment(
  caseNum: string,
  data: {
    estimatedValue: number | null;
    estimatedRent: number | null;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    source: string;
    fetchedAt: string;
  }
): Promise<void> {
  getDb().run(
    `INSERT INTO enrichment_cache (caseNum, estimatedValue, estimatedRent, beds, baths, sqft, source, fetchedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(caseNum) DO UPDATE SET
       estimatedValue=excluded.estimatedValue,
       estimatedRent=excluded.estimatedRent,
       beds=excluded.beds,
       baths=excluded.baths,
       sqft=excluded.sqft,
       source=excluded.source,
       fetchedAt=excluded.fetchedAt`,
    [
      caseNum,
      data.estimatedValue ?? null,
      data.estimatedRent ?? null,
      data.beds ?? null,
      data.baths ?? null,
      data.sqft ?? null,
      data.source,
      data.fetchedAt,
    ]
  );
}

export function logCallUsage(made: number, remaining: number): void {
  getDb().run(
    "INSERT INTO call_log (runAt, callsMade, callsRemaining) VALUES (?, ?, ?)",
    [new Date().toISOString(), made, remaining]
  );
}

export function getCallUsage(): { made: number; remaining: number } {
  const row = getDb().query(
    "SELECT SUM(callsMade) as total FROM call_log"
  ).get() as { total: number | null } | null;
  const total = row?.total ?? 0;
  const max = Number(process.env.RENTCAST_MAX_CALLS ?? 40);
  // Simple window: total ever made minus an arbitrary window isn't tracked;
  // for the free tier (50/month), we keep it simple: remaining = max - total.
  return { made: total, remaining: Math.max(0, max - total) };
}

export function resetCallUsage(): void {
  getDb().exec("DELETE FROM call_log");
}
