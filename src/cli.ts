import { fetchAllProperties } from "./arcgis-client.js";
import { enrichAndScore } from "./scoring.js";
import { renderHtml } from "./renderer.js";

async function main() {
  console.log("Fetching HUD REO properties for FL...");
  const properties = await fetchAllProperties();
  console.log(`Fetched ${properties.length} properties.`);

  console.log("Scoring...");
  const enriched = properties.map(enrichAndScore);

  const aCount = enriched.filter((p) => p.tier === "A").length;
  const bCount = enriched.filter((p) => p.tier === "B").length;
  const cCount = enriched.filter((p) => p.tier === "C").length;
  const reviteCount = enriched.filter((p) => p.revitalizationArea).length;

  console.log(`\nTier A: ${aCount} | Tier B: ${bCount} | Tier C: ${cCount}`);
  console.log(`Revite areas: ${reviteCount}`);

  const html = renderHtml(enriched);
  const outPath = "/tmp/hud-reo-fl.html";
  await Bun.write(outPath, html);
  console.log(`\nTracker written to file://${outPath}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
