import { fetchAllProperties } from "./arcgis-client.js";
import { enrichAndScore } from "./scoring.js";
import { renderHtml } from "./renderer.js";
import { setManualPrice, listManualPrices } from "./manual-prices.js";
import { quotaAwareEnrich } from "./quota-guard.js";
import { getCallUsage, syncInventory, clearNullCache, resetCallUsage } from "./cache.js";
import { BUY_BOX_ZIP_PREFIXES } from "./config.js";

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
  if (args[0] === "--reset-cache") {
    resetCallUsage();
    clearNullCache();
    console.log("Cleared call log and null cache entries.");
    process.exit(0);
  }

  const stateFlag = args.find((a) => a.startsWith("--state="));
  const stateCode = stateFlag ? stateFlag.split("=")[1] : "FL";

  // Default to buy-box (Miami-Dade + Broward) for FL; can override with --all-zips
  const buyBox = !args.includes("--all-zips");
  const zipPrefixes = buyBox ? BUY_BOX_ZIP_PREFIXES : undefined;

  console.log(`Fetching HUD REO properties for ${stateCode}${zipPrefixes ? " (buy-box: Miami-Dade + Broward)" : ""}...`);
  const properties = await fetchAllProperties({
    stateCode,
    pageSize: 1000,
    outFields: [
      "CASE_NUM", "STREET_NUM", "DIRECTION_PREFIX", "STREET_NAME",
      "CITY", "STATE_CODE", "DISPLAY_ZIP_CODE", "REVITE_NAME",
    ],
    returnGeometry: true,
    zipPrefixes,
  });
  console.log(`Fetched ${properties.length} properties.`);

  // Inventory tracking — only mark removals on full-state runs, not buy-box filtered runs
  if (!zipPrefixes) {
    const changes = await syncInventory(properties);
    if (changes.newCases.length > 0) console.log(`New: ${changes.newCases.length} (${changes.newCases.join(", ")})`);
    if (changes.removedCases.length > 0) console.log(`Removed: ${changes.removedCases.length} (${changes.removedCases.join(", ")})`);
  } else {
    console.log(`Buy-box filter active: ${properties.length} properties. Inventory changes not tracked for filtered runs.`);
  }

  console.log("Enriching with RentCast...");
  const enriches = await quotaAwareEnrich(properties);

  console.log("Scoring...");
  const enriched = await Promise.all(properties.map(async (p) => {
    const e = enriches.get(p.caseNumber) ?? {
      estimatedValue: null,
      estimatedRent: null,
      beds: null,
      baths: null,
      sqft: null,
      propertyType: null,
      source: "none",
      fetchedAt: new Date().toISOString(),
    };
    return enrichAndScore(p, e);
  }));

  const aCount = enriched.filter((p) => p.tier === "A").length;
  const bCount = enriched.filter((p) => p.tier === "B").length;
  const cCount = enriched.filter((p) => p.tier === "C").length;
  const reviteCount = enriched.filter((p) => p.revitalizationArea).length;

  const usage = getCallUsage();
  console.log(`\nTier A: ${aCount} | Tier B: ${bCount} | Tier C: ${cCount}`);
  console.log(`Revite areas: ${reviteCount}`);
  console.log(`Quota used: ${usage.made} | remaining: ${usage.remaining}`);

  const html = renderHtml(enriched);
  const outPath = "/tmp/hud-reo-fl.html";
  await Bun.write(outPath, html);
  console.log(`\nTracker written to file://${outPath}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
