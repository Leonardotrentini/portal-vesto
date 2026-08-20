-- Execute no Supabase: SQL Editor → New query → Run
-- Dashboard: https://supabase.com/dashboard/project/ovgjuyjdczbrbmgupbok/sql

create table if not exists public.portal_storage (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portal_storage enable row level security;

-- Acesso via chave pública (anon/publishable). Ajuste depois se quiser auth por usuário.
drop policy if exists "portal_storage_anon_all" on public.portal_storage;
create policy "portal_storage_anon_all"
  on public.portal_storage
  for all
  to anon, authenticated
  using (true)
  with check (true);

create index if not exists portal_storage_updated_at_idx on public.portal_storage (updated_at desc);
