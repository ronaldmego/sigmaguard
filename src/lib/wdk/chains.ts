export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeCurrency: string;
  blockExplorerUrl: string;
  isTestnet: boolean;
}

export const CHAINS: Record<string, ChainConfig> = {
  "ethereum-sepolia": {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: "https://rpc.sepolia.org",
    nativeCurrency: "ETH",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
  "polygon-amoy": {
    name: "Polygon Amoy",
    chainId: 80002,
    rpcUrl: "https://rpc-amoy.polygon.technology",
    nativeCurrency: "MATIC",
    blockExplorerUrl: "https://amoy.polygonscan.com",
    isTestnet: true,
  },
};

export const DEFAULT_CHAIN = "ethereum-sepolia";

export function getChain(chainKey: string): ChainConfig {
  const chain = CHAINS[chainKey];
  if (!chain) {
    throw new Error(`Unknown chain: ${chainKey}. Available: ${Object.keys(CHAINS).join(", ")}`);
  }
  return chain;
}
