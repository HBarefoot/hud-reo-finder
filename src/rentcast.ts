// RentCast bridge — uses /v1/avm/value endpoint
// Returns: estimatedValue (price), beds/baths/sqft from subjectProperty
// Note: rent estimate omitted to stay within single call per property (40 cap = 40 lookups)

import type { Enrichment } from "./enrichment.js";

const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY ?? "";

async function fetchWithAuth(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "Accept": "application/json",
      "X-Api-Key": RENTCAST_API_KEY,
    },
  });
}

function parseRentCastValue(data: any): any {
  const sp = data.subjectProperty ?? {};
  return {
    estimatedValue: typeof data.price === "number" ? data.price : null,
    estimatedRent: typeof data.estimatedMonthlyRent === "number" ? data.estimatedMonthlyRent : null,
    beds: typeof sp.bedrooms === "number" ? sp.bedrooms : null,
    baths: typeof sp.bathrooms === "number" ? sp.bathrooms : null,
    sqft: typeof sp.squareFootage === "number" ? sp.squareFootage : null,
    propertyType: typeof sp.propertyType === "string" ? sp.propertyType : null,
    source: "rentcast",
    fetchedAt: new Date().toISOString(),
  };
}

// Stage 1: value + propertyType + beds/baths (1 call)
export async function enrichProperty(address: string): Promise<Enrichment> {
  if (!RENTCAST_API_KEY) {
    return {
      estimatedValue: null, estimatedRent: null, beds: null, baths: null, sqft: null, propertyType: null,
      source: "none", fetchedAt: new Date().toISOString(),
    };
  }

  try {
    const url = `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(address)}`;
    const res = await fetchWithAuth(url);

    if (!res.ok) {
      console.warn(`RentCast HTTP ${res.status} for ${address}`);
      return { source: "rentcast-error" } as Enrichment;
    }

    const data = await res.json() as any;
    return parseRentCastValue(data) as Enrichment;
  } catch (err) {
    console.warn(`RentCast error: ${(err as Error).message}`);
    return { source: "rentcast-error" } as Enrichment;
  }
}

// Stage 2: rent estimate only (used for buy-box shortlist)
export async function enrichRent(address: string): Promise<{ estimatedRent: number | null; source: string; fetchedAt: string }> {
  if (!RENTCAST_API_KEY) {
    return { estimatedRent: null, source: "none", fetchedAt: new Date().toISOString() };
  }

  try {
    const url = `https://api.rentcast.io/v1/avm/rent/address?address=${encodeURIComponent(address)}`;
    const res = await fetchWithAuth(url);

    if (!res.ok) {
      console.warn(`RentCast rent HTTP ${res.status} for ${address}`);
      return { estimatedRent: null, source: "rentcast-error", fetchedAt: new Date().toISOString() };
    }

    const data = await res.json() as any;
    return {
      estimatedRent: typeof data.rent === "number" ? data.rent : null,
      source: "rentcast",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`RentCast rent error: ${(err as Error).message}`);
    return { estimatedRent: null, source: "rentcast-error", fetchedAt: new Date().toISOString() };
  }
}
