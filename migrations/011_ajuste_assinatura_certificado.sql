alter table public.configuracao_empresa
add column if not exists certificado_assinatura_tamanho integer default 100,
add column if not exists certificado_assinatura_opacidade integer default 100;

update public.configuracao_empresa
set
  certificado_assinatura_tamanho = coalesce(certificado_assinatura_tamanho, 100),
  certificado_assinatura_opacidade = coalesce(certificado_assinatura_opacidade, 100);

alter table public.configuracao_empresa
  drop constraint if exists configuracao_empresa_assinatura_tamanho_check;
alter table public.configuracao_empresa
  add constraint configuracao_empresa_assinatura_tamanho_check
  check (certificado_assinatura_tamanho between 50 and 150);

alter table public.configuracao_empresa
  drop constraint if exists configuracao_empresa_assinatura_opacidade_check;
alter table public.configuracao_empresa
  add constraint configuracao_empresa_assinatura_opacidade_check
  check (certificado_assinatura_opacidade between 10 and 100);