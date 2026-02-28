import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveApproval,
  updateTransactionStatus,
  getTransactionById,
} from "@/lib/db/queries";
import { executeApprovedTransaction } from "@/lib/governance/pipeline";

const ApprovalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decided_by: z.string().min(1, "decided_by is required"),
});

// POST /api/approvals/[id] — Approve or reject a pending transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = ApprovalDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Resolve the approval queue item
    const approval = await resolveApproval(id, parsed.data.decision, parsed.data.decided_by);

    if (parsed.data.decision === "approved") {
      try {
        const transaction = await getTransactionById(approval.transaction_id);
        const executedTx = await executeApprovedTransaction(transaction);

        return NextResponse.json({
          approval,
          transaction: executedTx,
          message: "Transaction approved and executed",
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          approval,
          error: `Approved but execution failed: ${errorMsg}`,
          message: "Transaction approved but execution failed",
        });
      }
    } else {
      await updateTransactionStatus(approval.transaction_id, "rejected");
      return NextResponse.json({
        approval,
        message: "Transaction rejected",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/approvals/[id] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
