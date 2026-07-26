import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processTransaction,
  executeApprovedTransaction,
  determineFinalOutcome,
  executeIntent,
  buildIntent,
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
  executeSwap: vi.fn(),
  supply: vi.fn(),
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
import { sendTransaction, executeSwap, supply } from "@/lib/wdk";

const mockInsertTransaction = vi.mocked(insertTransaction);
const mockUpdateTransactionStatus = vi.mocked(updateTransactionStatus);
const mockInsertApprovalItem = vi.mocked(insertApprovalItem);
const mockInsertAgentDecision = vi.mocked(insertAgentDecision);
const mockEvaluateRules = vi.mocked(evaluateRules);
const mockDetectAnomaly = vi.mocked(detectAnomaly);
const mockInterpretTransaction = vi.mocked(interpretTransaction);
const mockSendTransaction = vi.mocked(sendTransaction);
const mockExecuteSwap = vi.mocked(executeSwap);
const mockSupply = vi.mocked(supply);
const CHAIN = "ethereum-sepolia";

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

// ============================================================
// executeIntent — the transaction executes as what it IS
// ============================================================

describe("executeIntent", () => {
  // Before the dispatch existed, every approved transaction became a native
  // transfer to `recipient` — and for an agent swap that recipient was the
  // output token's contract address. The swap "succeeded" and the funds were
  // stranded. These tests exist so that cannot come back.

  it("routes a swap to the DEX, not to a native transfer", async () => {
    mockExecuteSwap.mockResolvedValue({ hash: "0xswap", fee: "1", tokenInAmount: "1", tokenOutAmount: "2", chain: CHAIN });

    const result = await executeIntent(CHAIN, WALLET_ADDRESS, 10, {
      action: "swap",
      swap: { tokenIn: "0xIn", tokenOut: "0xOut", tokenInAmountWei: "1000" },
    });

    expect(result.hash).toBe("0xswap");
    expect(mockExecuteSwap).toHaveBeenCalledWith(
      expect.objectContaining({ tokenIn: "0xIn", tokenOut: "0xOut", tokenInAmount: 1000n })
    );
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });

  it("routes a supply to the lending protocol, not to a native transfer", async () => {
    mockSupply.mockResolvedValue({ hash: "0xsupply", fee: "1", token: "0xTok", amount: "2500", protocol: "aave-v3", chain: CHAIN });

    const result = await executeIntent(CHAIN, WALLET_ADDRESS, 10, {
      action: "supply",
      supply: { token: "0xTok", amountWei: "2500" },
    });

    expect(result.hash).toBe("0xsupply");
    expect(mockSupply).toHaveBeenCalledWith(
      expect.objectContaining({ token: "0xTok", amount: 2500n })
    );
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });

  it("still sends a plain transfer, including when no intent was recorded", async () => {
    mockSendTransaction.mockResolvedValue({ hash: "0xnative", fee: "21000", chain: CHAIN });

    await executeIntent(CHAIN, "0xRecipient", 1, { action: "transfer" });
    await executeIntent(CHAIN, "0xRecipient", 1, undefined); // legacy rows

    expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    expect(mockExecuteSwap).not.toHaveBeenCalled();
    expect(mockSupply).not.toHaveBeenCalled();
  });

  it("refuses to fall back to a transfer when the action's parameters are missing", async () => {
    // The whole defect in one assertion: a quiet native transfer here is how
    // funds were sent to a token contract in the first place.
    await expect(executeIntent(CHAIN, WALLET_ADDRESS, 10, { action: "swap" })).rejects.toThrow(
      /refusing to fall back/
    );
    await expect(executeIntent(CHAIN, WALLET_ADDRESS, 10, { action: "supply" })).rejects.toThrow(
      /refusing to fall back/
    );
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });
});

describe("buildIntent", () => {
  it("defaults to a transfer, so existing callers are unchanged", () => {
    expect(buildIntent({ recipient: "0xa", amount: 1 })).toEqual({
      action: "transfer",
      swap: undefined,
      supply: undefined,
    });
  });

  it("carries the swap parameters into the audit trail", () => {
    const swap = { tokenIn: "0xIn", tokenOut: "0xOut", tokenInAmountWei: "5" };
    expect(buildIntent({ recipient: "0xa", amount: 1, action: "swap", swap }).swap).toEqual(swap);
  });
});

// ============================================================
// El pipeline USA el despacho — no solo lo exporta
// ============================================================

