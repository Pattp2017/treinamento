-- Executar no SQL Editor do Supabase antes de utilizar o cadastro de feriados.
create table if not exists public.treinamento_feriados (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  nome text not null check (length(trim(nome)) between 1 and 120),
  criado_em timestamptz not null default now()
);
alter table public.treinamento_feriados enable row level security;
-- Mesmos perfis de acesso do ambiente de testes atual, sem login.
grant select, insert, delete on public.treinamento_feriados to anon, authenticated;
drop policy if exists feriados_leitura on public.treinamento_feriados;
create policy feriados_leitura on public.treinamento_feriados for select to anon, authenticated using (true);
drop policy if exists feriados_cadastro on public.treinamento_feriados;
create policy feriados_cadastro on public.treinamento_feriados for insert to anon, authenticated with check (true);
drop policy if exists feriados_exclusao on public.treinamento_feriados;
create policy feriados_exclusao on public.treinamento_feriados for delete to anon, authenticated using (true);
