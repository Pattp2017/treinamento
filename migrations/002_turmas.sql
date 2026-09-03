-- Treinamento 2.0 - estrutura de Turmas no Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Compatível com a tabela public.turmas já existente, cujo id é UUID.

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  agenda_id text,
  empresa text,
  treinamento_id uuid,
  treinamento text,
  norma text,
  carga_horaria numeric(6,2),
  data_inicio date,
  data_fim date,
  instrutor text,
  habilitacao_instrutor text,
  registro_instrutor text,
  status text default 'Aberta',
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

alter table public.turmas add column if not exists codigo text;
alter table public.turmas add column if not exists agenda_id text;
alter table public.turmas add column if not exists empresa text;
alter table public.turmas add column if not exists treinamento_id uuid;
alter table public.turmas add column if not exists treinamento text;
alter table public.turmas add column if not exists norma text;
alter table public.turmas add column if not exists carga_horaria numeric(6,2);
alter table public.turmas add column if not exists data_inicio date;
alter table public.turmas add column if not exists data_fim date;
alter table public.turmas add column if not exists instrutor text;
alter table public.turmas add column if not exists habilitacao_instrutor text;
alter table public.turmas add column if not exists registro_instrutor text;
alter table public.turmas add column if not exists status text default 'Aberta';
alter table public.turmas add column if not exists criado_em timestamptz default now();
alter table public.turmas add column if not exists atualizado_em timestamptz default now();

create unique index if not exists uq_turmas_codigo on public.turmas (codigo) where codigo is not null;
create index if not exists idx_turmas_agenda_id on public.turmas (agenda_id);
create index if not exists idx_turmas_data_inicio on public.turmas (data_inicio);

-- Se uma tentativa anterior criou turma_participantes parcialmente, removemos apenas essa
-- tabela auxiliar ainda sem uso para recriá-la com o tipo correto de FK (UUID).
drop table if exists public.turma_participantes cascade;

create table public.turma_participantes (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  nome text not null,
  cpf text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint turma_participantes_turma_cpf_unique unique (turma_id, cpf)
);

create index if not exists idx_turma_participantes_turma_id on public.turma_participantes (turma_id);

-- id_turma precisa acompanhar o UUID usado em public.turmas.
-- Se a coluna já existir com outro tipo e ainda não tiver dados, converte para UUID.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='agenda' and column_name='id_turma'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema='public' and table_name='agenda' and column_name='id_turma'
        and data_type <> 'uuid'
    ) then
      alter table public.agenda alter column id_turma drop default;
      alter table public.agenda alter column id_turma type uuid using nullif(id_turma::text,'')::uuid;
    end if;
  else
    alter table public.agenda add column id_turma uuid;
  end if;
end $$;

alter table public.turmas enable row level security;
alter table public.turma_participantes enable row level security;

drop policy if exists "turmas_select_anon" on public.turmas;
create policy "turmas_select_anon" on public.turmas for select to anon using (true);
drop policy if exists "turmas_insert_anon" on public.turmas;
create policy "turmas_insert_anon" on public.turmas for insert to anon with check (true);
drop policy if exists "turmas_update_anon" on public.turmas;
create policy "turmas_update_anon" on public.turmas for update to anon using (true) with check (true);
drop policy if exists "turmas_delete_anon" on public.turmas;
create policy "turmas_delete_anon" on public.turmas for delete to anon using (true);

drop policy if exists "turma_participantes_select_anon" on public.turma_participantes;
create policy "turma_participantes_select_anon" on public.turma_participantes for select to anon using (true);
drop policy if exists "turma_participantes_insert_anon" on public.turma_participantes;
create policy "turma_participantes_insert_anon" on public.turma_participantes for insert to anon with check (true);
drop policy if exists "turma_participantes_update_anon" on public.turma_participantes;
create policy "turma_participantes_update_anon" on public.turma_participantes for update to anon using (true) with check (true);
drop policy if exists "turma_participantes_delete_anon" on public.turma_participantes;
create policy "turma_participantes_delete_anon" on public.turma_participantes for delete to anon using (true);
