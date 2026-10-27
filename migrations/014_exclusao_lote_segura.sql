-- Exclusão em lote atômica. Não conceda EXECUTE a anon.
CREATE OR REPLACE FUNCTION public.excluir_treinamentos_lote(p_agenda_ids text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE ids text[]; turmas text[]; total integer; n_ag integer; n_tur integer; n_par integer; n_hist integer;
BEGIN
 IF coalesce(array_length(p_agenda_ids,1),0) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Selecione de 1 a 500 agendas'; END IF;
 SELECT array_agg(DISTINCT x) INTO ids FROM unnest(p_agenda_ids) AS x WHERE x IS NOT NULL AND btrim(x)<>'';
 IF coalesce(array_length(ids,1),0)<>array_length(p_agenda_ids,1) THEN RAISE EXCEPTION 'IDs duplicados ou vazios'; END IF;
 PERFORM 1 FROM public.treinamento_agenda a WHERE a.id::text=ANY(ids) FOR UPDATE;
 SELECT count(*) INTO total FROM public.treinamento_agenda a WHERE a.id::text=ANY(ids);
 IF total<>array_length(ids,1) THEN RAISE EXCEPTION 'Alguma agenda não existe'; END IF;
 SELECT array_agg(DISTINCT t.id::text) INTO turmas FROM public.treinamento_turmas t
 WHERE t.agenda_id::text=ANY(ids) OR EXISTS(SELECT 1 FROM public.treinamento_agenda a WHERE a.id::text=ANY(ids) AND a.id_turma::text=t.id::text);
 IF EXISTS(SELECT 1 FROM public.treinamento_agenda a WHERE NOT(a.id::text=ANY(ids)) AND a.id_turma::text=ANY(coalesce(turmas,ARRAY[]::text[])))
 THEN RAISE EXCEPTION 'Turma vinculada a outra agenda'; END IF;
 DELETE FROM public.treinamento_historico_documentos h WHERE h.turma_id::text=ANY(coalesce(turmas,ARRAY[]::text[]));
 GET DIAGNOSTICS n_hist=ROW_COUNT;
 DELETE FROM public.treinamento_turma_participantes p WHERE p.turma_id::text=ANY(coalesce(turmas,ARRAY[]::text[]));
 GET DIAGNOSTICS n_par=ROW_COUNT;
 UPDATE public.treinamento_agenda a SET id_turma=NULL WHERE a.id::text=ANY(ids);
 DELETE FROM public.treinamento_turmas t WHERE t.id::text=ANY(coalesce(turmas,ARRAY[]::text[]));
 GET DIAGNOSTICS n_tur=ROW_COUNT;
 DELETE FROM public.treinamento_agenda a WHERE a.id::text=ANY(ids);
 GET DIAGNOSTICS n_ag=ROW_COUNT;
 IF n_ag<>array_length(ids,1) THEN RAISE EXCEPTION 'Exclusão parcial revertida'; END IF;
 RETURN jsonb_build_object('agendas_excluidas',n_ag,'turmas_excluidas',n_tur,'participantes_excluidos',n_par,'historicos_excluidos',n_hist);
END; $$;
REVOKE ALL ON FUNCTION public.excluir_treinamentos_lote(text[]) FROM PUBLIC,anon,authenticated;
-- Requer autenticação administrativa e RLS adequado antes de liberar a execução.
-- Esta operação exclui registros no banco, não PDFs já salvos no computador.
