-- PEPA Wallet Intelligence — Initial Schema
-- Schema: pepa (isolated from other projects)

-- Create schema
CREATE SCHEMA IF NOT EXISTS pepa;

-- Grant schema usage
GRANT USAGE ON SCHEMA pepa TO anon, authenticated, service_role;

-- Restrictive default privileges: anon/authenticated get SELECT only
-- (service_role bypasses RLS and has superuser-level access already)
ALTER DEFAULT PRIVILEGES IN SCHEMA pepa GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pepa GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pepa GRANT SELECT ON TABLES TO anon, authenticated;

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- ============================================================
-- Table: transactions (audit log — append-only)
-- ============================================================
CREATE TABLE pepa.transactions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  chain TEXT NOT NULL DEFAULT 'ethereum-sepolia',
  category TEXT,
  merchant TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  tx_hash TEXT,
  governance_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for anomaly detection queries (history by wallet + category)
CREATE INDEX idx_transactions_wallet ON pepa.transactions (wallet_address);
CREATE INDEX idx_transactions_wallet_category ON pepa.transactions (wallet_address, category);
CREATE INDEX idx_transactions_wallet_created ON pepa.transactions (wallet_address, created_at DESC);
CREATE INDEX idx_transactions_status ON pepa.transactions (status);

-- ============================================================
-- Table: governance_rules
-- ============================================================
CREATE TABLE pepa.governance_rules (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rule_type TEXT NOT NULL
    CHECK (rule_type IN (
      'max_amount', 'daily_cap', 'merchant_blacklist',
      'merchant_whitelist', 'category_limit', 'frequency_limit'
    )),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  wallet_address TEXT, -- NULL = applies to all wallets
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_governance_rules_active ON pepa.governance_rules (is_active, priority);
CREATE INDEX idx_governance_rules_wallet ON pepa.governance_rules (wallet_address) WHERE wallet_address IS NOT NULL;

-- ============================================================
-- Table: approval_queue
-- ============================================================
CREATE TABLE pepa.approval_queue (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES pepa.transactions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  flag_source TEXT NOT NULL
    CHECK (flag_source IN ('rules', 'anomaly', 'agent', 'manual')),
  agent_explanation TEXT,
  anomaly_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_queue_status ON pepa.approval_queue (status);
CREATE INDEX idx_approval_queue_transaction ON pepa.approval_queue (transaction_id);

-- ============================================================
-- Table: agent_decisions (full audit trail per transaction)
-- ============================================================
CREATE TABLE pepa.agent_decisions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES pepa.transactions(id) ON DELETE CASCADE,
  rules_result JSONB NOT NULL DEFAULT '{}',
  anomaly_result JSONB NOT NULL DEFAULT '{}',
  explanation TEXT,
  recommendation TEXT NOT NULL
    CHECK (recommendation IN ('auto_approve', 'flag_for_review', 'reject')),
  confidence NUMERIC(3, 2),
  model_used TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  raw_prompt TEXT,
  raw_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_decisions_transaction ON pepa.agent_decisions (transaction_id);

-- ============================================================
-- Enable realtime publication for live UI updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE pepa.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE pepa.approval_queue;

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION pepa.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON pepa.transactions
  FOR EACH ROW EXECUTE FUNCTION pepa.update_updated_at();

CREATE TRIGGER trg_governance_rules_updated_at
  BEFORE UPDATE ON pepa.governance_rules
  FOR EACH ROW EXECUTE FUNCTION pepa.update_updated_at();
