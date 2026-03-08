"use client";

import { useEffect, useState, useCallback } from "react";
import type { Transaction, GovernanceRule } from "@/types";
import type { ApprovalWithTx } from "./components/ApprovalCard";
import DashboardShell from "./components/DashboardShell";
import WalletOverview from "./components/WalletOverview";
import AnalyticsMini from "./components/AnalyticsMini";
import AgentPanel from "./components/AgentPanel";
import PortfolioAllocation from "./components/PortfolioAllocation";
import AgentActivityFeed from "./components/AgentActivityFeed";
import TransactionFeed from "./components/TransactionFeed";
import ApprovalQueue from "./components/ApprovalQueue";
import GovernanceRules from "./components/GovernanceRules";
import GovernanceChart from "./components/GovernanceChart";

interface WalletInfo {
  chain: string;
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  error?: string;
}

export default function Home() {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [approvals, setApprovals] = useState<ApprovalWithTx[]>([]);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, txRes, approvalsRes, rulesRes] = await Promise.all([
        fetch("/api/wallet")
          .then((r) => r.json())
          .catch(() => ({ wallets: [] })),
        fetch("/api/transactions?limit=100")
          .then((r) => r.json())
          .catch(() => ({ transactions: [] })),
        fetch("/api/approvals")
          .then((r) => r.json())
          .catch(() => ({ approvals: [] })),
        fetch("/api/rules")
          .then((r) => r.json())
          .catch(() => ({ rules: [] })),
      ]);

      setWallets(walletRes.wallets || []);
      setTransactions(txRes.transactions || []);
      setApprovals(approvalsRes.approvals || []);
      setRules(rulesRes.rules || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  async function handleRuleUpdate(
    id: string,
    config: Record<string, unknown>
  ) {
    const res = await fetch(`/api/rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update rule");
    }
    const data = await res.json();
    setRules((prev) =>
      prev.map((r) => (r.id === data.rule.id ? data.rule : r))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell pendingCount={approvals.length}>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div id="overview" className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              AI-Governed DeFi Agent
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Autonomous wallet — 4-layer transaction governance
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
            <span className="text-xs text-gray-500">Testnet</span>
          </div>
        </div>

        {/* Top row: Wallet + Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <WalletOverview wallets={wallets} />
          </div>
          <div className="md:col-span-3">
            <AnalyticsMini
              transactions={transactions}
              pendingCount={approvals.length}
            />
          </div>
        </div>

        {/* Agent Section */}
        <div id="agent" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <AgentPanel />
            </div>
            <div>
              <PortfolioAllocation wallets={wallets} />
            </div>
          </div>
          {/* Governance Anomaly Detection Chart */}
          <GovernanceChart transactions={transactions} />

          <AgentActivityFeed />
        </div>

        {/* Approval Queue (only shows if pending items exist) */}
        <ApprovalQueue
          initialApprovals={approvals}
          onApprovalChange={handleRefresh}
        />

        {/* Transaction Feed */}
        <TransactionFeed
          initialTransactions={transactions}
          onTransactionUpdate={handleRefresh}
        />

        {/* Governance Rules */}
        <GovernanceRules rules={rules} onRuleUpdate={handleRuleUpdate} />
      </div>
    </DashboardShell>
  );
}
