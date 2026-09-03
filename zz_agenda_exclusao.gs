//=====================================================
// PROTECAO DE EXCLUSAO DA AGENDA
// Regra: somente permite excluir quando nao houver
// turma nem participantes vinculados ao agendamento.
//=====================================================

function excluirAgendamentoAgendaServidor(idAgenda) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const idProcurado = String(idAgenda || '').trim();
    if (!idProcurado) {
      throw new Error('ID do agendamento não informado.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const abaAgenda = ss.getSheetByName(AGENDA_ABA);

    if (!abaAgenda) {
      throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
    }

    const ultimaLinhaAgenda = abaAgenda.getLastRow();
    if (ultimaLinhaAgenda < 2) {
      throw new Error('Não existem agendamentos cadastrados.');
    }

    const dadosAgenda = abaAgenda
      .getRange(2, 1, ultimaLinhaAgenda - 1, 14)
      .getDisplayValues();

    let linhaAgenda = -1;
    let idTurmaAgenda = '';

    for (let i = 0; i < dadosAgenda.length; i++) {
      if (String(dadosAgenda[i][0] || '').trim() === idProcurado) {
        linhaAgenda = i + 2;
        idTurmaAgenda = String(dadosAgenda[i][13] || '').trim();
        break;
      }
    }

    if (linhaAgenda === -1) {
      throw new Error('Agendamento não encontrado: ' + idProcurado);
    }

    // Se a própria Agenda já possui ID Turma, a exclusão é bloqueada.
    if (idTurmaAgenda) {
      throw new Error(
        'Este agendamento não pode ser excluído porque já possui uma turma vinculada (' +
        idTurmaAgenda + ').'
      );
    }

    // Verificação adicional no Protocolo. Isso protege inclusive casos
    // em que o ID Turma da Agenda esteja vazio por inconsistência antiga.
    const abaProtocolo = ss.getSheetByName('Protocolo do Treinamento');

    if (abaProtocolo && abaProtocolo.getLastRow() >= 2) {
      const ultimaColuna = abaProtocolo.getLastColumn();
      const cabecalho = abaProtocolo
        .getRange(1, 1, 1, ultimaColuna)
        .getDisplayValues()[0]
        .map(normalizarCabecalhoAgenda_);

      const colunaIdAgenda = cabecalho.indexOf('id agenda');
      const colunaIdTurma = cabecalho.indexOf('id turma');

      if (colunaIdAgenda !== -1) {
        const quantidadeLinhas = abaProtocolo.getLastRow() - 1;
        const dadosProtocolo = abaProtocolo
          .getRange(2, 1, quantidadeLinhas, ultimaColuna)
          .getDisplayValues();

        const vinculados = dadosProtocolo.filter(function(linha) {
          return String(linha[colunaIdAgenda] || '').trim() === idProcurado;
        });

        if (vinculados.length > 0) {
          let idTurma = '';
          if (colunaIdTurma !== -1) {
            idTurma = String(vinculados[0][colunaIdTurma] || '').trim();
          }

          throw new Error(
            'Este agendamento não pode ser excluído porque possui ' +
            vinculados.length + ' participante(s) vinculado(s)' +
            (idTurma ? ' na turma ' + idTurma : '') + '.'
          );
        }
      }
    }

    // Sem turma e sem participantes: exclusão liberada.
    abaAgenda.deleteRow(linhaAgenda);

    return {
      sucesso: true,
      idAgenda: idProcurado,
      quantidadeExcluida: 0,
      mensagem: 'Agendamento excluído com sucesso.'
    };

  } finally {
    lock.releaseLock();
  }
}
