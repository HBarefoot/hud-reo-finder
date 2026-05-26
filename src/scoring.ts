import type { Property } from "./types.js";
import type { EnrichedProperty, Enrichment } from "./enrichment.ts";

const LIQUID_BEDS_RANGE = { min: 2, max: 4 };
const LIQUID_BATHS_MIN = 1.5;

function liquidConfig(
  beds: number | null,
  baths: number | null
): boolean {
  if (beds == null || baths == null) return false;
  return (
    beds >= LIQUID_BEDS_RANGE.min &&
    beds <= LIQUID_BEDS_RANGE.max &&
    baths >= LIQUID_BATHS_MIN
  );
}

function calcTier(
  p: Property,
  e: Enrichment
): { tier: "A" | "B" | "C"; score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 0;

  // Revite is heavy weight
  if (p.revitalizationArea) {
    score += 50;
    notes.push(`revite:${p.revitalizationArea}`);
  }

  // Liquid config is medium weight
  if (liquidConfig(e.beds, e.baths)) {
    score += 30;
    notes.push("liquid:beds-baths");
  }

  // Estimated value is present (RentCast worked)
  if (e.estimatedValue != null && e.estimatedValue > 0) {
    score += 20;
    notes.push(`est.val:$${e.estimatedValue.toLocaleString()}`);
  }

  const tier = score >= 60 ? "A" : score >= 30 ? "B" : "C";

  return { tier, score, notes };
}

export function enrichAndScore(p: Property): EnrichedProperty {
  const e: Enrichment = {
    estimatedValue: null,
    estimatedRent: null,
    beds: null,
    baths: null,
    sqft: null,
    source: "none",
    fetchedAt: new Date().toISOString(),
  };

  const t = calcTier(p, e);

  return {
    caseNumber: p.caseNumber,
    fullAddress: p.fullAddress,
    city: p.city,
    zip: p.zip,
    lat: p.lat,
    lon: p.lon,
    revitalizationArea: p.revitalizationArea,
    estimatedValue: e.estimatedValue,
    estimatedRent: e.estimatedRent,
    beds: e.beds,
    baths: e.baths,
    sqft: e.sqft,
    valueSource: e.source,
    enrichmentFetchedAt: e.fetchedAt,
    tier: t.tier,
    tierScore: t.score,
    notes: t.notes,
  };
}
