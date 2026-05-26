import { fetchAllProperties } from "./arcgis-client.js";

async function main() {
  console.log("Fetching HUD REO properties for FL...");
  const properties = await fetchAllProperties();
  console.log(`Total properties fetched: ${properties.length}`);

  // Quick sample
  console.log("\n--- Sample (first 3) ---");
  for (const p of properties.slice(0, 3)) {
    console.log(`Case: ${p.caseNumber} | ${p.fullAddress}`);
  }

  // Write JSON
  const outPath = "/tmp/hud-reo-fl.json";
  await Bun.write(outPath, JSON.stringify(properties, null, 2));
  console.log(`\nWritten to ${outPath}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
