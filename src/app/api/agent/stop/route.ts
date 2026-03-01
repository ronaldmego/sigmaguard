import { NextResponse } from "next/server";
import { stopAgent } from "@/lib/agent/autonomous";

export async function POST() {
  try {
    const result = stopAgent();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/agent/stop error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
