import { HUD_ARCGIS_URL, defaultConfig, type ArcGISConfig } from "./config.js";
import type { ArcGISResponse, Property, RawFeature } from "./types.js";

function buildUrl(config: ArcGISConfig, offset: number): string {
  const params = new URLSearchParams({
    where: `STATE_CODE='${config.stateCode}'`,
    outFields: config.outFields.join(","),
    returnGeometry: String(config.returnGeometry),
    resultOffset: String(offset),
    resultRecordCount: String(config.pageSize),
    f: "json",
  });
  return `${HUD_ARCGIS_URL}?${params.toString()}`;
}

function normalize(feature: RawFeature): Property {
  const a = feature.attributes;
  const streetParts: string[] = [
    String(a.STREET_NUM ?? ""),
    String(a.DIRECTION_PREFIX ?? ""),
    String(a.STREET_NAME ?? ""),
  ].filter((s) => s.length > 0);

  const parts: string[] = [
    streetParts.join(" ").trim(),
    String(a.CITY ?? ""),
    String(a.STATE_CODE ?? ""),
    String(a.DISPLAY_ZIP_CODE ?? ""),
  ].filter((s) => s.length > 0);

  return {
    caseNumber: String(a.CASE_NUM ?? ""),
    streetNumber: String(a.STREET_NUM ?? ""),
    directionPrefix: a.DIRECTION_PREFIX ? String(a.DIRECTION_PREFIX) : null,
    streetName: String(a.STREET_NAME ?? ""),
    city: String(a.CITY ?? ""),
    state: String(a.STATE_CODE ?? ""),
    zip: String(a.DISPLAY_ZIP_CODE ?? ""),
    lat: feature.geometry?.y ?? null,
    lon: feature.geometry?.x ?? null,
    revitalizationArea: a.REVITE_NAME ? String(a.REVITE_NAME) : null,
    fullAddress: parts.join(", "),
  };
}

export async function fetchAllProperties(
  config: ArcGISConfig = defaultConfig
): Promise<Property[]> {
  const results: Property[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = buildUrl(config, offset);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`ArcGIS HTTP ${res.status}: ${res.statusText}`);
    }
    const data = (await res.json()) as ArcGISResponse;
    if (data.error) {
      throw new Error(`ArcGIS error ${data.error.code}: ${data.error.message}`);
    }

    const batch = data.features.map(normalize);
    results.push(...batch);

    hasMore = data.exceededTransferLimit === true;
    offset += batch.length;

    if (batch.length === 0) break; // safety
  }

  return results;
}
