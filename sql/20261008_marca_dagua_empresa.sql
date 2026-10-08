-- Executar uma vez no SQL Editor do Supabase do projeto.
-- Amplia a configuração institucional já existente, sem alterar dados atuais.
ALTER TABLE public.empresa_configuracao
  ADD COLUMN IF NOT EXISTS marca_dagua_url text,
  ADD COLUMN IF NOT EXISTS marca_dagua_opacidade numeric(4,3) NOT NULL DEFAULT 0.120,
  ADD COLUMN IF NOT EXISTS marca_dagua_posicao text NOT NULL DEFAULT 'laterais';

ALTER TABLE public.empresa_configuracao
  DROP CONSTRAINT IF EXISTS empresa_configuracao_marca_dagua_opacidade_check;
ALTER TABLE public.empresa_configuracao
  ADD CONSTRAINT empresa_configuracao_marca_dagua_opacidade_check
  CHECK (marca_dagua_opacidade BETWEEN 0.05 AND 0.30);

ALTER TABLE public.empresa_configuracao
  DROP CONSTRAINT IF EXISTS empresa_configuracao_marca_dagua_posicao_check;
ALTER TABLE public.empresa_configuracao
  ADD CONSTRAINT empresa_configuracao_marca_dagua_posicao_check
  CHECK (marca_dagua_posicao IN ('laterais','centro','esquerda','direita'));
