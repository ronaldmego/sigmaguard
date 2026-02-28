import { NextResponse } from "next/server";
import { getPendingApprovals } from "@/lib/db/queries";

// GET /api/approvals — List pending approvals with transaction details and agent explanation
export async function GET() {
  try {
    const approvals = await getPendingApprovals();
    return NextResponse.json({ approvals, count: approvals.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/approvals error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
