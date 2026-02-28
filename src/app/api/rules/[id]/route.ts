import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateRule } from "@/lib/db/queries";

const UpdateRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional(),
});

// PUT /api/rules/[id] — Update a governance rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const rule = await updateRule(id, parsed.data);
    return NextResponse.json({ rule });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("PUT /api/rules/[id] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
