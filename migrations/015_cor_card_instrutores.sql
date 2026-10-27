-- Cor personalizada dos cards por instrutor na agenda.
ALTER TABLE public.treinamento_instrutores
  ADD COLUMN IF NOT EXISTS cor_card text DEFAULT '#b7dfc6';

ALTER TABLE public.treinamento_instrutores
  DROP CONSTRAINT IF EXISTS treinamento_instrutores_cor_card_formato;
ALTER TABLE public.treinamento_instrutores
  ADD CONSTRAINT treinamento_instrutores_cor_card_formato
  CHECK (cor_card IS NULL OR cor_card ~ '^#[0-9a-fA-F]{6}$');
