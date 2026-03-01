import { NextRequest, NextResponse } from "next/server";
import { getAgentRunHistory } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const offset = Number(searchParams.get("offset") ?? 0);
    const strategyId = searchParams.get("strategy_id") ?? undefined;

    const runs = await getAgentRunHistory({
      limit,
      offset,
      strategy_id: strategyId,
    });

    return NextResponse.json({ runs, count: runs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/agent/history error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
