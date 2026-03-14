import { describe, it, expect, vi, beforeEach } from "vitest";
import { quoteSupply, supply, getAccountData, LENDING_TOKENS } from "@/lib/wdk/lending";

const mockQuoteSupplyFn = vi.fn();
const mockSupplyFn = vi.fn();
const mockGetAccountDataFn = vi.fn();

vi.mock("@/lib/wdk/wallet", () => ({
  getWdk: vi.fn(),
}));

vi.mock("@tetherto/wdk-protocol-lending-aave-evm", async () => {
  return {
    default: class MockAave {
      quoteSupply(...args: unknown[]) { return mockQuoteSupplyFn(...args); }
      supply(...args: unknown[]) { return mockSupplyFn(...args); }
      getAccountData(...args: unknown[]) { return mockGetAccountDataFn(...args); }
    },
  };
});

import { getWdk } from "@/lib/wdk/wallet";
const mockGetWdkFn = vi.mocked(getWdk);

beforeEach(() => {
  vi.clearAllMocks();
});

function setupWdk() {
  const mockAccount = { getAddress: vi.fn().mockResolvedValue("0xabc") };
  const mockWdk = { getAccount: vi.fn().mockResolvedValue(mockAccount) };
  mockGetWdkFn.mockReturnValue(mockWdk as any);
  return mockWdk;
}

// ============================================================
// LENDING_TOKENS config
// ============================================================

describe("LENDING_TOKENS", () => {
  it("has token addresses for ethereum-sepolia", () => {
    expect(LENDING_TOKENS["ethereum-sepolia"]).toBeDefined();
    expect(LENDING_TOKENS["ethereum-sepolia"]["USDT"]).toMatch(/^0x/);
    expect(LENDING_TOKENS["ethereum-sepolia"]["USDC"]).toMatch(/^0x/);
    expect(LENDING_TOKENS["ethereum-sepolia"]["DAI"]).toMatch(/^0x/);
  });

  it("has token addresses for polygon-amoy", () => {
    expect(LENDING_TOKENS["polygon-amoy"]).toBeDefined();
    expect(LENDING_TOKENS["polygon-amoy"]["USDT"]).toMatch(/^0x/);
  });
});

// ============================================================
// quoteSupply
// ============================================================

describe("quoteSupply", () => {
  it("returns quote with correct shape", async () => {
    setupWdk();
    mockQuoteSupplyFn.mockResolvedValue({ fee: 30000000000000n });

    const quote = await quoteSupply({
      chain: "ethereum-sepolia",
      token: LENDING_TOKENS["ethereum-sepolia"]["USDT"],
      amount: 1000000n,
    });

    expect(quote.fee).toBe("30000000000000");
    expect(quote.chain).toBe("ethereum-sepolia");
    expect(quote.protocol).toBe("aave-v3");
    expect(mockQuoteSupplyFn).toHaveBeenCalledTimes(1);
  });

  it("uses default chain when not specified", async () => {
    const mockWdk = setupWdk();
    mockQuoteSupplyFn.mockResolvedValue({ fee: 0n });

    await quoteSupply({
      token: "0xToken",
      amount: 100n,
    });

    expect(mockWdk.getAccount).toHaveBeenCalledWith("ethereum-sepolia", 0);
  });

  it("propagates errors from protocol", async () => {
    setupWdk();
    mockQuoteSupplyFn.mockRejectedValue(new Error("Pool frozen"));

    await expect(
      quoteSupply({ token: "0xA", amount: 100n })
    ).rejects.toThrow("Pool frozen");
  });
});

// ============================================================
// supply
// ============================================================

describe("supply", () => {
  it("returns result with hash", async () => {
    setupWdk();
    mockSupplyFn.mockResolvedValue({ hash: "0xsupply123", fee: 45000000000000n });

    const result = await supply({
      chain: "ethereum-sepolia",
      token: LENDING_TOKENS["ethereum-sepolia"]["USDT"],
      amount: 1000000n,
    });

    expect(result.hash).toBe("0xsupply123");
    expect(result.fee).toBe("45000000000000");
    expect(result.protocol).toBe("aave-v3");
  });

  it("propagates errors from protocol", async () => {
    setupWdk();
    mockSupplyFn.mockRejectedValue(new Error("Insufficient allowance"));

    await expect(
      supply({ token: "0xA", amount: 100n })
    ).rejects.toThrow("Insufficient allowance");
  });
});

// ============================================================
// getAccountData
// ============================================================

describe("getAccountData", () => {
  it("returns account data", async () => {
    setupWdk();
    mockGetAccountDataFn.mockResolvedValue({
      totalCollateralBase: 1000000000n,
      totalDebtBase: 0n,
      availableBorrowsBase: 800000000n,
      healthFactor: 115792089237316195423570985008687907853269984665640564039457584007913129639935n,
    });

    const data = await getAccountData("ethereum-sepolia");

    expect(data.totalCollateralBase).toBe("1000000000");
    expect(data.totalDebtBase).toBe("0");
    expect(data.chain).toBe("ethereum-sepolia");
  });
});
