import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { CHAINS, DEFAULT_CHAIN } from "./chains";

// Singleton WDK instance
let wdkInstance: WDK | null = null;

function getSeedPhrase(): string {
  const seed = process.env.WDK_SEED_PHRASE;
  if (!seed) {
    throw new Error("WDK_SEED_PHRASE not set in environment");
  }
  return seed;
}

function getWdk(): WDK {
  if (wdkInstance) return wdkInstance;

  const seed = getSeedPhrase();
  const wdk = new WDK(seed);

  // Register EVM wallet for each configured chain
  for (const [key, chain] of Object.entries(CHAINS)) {
    wdk.registerWallet(key, WalletManagerEvm, {
      provider: chain.rpcUrl,
    });
  }

  wdkInstance = wdk;
  return wdk;
}

export async function getWalletAddress(
  chain: string = DEFAULT_CHAIN
): Promise<string> {
  const wdk = getWdk();
  const account = await wdk.getAccount(chain, 0);
  return await account.getAddress();
}

export interface WalletBalance {
  chain: string;
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
}

export async function getWalletBalance(
  chain: string = DEFAULT_CHAIN
): Promise<WalletBalance> {
  const wdk = getWdk();
  const chainConfig = CHAINS[chain];
  if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

  const account = await wdk.getAccount(chain, 0);
  const balanceWei = await account.getBalance();
  const address = await account.getAddress();

  return {
    chain,
    address,
    nativeBalance: formatWei(balanceWei),
    nativeSymbol: chainConfig.nativeCurrency,
  };
}

export interface SendTransactionResult {
  hash: string;
  fee: string;
  chain: string;
}

export async function sendTransaction(
  chain: string,
  recipient: string,
  amountWei: bigint
): Promise<SendTransactionResult> {
  const wdk = getWdk();
  const account = await wdk.getAccount(chain, 0);

  const result = await account.sendTransaction({
    to: recipient,
    value: amountWei,
  });

  return {
    hash: result.hash,
    fee: formatWei(result.fee),
    chain,
  };
}

export async function estimateFee(
  chain: string,
  recipient: string,
  amountWei: bigint
): Promise<string> {
  const wdk = getWdk();
  const account = await wdk.getAccount(chain, 0);

  const quote = await account.quoteSendTransaction({
    to: recipient,
    value: amountWei,
  });

  return formatWei(quote.fee);
}

export function generateSeedPhrase(): string {
  return WDK.getRandomSeedPhrase();
}

export function isValidSeed(seed: string): boolean {
  return WDK.isValidSeed(seed);
}

export function disposeWdk(): void {
  if (wdkInstance) {
    wdkInstance.dispose();
    wdkInstance = null;
  }
}

// Convert wei (bigint) to human-readable string (18 decimals)
function formatWei(wei: bigint): string {
  const str = wei.toString().padStart(19, "0");
  const intPart = str.slice(0, str.length - 18) || "0";
  const decPart = str.slice(str.length - 18).replace(/0+$/, "");
  return decPart ? `${intPart}.${decPart}` : intPart;
}
