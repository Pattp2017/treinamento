create table if not exists public.historico_documentos (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid null references public.agenda(id) on delete set null,
  turma_id uuid null references public.turmas(id) on delete set null,
  id_turma text,
  tipo text not null,
  empresa text,
  treinamento text,
  participante text,
  cpf text,
  status text not null default 'Gerado',
  observacao text,
  nome_arquivo text,
  arquivo_url text,
  criado_em timestamptz not null default now()
);

create index if not exists historico_documentos_criado_em_idx on public.historico_documentos (criado_em desc);
create index if not exists historico_documentos_turma_id_idx on public.historico_documentos (turma_id);
create index if not exists historico_documentos_cpf_idx on public.historico_documentos (cpf);

alter table public.historico_documentos enable row level security;

drop policy if exists historico_documentos_select_anon on public.historico_documentos;
create policy historico_documentos_select_anon
on public.historico_documentos for select to anon
using (true);

drop policy if exists historico_documentos_insert_anon on public.historico_documentos;
create policy historico_documentos_insert_anon
on public.historico_documentos for insert to anon
with check (true);

drop policy if exists historico_documentos_update_anon on public.historico_documentos;
create policy historico_documentos_update_anon
on public.historico_documentos for update to anon
using (true) with check (true);