import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

async function getWalletAddress(): Promise<string> {
  const seed = process.env.WDK_SEED_PHRASE;
  if (!seed) {
    console.warn("WDK_SEED_PHRASE not set, using fallback demo address");
    return "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";
  }
  const wdk = new WDK(seed);
  wdk.registerWallet("ethereum-sepolia", WalletManagerEvm, {
    provider: "https://rpc.sepolia.org",
  });
  const account = await wdk.getAccount("ethereum-sepolia", 0);
  const address = await account.getAddress();
  wdk.dispose();
  return address;
}

// Governance rules to seed
const RULES = [
  {
    rule_type: "max_amount",
    name: "Maximum Transaction Amount",
    description: "Block any single transaction above $500",
    config: { max_amount: 500 },
    is_active: true,
    priority: 10,
  },
  {
    rule_type: "daily_cap",
    name: "Daily Spending Cap",
    description: "Total daily spending cannot exceed $1,000",
    config: { daily_cap: 1000 },
    is_active: true,
    priority: 20,
  },
  {
    rule_type: "merchant_blacklist",
    name: "Blacklisted Merchants",
    description: "Block transactions to known high-risk merchants",
    config: { merchants: ["shadycasino.com", "fastloan.xyz", "cryptomixer.io"] },
    is_active: true,
    priority: 30,
  },
  {
    rule_type: "category_limit",
    name: "Gambling Category Limit",
    description: "Gambling transactions capped at $50",
    config: { category: "gambling", max_amount: 50 },
    is_active: true,
    priority: 40,
  },
  {
    rule_type: "frequency_limit",
    name: "Transaction Frequency Limit",
    description: "Maximum 20 transactions per hour",
    config: { max_transactions: 20, window_minutes: 60 },
    is_active: true,
    priority: 50,
  },
];

// Realistic transaction categories with typical amounts
const CATEGORIES: Record<string, { merchants: string[]; minAmount: number; maxAmount: number }> = {
  food: {
    merchants: ["uber_eats", "doordash", "mcdonalds", "starbucks", "chipotle"],
    minAmount: 5,
    maxAmount: 45,
  },
  transport: {
    merchants: ["uber", "lyft", "shell_gas", "parking_co"],
    minAmount: 5,
    maxAmount: 60,
  },
  shopping: {
    merchants: ["amazon", "target", "walmart", "best_buy"],
    minAmount: 10,
    maxAmount: 200,
  },
  subscription: {
    merchants: ["netflix", "spotify", "openai", "github", "aws"],
    minAmount: 5,
    maxAmount: 30,
  },
  utilities: {
    merchants: ["electric_co", "water_dept", "internet_isp"],
    minAmount: 30,
    maxAmount: 150,
  },
  transfer: {
    merchants: ["peer_alice", "peer_bob", "peer_charlie"],
    minAmount: 10,
    maxAmount: 100,
  },
};

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a normal-ish distribution around the category's mean
function generateNormalAmount(min: number, max: number): number {
  const mean = (min + max) / 2;
  const std = (max - min) / 4;
  // Box-Muller transform for approximate normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const amount = mean + z * std;
  return Math.round(Math.max(min, Math.min(max, amount)) * 100) / 100;
}

