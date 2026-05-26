import type { EnrichedProperty } from "./enrichment.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tierClass(tier: string): string {
  if (tier === "A") return "tier-a";
  if (tier === "B") return "tier-b";
  return "tier-c";
}

export function renderHtml(properties: EnrichedProperty[]): string {
  const rows = properties
    .sort((a, b) => b.tierScore - a.tierScore)
    .map((p) => {
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.fullAddress)}`;
      const latLon = p.lat != null && p.lon != null ? `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}` : "—";
      const revite = p.revitalizationArea ? `✓ ${escapeHtml(p.revitalizationArea)}` : "—";
      const val = p.estimatedValue ? `$${p.estimatedValue.toLocaleString()}` : "—";
      const rent = p.estimatedRent ? `$${p.estimatedRent.toLocaleString()}/mo` : "—";
      const equity = p.equitySpread != null ? `${(p.equitySpreadPct! * 100).toFixed(1)}%` : "—";
      const yieldStr = p.grossYield != null ? `${(p.grossYield * 100).toFixed(1)}%` : "—";
      const cap = p.capRate != null ? `${(p.capRate * 100).toFixed(1)}%` : "—";
      const notes = p.notes.map((n) => `\n            \u003cspan class="note-tag"\u003e${escapeHtml(n)}\u003c/span\u003e`).join("");

      return `
    \u003ctr class="${tierClass(p.tier)}"\u003e
      \u003ctd\u003e\u003cspan class="tier-badge ${tierClass(p.tier)}"\u003e${escapeHtml(p.tier)}\u003c/span\u003e\u003c/td\u003e
      \u003ctd\u003e\u003ca href="${mapLink}" target="_blank" rel="noopener"\u003e${escapeHtml(p.caseNumber)}\u003c/a\u003e\u003c/td\u003e
      \u003ctd\u003e${escapeHtml(p.fullAddress)}\u003c/td\u003e
      \u003ctd\u003e${escapeHtml(p.city)}\u003c/td\u003e
      \u003ctd\u003e${escapeHtml(p.zip)}\u003c/td\u003e
      \u003ctd\u003e${escapeHtml(revite)}\u003c/td\u003e
      \u003ctd\u003e${val}\u003c/td\u003e
      \u003ctd\u003e${rent}\u003c/td\u003e
      \u003ctd\u003e${equity}\u003c/td\u003e
      \u003ctd\u003e${yieldStr}\u003c/td\u003e
      \u003ctd\u003e${cap}\u003c/td\u003e
      \u003ctd\u003e${latLon}\u003c/td\u003e
      \u003ctd\u003e\u003cdiv class="notes"\u003e${notes}\u003c/div\u003e\u003c/td\u003e
    \u003c/tr\u003e`;
    })
    .join("");

  return `\u003c!DOCTYPE html\u003e
\u003chtml lang="en"\u003e
\u003chead\u003e
\u003cmeta charset="UTF-8"\u003e
\u003cmeta name="viewport" content="width=device-width, initial-scale=1.0"\u003e
\u003ctitle\u003eHUD REO Tracker — FL\u003c/title\u003e
\u003cstyle\u003e
  :root { --bg:#0d1117; --card:#161b22;--border:#30363d; --text:#c9d1d9; --muted:#8b949e; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);padding:2rem}
  h1{margin-bottom:1rem;font-size:1.5rem}
  .stats{display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
  .stat{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;min-width:120px}
  .stat .label{font-size:0.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em}
  .stat .value{font-size:1.25rem;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:0.9rem}
  th,td{padding:0.6rem 0.7rem;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
  th{position:sticky;top:0;background:var(--card);color:var(--muted);font-weight:600;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer}
  tr:hover{background:rgba(255,255,255,0.03)}
  .tier-a{background:rgba(35,197,94,0.08)}
  .tier-b{background:rgba(234,179,8,0.06)}
  .tier-c{background:transparent}
  .tier-badge{display:inline-block;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em}
  .tier-a .tier-badge{background:rgba(35,197,94,0.15);color:#4ade80}
  .tier-b .tier-badge{background:rgba(234,179,8,0.15);color:#facc15}
  .tier-c .tier-badge{background:rgba(148,163,184,0.15);color:#94a3b8}
  a{color:#60a5fa;text-decoration:none}
  a:hover{text-decoration:underline}
  .notes{display:flex;flex-wrap:wrap;gap:0.35rem}
  .note-tag{font-size:0.7rem;background:var(--card);border:1px solid var(--border);padding:0.15rem 0.35rem;border-radius:4px;color:var(--muted)}
\u003c/style\u003e
\u003c/head\u003e
\u003cbody\u003e
\u003ch1\u003eHUD REO Tracker — FL (${properties.length} properties)\u003c/h1\u003e
\u003cdiv class="stats"\u003e
  \u003cdiv class="stat"\u003e\u003cdiv class="label"\u003eTier A\u003c/div\u003e\u003cdiv class="value"\u003e${properties.filter((p) => p.tier === "A").length}\u003c/div\u003e\u003c/div\u003e
  \u003cdiv class="stat"\u003e\u003cdiv class="label"\u003eTier B\u003c/div\u003e\u003cdiv class="value"\u003e${properties.filter((p) => p.tier === "B").length}\u003c/div\u003e\u003c/div\u003e
  \u003cdiv class="stat"\u003e\u003cdiv class="label"\u003eTier C\u003c/div\u003e\u003cdiv class="value"\u003e${properties.filter((p) => p.tier === "C").length}\u003c/div\u003e\u003c/div\u003e
  \u003cdiv class="stat"\u003e\u003cdiv class="label"\u003eRevite\u003c/div\u003e\u003cdiv class="value"\u003e${properties.filter((p) => p.revitalizationArea).length}\u003c/div\u003e\u003c/div\u003e
\u003c/div\u003e
\u003ctable\u003e
  \u003cthead\u003e
    \u003ctr\u003e\u003cth\u003eTier\u003c/th\u003e\u003cth\u003eCase\u003c/th\u003e\u003cth\u003eAddress\u003c/th\u003e\u003cth\u003eCity\u003c/th\u003e\u003cth\u003eZip\u003c/th\u003e\u003cth\u003eRevite\u003c/th\u003e\u003cth\u003eEst. Value\u003c/th\u003e\u003cth\u003eEst. Rent\u003c/th\u003e\u003cth\u003eEquity%\u003c/th\u003e\u003cth\u003eYield\u003c/th\u003e\u003cth\u003eCap%\u003c/th\u003e\u003cth\u003eLat/Lon\u003c/th\u003e\u003cth\u003eNotes\u003c/th\u003e\u003c/tr\u003e
  \u003c/thead\u003e
  \u003ctbody\u003e${rows}
  \u003c/tbody\u003e
\u003c/table\u003e
\u003c/body\u003e
\u003c/html\u003e`;
}
