import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processTransaction } from "@/lib/governance/pipeline";
import { getTransactions } from "@/lib/db/queries";
import { getWalletAddress } from "@/lib/wdk";

const TransactionSchema = z.object({
  recipient: z.string().min(1, "Recipient is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().optional().default("USDT"),
  chain: z.string().optional().default("ethereum-sepolia"),
  category: z.string().optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
});

// POST /api/transactions — Submit transaction through governance pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = TransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const walletAddress = await getWalletAddress(parsed.data.chain);
    const { transaction, result } = await processTransaction(
      walletAddress,
      parsed.data
    );

    return NextResponse.json({
      transaction,
      governance: {
        final_outcome: result.final_outcome,
        rules_passed: result.rules_result.passed,
        is_anomaly: result.anomaly_result.is_anomaly,
        z_score: result.anomaly_result.z_score,
        explanation: result.agent_interpretation.explanation,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/transactions error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/transactions — List transactions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const offset = Number(searchParams.get("offset") ?? 0);
    const status = searchParams.get("status") ?? undefined;

    const transactions = await getTransactions({ limit, offset, status });

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/transactions error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
