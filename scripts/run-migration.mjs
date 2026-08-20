/**
 * Executa arquivos .sql em supabase/migrations/ via conexão Postgres direta.
 * Requer DATABASE_URL no .env.local
 *
 * Uso:
 *   node scripts/run-migration.mjs              # roda todos pendentes
 *   node scripts/run-migration.mjs schema.sql   # roda um arquivo
 */
import pg from "pg";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./load-env.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const migrationsDir = resolve(root, "supabase", "migrations");

loadEnv();

const connectionString = process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL ou DATABASE_POOLER_URL não configurada no .env.local");
  console.error("");
  console.error("Supabase → botão Connect → Session pooler → copie a URI");
  process.exit(1);
}

const targetFile = process.argv[2];
const files = targetFile
  ? [targetFile.includes("/") ? targetFile : join(migrationsDir, targetFile)]
  : readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort().map(f => join(migrationsDir, f));

if (files.length === 0) {
  console.log("Nenhum arquivo .sql encontrado em supabase/migrations/");
  process.exit(0);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  console.log("🔗 Conectado ao Postgres\n");

  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`❌ Arquivo não encontrado: ${file}`);
      process.exit(1);
    }
    const sql = readFileSync(file, "utf8");
    const name = file.split(/[/\\]/).pop();
    console.log(`▶ Executando ${name}...`);
    await client.query(sql);
    console.log(`✅ ${name} OK\n`);
  }

  console.log("🎉 Migrations concluídas");
} catch (e) {
  console.error("❌ Erro:", e.message);
  if (e.message.includes("ETIMEDOUT") || e.message.includes("ENOTFOUND")) {
    console.error("");
    console.error("💡 Conexão direta (db....supabase.co) usa IPv6 e pode falhar na sua rede.");
    console.error("   Supabase → Connect → Session pooler → copie a URI para DATABASE_POOLER_URL no .env.local");
  }
  if (e.message.includes("password authentication failed")) {
    console.error("   Verifique a senha do banco (Database → Reset password).");
  }
  process.exit(1);
} finally {
  await client.end();
}
