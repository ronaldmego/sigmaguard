import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PepaClient = ReturnType<typeof createClient<any, "pepa">>;

// Server-side client (service role — bypasses RLS)
// Uses local Kong URL on VPS for direct connection
let serverClient: PepaClient | null = null;

export function getServerClient(): PepaClient {
  if (serverClient) return serverClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serverClient = createClient<any, "pepa">(url, key, {
    db: { schema: "pepa" },
    auth: { persistSession: false },
  });

  return serverClient;
}

// Browser-side client (anon key — RLS enforced)
let browserClient: PepaClient | null = null;

export function getBrowserClient(): PepaClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browserClient = createClient<any, "pepa">(url, key, {
    db: { schema: "pepa" },
  });

  return browserClient;
}
