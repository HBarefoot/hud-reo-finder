import { describe, expect, test } from "bun:test";
import { fetchAllProperties } from "../src/arcgis-client.js";
import { scoreProperty } from "../src/scoring.js";

describe("arcgis fetch", () => {
  test("returns FL properties", async () => {
    const props = await fetchAllProperties("FL");
    expect(props.length).toBeGreaterThan(0);
    expect(props[0].state).toBe("FL");
    expect(props[0].caseNumber).toBeTruthy();
    expect(props[0].fullAddress).toBeTruthy();
  });
});

describe("scoring", () => {
  test("revite + liquid + value = Tier A", () => {
    const scored = scoreProperty(
      { caseNumber: "001", fullAddress: "", city: "", zip: "", state: "FL", lat: null, lon: null, streetNumber: "", directionPrefix: null, streetName: "", revitalizationArea: "Some Area" },
      { estimatedValue: 300000, estimatedRent: 2000, beds: 3, baths: 2, sqft: 1500, source: "rentcast", fetchedAt: "2026-01-01" },
      200000
    );
    expect(scored.tier).toBe("A");
    expect(scored.score).toBe(100); // 50 + 30 + 20
    expect(scored.equitySpread).toBe(100000);
    expect(scored.equitySpreadPct).toBe(0.5);
  });

  test("no revite, no value, no list = Tier C", () => {
    const scored = scoreProperty(
      { caseNumber: "002", fullAddress: "", city: "", zip: "", state: "FL", lat: null, lon: null, streetNumber: "", directionPrefix: null, streetName: "", revitalizationArea: null },
      { estimatedValue: null, estimatedRent: null, beds: null, baths: null, sqft: null, source: "none", fetchedAt: "2026-01-01" },
      null
    );
    expect(scored.tier).toBe("C");
    expect(scored.score).toBe(0);
  });
});
