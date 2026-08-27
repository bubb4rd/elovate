export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}
