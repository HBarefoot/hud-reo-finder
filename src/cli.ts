import { fetchAllProperties } from "./arcgis-client.js";
import { enrichAndScore } from "./scoring.js";
import { renderHtml } from "./renderer.js";
import { setManualPrice, listManualPrices } from "./manual-prices.js";

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--price" && args[1] && args[2]) {
    await setManualPrice(args[1], Number(args[2].replace(/,/g, "")));
    process.exit(0);
  }
  if (args[0] === "--list-prices") {
    const prices = await listManualPrices();
    if (prices.length === 0) console.log("No manual prices yet.");
    for (const p of prices) console.log(`${p.caseNum}\t${p.listPrice.toLocaleString()}\t${p.source}\t${p.updatedAt}`);
    process.exit(0);
  }

  console.log("Fetching HUD REO properties for FL...");
  const properties = await fetchAllProperties();
  console.log(`Fetched ${properties.length} properties.`);

  const enriched = await Promise.all(properties.map(enrichAndScore));

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
