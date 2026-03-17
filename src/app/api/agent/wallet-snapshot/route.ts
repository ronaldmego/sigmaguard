import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pepa" } }
    );

    const { data, error } = await supabase
      .from("agent_runs")
      .select("market_data, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ snapshot: null });
    }

    const marketData = (data[0] as { market_data: Record<string, unknown> }).market_data;
    const snapshot = marketData?.wallet_snapshot as {
      eth: number;
      matic: number;
      usdt: number;
    } | undefined;

    return NextResponse.json({ snapshot: snapshot ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/agent/wallet-snapshot error:", message);
    return NextResponse.json({ snapshot: null });
  }
}
