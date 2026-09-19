import "server-only";

// Rupees per US dollar, for showing creator amounts in dollars (they are
// recorded and paid in rupees). Refreshed at most once a day from free public
// sources (ECB rates via Frankfurter, then open.er-api.com as a backup), with a
// last-resort constant so the creator site never breaks.
const FALLBACK_INR_PER_USD = 95;
const DAY_SECONDS = 24 * 60 * 60;

async function fromFrankfurter() {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR", {
    next: { revalidate: DAY_SECONDS },
    signal: AbortSignal.timeout(5000),
  });
  const json = await res.json();
  return { rate: Number(json?.rates?.INR), date: json?.date ?? null, source: "ECB via Frankfurter" };
}

async function fromOpenErApi() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: DAY_SECONDS },
    signal: AbortSignal.timeout(5000),
  });
  const json = await res.json();
  return {
    rate: Number(json?.rates?.INR),
    date: json?.time_last_update_utc ?? null,
    source: "open.er-api.com",
  };
}

/** @returns {Promise<{ rate: number, date: string|null, source: string }>} */
export async function getInrPerUsd() {
  for (const source of [fromFrankfurter, fromOpenErApi]) {
    try {
      const result = await source();
      if (Number.isFinite(result.rate) && result.rate > 10 && result.rate < 1000) return result;
    } catch {
      // Try the next source.
    }
  }
  return { rate: FALLBACK_INR_PER_USD, date: null, source: "fallback" };
}
