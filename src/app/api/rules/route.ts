import { NextResponse } from "next/server";
import { getActiveRules } from "@/lib/db/queries";

// GET /api/rules — List active governance rules
export async function GET() {
  try {
    const rules = await getActiveRules();
    return NextResponse.json({ rules });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/rules error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
