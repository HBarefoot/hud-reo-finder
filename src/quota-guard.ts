// Quota-aware enrichment pipeline
// 1. Check SQLite cache
// 2. Prioritize: revite first, then target zips, then the rest
// 3. Count each live API call, stop when cap hit
// 4. Persist successful results + log summary

import type { Property } from "./types.js";
import type { Enrichment } from "./enrichment.js";
import { enrichProperty } from "./rentcast.js";
import { getCachedEnrichment, setCachedEnrichment, logCallUsage, getCallUsage } from "./cache.js";

const MAX_CALLS = Number(process.env.RENTCAST_MAX_CALLS ?? 40);
const TARGET_ZIPS = (process.env.TARGET_ZIPS ?? "").split(",").map((z) => z.trim()).filter(Boolean);

function prioritizer(a: Property) {
  let score = 0;
  if (a.revitalizationArea) score += 1000;
  if (TARGET_ZIPS.length > 0 && TARGET_ZIPS.includes(a.zip)) score += 100;
  // Prefer earlier case numbers as a tiebreaker for determinism
  score += Math.max(0, 999 - parseInt(a.caseNumber.replace(/\D/g, "").slice(0, 3)));
  return score;
}

export async function quotaAwareEnrich(properties: Property[]): Promise<Map<string, Enrichment>> {
  const results = new Map<string, Enrichment>();
  let callsMade = 0;

  for (const p of properties) {
    const cached = await getCachedEnrichment(p.caseNumber);
    if (cached) {
      results.set(p.caseNumber, cached as Enrichment);
      continue;
    }
  }

  // Determine how many calls we have left
  const usage = getCallUsage();
  let remaining = Math.max(0, MAX_CALLS - usage.made);

  // Candidates that still need a live call, prioritized
  const toFetch = properties
    .filter((p) => !results.has(p.caseNumber))
    .sort((a, b) => prioritizer(b) - prioritizer(a));

  for (const p of toFetch) {
    if (callsMade >= remaining) {
      console.log(`[quota] Cap reached (${MAX_CALLS}). Skipping remaining.`);
      break;
    }

    const enriched = await enrichProperty(p.fullAddress);

    // Only count as a quota call if we actually hit RentCast
    if (enriched.source !== "none") {
      callsMade++;
    }

    // Persist even on error so we don't re-burn quota for bad addresses
    await setCachedEnrichment(p.caseNumber, enriched);
    results.set(p.caseNumber, enriched);
  }

  logCallUsage(callsMade, Math.max(0, remaining - callsMade));
  console.log(`[quota] Calls this run: ${callsMade}; remaining: ${Math.max(0, remaining - callsMade)}`);

  return results;
}
