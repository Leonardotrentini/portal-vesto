/**
 * Cliente admin Supabase (service_role) — bypass RLS para scripts locais.
 * Uso: node scripts/supabase-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários no .env.local");
  process.exit(1);
}

export const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (process.argv[1]?.includes("supabase-admin")) {
  const { data, error } = await admin.from("portal_storage").select("key, updated_at");
  if (error) {
    console.error("❌ Service role falhou:", error.message);
    process.exit(1);
  }
  console.log("✅ Service role conectada");
  console.log("   Linhas em portal_storage:", data?.length ?? 0);
}
