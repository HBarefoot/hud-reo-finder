// Enricher interface: pluggable value/estimation sources
export interface Enrichment {
  estimatedValue: number | null;
  estimatedRent: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  source: string;
  fetchedAt: string;
}

export interface EnrichedProperty {
  caseNumber: string;
  fullAddress: string;
  city: string;
  zip: string;
  lat: number | null;
  lon: number | null;
  revitalizationArea: string | null;
  // enrichment
  estimatedValue: number | null;
  estimatedRent: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  valueSource: string;
  enrichmentFetchedAt: string | null;
  // tier
  tier: "A" | "B" | "C";
  tierScore: number;
  notes: string[];
  // manual price
  listPrice: number | null;
  equitySpread: number | null;
  // equity rank
  equityScore: number | null;
}

export type Enricher = (address: string, zip: string) => Promise<Enrichment>;

// Placeholder enricher: no RentCast key yet. Returns nulls but marks source.
export async function nullEnricher(_address: string, _zip: string): Promise<Enrichment> {
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
