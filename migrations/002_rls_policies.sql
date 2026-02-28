-- PEPA Wallet Intelligence — RLS Policies & Permission Hardening
-- Defense-in-depth: app uses service_role (bypasses RLS),
-- but if anon key leaks, damage is limited to read-only access.

-- ============================================================
-- 1. Revoke overly broad permissions granted by 001
-- ============================================================
REVOKE ALL ON ALL TABLES IN SCHEMA pepa FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA pepa FROM anon, authenticated;

-- ============================================================
-- 2. Grant minimal permissions (SELECT only, no agent_decisions)
-- ============================================================
GRANT SELECT ON pepa.transactions TO anon, authenticated;
GRANT SELECT ON pepa.governance_rules TO anon, authenticated;
GRANT SELECT ON pepa.approval_queue TO anon, authenticated;
-- agent_decisions: no access for anon/authenticated (internal audit trail)

-- ============================================================
-- 3. Enable RLS on all tables
-- ============================================================
ALTER TABLE pepa.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pepa.governance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pepa.approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pepa.agent_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Read-only policies for anon/authenticated
-- ============================================================

-- transactions: read-only for realtime feed
CREATE POLICY select_transactions ON pepa.transactions
  FOR SELECT TO anon, authenticated
  USING (true);

-- governance_rules: read-only for rules UI
CREATE POLICY select_rules ON pepa.governance_rules
  FOR SELECT TO anon, authenticated
  USING (true);

-- approval_queue: read-only for approval dashboard
CREATE POLICY select_approvals ON pepa.approval_queue
  FOR SELECT TO anon, authenticated
  USING (true);

-- agent_decisions: NO policy — anon/authenticated have zero access
-- (no GRANT + no policy = fully blocked)

-- ============================================================
-- 5. Fix default privileges for future tables in pepa schema
-- ============================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA pepa REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA pepa REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA pepa GRANT SELECT ON TABLES TO anon, authenticated;
