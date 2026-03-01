import { NextResponse } from "next/server";
import { getAgentStatus } from "@/lib/agent/autonomous";
import { getAllStrategies } from "@/lib/db/queries";

export async function GET() {
  try {
    const [status, strategies] = await Promise.all([
      getAgentStatus(),
      getAllStrategies(),
    ]);

    return NextResponse.json({ ...status, strategies_list: strategies });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/agent/status error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
