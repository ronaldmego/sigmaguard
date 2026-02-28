import { NextResponse } from "next/server";
import { getWalletBalance, CHAINS } from "@/lib/wdk";

// GET /api/wallet — Get wallet address and balance for all chains
export async function GET() {
  try {
    const balances = await Promise.allSettled(
      Object.keys(CHAINS).map((chain) => getWalletBalance(chain))
    );

    const wallets = balances
      .map((result, index) => {
        const chainKey = Object.keys(CHAINS)[index];
        if (result.status === "fulfilled") {
          return result.value;
        }
        return {
          chain: chainKey,
          address: "unavailable",
          nativeBalance: "0",
          nativeSymbol: CHAINS[chainKey].nativeCurrency,
          error: result.reason?.message ?? "Failed to fetch balance",
        };
      });

    return NextResponse.json({ wallets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/wallet error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
