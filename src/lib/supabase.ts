import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-side Supabase client. Uses the service role key when available
 * (bypasses RLS); falls back to the publishable key for local bootstrap.
 * Never import this from client components.
 */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
