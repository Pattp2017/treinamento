alter table public.configuracao_empresa
  add column if not exists rodape_url text;

comment on column public.configuracao_empresa.rodape_url is
  'URL pública da imagem de rodapé usada nos documentos emitidos pelo sistema.';