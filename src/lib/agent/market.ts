import type { MarketData } from "@/types";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// Map our chain keys to CoinGecko IDs
const CHAIN_TO_COINGECKO: Record<string, string> = {
  "ethereum-sepolia": "ethereum",
  "polygon-amoy": "matic-network",
};

const COINGECKO_TO_CHAIN: Record<string, string> = {
  ethereum: "ethereum-sepolia",
  "matic-network": "polygon-amoy",
};

// In-memory cache (60s TTL)
let cachedData: MarketData | null = null;
let cacheExpiresAt = 0;

const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

export async function fetchMarketData(): Promise<MarketData> {
  // Return cache if fresh
  if (cachedData && Date.now() < cacheExpiresAt) {
    return cachedData;
  }

  const coinIds = Object.values(CHAIN_TO_COINGECKO).join(",");
  const url = `${COINGECKO_API}?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const raw = (await response.json()) as Record<
      string,
      { usd: number; usd_24h_change: number }
    >;

    // Map CoinGecko IDs to our chain keys
    const prices: MarketData["prices"] = {};
    for (const [geckoId, data] of Object.entries(raw)) {
      const chainKey = COINGECKO_TO_CHAIN[geckoId];
      if (chainKey) {
        prices[chainKey] = {
          usd: data.usd,
          usd_24h_change: data.usd_24h_change ?? 0,
        };
      }
    }

    const marketData: MarketData = {
      prices,
      fetched_at: new Date().toISOString(),
    };

    // Update cache
    cachedData = marketData;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    return marketData;
  } catch (err) {
    // Fallback to stale cache if available
    if (cachedData) {
      console.warn(
        `[PEPA] CoinGecko fetch failed, using stale cache: ${err instanceof Error ? err.message : err}`
      );
      return cachedData;
    }

    // No cache at all — throw
    throw new Error(
      `Failed to fetch market data: ${err instanceof Error ? err.message : err}`
    );
  }
}

// Exposed for testing
export function clearMarketCache(): void {
  cachedData = null;
  cacheExpiresAt = 0;
}

export function setMarketCache(data: MarketData): void {
  cachedData = data;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}
