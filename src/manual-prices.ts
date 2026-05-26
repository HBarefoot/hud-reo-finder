import { join } from "path";
import { homedir } from "os";

const MANUAL_PATH = process.env.MANUAL_PRICES_PATH ?? join(homedir(), ".config", "hud-reo-finder", "manual-prices.json");

type ManualEntry = {
  caseNum: string;
  listPrice: number;
  source: "manual" | "hud-spike";
  enteredAt: string;
  updatedAt: string;
};

type Store = Record<string, ManualEntry>;

async function loadStore(): Promise<Store> {
  try {
    const text = await Bun.file(MANUAL_PATH).text();
    return JSON.parse(text) as Store;
  } catch {
    return {};
  }
}

async function persistStore(store: Store): Promise<void> {
  await Bun.write(MANUAL_PATH, JSON.stringify(store, null, 2));
}

export async function getManualPrice(caseNum: string): Promise<number | null> {
  const store = await loadStore();
  return store[caseNum]?.listPrice ?? null;
}

export async function setManualPrice(caseNum: string, price: number, source: "manual" | "hud-spike" = "manual"): Promise<void> {
  const store = await loadStore();
  const now = new Date().toISOString();
  store[caseNum] = {
    caseNum,
    listPrice: price,
    source,
    enteredAt: store[caseNum]?.enteredAt ?? now,
    updatedAt: now,
  };
  await persistStore(store);
  console.log(`[manual] ${caseNum} → ${price.toLocaleString()} (${source})`);
}

export async function listManualPrices(): Promise<ManualEntry[]> {
  const store = await loadStore();
  return Object.values(store).sort((a, b) => a.caseNum.localeCompare(b.caseNum));
}

export async function clearManualPrice(caseNum: string): Promise<void> {
  const store = await loadStore();
  delete store[caseNum];
  await persistStore(store);
}