function generateHistoricalTransactions(count: number, walletAddress: string) {
  const transactions = [];
  const categories = Object.keys(CATEGORIES);
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const category = randomElement(categories);
    const cat = CATEGORIES[category];
    const merchant = randomElement(cat.merchants);
    const amount = generateNormalAmount(cat.minAmount, cat.maxAmount);

    // Spread transactions over last 30 days
    const daysAgo = Math.random() * 30;
    const hoursOffset = Math.random() * 24;
    const createdAt = new Date(
      now - daysAgo * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000
    ).toISOString();

    transactions.push({
      wallet_address: walletAddress,
      recipient: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, "0")}`,
      amount,
      currency: "USDT",
      chain: "ethereum-sepolia",
      category,
      merchant,
      description: `Payment to ${merchant}`,
      status: "executed",
      tx_hash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 66),
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  return transactions;
}

function generateAnomalousTransactions(walletAddress: string) {
  const now = Date.now();
  return [
    // Anomaly 1: Very high food transaction
    {
      wallet_address: walletAddress,
      recipient: "0xABCD1234567890abcdef1234567890abcdef1234",
      amount: 350.00,
      currency: "USDT",
      chain: "ethereum-sepolia",
      category: "food",
      merchant: "fancy_restaurant",
      description: "Expensive dinner — should trigger anomaly",
      status: "executed",
      tx_hash: `0xanomaly1${Math.random().toString(16).slice(2)}`.slice(0, 66),
      created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Anomaly 2: Unusually large subscription
    {
      wallet_address: walletAddress,
      recipient: "0xDEAD0000000000000000000000000000DEADbeef",
      amount: 499.99,
      currency: "USDT",
      chain: "ethereum-sepolia",
      category: "subscription",
      merchant: "enterprise_saas",
      description: "Enterprise SaaS — should trigger anomaly",
      status: "executed",
      tx_hash: `0xanomaly2${Math.random().toString(16).slice(2)}`.slice(0, 66),
      created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Anomaly 3: Large transfer
    {
      wallet_address: walletAddress,
      recipient: "0xBEEF0000000000000000000000000000BEEFcafe",
      amount: 450.00,
      currency: "USDT",
      chain: "ethereum-sepolia",
      category: "transfer",
      merchant: "peer_unknown",
      description: "Large peer transfer — should trigger anomaly",
      status: "executed",
      tx_hash: `0xanomaly3${Math.random().toString(16).slice(2)}`.slice(0, 66),
      created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Anomaly 4: Very high shopping
    {
      wallet_address: walletAddress,
      recipient: "0xCAFE0000000000000000000000000000CAFEbabe",
      amount: 480.00,
      currency: "USDT",
      chain: "ethereum-sepolia",
      category: "shopping",
      merchant: "luxury_store",
      description: "Luxury purchase — should trigger anomaly",
      status: "executed",
      tx_hash: `0xanomaly4${Math.random().toString(16).slice(2)}`.slice(0, 66),
      created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient<any, "pepa">(url, key, {
    db: { schema: "pepa" },
    auth: { persistSession: false },
  });

  // Get real wallet address from WDK
  console.log("Resolving wallet address from WDK...");
  const walletAddress = await getWalletAddress();
  console.log(`  ✓ Wallet: ${walletAddress}\n`);

  console.log("🌱 Seeding PEPA Wallet Intelligence database...\n");

  // Clear existing data (for re-seeding)
  console.log("Clearing existing data...");
  await supabase.from("agent_decisions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("approval_queue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("governance_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("  ✓ Cleared\n");

  // Seed governance rules
  console.log("Seeding governance rules...");
  const { error: rulesError } = await supabase
    .from("governance_rules")
    .insert(RULES);
  if (rulesError) {
    console.error("  ✗ Failed to seed rules:", rulesError.message);
    process.exit(1);
  }
  console.log(`  ✓ ${RULES.length} rules created\n`);

  // Seed historical transactions (normal)
  const normalCount = 80;
  console.log(`Seeding ${normalCount} historical transactions...`);
  const normalTxs = generateHistoricalTransactions(normalCount, walletAddress);
  const { error: txError } = await supabase
    .from("transactions")
    .insert(normalTxs);
  if (txError) {
    console.error("  ✗ Failed to seed transactions:", txError.message);
    process.exit(1);
  }
  console.log(`  ✓ ${normalCount} normal transactions created\n`);

  // Seed anomalous transactions
  const anomalies = generateAnomalousTransactions(walletAddress);
  console.log(`Seeding ${anomalies.length} anomalous transactions...`);
  const { error: anomalyError } = await supabase
    .from("transactions")
    .insert(anomalies);
  if (anomalyError) {
    console.error("  ✗ Failed to seed anomalies:", anomalyError.message);
    process.exit(1);
  }
  console.log(`  ✓ ${anomalies.length} anomalous transactions created\n`);

  // Summary
  const { count: txCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });
  const { count: ruleCount } = await supabase
    .from("governance_rules")
    .select("*", { count: "exact", head: true });

  console.log("═══════════════════════════════════════");
  console.log("✅ Seed complete!");
  console.log(`   Wallet address: ${walletAddress}`);
  console.log(`   Transactions: ${txCount}`);
  console.log(`   Governance rules: ${ruleCount}`);
  console.log(`   Anomalous transactions: ${anomalies.length}`);
  console.log("═══════════════════════════════════════");
  console.log("\nNext steps:");
  console.log("  npm run dev    → Start server on :4007");
  console.log("  POST /api/transactions with a test transaction");
}

main().catch(console.error);