describe("processTransaction dispatches by action", () => {
  // Estos son los tests que faltaban. Los de executeIntent prueban la funcion
  // aislada: revertir el cableado del pipeline los dejaba a todos en verde,
  // con el defecto original de vuelta. Un test que no falla con el bug presente
  // es peor que no tenerlo, asi que estos observan processTransaction y
  // executeApprovedTransaction, que es donde el defecto vivia.
  const baseTransaction = makeDbTransaction();

  function approveEverything() {
    mockInsertTransaction.mockResolvedValue(baseTransaction);
    mockUpdateTransactionStatus.mockResolvedValue({ ...baseTransaction, status: "executed" });
    mockInsertAgentDecision.mockResolvedValue({} as any);
    mockInsertApprovalItem.mockResolvedValue({} as any);
    mockEvaluateRules.mockResolvedValue(makeRulesResult({ passed: true }));
    mockDetectAnomaly.mockResolvedValue(makeAnomalyResult({ is_anomaly: false }));
    mockInterpretTransaction.mockResolvedValue(
      makeAgentInterpretation({ recommendation: "auto_approve" })
    );
  }

  it("an auto-approved swap reaches the DEX, never a native transfer", async () => {
    approveEverything();
    mockExecuteSwap.mockResolvedValue({
      hash: "0xswap", fee: "1", tokenInAmount: "1000", tokenOutAmount: "2000", chain: CHAIN,
    });

    await processTransaction(WALLET_ADDRESS, {
      ...makeTransaction(),
      action: "swap",
      swap: { tokenIn: "0xIn", tokenOut: "0xOut", tokenInAmountWei: "1000" },
    });

    expect(mockExecuteSwap).toHaveBeenCalledTimes(1);
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });

  it("an auto-approved supply reaches the lending protocol", async () => {
    approveEverything();
    mockSupply.mockResolvedValue({
      hash: "0xsupply", fee: "1", token: "0xTok", amount: "2500", protocol: "aave-v3", chain: CHAIN,
    });

    await processTransaction(WALLET_ADDRESS, {
      ...makeTransaction(),
      action: "supply",
      supply: { token: "0xTok", amountWei: "2500" },
    });

    expect(mockSupply).toHaveBeenCalledTimes(1);
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });

  it("records the intent in the audit trail so a later approval can honour it", async () => {
    approveEverything();
    mockExecuteSwap.mockResolvedValue({
      hash: "0xswap", fee: "1", tokenInAmount: "1000", tokenOutAmount: "2000", chain: CHAIN,
    });

    const { result } = await processTransaction(WALLET_ADDRESS, {
      ...makeTransaction(),
      action: "swap",
      swap: { tokenIn: "0xIn", tokenOut: "0xOut", tokenInAmountWei: "1000" },
    });

    expect(result.intent).toEqual({
      action: "swap",
      swap: { tokenIn: "0xIn", tokenOut: "0xOut", tokenInAmountWei: "1000" },
      supply: undefined,
    });
  });

  it("a swap approved by a human hours later still executes as a swap", async () => {
    mockUpdateTransactionStatus.mockResolvedValue({ ...baseTransaction, status: "executed" });
    mockExecuteSwap.mockResolvedValue({
      hash: "0xswap", fee: "1", tokenInAmount: "1000", tokenOutAmount: "2000", chain: CHAIN,
    });

    await executeApprovedTransaction({
      ...baseTransaction,
      status: "pending",
      governance_result: {
        ...(baseTransaction.governance_result as any),
        intent: {
          action: "swap",
          swap: { tokenIn: "0xIn", tokenOut: "0xOut", tokenInAmountWei: "1000" },
        },
      },
    } as any);

    expect(mockExecuteSwap).toHaveBeenCalledTimes(1);
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });
});

describe("legacy rows written before execution intents", () => {
  it("refuses to execute an old agent swap as a native transfer", async () => {
    // Su `recipient` es el contrato del token de salida: ejecutarlo como
    // transferencia reproduce el defecto exacto que este PR arregla.
    mockUpdateTransactionStatus.mockResolvedValue({} as any);

    await expect(
      executeApprovedTransaction({
        ...makeDbTransaction(),
        category: "agent_swap",
        recipient: "0xOutputTokenContract",
        governance_result: null,
      } as any)
    ).rejects.toThrow(/predates execution intents/);

    expect(mockSendTransaction).not.toHaveBeenCalled();
    expect(mockExecuteSwap).not.toHaveBeenCalled();
  });

  it("still executes an ordinary old transfer, which was never ambiguous", async () => {
    mockSendTransaction.mockResolvedValue({ hash: "0xok", fee: "21000", chain: CHAIN });
    mockUpdateTransactionStatus.mockResolvedValue({} as any);

    await executeApprovedTransaction({
      ...makeDbTransaction(),
      category: "groceries",
      governance_result: null,
    } as any);

    expect(mockSendTransaction).toHaveBeenCalledTimes(1);
  });
});
