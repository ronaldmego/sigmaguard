import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  interpretTransaction,
  validateRecommendation,
} from "@/lib/governance/agent";
import {
  makeTransaction,
  makeRulesResult,
  makeAnomalyResult,
} from "../fixtures/governance.fixtures";
import type { AgentRecommendation, RulesResult, AnomalyResult } from "@/types";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  const createMock = vi.fn();
  return {
    default: class MockAnthropic {
      messages = {
        create: createMock,
      };
    },
    __createMock: createMock,
  };
});

// Get a handle on the mock — we need to access it through the module
import Anthropic from "@anthropic-ai/sdk";

function getCreateMock() {
  const client = new Anthropic({ apiKey: "test" });
  return vi.mocked(client.messages.create);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");
});

// ============================================================
// validateRecommendation — full truth table (9 combos)
// ============================================================

describe("validateRecommendation", () => {
  const rulesFailed = makeRulesResult({ passed: false });
  const rulesPassed = makeRulesResult({ passed: true });
  const noAnomaly = makeAnomalyResult({ is_anomaly: false });
  const hasAnomaly = makeAnomalyResult({ is_anomaly: true });

  // Rules failed → always reject (3 cases)
  it("rejects when rules failed + no anomaly + LLM says auto_approve", () => {
    expect(validateRecommendation("auto_approve", rulesFailed, noAnomaly)).toBe("reject");
  });

  it("rejects when rules failed + no anomaly + LLM says flag_for_review", () => {
    expect(validateRecommendation("flag_for_review", rulesFailed, noAnomaly)).toBe("reject");
  });

  it("rejects when rules failed + anomaly + LLM says auto_approve", () => {
    expect(validateRecommendation("auto_approve", rulesFailed, hasAnomaly)).toBe("reject");
  });

  // Rules passed + anomaly → at minimum flag_for_review (3 cases)
  it("overrides to flag_for_review when anomaly + LLM says auto_approve", () => {
    expect(validateRecommendation("auto_approve", rulesPassed, hasAnomaly)).toBe(
      "flag_for_review"
    );
  });

  it("keeps flag_for_review when anomaly + LLM says flag_for_review", () => {
    expect(validateRecommendation("flag_for_review", rulesPassed, hasAnomaly)).toBe(
      "flag_for_review"
    );
  });

  it("keeps reject when anomaly + LLM says reject", () => {
    expect(validateRecommendation("reject", rulesPassed, hasAnomaly)).toBe("reject");
  });

  // Rules passed + no anomaly → LLM decides (3 cases)
  it("allows auto_approve when no anomaly + LLM says auto_approve", () => {
    expect(validateRecommendation("auto_approve", rulesPassed, noAnomaly)).toBe("auto_approve");
  });

  it("allows flag_for_review when no anomaly + LLM says flag_for_review", () => {
    expect(validateRecommendation("flag_for_review", rulesPassed, noAnomaly)).toBe(
      "flag_for_review"
    );
  });

  it("allows reject when no anomaly + LLM says reject", () => {
    expect(validateRecommendation("reject", rulesPassed, noAnomaly)).toBe("reject");
  });
});

// ============================================================
// interpretTransaction (mocked Anthropic)
// ============================================================

describe("interpretTransaction", () => {
  function mockCompletion(content: string, usage?: { input_tokens: number; output_tokens: number }) {
    const createMock = getCreateMock();
    createMock.mockResolvedValue({
      content: [{ type: "text", text: content }],
      usage: usage ?? { input_tokens: 100, output_tokens: 50 },
    } as any);
  }

  it("parses valid JSON response correctly", async () => {
    mockCompletion(
      JSON.stringify({
        explanation: "Normal transaction within limits.",
        recommendation: "auto_approve",
        confidence: 0.9,
      })
    );

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: true }),
      makeAnomalyResult({ is_anomaly: false })
    );

    expect(result.explanation).toBe("Normal transaction within limits.");
    expect(result.recommendation).toBe("auto_approve");
    expect(result.confidence).toBe(0.9);
    expect(result.model_used).toBe("claude-sonnet-4-6");
  });

  it("falls back to flag_for_review on invalid JSON", async () => {
    mockCompletion("This is not valid JSON{{{");

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: true }),
      makeAnomalyResult({ is_anomaly: false })
    );

    expect(result.recommendation).toBe("flag_for_review");
    expect(result.confidence).toBe(0);
  });

  it("clamps confidence > 1 to 1", async () => {
    mockCompletion(
      JSON.stringify({
        explanation: "test",
        recommendation: "auto_approve",
        confidence: 5.0,
      })
    );

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: true }),
      makeAnomalyResult({ is_anomaly: false })
    );

    expect(result.confidence).toBe(1);
  });

  it("clamps confidence < 0 to 0", async () => {
    mockCompletion(
      JSON.stringify({
        explanation: "test",
        recommendation: "auto_approve",
        confidence: -0.5,
      })
    );

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: true }),
      makeAnomalyResult({ is_anomaly: false })
    );

    expect(result.confidence).toBe(0);
  });

  it("defaults confidence to 0.5 when missing", async () => {
    mockCompletion(
      JSON.stringify({
        explanation: "test",
        recommendation: "auto_approve",
      })
    );

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: true }),
      makeAnomalyResult({ is_anomaly: false })
    );

    expect(result.confidence).toBe(0.5);
  });

  it("tracks token usage from response", async () => {
    mockCompletion(
      JSON.stringify({
        explanation: "test",
        recommendation: "auto_approve",
        confidence: 0.9,
      }),
      { input_tokens: 200, output_tokens: 80 }
    );

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: true }),
      makeAnomalyResult({ is_anomaly: false })
    );

    expect(result.tokens_used).toBe(280);
  });

  it("throws when ANTHROPIC_API_KEY is not set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    await expect(
      interpretTransaction(
        makeTransaction(),
        makeRulesResult({ passed: true }),
        makeAnomalyResult({ is_anomaly: false })
      )
    ).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("applies safety override: anomaly + LLM auto_approve → flag_for_review", async () => {
    mockCompletion(
      JSON.stringify({
        explanation: "Looks fine to me",
        recommendation: "auto_approve",
        confidence: 0.8,
      })
    );

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: true }),
      makeAnomalyResult({ is_anomaly: true })
    );

    expect(result.recommendation).toBe("flag_for_review");
  });

  it("applies safety override: rules failed + LLM auto_approve → reject", async () => {
    mockCompletion(
      JSON.stringify({
        explanation: "Looks fine to me",
        recommendation: "auto_approve",
        confidence: 0.8,
      })
    );

    const result = await interpretTransaction(
      makeTransaction(),
      makeRulesResult({ passed: false }),
      makeAnomalyResult({ is_anomaly: false })
    );

    expect(result.recommendation).toBe("reject");
  });
});
