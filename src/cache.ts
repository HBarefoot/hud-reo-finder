// SQLite cache for enrichment results + call quota tracking
// Schema: enrichment_cache (caseNum unique), call_log (run id + summary), inventory (firstSeen/lastSeen)

import { Database } from "bun:sqlite";
import { join } from "path";
import { homedir } from "os";
import type { Property } from "./types.js";

const DB_DIR = process.env.HUD_DB_DIR ?? join(homedir(), ".config", "hud-reo-finder");
const DB_PATH = join(DB_DIR, "hud-reo.db");

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
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
        propertyType TEXT,
        source TEXT NOT NULL,
        fetchedAt TEXT NOT NULL
      );
    `);
    // Migration: add propertyType column if missing (legacy db)
    try {
      db.run("ALTER TABLE enrichment_cache ADD COLUMN propertyType TEXT");
    } catch (_) { /* already exists */ }
    db.exec(`
      CREATE TABLE IF NOT EXISTS call_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        runAt TEXT NOT NULL,
        callsMade INTEGER NOT NULL DEFAULT 0,
        callsRemaining INTEGER NOT NULL DEFAULT 0
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS inventory (
        caseNum TEXT PRIMARY KEY,
        fullAddress TEXT NOT NULL,
        city TEXT NOT NULL,
        zip TEXT NOT NULL,
        lat REAL,
        lon REAL,
        revitalizationArea TEXT,
        firstSeen TEXT NOT NULL,
        lastSeen TEXT NOT NULL,
        removed INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return db;
}

/* ── enrichment cache ────────────────────────────────────────── */

export async function getCachedEnrichment(caseNum: string) {
  const row = getDb().query("SELECT * FROM enrichment_cache WHERE caseNum = ?").get(caseNum);
  if (!row) return null;
  return row as {
    estimatedValue: number | null;
    estimatedRent: number | null;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    propertyType: string | null;
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
    propertyType: string | null;
    source: string;
    fetchedAt: string;
  }
): Promise<void> {
  getDb().run(
    `INSERT INTO enrichment_cache (caseNum, estimatedValue, estimatedRent, beds, baths, sqft, propertyType, source, fetchedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(caseNum) DO UPDATE SET
       estimatedValue=excluded.estimatedValue,
       estimatedRent=excluded.estimatedRent,
       beds=excluded.beds,
       baths=excluded.baths,
       sqft=excluded.sqft,
       propertyType=excluded.propertyType,
       source=excluded.source,
       fetchedAt=excluded.fetchedAt`,
    [
      caseNum,
      data.estimatedValue ?? null,
      data.estimatedRent ?? null,
      data.beds ?? null,
      data.baths ?? null,
      data.sqft ?? null,
      data.propertyType ?? null,
      data.source,
      data.fetchedAt,
    ]
  );
}

/* ── quota tracking ────────────────────────────────────────── */

export function logCallUsage(made: number, remaining: number): void {
  getDb().run(
    "INSERT INTO call_log (runAt, callsMade, callsRemaining) VALUES (?, ?, ?)",
    [new Date().toISOString(), made, remaining]
  );
}

export function getCallUsage(): { made: number; remaining: number } {
  const max = Number(process.env.RENTCAST_MAX_CALLS ?? 40);
  // Count only calls in the current calendar month
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`;
  const row = getDb().query(
    "SELECT SUM(callsMade) as total FROM call_log WHERE runAt >= ?"
  ).get(startOfMonth) as { total: number | null } | null;
  const total = row?.total ?? 0;
  return { made: total, remaining: Math.max(0, max - total) };
}

export function resetCallUsage(): void {
  getDb().exec("DELETE FROM call_log");
}

export function clearNullCache(): void {
  getDb().run("DELETE FROM enrichment_cache WHERE source = 'none'");
}

/* ── inventory tracking ────────────────────────────────────── */

export async function syncInventory(properties: Property[]): Promise<{ newCases: string[]; removedCases: string[] }> {
  const db = getDb();
  const now = new Date().toISOString();
  const newCases: string[] = [];
  const removedCases: string[] = [];

  // Upsert all current properties
  for (const p of properties) {
    const existing = db.query("SELECT caseNum, firstSeen, removed FROM inventory WHERE caseNum = ?").get(p.caseNumber) as { caseNum: string; firstSeen: string; removed: number } | null;
    if (!existing) {
      newCases.push(p.caseNumber);
    }
    db.run(
      `INSERT INTO inventory (caseNum, fullAddress, city, zip, lat, lon, revitalizationArea, firstSeen, lastSeen, removed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(caseNum) DO UPDATE SET
         fullAddress=excluded.fullAddress,
         city=excluded.city,
         zip=excluded.zip,
         lat=excluded.lat,
         lon=excluded.lon,
         revitalizationArea=excluded.revitalizationArea,
         lastSeen=excluded.lastSeen,
         removed=0`,
      [
        p.caseNumber,
        p.fullAddress,
        p.city,
        p.zip,
        p.lat,
        p.lon,
        p.revitalizationArea ?? null,
        existing?.firstSeen ?? now,
        now,
      ]
    );
  }

  // Mark removed properties
  const currentCaseNums = properties.map((p) => p.caseNumber);
  const placeholders = currentCaseNums.map(() => "?").join(",");
  const removed = db.query(
    `SELECT caseNum FROM inventory WHERE caseNum NOT IN (${placeholders}) AND removed = 0`
  ).all(...currentCaseNums) as { caseNum: string }[];

  for (const r of removed) {
    removedCases.push(r.caseNum);
    db.run("UPDATE inventory SET removed = 1, lastSeen = ? WHERE caseNum = ?", [now, r.caseNum]);
  }

  return { newCases, removedCases };
}

export function getInventoryChanges(): { newCases: string[]; removedCases: string[] } {
  const db = getDb();
  const now = new Date().toISOString();
  const lastRun = db.query("SELECT MAX(runAt) as lastRun FROM call_log").get() as { lastRun: string | null } | null;
  const since = lastRun?.lastRun ?? now;

  const newCases = db.query("SELECT caseNum FROM inventory WHERE firstSeen \u003e ? AND removed = 0").all(since) as { caseNum: string }[];
  const removedCases = db.query("SELECT caseNum FROM inventory WHERE removed = 1 AND lastSeen \u003e ?").all(since) as { caseNum: string }[];

  return {
    newCases: newCases.map((r) => r.caseNum),
    removedCases: removedCases.map((r) => r.caseNum),
  };
}
