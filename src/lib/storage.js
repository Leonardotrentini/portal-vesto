import { supabase, supabaseConfigured } from "./supabase.js";

const TABLE = "portal_storage";
const PORTAL_KEY = "vesto:portal-v2";

function emptyPortalData() {
  return {
    clients: {},
    tasks: {},
    reports: {},
    labels: [
      { id: "conteudo", name: "Conteúdo", color: "#7c9a5e" },
      { id: "criativos", name: "Criativos", color: "#c4a35a" },
      { id: "estrutura", name: "Estrutura", color: "#5a8a8a" },
      { id: "vendas", name: "Vendas", color: "#8ab05a" },
      { id: "estrategia", name: "Estratégia", color: "#a08050" },
      { id: "urgente", name: "Urgente", color: "#c45a5a" },
    ],
    statuses: [
      { id: "todo", label: "A Fazer", color: "#9c9787" },
      { id: "doing", label: "Em Andamento", color: "#c4a35a" },
      { id: "done", label: "Concluído", color: "#4ade80" },
    ],
    events: [],
    adminName: "",
    adminNotes: [],
    adminChecklist: [],
    admins: [
      { id: "admin-leo", email: "leo@vesto.com", password: "Vesto@123", name: "Leo" },
      { id: "admin-raul", email: "raul@vesto.com", password: "Vesto@123", name: "Raul" },
    ],
  };
}

function localStorageAdapter() {
  return {
    async get(key) {
      const value = localStorage.getItem(key);
      return value == null ? null : { value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
  };
}

function supabaseAdapter() {
  return {
    async get(key) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const value = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
      return { value };
    },

    async set(key, value) {
      let parsed;
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }

      const { error } = await supabase.from(TABLE).upsert(
        { key, value: parsed, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

      if (error) throw error;
    },
  };
}

async function ensurePortalRow(key) {
  const { data } = await supabase.from(TABLE).select("key").eq("key", key).maybeSingle();
  if (data) return;
  await supabase.from(TABLE).upsert(
    { key, value: emptyPortalData(), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

async function migrateLocalToSupabase(key) {
  const { data } = await supabase.from(TABLE).select("key, value").eq("key", key).maybeSingle();
  if (data?.value && Object.keys(data.value).length > 0) return;

  const local = localStorage.getItem(key);
  if (!local || !supabaseConfigured) {
    await ensurePortalRow(key);
    return;
  }

  try {
    const parsed = JSON.parse(local);
    await supabase.from(TABLE).upsert(
      { key, value: parsed, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch (e) {
    console.warn("Migração localStorage → Supabase falhou:", e);
    await ensurePortalRow(key);
  }
}

export async function initStorage() {
  if (!window.storage) {
    if (supabaseConfigured) {
      try {
        window.storage = supabaseAdapter();
        await migrateLocalToSupabase(PORTAL_KEY);
        console.info("[Vesto] Storage: Supabase conectado");
        return;
      } catch (e) {
        console.warn("[Vesto] Supabase indisponível, usando localStorage:", e.message);
      }
    }
    window.storage = localStorageAdapter();
    console.info("[Vesto] Storage: localStorage");
  }
}
