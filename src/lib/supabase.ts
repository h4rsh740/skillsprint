import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a safe client that won't crash if env vars are missing
function createSafeClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock-like proxy that won't crash but will fail gracefully
    return new Proxy({} as SupabaseClient, {
      get: (_target, prop) => {
        if (prop === 'auth') {
          return new Proxy({}, {
            get: () => async () => ({ data: null, error: new Error('Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local') }),
          });
        }
        return () => ({ data: null, error: new Error('Supabase not configured') });
      },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSafeClient();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseAdmin() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}
