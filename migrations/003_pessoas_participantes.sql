-- Treinamento 2.0 - cadastro central de pessoas ligado aos participantes
-- Execute este arquivo inteiro no SQL Editor do Supabase antes de testar a nova importação.

create extension if not exists pgcrypto;

create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  telefone text,
  email text,
  instrutor boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.pessoas add column if not exists nome text;
alter table public.pessoas add column if not exists cpf text;
alter table public.pessoas add column if not exists telefone text;
alter table public.pessoas add column if not exists email text;
alter table public.pessoas add column if not exists instrutor boolean not null default false;
alter table public.pessoas add column if not exists ativo boolean not null default true;
alter table public.pessoas add column if not exists criado_em timestamptz not null default now();
alter table public.pessoas add column if not exists atualizado_em timestamptz not null default now();

create unique index if not exists uq_pessoas_cpf
  on public.pessoas (cpf)
  where cpf is not null and btrim(cpf) <> '';

alter table public.turma_participantes
  add column if not exists pessoa_id uuid references public.pessoas(id) on delete restrict;

create index if not exists idx_turma_participantes_pessoa_id
  on public.turma_participantes (pessoa_id);

alter table public.pessoas enable row level security;

drop policy if exists "pessoas_select_anon" on public.pessoas;
create policy "pessoas_select_anon" on public.pessoas
for select to anon using (true);

drop policy if exists "pessoas_insert_anon" on public.pessoas;
create policy "pessoas_insert_anon" on public.pessoas
for insert to anon with check (true);

drop policy if exists "pessoas_update_anon" on public.pessoas;
create policy "pessoas_update_anon" on public.pessoas
for update to anon using (true) with check (true);

-- Mantemos nome e CPF na turma_participantes como retrato histórico da turma.
-- pessoa_id liga o registro ao cadastro mestre sem alterar automaticamente o nome central.
