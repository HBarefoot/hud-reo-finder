import { HUD_ARCGIS_URL, defaultConfig, type ArcGISConfig } from "./config.js";
import type { ArcGISResponse, Property, RawFeature } from "./types.js";
import { mercatorToLatLon } from "./mercator.js";

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
    String(a.STREET_NUM ?? "").trim(),
    String(a.DIRECTION_PREFIX ?? "").trim(),
    String(a.STREET_NAME ?? "").trim(),
  ].filter((s) => s.length > 0);

  const parts: string[] = [
    streetParts.join(" ").trim(),
    String(a.CITY ?? "").trim(),
    String(a.STATE_CODE ?? "").trim(),
    String(a.DISPLAY_ZIP_CODE ?? "").trim(),
  ].filter((s) => s.length > 0);

  const coords = feature.geometry
    ? mercatorToLatLon(feature.geometry.x, feature.geometry.y)
    : { lat: null, lon: null };

  return {
    caseNumber: String(a.CASE_NUM ?? ""),
    streetNumber: String(a.STREET_NUM ?? "").trim(),
    directionPrefix: a.DIRECTION_PREFIX ? String(a.DIRECTION_PREFIX).trim() : null,
    streetName: String(a.STREET_NAME ?? "").trim(),
    city: String(a.CITY ?? "").trim(),
    state: String(a.STATE_CODE ?? "").trim(),
    zip: String(a.DISPLAY_ZIP_CODE ?? "").trim(),
    lat: coords.lat,
    lon: coords.lon,
    revitalizationArea: (a.REVITE_NAME && String(a.REVITE_NAME).trim() !== "None")
      ? String(a.REVITE_NAME).trim()
      : null,
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
