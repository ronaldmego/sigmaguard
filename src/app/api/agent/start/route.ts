import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startAgent } from "@/lib/agent/autonomous";

const StartSchema = z.object({
  interval_seconds: z.number().int().min(30).max(3600).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = StartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = startAgent(parsed.data.interval_seconds);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/agent/start error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
