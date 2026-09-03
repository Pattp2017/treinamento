//=====================================================
// CANCELAMENTO SEGURO DA AGENDA
// Preserva registros vinculados e impede cancelamento tardio.
//=====================================================

function verificarCancelamentoAgendamentoAgendaServidor(idAgenda) {
  const idProcurado = String(idAgenda || '').trim();

  if (!idProcurado) {
    throw new Error('ID do agendamento não informado.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaAgenda = ss.getSheetByName(AGENDA_ABA);

  if (!abaAgenda) {
    throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
  }

  const ultimaLinha = abaAgenda.getLastRow();
  if (ultimaLinha < 2) {
    throw new Error('Não existem agendamentos cadastrados.');
  }

  const dados = abaAgenda
    .getRange(2, 1, ultimaLinha - 1, 14)
    .getDisplayValues();

  let encontrado = null;

  for (let i = 0; i < dados.length; i++) {
    if (String(dados[i][0] || '').trim() === idProcurado) {
      encontrado = {
        linha: i + 2,
        status: String(dados[i][9] || '').trim(),
        etapa: Number(dados[i][10] || 1),
        idTurma: String(dados[i][13] || '').trim()
      };
      break;
    }
  }

  if (!encontrado) {
    throw new Error('Agendamento não encontrado: ' + idProcurado);
  }

  const statusNormalizado = String(encontrado.status || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (statusNormalizado === 'cancelado' || statusNormalizado === 'cancelada') {
    return {
      sucesso: true,
      podeCancelar: false,
      jaCancelado: true,
      idAgenda: idProcurado,
      etapa: encontrado.etapa,
      idTurma: encontrado.idTurma,
      motivo: 'Este agendamento já está cancelado.'
    };
  }

  // A partir da etapa 3 já existe documento operacional gerado.
  // Nessa situação o cancelamento simples é bloqueado para preservar rastreabilidade.
  if (encontrado.etapa >= 3) {
    return {
      sucesso: true,
      podeCancelar: false,
      jaCancelado: false,
      idAgenda: idProcurado,
      etapa: encontrado.etapa,
      idTurma: encontrado.idTurma,
      motivo: 'Este agendamento não pode ser cancelado porque já atingiu a etapa ' +
        encontrado.etapa + '. Há documentos gerados e o histórico deve ser preservado.'
    };
  }

  return {
    sucesso: true,
    podeCancelar: true,
    jaCancelado: false,
    idAgenda: idProcurado,
    etapa: encontrado.etapa,
    idTurma: encontrado.idTurma,
    linhaAgenda: encontrado.linha,
    motivo: ''
  };
}

function cancelarAgendamentoAgendaServidor(idAgenda, motivo) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const validacao = verificarCancelamentoAgendamentoAgendaServidor(idAgenda);

    if (!validacao.podeCancelar) {
      throw new Error(validacao.motivo || 'Este agendamento não pode ser cancelado.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const abaAgenda = ss.getSheetByName(AGENDA_ABA);

    const textoMotivo = String(motivo || '').trim();
    const observacaoAtual = String(
      abaAgenda.getRange(validacao.linhaAgenda, 12).getDisplayValue() || ''
    ).trim();

    const registroCancelamento =
      'Cancelado em ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') +
      (textoMotivo ? ' - Motivo: ' + textoMotivo : '');

    const novaObservacao = observacaoAtual
      ? observacaoAtual + ' | ' + registroCancelamento
      : registroCancelamento;

    abaAgenda.getRange(validacao.linhaAgenda, 10).setValue('Cancelado');
    abaAgenda.getRange(validacao.linhaAgenda, 12).setValue(novaObservacao);

    SpreadsheetApp.flush();

    return {
      sucesso: true,
      idAgenda: validacao.idAgenda,
      etapa: validacao.etapa,
      idTurma: validacao.idTurma,
      mensagem: validacao.idTurma
        ? 'Agendamento cancelado. A turma e os participantes foram preservados para manter a rastreabilidade.'
        : 'Agendamento cancelado com sucesso.'
    };

  } finally {
    lock.releaseLock();
  }
}
