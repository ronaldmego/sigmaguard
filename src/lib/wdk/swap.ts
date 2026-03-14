import VeloraProtocolEvm from "@tetherto/wdk-protocol-swap-velora-evm";
import type { SwapOptions } from "@tetherto/wdk-protocol-swap-velora-evm";
import { getWdk } from "./wallet";
import { DEFAULT_CHAIN } from "./chains";

// Well-known testnet token addresses
export const SWAP_TOKENS: Record<string, Record<string, string>> = {
  "ethereum-sepolia": {
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
  },
  "polygon-amoy": {
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    USDT: "0x1616d425Cd540B256475cBfb604586C8598eC0FB",
  },
};

export interface SwapQuote {
  fee: string;
  tokenInAmount: string;
  tokenOutAmount: string;
  tokenIn: string;
  tokenOut: string;
  chain: string;
}

export interface SwapExecutionResult {
  hash: string;
  fee: string;
  tokenInAmount: string;
  tokenOutAmount: string;
  chain: string;
}

export interface SwapInput {
  chain?: string;
  tokenIn: string;
  tokenOut: string;
  tokenInAmount?: bigint;
  tokenOutAmount?: bigint;
  maxFee?: bigint;
}

async function getSwapProtocol(chain: string): Promise<VeloraProtocolEvm> {
  const wdk = getWdk();
  const account = await wdk.getAccount(chain, 0);
  // WDK returns IWalletAccountWithProtocols; VeloraProtocolEvm expects WalletAccountEvm.
  // At runtime the account IS a WalletAccountEvm — the generic wrapper type just doesn't narrow.
  return new VeloraProtocolEvm(account as unknown as ConstructorParameters<typeof VeloraProtocolEvm>[0]);
}

function buildSwapOptions(input: SwapInput): SwapOptions {
  if (input.tokenOutAmount) {
    return {
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      tokenOutAmount: input.tokenOutAmount,
    };
  }
  // Default to sell (tokenInAmount) — must provide at least one
  return {
    tokenIn: input.tokenIn,
    tokenOut: input.tokenOut,
    tokenInAmount: input.tokenInAmount ?? 0n,
  };
}

/**
 * Get a swap quote without executing — proves the agent makes informed decisions
 * with real DEX data. Works even on testnet with no liquidity (returns price data).
 */
export async function quoteSwap(input: SwapInput): Promise<SwapQuote> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const protocol = await getSwapProtocol(chain);
  const options = buildSwapOptions(input);

  const quote = await protocol.quoteSwap(options);

  return {
    fee: quote.fee.toString(),
    tokenInAmount: quote.tokenInAmount.toString(),
    tokenOutAmount: quote.tokenOutAmount.toString(),
    tokenIn: input.tokenIn,
    tokenOut: input.tokenOut,
    chain,
  };
}

/**
 * Execute a swap through Velora DEX.
 * Must go through governance pipeline before calling this.
 */
export async function executeSwap(input: SwapInput): Promise<SwapExecutionResult> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const protocol = await getSwapProtocol(chain);
  const options = buildSwapOptions(input);

  const result = await protocol.swap(options);

  return {
    hash: result.hash,
    fee: result.fee.toString(),
    tokenInAmount: result.tokenInAmount.toString(),
    tokenOutAmount: result.tokenOutAmount.toString(),
    chain,
  };
}
