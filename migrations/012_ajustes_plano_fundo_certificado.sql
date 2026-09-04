alter table public.configuracao_empresa
  add column if not exists certificado_frente_escala integer default 100,
  add column if not exists certificado_frente_opacidade integer default 100,
  add column if not exists certificado_frente_pos_x integer default 50,
  add column if not exists certificado_frente_pos_y integer default 50,
  add column if not exists certificado_frente_ajuste text default 'cover',
  add column if not exists certificado_verso_escala integer default 100,
  add column if not exists certificado_verso_opacidade integer default 100,
  add column if not exists certificado_verso_pos_x integer default 50,
  add column if not exists certificado_verso_pos_y integer default 50,
  add column if not exists certificado_verso_ajuste text default 'cover';

update public.configuracao_empresa
set
  certificado_frente_escala = coalesce(certificado_frente_escala,100),
  certificado_frente_opacidade = coalesce(certificado_frente_opacidade,100),
  certificado_frente_pos_x = coalesce(certificado_frente_pos_x,50),
  certificado_frente_pos_y = coalesce(certificado_frente_pos_y,50),
  certificado_frente_ajuste = coalesce(certificado_frente_ajuste,'cover'),
  certificado_verso_escala = coalesce(certificado_verso_escala,100),
  certificado_verso_opacidade = coalesce(certificado_verso_opacidade,100),
  certificado_verso_pos_x = coalesce(certificado_verso_pos_x,50),
  certificado_verso_pos_y = coalesce(certificado_verso_pos_y,50),
  certificado_verso_ajuste = coalesce(certificado_verso_ajuste,'cover');

alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_frente_escala_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_frente_escala_check check (certificado_frente_escala between 50 and 150);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_frente_opacidade_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_frente_opacidade_check check (certificado_frente_opacidade between 10 and 100);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_frente_pos_x_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_frente_pos_x_check check (certificado_frente_pos_x between 0 and 100);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_frente_pos_y_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_frente_pos_y_check check (certificado_frente_pos_y between 0 and 100);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_frente_ajuste_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_frente_ajuste_check check (certificado_frente_ajuste in ('cover','contain','fill'));

alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_verso_escala_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_verso_escala_check check (certificado_verso_escala between 50 and 150);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_verso_opacidade_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_verso_opacidade_check check (certificado_verso_opacidade between 10 and 100);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_verso_pos_x_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_verso_pos_x_check check (certificado_verso_pos_x between 0 and 100);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_verso_pos_y_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_verso_pos_y_check check (certificado_verso_pos_y between 0 and 100);
alter table public.configuracao_empresa drop constraint if exists configuracao_empresa_verso_ajuste_check;
alter table public.configuracao_empresa add constraint configuracao_empresa_verso_ajuste_check check (certificado_verso_ajuste in ('cover','contain','fill'));