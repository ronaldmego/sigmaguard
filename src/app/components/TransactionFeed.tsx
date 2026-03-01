"use client";

import { useEffect, useState, useRef } from "react";
import { getBrowserClient } from "@/lib/db/supabase";
import type { Transaction } from "@/types";
import TransactionRow from "./TransactionRow";

interface Props {
  initialTransactions: Transaction[];
  onTransactionUpdate?: () => void;
}

export default function TransactionFeed({
  initialTransactions,
  onTransactionUpdate,
}: Props) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const onUpdateRef = useRef(onTransactionUpdate);
  onUpdateRef.current = onTransactionUpdate;

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  useEffect(() => {
    const client = getBrowserClient();
    const channel = client
      .channel("transactions-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "pepa", table: "transactions" },
        (payload) => {
          const newTx = payload.new as Transaction;
          setTransactions((prev) => [newTx, ...prev]);
          setNewIds((prev) => new Set([...prev, newTx.id]));
          setTimeout(
            () =>
              setNewIds((prev) => {
                const next = new Set(prev);
                next.delete(newTx.id);
                return next;
              }),
            3000
          );
          onUpdateRef.current?.();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "pepa", table: "transactions" },
        (payload) => {
          const updated = payload.new as Transaction;
          setTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
          onUpdateRef.current?.();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div
      id="transactions"
      className="bg-[#12121e] border border-gray-800/50 rounded-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/30">
        <h2 className="text-sm font-medium text-gray-400">Transactions</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {transactions.length} total
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="text-center text-gray-600 py-8">
            No transactions yet
          </p>
        ) : (
          transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              isNew={newIds.has(tx.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
