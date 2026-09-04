create extension if not exists pgcrypto;

create table if not exists public.instrutores (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null unique references public.pessoas(id) on delete restrict,
  conselho text,
  numero_registro text,
  uf_registro text,
  formacao text,
  especialidade text,
  assinatura_path text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.instrutores add column if not exists conselho text;
alter table public.instrutores add column if not exists numero_registro text;
alter table public.instrutores add column if not exists uf_registro text;
alter table public.instrutores add column if not exists formacao text;
alter table public.instrutores add column if not exists especialidade text;
alter table public.instrutores add column if not exists assinatura_path text;
alter table public.instrutores add column if not exists ativo boolean not null default true;
alter table public.instrutores add column if not exists criado_em timestamptz not null default now();
alter table public.instrutores add column if not exists atualizado_em timestamptz not null default now();

alter table public.instrutores enable row level security;

drop policy if exists "instrutores_select_anon" on public.instrutores;
create policy "instrutores_select_anon" on public.instrutores
for select to anon using (true);

drop policy if exists "instrutores_insert_anon" on public.instrutores;
create policy "instrutores_insert_anon" on public.instrutores
for insert to anon with check (true);

drop policy if exists "instrutores_update_anon" on public.instrutores;
create policy "instrutores_update_anon" on public.instrutores
for update to anon using (true) with check (true);

comment on column public.instrutores.assinatura_path is 'URL ou caminho da imagem de assinatura vinculada ao instrutor.';