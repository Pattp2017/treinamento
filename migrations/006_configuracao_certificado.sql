alter table public.configuracao_empresa
  add column if not exists certificado_modelo text not null default 'padrao',
  add column if not exists certificado_logo_url text,
  add column if not exists certificado_frente_url text,
  add column if not exists certificado_verso_url text,
  add column if not exists certificado_assinatura_url text;

comment on column public.configuracao_empresa.certificado_modelo is 'Modelo do certificado: padrao ou personalizado.';
comment on column public.configuracao_empresa.certificado_logo_url is 'Logo específico do certificado. Se vazio, usa o logo principal.';
comment on column public.configuracao_empresa.certificado_frente_url is 'Imagem de fundo da página 1/frente do certificado.';
comment on column public.configuracao_empresa.certificado_verso_url is 'Imagem de fundo da página 2/verso do certificado.';
comment on column public.configuracao_empresa.certificado_assinatura_url is 'Imagem de assinatura padrão usada nos certificados.';