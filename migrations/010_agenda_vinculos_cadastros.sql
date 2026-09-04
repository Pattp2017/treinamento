-- Treinamento 2.0 - vínculos da Agenda com os cadastros mestres
-- Execute este arquivo inteiro no SQL Editor do Supabase.

alter table public.agenda
  add column if not exists empresa_id uuid,
  add column if not exists instrutor_id uuid;

-- Remove constraints antigas com estes nomes, caso existam.
alter table public.agenda drop constraint if exists agenda_empresa_id_fkey;
alter table public.agenda drop constraint if exists agenda_instrutor_id_fkey;

alter table public.agenda
  add constraint agenda_empresa_id_fkey
    foreign key (empresa_id) references public.empresas(id) on delete restrict,
  add constraint agenda_instrutor_id_fkey
    foreign key (instrutor_id) references public.instrutores(id) on delete restrict;

create index if not exists idx_agenda_empresa_id on public.agenda(empresa_id);
create index if not exists idx_agenda_instrutor_id on public.agenda(instrutor_id);

-- Preenche os IDs automaticamente a partir dos nomes gravados pela Agenda.
create or replace function public.agenda_resolver_cadastros()
returns trigger
language plpgsql
as $$
begin
  if new.empresa is not null and btrim(new.empresa) <> '' then
    select e.id
      into new.empresa_id
      from public.empresas e
     where e.ativo = true
       and lower(btrim(e.nome)) = lower(btrim(new.empresa))
     limit 1;
  else
    new.empresa_id := null;
  end if;

  if new.instrutor is not null and btrim(new.instrutor) <> '' then
    select i.id
      into new.instrutor_id
      from public.instrutores i
      join public.pessoas p on p.id = i.pessoa_id
     where i.ativo = true
       and p.ativo = true
       and lower(btrim(p.nome)) = lower(btrim(new.instrutor))
     limit 1;
  else
    new.instrutor_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_agenda_resolver_cadastros on public.agenda;
create trigger trg_agenda_resolver_cadastros
before insert or update of empresa, instrutor
on public.agenda
for each row execute function public.agenda_resolver_cadastros();

-- Tenta vincular também os agendamentos antigos.
update public.agenda a
set empresa_id = e.id
from public.empresas e
where a.empresa_id is null
  and lower(btrim(a.empresa)) = lower(btrim(e.nome));

update public.agenda a
set instrutor_id = i.id
from public.instrutores i
join public.pessoas p on p.id = i.pessoa_id
where a.instrutor_id is null
  and lower(btrim(a.instrutor)) = lower(btrim(p.nome));

comment on column public.agenda.empresa_id is 'Empresa/fazenda selecionada no cadastro mestre.';
comment on column public.agenda.instrutor_id is 'Instrutor selecionado no cadastro mestre.';