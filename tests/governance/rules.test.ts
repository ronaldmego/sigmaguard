import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateRules } from "@/lib/governance/rules";
import {
  WALLET_ADDRESS,
  makeTransaction,
  makeRule,
} from "../fixtures/governance.fixtures";

// Mock the DB queries module
vi.mock("@/lib/db/queries", () => ({
  getActiveRules: vi.fn(),
  getDailyTotal: vi.fn(),
  getTransactionCountInWindow: vi.fn(),
}));

import {
  getActiveRules,
  getDailyTotal,
  getTransactionCountInWindow,
} from "@/lib/db/queries";

const mockGetActiveRules = vi.mocked(getActiveRules);
const mockGetDailyTotal = vi.mocked(getDailyTotal);
const mockGetTransactionCountInWindow = vi.mocked(getTransactionCountInWindow);

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// max_amount
// ============================================================

describe("max_amount rule", () => {
  it("passes when amount is within limit", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ rule_type: "max_amount", config: { max_amount: 100 } }),
    ]);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction({ amount: 50 }));
    expect(result.passed).toBe(true);
    expect(result.failed_rules).toHaveLength(0);
  });

  it("passes when amount equals limit (<=)", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ rule_type: "max_amount", config: { max_amount: 100 } }),
    ]);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction({ amount: 100 }));
    expect(result.passed).toBe(true);
  });

  it("fails when amount exceeds limit", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ rule_type: "max_amount", config: { max_amount: 100 } }),
    ]);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction({ amount: 101 }));
    expect(result.passed).toBe(false);
    expect(result.failed_rules).toHaveLength(1);
    expect(result.failed_rules[0].rule_type).toBe("max_amount");
  });
});

// ============================================================
// daily_cap
// ============================================================

describe("daily_cap rule", () => {
  it("passes when projected total is under cap", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ rule_type: "daily_cap", config: { daily_cap: 500 } }),
    ]);
    mockGetDailyTotal.mockResolvedValue(200);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction({ amount: 50 }));
    expect(result.passed).toBe(true);
  });

  it("fails when projected total would exceed cap", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ rule_type: "daily_cap", config: { daily_cap: 500 } }),
    ]);
    mockGetDailyTotal.mockResolvedValue(480);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction({ amount: 50 }));
    expect(result.passed).toBe(false);
    expect(result.failed_rules[0].rule_type).toBe("daily_cap");
  });

  it("passes when first tx of day (total=0)", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ rule_type: "daily_cap", config: { daily_cap: 500 } }),
    ]);
    mockGetDailyTotal.mockResolvedValue(0);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction({ amount: 100 }));
    expect(result.passed).toBe(true);
  });
});

// ============================================================
// merchant_blacklist
// ============================================================

describe("merchant_blacklist rule", () => {
  it("passes when merchant is not listed", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "merchant_blacklist",
        config: { merchants: ["BadShop", "ScamCo"] },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ merchant: "GoodStore" })
    );
    expect(result.passed).toBe(true);
  });

  it("fails when merchant is listed (case-insensitive)", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "merchant_blacklist",
        config: { merchants: ["BadShop", "ScamCo"] },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ merchant: "badshop" })
    );
    expect(result.passed).toBe(false);
    expect(result.failed_rules[0].rule_type).toBe("merchant_blacklist");
  });

  it("passes when no merchant specified", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "merchant_blacklist",
        config: { merchants: ["BadShop"] },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ merchant: undefined })
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================================
// merchant_whitelist
// ============================================================

describe("merchant_whitelist rule", () => {
  it("passes when merchant is in whitelist", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "merchant_whitelist",
        config: { merchants: ["TrustedShop", "GoodStore"] },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ merchant: "TrustedShop" })
    );
    expect(result.passed).toBe(true);
  });

  it("fails when merchant is not in whitelist", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "merchant_whitelist",
        config: { merchants: ["TrustedShop"] },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ merchant: "RandomStore" })
    );
    expect(result.passed).toBe(false);
  });

  it("skips when no merchant specified", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "merchant_whitelist",
        config: { merchants: ["TrustedShop"] },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ merchant: undefined })
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================================
// category_limit
// ============================================================

describe("category_limit rule", () => {
  it("passes when matching category is under limit", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "category_limit",
        config: { category: "gaming", max_amount: 200 },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ category: "gaming", amount: 100 })
    );
    expect(result.passed).toBe(true);
  });

  it("fails when matching category exceeds limit", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "category_limit",
        config: { category: "gaming", max_amount: 200 },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ category: "gaming", amount: 250 })
    );
    expect(result.passed).toBe(false);
  });

  it("skips when category does not match", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "category_limit",
        config: { category: "gaming", max_amount: 50 },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ category: "transfer", amount: 200 })
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================================
// frequency_limit
// ============================================================

describe("frequency_limit rule", () => {
  it("passes when count is under limit", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "frequency_limit",
        config: { max_transactions: 10, window_minutes: 60 },
      }),
    ]);
    mockGetTransactionCountInWindow.mockResolvedValue(5);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction());
    expect(result.passed).toBe(true);
  });

  it("fails when count equals max (strict <)", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "frequency_limit",
        config: { max_transactions: 10, window_minutes: 60 },
      }),
    ]);
    mockGetTransactionCountInWindow.mockResolvedValue(10);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction());
    expect(result.passed).toBe(false);
  });

  it("fails when count exceeds max", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        rule_type: "frequency_limit",
        config: { max_transactions: 10, window_minutes: 60 },
      }),
    ]);
    mockGetTransactionCountInWindow.mockResolvedValue(15);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction());
    expect(result.passed).toBe(false);
  });
});

// ============================================================
// Integration
// ============================================================

describe("rules integration", () => {
  it("passes when there are no active rules", async () => {
    mockGetActiveRules.mockResolvedValue([]);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction());
    expect(result.passed).toBe(true);
    expect(result.evaluations).toHaveLength(0);
  });

  it("passes when multiple rules all pass", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ id: "r1", rule_type: "max_amount", config: { max_amount: 200 } }),
      makeRule({
        id: "r2",
        rule_type: "merchant_blacklist",
        config: { merchants: ["BadShop"] },
      }),
    ]);

    const result = await evaluateRules(
      WALLET_ADDRESS,
      makeTransaction({ amount: 50, merchant: "GoodStore" })
    );
    expect(result.passed).toBe(true);
    expect(result.evaluations).toHaveLength(2);
  });

  it("fails when one rule fails out of many", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({ id: "r1", rule_type: "max_amount", config: { max_amount: 200 } }),
      makeRule({ id: "r2", rule_type: "max_amount", config: { max_amount: 30 } }),
    ]);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction({ amount: 50 }));
    expect(result.passed).toBe(false);
    expect(result.failed_rules).toHaveLength(1);
    expect(result.failed_rules[0].rule_id).toBe("r2");
  });

  it("skips unknown rule types", async () => {
    mockGetActiveRules.mockResolvedValue([
      makeRule({
        id: "r1",
        rule_type: "unknown_type" as any,
        config: {},
      }),
    ]);

    const result = await evaluateRules(WALLET_ADDRESS, makeTransaction());
    expect(result.passed).toBe(true);
    expect(result.evaluations[0].reason).toContain("Unknown rule type");
  });
});
