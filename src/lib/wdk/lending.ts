import AaveProtocolEvm from "@tetherto/wdk-protocol-lending-aave-evm";
import type { SupplyOptions } from "@tetherto/wdk-protocol-lending-aave-evm";
import { getWdk } from "./wallet";
import { DEFAULT_CHAIN } from "./chains";

// USDT token addresses on supported testnets (same as swap.ts)
export const LENDING_TOKENS: Record<string, Record<string, string>> = {
  "ethereum-sepolia": {
    USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
    USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
    DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
  },
  "polygon-amoy": {
    USDT: "0x1616d425Cd540B256475cBfb604586C8598eC0FB",
  },
};

export interface LendingQuote {
  fee: string;
  token: string;
  amount: string;
  chain: string;
  protocol: "aave-v3";
}

export interface LendingResult {
  hash: string;
  fee: string;
  token: string;
  amount: string;
  chain: string;
  protocol: "aave-v3";
}

export interface LendingAccountData {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  healthFactor: string;
  chain: string;
}

export interface LendingInput {
  chain?: string;
  token: string;
  amount: bigint;
}

async function getLendingProtocol(chain: string): Promise<AaveProtocolEvm> {
  const wdk = getWdk();
  const account = await wdk.getAccount(chain, 0);
  // WDK returns IWalletAccountWithProtocols; AaveProtocolEvm expects WalletAccountEvm
  return new AaveProtocolEvm(account as unknown as ConstructorParameters<typeof AaveProtocolEvm>[0]);
}

/**
 * Quote the gas cost of supplying tokens to Aave V3.
 * Proves the agent evaluates yield opportunities with real protocol data.
 */
export async function quoteSupply(input: LendingInput): Promise<LendingQuote> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const protocol = await getLendingProtocol(chain);

  const options: SupplyOptions = {
    token: input.token,
    amount: input.amount,
  };

  const quote = await protocol.quoteSupply(options);

  return {
    fee: quote.fee.toString(),
    token: input.token,
    amount: input.amount.toString(),
    chain,
    protocol: "aave-v3",
  };
}

/**
 * Supply tokens to Aave V3 lending pool.
 * Must go through governance pipeline before calling this.
 */
export async function supply(input: LendingInput): Promise<LendingResult> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const protocol = await getLendingProtocol(chain);

  const options: SupplyOptions = {
    token: input.token,
    amount: input.amount,
  };

  const result = await protocol.supply(options);

  return {
    hash: result.hash,
    fee: result.fee.toString(),
    token: input.token,
    amount: input.amount.toString(),
    chain,
    protocol: "aave-v3",
  };
}

/**
 * Get Aave V3 account data (collateral, debt, health factor).
 */
export async function getAccountData(chain?: string): Promise<LendingAccountData> {
  const targetChain = chain ?? DEFAULT_CHAIN;
  const protocol = await getLendingProtocol(targetChain);

  const data = await protocol.getAccountData();

  return {
    totalCollateralBase: data.totalCollateralBase.toString(),
    totalDebtBase: data.totalDebtBase.toString(),
    availableBorrowsBase: data.availableBorrowsBase.toString(),
    healthFactor: data.healthFactor.toString(),
    chain: targetChain,
  };
}
