-- Treinamento 2.0 - cadastro central de empresas
-- Execute este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  grupo text,
  telefone text,
  email text,
  endereco text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.empresas add column if not exists nome text;
alter table public.empresas add column if not exists documento text;
alter table public.empresas add column if not exists grupo text;
alter table public.empresas add column if not exists telefone text;
alter table public.empresas add column if not exists email text;
alter table public.empresas add column if not exists endereco text;
alter table public.empresas add column if not exists ativo boolean not null default true;
alter table public.empresas add column if not exists criado_em timestamptz not null default now();
alter table public.empresas add column if not exists atualizado_em timestamptz not null default now();

create unique index if not exists uq_empresas_documento
  on public.empresas (documento)
  where documento is not null and btrim(documento) <> '';

alter table public.empresas enable row level security;

drop policy if exists "empresas_select_anon" on public.empresas;
create policy "empresas_select_anon" on public.empresas
for select to anon using (true);

drop policy if exists "empresas_insert_anon" on public.empresas;
create policy "empresas_insert_anon" on public.empresas
for insert to anon with check (true);

drop policy if exists "empresas_update_anon" on public.empresas;
create policy "empresas_update_anon" on public.empresas
for update to anon using (true) with check (true);

comment on table public.empresas is 'Cadastro mestre de empresas e fazendas atendidas pelo sistema.';
comment on column public.empresas.grupo is 'Grupo empresarial opcional para agrupar empresas ou fazendas relacionadas.';