/**
 * Verifica conexão Supabase e inicializa dados do portal se necessário.
 * Uso: node scripts/supabase-setup.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) throw new Error(".env não encontrado");
  const lines = readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const STORAGE_KEY = "vesto:portal-v2";

const DEFAULT_LABELS = [
  { id: "conteudo", name: "Conteúdo", color: "#7c9a5e" },
  { id: "criativos", name: "Criativos", color: "#c4a35a" },
  { id: "estrutura", name: "Estrutura", color: "#5a8a8a" },
  { id: "vendas", name: "Vendas", color: "#8ab05a" },
  { id: "estrategia", name: "Estratégia", color: "#a08050" },
  { id: "urgente", name: "Urgente", color: "#c45a5a" },
];

const DEFAULT_STATUSES = [
  { id: "todo", label: "A Fazer", color: "#9c9787" },
  { id: "doing", label: "Em Andamento", color: "#c4a35a" },
  { id: "done", label: "Concluído", color: "#4ade80" },
];

function emptyData() {
  return {
    clients: {},
    tasks: {},
    reports: {},
    labels: [...DEFAULT_LABELS],
    statuses: [...DEFAULT_STATUSES],
    events: [],
    adminName: "",
    adminNotes: [],
    adminChecklist: [],
  };
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes no .env");
  process.exit(1);
}

const supabase = createClient(url, key);

console.log("🔗 Supabase:", url);
console.log("📦 Tabela: portal_storage\n");

// 1. Testar leitura da tabela
const { data: rows, error: listErr } = await supabase
  .from("portal_storage")
  .select("key, updated_at")
  .order("updated_at", { ascending: false });

if (listErr) {
  console.error("❌ Erro ao acessar portal_storage:", listErr.message);
  if (listErr.message.includes("does not exist")) {
    console.error("\n→ Execute supabase/schema.sql no SQL Editor do Supabase.");
  }
  process.exit(1);
}

console.log("✅ Tabela acessível. Linhas:", rows?.length ?? 0);

// 2. Verificar registro principal
const { data: existing, error: getErr } = await supabase
  .from("portal_storage")
  .select("value, updated_at")
  .eq("key", STORAGE_KEY)
  .maybeSingle();

if (getErr) {
  console.error("❌ Erro ao ler chave principal:", getErr.message);
  process.exit(1);
}

if (existing?.value) {
  const v = existing.value;
  const clients = Object.keys(v.clients || {}).length;
  const tasks = Object.values(v.tasks || {}).flat().length;
  console.log(`✅ Dados já existem (${existing.updated_at})`);
  console.log(`   Clientes: ${clients} | Tarefas: ${tasks} | Admin: ${v.adminName || "(sem nome)"}`);
} else {
  console.log("⚙️  Inicializando estrutura vazia do portal...");
  const initial = emptyData();
  const { error: upsertErr } = await supabase.from("portal_storage").upsert(
    { key: STORAGE_KEY, value: initial, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (upsertErr) {
    console.error("❌ Erro ao inicializar:", upsertErr.message);
    process.exit(1);
  }
  console.log("✅ Portal inicializado no Supabase");
}

// 3. Teste write/read roundtrip
const testKey = "vesto:healthcheck";
const testVal = { ok: true, at: new Date().toISOString() };
const { error: wErr } = await supabase.from("portal_storage").upsert(
  { key: testKey, value: testVal, updated_at: new Date().toISOString() },
  { onConflict: "key" }
);
if (wErr) {
  console.error("❌ Escrita falhou:", wErr.message);
  process.exit(1);
}
const { data: readBack, error: rErr } = await supabase
  .from("portal_storage")
  .select("value")
  .eq("key", testKey)
  .single();
if (rErr || !readBack?.value?.ok) {
  console.error("❌ Leitura roundtrip falhou");
  process.exit(1);
}
await supabase.from("portal_storage").delete().eq("key", testKey);
console.log("✅ Escrita e leitura OK\n");
console.log("🎉 Supabase 100% operacional para o Portal Vesto");
