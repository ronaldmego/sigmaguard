-- PEPA Wallet Intelligence — Autonomous Agent Tables
-- Phase 3: DCA + Rebalance strategies with full audit trail

-- ============================================================
-- Table: agent_strategies (strategy configuration)
-- ============================================================
CREATE TABLE pepa.agent_strategies (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  strategy_type TEXT NOT NULL
    CHECK (strategy_type IN ('dca', 'rebalance')),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_strategies_active ON pepa.agent_strategies (is_active);
CREATE INDEX idx_agent_strategies_type ON pepa.agent_strategies (strategy_type);

-- updated_at trigger
CREATE TRIGGER trg_agent_strategies_updated_at
  BEFORE UPDATE ON pepa.agent_strategies
  FOR EACH ROW EXECUTE FUNCTION pepa.update_updated_at();

-- ============================================================
-- Table: agent_runs (audit trail per agent cycle)
-- ============================================================
CREATE TABLE pepa.agent_runs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES pepa.agent_strategies(id) ON DELETE CASCADE,
  strategy_type TEXT NOT NULL
    CHECK (strategy_type IN ('dca', 'rebalance')),
  market_data JSONB NOT NULL DEFAULT '{}',
  decision TEXT NOT NULL
    CHECK (decision IN ('hold', 'transfer')),
  decision_reason TEXT NOT NULL,
  transaction_id UUID REFERENCES pepa.transactions(id) ON DELETE SET NULL,
  governance_outcome TEXT
    CHECK (governance_outcome IS NULL OR governance_outcome IN ('auto_approve', 'flag_for_review', 'reject')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_strategy ON pepa.agent_runs (strategy_id);
CREATE INDEX idx_agent_runs_created ON pepa.agent_runs (created_at DESC);
CREATE INDEX idx_agent_runs_decision ON pepa.agent_runs (decision);

-- ============================================================
-- Realtime publication for agent_runs (live dashboard feed)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE pepa.agent_runs;

-- ============================================================
-- RLS policies (same pattern as 002: read-only for anon/authenticated)
-- ============================================================
ALTER TABLE pepa.agent_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pepa.agent_runs ENABLE ROW LEVEL SECURITY;

-- Grant SELECT to anon/authenticated
GRANT SELECT ON pepa.agent_strategies TO anon, authenticated;
GRANT SELECT ON pepa.agent_runs TO anon, authenticated;

-- Read-only policies
CREATE POLICY select_agent_strategies ON pepa.agent_strategies
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY select_agent_runs ON pepa.agent_runs
  FOR SELECT TO anon, authenticated
  USING (true);
