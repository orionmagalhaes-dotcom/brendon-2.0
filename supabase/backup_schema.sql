-- Execute no SQL Editor do Supabase.
-- Cria a tabela de backups ponto a ponto do sistema Brancao.
-- Cada linha representa um snapshot dos dados criticos em um momento especifico.
-- Os backups NUNCA sao apagados automaticamente — so por acao manual dentro do sistema.

create table if not exists public.restobar_backups (
  id text primary key,
  reason text not null default 'auto',
  created_at timestamptz not null default now(),
  payload jsonb not null
);

comment on table public.restobar_backups is
  'Snapshots de backup dos dados criticos do sistema (catalogo, fiados, relatorios, funcionarios).';

alter table public.restobar_backups enable row level security;

do $$
begin
  -- Policy: anonimo pode ler qualquer backup
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restobar_backups'
      and policyname = 'allow_anon_select_restobar_backups'
  ) then
    create policy allow_anon_select_restobar_backups
      on public.restobar_backups
      for select
      to anon
      using (true);
  end if;

  -- Policy: anonimo pode inserir novos backups
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restobar_backups'
      and policyname = 'allow_anon_insert_restobar_backups'
  ) then
    create policy allow_anon_insert_restobar_backups
      on public.restobar_backups
      for insert
      to anon
      with check (true);
  end if;

  -- Policy: anonimo pode excluir backups (exige confirmacao manual no sistema)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restobar_backups'
      and policyname = 'allow_anon_delete_restobar_backups'
  ) then
    create policy allow_anon_delete_restobar_backups
      on public.restobar_backups
      for delete
      to anon
      using (true);
  end if;
end $$;

-- Indice para listagem por data de criacao (mais recente primeiro)
create index if not exists restobar_backups_created_at_idx
  on public.restobar_backups (created_at desc);

-- Replica identity completa (caso queira habilitar Realtime futuramente)
alter table public.restobar_backups replica identity full;
