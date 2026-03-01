// Generic Supabase database type helpers
// These map to the pepa schema tables

export interface Database {
  pepa: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          wallet_address: string;
          recipient: string;
          amount: number;
          currency: string;
          chain: string;
          category: string | null;
          merchant: string | null;
          description: string | null;
          status: string;
          tx_hash: string | null;
          governance_result: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          recipient: string;
          amount: number;
          currency?: string;
          chain?: string;
          category?: string | null;
          merchant?: string | null;
          description?: string | null;
          status?: string;
          tx_hash?: string | null;
          governance_result?: Record<string, unknown> | null;
        };
        Update: {
          status?: string;
          tx_hash?: string | null;
          governance_result?: Record<string, unknown> | null;
          updated_at?: string;
        };
      };
      governance_rules: {
        Row: {
          id: string;
          rule_type: string;
          name: string;
          description: string | null;
          config: Record<string, unknown>;
          is_active: boolean;
          priority: number;
          wallet_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rule_type: string;
          name: string;
          description?: string | null;
          config: Record<string, unknown>;
          is_active?: boolean;
          priority?: number;
          wallet_address?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          config?: Record<string, unknown>;
          is_active?: boolean;
          priority?: number;
        };
      };
      approval_queue: {
        Row: {
          id: string;
          transaction_id: string;
          reason: string;
          flag_source: string;
          agent_explanation: string | null;
          anomaly_details: Record<string, unknown> | null;
          status: string;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          reason: string;
          flag_source: string;
          agent_explanation?: string | null;
          anomaly_details?: Record<string, unknown> | null;
          status?: string;
        };
        Update: {
          status?: string;
          decided_by?: string | null;
          decided_at?: string | null;
        };
      };
      agent_decisions: {
        Row: {
          id: string;
          transaction_id: string;
          rules_result: Record<string, unknown>;
          anomaly_result: Record<string, unknown>;
          explanation: string | null;
          recommendation: string;
          confidence: number | null;
          model_used: string | null;
          tokens_used: number | null;
          latency_ms: number | null;
          raw_prompt: string | null;
          raw_response: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          rules_result: Record<string, unknown>;
          anomaly_result: Record<string, unknown>;
          explanation?: string | null;
          recommendation: string;
          confidence?: number | null;
          model_used?: string | null;
          tokens_used?: number | null;
          latency_ms?: number | null;
          raw_prompt?: string | null;
          raw_response?: string | null;
        };
        Update: Record<string, never>;
      };
      agent_strategies: {
        Row: {
          id: string;
          strategy_type: string;
          name: string;
          description: string | null;
          config: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          strategy_type: string;
          name: string;
          description?: string | null;
          config: Record<string, unknown>;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          config?: Record<string, unknown>;
          is_active?: boolean;
        };
      };
      agent_runs: {
        Row: {
          id: string;
          strategy_id: string;
          strategy_type: string;
          market_data: Record<string, unknown>;
          decision: string;
          decision_reason: string;
          transaction_id: string | null;
          governance_outcome: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          strategy_id: string;
          strategy_type: string;
          market_data: Record<string, unknown>;
          decision: string;
          decision_reason: string;
          transaction_id?: string | null;
          governance_outcome?: string | null;
        };
        Update: Record<string, never>;
      };
    };
  };
}
