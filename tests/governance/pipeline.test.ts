import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processTransaction,
  executeApprovedTransaction,
  determineFinalOutcome,
} from "@/lib/governance/pipeline";
import {
  WALLET_ADDRESS,
  makeTransaction,
  makeDbTransaction,
  makeRulesResult,
  makeAnomalyResult,
  makeAgentInterpretation,
} from "../fixtures/governance.fixtures";

// Mock all dependencies
vi.mock("@/lib/db/queries", () => ({
  insertTransaction: vi.fn(),
  updateTransactionStatus: vi.fn(),
  insertApprovalItem: vi.fn(),
  insertAgentDecision: vi.fn(),
}));

vi.mock("@/lib/governance/rules", () => ({
  evaluateRules: vi.fn(),
}));

vi.mock("@/lib/governance/anomaly", () => ({
  detectAnomaly: vi.fn(),
}));

vi.mock("@/lib/governance/agent", () => ({
  interpretTransaction: vi.fn(),
}));

vi.mock("@/lib/wdk", () => ({
  sendTransaction: vi.fn(),
}));

import {
  insertTransaction,
  updateTransactionStatus,
  insertApprovalItem,
  insertAgentDecision,
} from "@/lib/db/queries";
import { evaluateRules } from "@/lib/governance/rules";
import { detectAnomaly } from "@/lib/governance/anomaly";
import { interpretTransaction } from "@/lib/governance/agent";
import { sendTransaction } from "@/lib/wdk";

const mockInsertTransaction = vi.mocked(insertTransaction);
const mockUpdateTransactionStatus = vi.mocked(updateTransactionStatus);
const mockInsertApprovalItem = vi.mocked(insertApprovalItem);
const mockInsertAgentDecision = vi.mocked(insertAgentDecision);
const mockEvaluateRules = vi.mocked(evaluateRules);
const mockDetectAnomaly = vi.mocked(detectAnomaly);
const mockInterpretTransaction = vi.mocked(interpretTransaction);
const mockSendTransaction = vi.mocked(sendTransaction);

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// determineFinalOutcome — 5 key combos
// ============================================================

describe("determineFinalOutcome", () => {
  it("rejects when rules failed (regardless of anomaly/agent)", () => {
    expect(determineFinalOutcome(false, false, "auto_approve")).toBe("reject");
    expect(determineFinalOutcome(false, true, "auto_approve")).toBe("reject");
  });

  it("flags for review when anomaly detected (rules passed)", () => {
    expect(determineFinalOutcome(true, true, "auto_approve")).toBe("flag_for_review");
    expect(determineFinalOutcome(true, true, "reject")).toBe("flag_for_review");
  });

  it("respects agent flag_for_review when no anomaly", () => {
    expect(determineFinalOutcome(true, false, "flag_for_review")).toBe("flag_for_review");
  });

  // The claim on the box is "AI explains, never decides". These are the tests
  // that make it true instead of decorative.
  it("never lets the agent end a transaction — a reject recommendation summons a human", () => {
    expect(determineFinalOutcome(true, false, "reject")).toBe("flag_for_review");
  });

  it("only deterministic rules can reject outright", () => {
    const outcomes = ["auto_approve", "flag_for_review", "reject", "anything_else"].map(
      (recommendation) => determineFinalOutcome(true, false, recommendation)
    );
    expect(outcomes).not.toContain("reject");
    // ...and when the rules do fail, no agent recommendation can rescue it.
    expect(determineFinalOutcome(false, false, "auto_approve")).toBe("reject");
  });

  it("never lets the agent de-escalate what an earlier layer raised", () => {
    // An anomaly, or failed rules, cannot be talked down by the model.
    expect(determineFinalOutcome(true, true, "auto_approve")).toBe("flag_for_review");
    expect(determineFinalOutcome(false, true, "auto_approve")).toBe("reject");
  });

  it("auto-approves when all clear", () => {
    expect(determineFinalOutcome(true, false, "auto_approve")).toBe("auto_approve");
  });
});

// ============================================================
// processTransaction
// ============================================================

