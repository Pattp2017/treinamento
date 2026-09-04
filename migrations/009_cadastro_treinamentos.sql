-- Treinamento 2.0 - cadastro central de treinamentos
-- Execute este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.treinamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  norma text,
  carga_horaria_padrao numeric,
  validade_meses integer,
  descricao text,
  topicos_padrao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.treinamentos add column if not exists nome text;
alter table public.treinamentos add column if not exists norma text;
alter table public.treinamentos add column if not exists carga_horaria_padrao numeric;
alter table public.treinamentos add column if not exists validade_meses integer;
alter table public.treinamentos add column if not exists descricao text;
alter table public.treinamentos add column if not exists topicos_padrao text;
alter table public.treinamentos add column if not exists ativo boolean not null default true;
alter table public.treinamentos add column if not exists criado_em timestamptz not null default now();
alter table public.treinamentos add column if not exists atualizado_em timestamptz not null default now();

create unique index if not exists uq_treinamentos_nome
  on public.treinamentos (lower(btrim(nome)))
  where nome is not null and btrim(nome) <> '';

alter table public.treinamentos enable row level security;

drop policy if exists "treinamentos_select_anon" on public.treinamentos;
create policy "treinamentos_select_anon" on public.treinamentos
for select to anon using (true);

drop policy if exists "treinamentos_insert_anon" on public.treinamentos;
create policy "treinamentos_insert_anon" on public.treinamentos
for insert to anon with check (true);

drop policy if exists "treinamentos_update_anon" on public.treinamentos;
create policy "treinamentos_update_anon" on public.treinamentos
for update to anon using (true) with check (true);

comment on table public.treinamentos is 'Cadastro mestre de treinamentos do sistema.';
comment on column public.treinamentos.topicos_padrao is 'Conteúdo programático padrão copiado para a turma no momento de sua criação.';