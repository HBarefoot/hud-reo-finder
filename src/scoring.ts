import type { Property } from "./types.js";
import type { EnrichedProperty, Enrichment } from "./enrichment.js";
import { getManualPrice } from "./manual-prices.js";

const LIQUID_BEDS_RANGE = { min: 2, max: 4 };
const LIQUID_BATHS_MIN = 1.5;

const MULTIFAMILY_TYPES = new Set(["Duplex", "Triplex", "Quadruplex", "Multi-Family", "Fourplex"]);

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

function isMultfamily(propertyType: string | null): boolean {
  if (!propertyType) return false;
  return MULTIFAMILY_TYPES.has(propertyType);
}

export function scoreProperty(
  p: Property,
  enrichment: Enrichment,
  listPrice: number | null
): { tier: "A" | "B" | "C"; score: number; notes: string[]; equitySpread: number | null; equitySpreadPct: number | null; grossYield: number | null; capRate: number | null } {
  const equitySpread = (enrichment.estimatedValue != null && listPrice != null)
    ? enrichment.estimatedValue - listPrice
    : null;
  const equitySpreadPct = (equitySpread != null && listPrice != null && listPrice > 0)
    ? (equitySpread / listPrice)
    : null;
  const grossYield = (enrichment.estimatedRent != null && listPrice != null && listPrice > 0)
    ? ((enrichment.estimatedRent * 12) / listPrice)
    : null;
  const capRate = (enrichment.estimatedRent != null && enrichment.estimatedValue != null && enrichment.estimatedValue > 0)
    ? ((enrichment.estimatedRent * 12 * 0.6) / enrichment.estimatedValue) // 60% NOI rough
    : null;

  let score = 0;
  const notes: string[] = [];
  if (p.revitalizationArea) {
    score += 50;
    notes.push(`revite:${p.revitalizationArea}`);
  }
  if (isMultfamily(enrichment.propertyType)) {
    score += 40;
    notes.push(`multifamily:${enrichment.propertyType}`);
  }
  if (liquidConfig(enrichment.beds, enrichment.baths)) {
    score += 30;
    notes.push("liquid:beds-baths");
  }
  if (enrichment.estimatedValue != null && enrichment.estimatedValue > 0) {
    score += 20;
    notes.push(`est.val:$${enrichment.estimatedValue.toLocaleString()}`);
  }
  if (listPrice != null) {
    notes.push(`list:$${listPrice.toLocaleString()}`);
    if (equitySpread != null) {
      notes.push(`equity:$${equitySpread.toLocaleString()}`);
    }
  }

  const tier = score >= 90 ? "A" : score >= 50 ? "B" : "C";
  return { tier, score, notes, equitySpread, equitySpreadPct, grossYield, capRate };
}

export function buildEnriched(
  p: Property,
  enrichment: Enrichment,
  scored: { tier: "A" | "B" | "C"; score: number; notes: string[]; equitySpread: number | null; equitySpreadPct: number | null; grossYield: number | null; capRate: number | null },
  listPrice: number | null
): EnrichedProperty {
  return {
    caseNumber: p.caseNumber,
    fullAddress: p.fullAddress,
    city: p.city,
    zip: p.zip,
    lat: p.lat,
    lon: p.lon,
    revitalizationArea: p.revitalizationArea,
    estimatedValue: enrichment.estimatedValue,
    estimatedRent: enrichment.estimatedRent,
    beds: enrichment.beds,
    baths: enrichment.baths,
    sqft: enrichment.sqft,
    propertyType: enrichment.propertyType,
    valueSource: enrichment.source,
    enrichmentFetchedAt: enrichment.fetchedAt,
    tier: scored.tier,
    tierScore: scored.score,
    notes: scored.notes,
    listPrice,
    equitySpread: scored.equitySpread,
    equityScore: null,
    equitySpreadPct: scored.equitySpreadPct,
    grossYield: scored.grossYield,
    capRate: scored.capRate,
  };
}

export async function enrichAndScore(
  p: Property,
  enrichment: Enrichment
): Promise<EnrichedProperty> {
  const listPrice = await getManualPrice(p.caseNumber);
  const scored = scoreProperty(p, enrichment, listPrice);
  return buildEnriched(p, enrichment, scored, listPrice);
}
