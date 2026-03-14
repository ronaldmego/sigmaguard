import { describe, it, expect, vi, beforeEach } from "vitest";
import { quoteSwap, executeSwap, SWAP_TOKENS } from "@/lib/wdk/swap";

const mockQuoteSwapFn = vi.fn();
const mockSwapFn = vi.fn();

vi.mock("@/lib/wdk/wallet", () => ({
  getWdk: vi.fn(),
}));

vi.mock("@tetherto/wdk-protocol-swap-velora-evm", async () => {
  return {
    default: class MockVelora {
      quoteSwap(...args: unknown[]) { return mockQuoteSwapFn(...args); }
      swap(...args: unknown[]) { return mockSwapFn(...args); }
    },
  };
});

import { getWdk } from "@/lib/wdk/wallet";
const mockGetWdkFn = vi.mocked(getWdk);

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// SWAP_TOKENS config
// ============================================================

describe("SWAP_TOKENS", () => {
  it("has token addresses for ethereum-sepolia", () => {
    expect(SWAP_TOKENS["ethereum-sepolia"]).toBeDefined();
    expect(SWAP_TOKENS["ethereum-sepolia"]["WETH"]).toMatch(/^0x/);
    expect(SWAP_TOKENS["ethereum-sepolia"]["USDT"]).toMatch(/^0x/);
  });

  it("has token addresses for polygon-amoy", () => {
    expect(SWAP_TOKENS["polygon-amoy"]).toBeDefined();
    expect(SWAP_TOKENS["polygon-amoy"]["WMATIC"]).toMatch(/^0x/);
    expect(SWAP_TOKENS["polygon-amoy"]["USDT"]).toMatch(/^0x/);
  });
});

// ============================================================
// quoteSwap
// ============================================================

describe("quoteSwap", () => {
  const mockQuoteResult = {
    fee: 50000000000000n,
    tokenInAmount: 1000000000000000000n,
    tokenOutAmount: 2000000000n,
  };

  function setupWdk() {
    const mockAccount = { getAddress: vi.fn().mockResolvedValue("0xabc") };
    const mockWdk = { getAccount: vi.fn().mockResolvedValue(mockAccount) };
    mockGetWdkFn.mockReturnValue(mockWdk as any);
    mockQuoteSwapFn.mockResolvedValue(mockQuoteResult);
    return mockWdk;
  }

  it("returns quote with correct shape", async () => {
    setupWdk();

    const quote = await quoteSwap({
      chain: "ethereum-sepolia",
      tokenIn: SWAP_TOKENS["ethereum-sepolia"]["WETH"],
      tokenOut: SWAP_TOKENS["ethereum-sepolia"]["USDT"],
      tokenInAmount: 1000000000000000000n,
    });

    expect(quote.fee).toBe("50000000000000");
    expect(quote.tokenInAmount).toBe("1000000000000000000");
    expect(quote.tokenOutAmount).toBe("2000000000");
    expect(quote.chain).toBe("ethereum-sepolia");
    expect(mockQuoteSwapFn).toHaveBeenCalledTimes(1);
  });

  it("uses default chain when not specified", async () => {
    const mockWdk = setupWdk();

    await quoteSwap({
      tokenIn: "0xTokenA",
      tokenOut: "0xTokenB",
      tokenInAmount: 100n,
    });

    expect(mockWdk.getAccount).toHaveBeenCalledWith("ethereum-sepolia", 0);
  });

  it("passes tokenOutAmount when tokenInAmount not specified", async () => {
    setupWdk();

    await quoteSwap({
      tokenIn: "0xTokenA",
      tokenOut: "0xTokenB",
      tokenOutAmount: 500n,
    });

    expect(mockQuoteSwapFn).toHaveBeenCalledWith(
      expect.objectContaining({ tokenOutAmount: 500n })
    );
  });

  it("propagates errors from protocol", async () => {
    setupWdk();
    mockQuoteSwapFn.mockRejectedValue(new Error("No liquidity"));

    await expect(
      quoteSwap({
        tokenIn: "0xA",
        tokenOut: "0xB",
        tokenInAmount: 100n,
      })
    ).rejects.toThrow("No liquidity");
  });
});

// ============================================================
// executeSwap
// ============================================================

describe("executeSwap", () => {
  const mockSwapResult = {
    hash: "0xswaphash123",
    fee: 75000000000000n,
    tokenInAmount: 1000000000000000000n,
    tokenOutAmount: 1950000000n,
  };

  function setupWdk() {
    const mockAccount = { getAddress: vi.fn().mockResolvedValue("0xabc") };
    const mockWdk = { getAccount: vi.fn().mockResolvedValue(mockAccount) };
    mockGetWdkFn.mockReturnValue(mockWdk as any);
    mockSwapFn.mockResolvedValue(mockSwapResult);
  }

  it("returns execution result with hash", async () => {
    setupWdk();

    const result = await executeSwap({
      chain: "ethereum-sepolia",
      tokenIn: SWAP_TOKENS["ethereum-sepolia"]["WETH"],
      tokenOut: SWAP_TOKENS["ethereum-sepolia"]["USDT"],
      tokenInAmount: 1000000000000000000n,
    });

    expect(result.hash).toBe("0xswaphash123");
    expect(result.fee).toBe("75000000000000");
    expect(result.chain).toBe("ethereum-sepolia");
  });

  it("propagates errors from protocol", async () => {
    setupWdk();
    mockSwapFn.mockRejectedValue(new Error("Insufficient balance"));

    await expect(
      executeSwap({
        tokenIn: "0xA",
        tokenOut: "0xB",
        tokenInAmount: 100n,
      })
    ).rejects.toThrow("Insufficient balance");
  });
});
