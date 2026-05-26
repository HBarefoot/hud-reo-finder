// Build RentCast bridge for property enrichment
// Free tier: 50 calls/month from RapidAPI. Keep it optional.

import type { Enrichment } from "./enrichment.js";

const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY ?? "";
const RAPIDAPI_KEY = process.env.RENTCAST_RAPIDAPI_KEY ?? "";

async function rentcastEnrichAddress(
  address: string
): Promise<Partial<Enrichment>> {
  if (!RENTCAST_API_KEY && !RAPIDAPI_KEY) {
    return { source: "none" };
  }

  try {
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (RENTCAST_API_KEY) {
      headers["X-RapidAPI-Key"] = RENTCAST_API_KEY;
      headers["X-RapidAPI-Host"] = "rentcast.p.rapidapi.com";
    } else {
      headers["Authorization"] = `Bearer ${RENTCAST_API_KEY}`;
    }

    const url = `https://api.rentcast.io/v1/avm/address?address=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      // Free or key exhausted — degrade gracefully
      console.warn(`RentCast HTTP ${res.status} for ${address}`);
      return { source: "rentcast-error" };
    }

    const data = (await res.json()) as Record<string, any>;

    return {
      estimatedValue: typeof data.estimatedValue === "number" ? data.estimatedValue : null,
      estimatedRent: typeof data.estimatedMonthlyRent === "number" ? data.estimatedMonthlyRent : null,
      beds: typeof data.bedrooms === "number" ? data.bedrooms : null,
      baths: typeof data.bathrooms === "number" ? data.bathrooms : null,
      sqft: typeof data.squareFootage === "number" ? data.squareFootage : null,
      source: "rentcast",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`RentCast error: ${(err as Error).message}`);
    return { source: "rentcast-error" };
  }
}

export async function enrichProperty(address: string): Promise<Enrichment> {
  // Try primary endpoint with full address
  const primary = await rentcastEnrichAddress(address);
  if (primary.source === "rentcast") return primary as Enrichment;

  // Fallback: no enrichment
  return {
    estimatedValue: null,
    estimatedRent: null,
    beds: null,
    baths: null,
    sqft: null,
    source: "none",
    fetchedAt: new Date().toISOString(),
  };
}
