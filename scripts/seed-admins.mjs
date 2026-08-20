/**
 * Garante admins Leo e Raul no Supabase.
 * Uso: node scripts/seed-admins.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const STORAGE_KEY = "vesto:portal-v2";
const DEFAULT_ADMINS = [
  { id: "admin-leo", email: "leo@vesto.com", password: "Vesto@123", name: "Leo" },
  { id: "admin-raul", email: "raul@vesto.com", password: "Vesto@123", name: "Raul" },
];

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Credenciais Supabase ausentes");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

function normalizeAdmins(admins) {
  const list = Array.isArray(admins) ? [...admins] : [];
  for (const def of DEFAULT_ADMINS) {
    const email = def.email.toLowerCase();
    const idx = list.findIndex(a => a.email?.toLowerCase().trim() === email);
    if (idx === -1) list.push({ ...def });
    else list[idx] = { ...def, ...list[idx], id: list[idx].id || def.id, email: def.email, password: def.password, name: list[idx].name || def.name };
  }
  return list;
}

const { data: row, error } = await supabase.from("portal_storage").select("value").eq("key", STORAGE_KEY).maybeSingle();
if (error) {
  console.error("❌ Erro ao ler portal:", error.message);
  process.exit(1);
}

const value = row?.value || {
  clients: {},
  tasks: {},
  reports: {},
  events: [],
  adminName: "",
  adminNotes: [],
  adminChecklist: [],
};

value.admins = normalizeAdmins(value.admins);

const { error: upsertErr } = await supabase.from("portal_storage").upsert(
  { key: STORAGE_KEY, value, updated_at: new Date().toISOString() },
  { onConflict: "key" }
);

if (upsertErr) {
  console.error("❌ Erro ao salvar admins:", upsertErr.message);
  process.exit(1);
}

console.log("✅ Admins configurados no Supabase:");
for (const a of value.admins.filter(a => DEFAULT_ADMINS.some(d => d.email === a.email?.toLowerCase()))) {
  console.log(`   • ${a.email} (${a.name})`);
}