describe("processTransaction", () => {
  const baseTransaction = makeDbTransaction();

  function setupMocksForOutcome(
    rulesPassed: boolean,
    isAnomaly: boolean,
    recommendation: "auto_approve" | "flag_for_review" | "reject"
  ) {
    mockInsertTransaction.mockResolvedValue(baseTransaction);
    mockUpdateTransactionStatus.mockResolvedValue({
      ...baseTransaction,
      status: "executed",
    });
    mockInsertAgentDecision.mockResolvedValue({} as any);
    mockInsertApprovalItem.mockResolvedValue({} as any);
    mockEvaluateRules.mockResolvedValue(makeRulesResult({ passed: rulesPassed }));
    mockDetectAnomaly.mockResolvedValue(makeAnomalyResult({ is_anomaly: isAnomaly }));
    mockInterpretTransaction.mockResolvedValue(
      makeAgentInterpretation({ recommendation })
    );
  }

  it("auto-approves and calls WDK when all clear", async () => {
    setupMocksForOutcome(true, false, "auto_approve");
    mockSendTransaction.mockResolvedValue({ hash: "0xabc123", fee: "21000", chain: "ethereum-sepolia" });

    const { result } = await processTransaction(WALLET_ADDRESS, makeTransaction());

    expect(result.final_outcome).toBe("auto_approve");
    expect(mockSendTransaction).toHaveBeenCalled();
    expect(mockUpdateTransactionStatus).toHaveBeenCalledWith(
      baseTransaction.id,
      "executed",
      "0xabc123",
      expect.anything()
    );
  });

  it("sets status=approved when WDK execution fails", async () => {
    setupMocksForOutcome(true, false, "auto_approve");
    mockSendTransaction.mockRejectedValue(new Error("WDK network error"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = await processTransaction(WALLET_ADDRESS, makeTransaction());

    expect(result.final_outcome).toBe("auto_approve");
    expect(mockUpdateTransactionStatus).toHaveBeenCalledWith(
      baseTransaction.id,
      "approved",
      undefined,
      expect.anything()
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("pushes to approval queue when flagged for review", async () => {
    setupMocksForOutcome(true, true, "flag_for_review");

    const { result } = await processTransaction(WALLET_ADDRESS, makeTransaction());

    expect(result.final_outcome).toBe("flag_for_review");
    expect(mockInsertApprovalItem).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_id: baseTransaction.id,
        flag_source: "anomaly",
      })
    );
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });

  it("rejects when rules fail — no WDK call", async () => {
    setupMocksForOutcome(false, false, "reject");

    const { result } = await processTransaction(WALLET_ADDRESS, makeTransaction());

    expect(result.final_outcome).toBe("reject");
    expect(mockSendTransaction).not.toHaveBeenCalled();
    expect(mockUpdateTransactionStatus).toHaveBeenCalledWith(
      baseTransaction.id,
      "rejected",
      undefined,
      expect.anything()
    );
  });

  it("always records audit trail via insertAgentDecision", async () => {
    setupMocksForOutcome(true, false, "auto_approve");
    mockSendTransaction.mockResolvedValue({ hash: "0x123", fee: "21000", chain: "ethereum-sepolia" });

    await processTransaction(WALLET_ADDRESS, makeTransaction());

    expect(mockInsertAgentDecision).toHaveBeenCalledTimes(1);
    expect(mockInsertAgentDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_id: baseTransaction.id,
      })
    );
  });

  it("marks transaction as failed and throws on pipeline error", async () => {
    mockInsertTransaction.mockResolvedValue(baseTransaction);
    mockEvaluateRules.mockRejectedValue(new Error("DB connection lost"));
    mockUpdateTransactionStatus.mockResolvedValue({
      ...baseTransaction,
      status: "failed",
    });

    await expect(
      processTransaction(WALLET_ADDRESS, makeTransaction())
    ).rejects.toThrow("Governance pipeline failed");

    expect(mockUpdateTransactionStatus).toHaveBeenCalledWith(
      baseTransaction.id,
      "failed"
    );
  });
});

// ============================================================
// executeApprovedTransaction
// ============================================================

describe("executeApprovedTransaction", () => {
  const approvedTx = makeDbTransaction({ status: "approved" });

  it("executes via WDK and returns updated transaction", async () => {
    mockSendTransaction.mockResolvedValue({ hash: "0xdef456", fee: "21000", chain: "ethereum-sepolia" });
    mockUpdateTransactionStatus.mockResolvedValue({
      ...approvedTx,
      status: "executed",
      tx_hash: "0xdef456",
    });

    const result = await executeApprovedTransaction(approvedTx);

    expect(result.status).toBe("executed");
    expect(result.tx_hash).toBe("0xdef456");
    expect(mockSendTransaction).toHaveBeenCalled();
  });

  it("marks as failed and throws when WDK fails", async () => {
    mockSendTransaction.mockRejectedValue(new Error("Insufficient funds"));
    mockUpdateTransactionStatus.mockResolvedValue({
      ...approvedTx,
      status: "failed",
    });

    await expect(executeApprovedTransaction(approvedTx)).rejects.toThrow(
      "Failed to execute approved tx"
    );

    expect(mockUpdateTransactionStatus).toHaveBeenCalledWith(
      approvedTx.id,
      "failed"
    );
  });
});
