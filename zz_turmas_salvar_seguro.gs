//=====================================================
// SALVAMENTO SEGURO DE TURMAS
// Impede criar mais de uma turma para o mesmo ID Agenda.
//=====================================================

function salvarTurmaSeguro(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(ABA_PROTOCOLO);

    if (!aba) {
      throw new Error('A aba "' + ABA_PROTOCOLO + '" não foi encontrada.');
    }

    if (!dados) {
      throw new Error('Nenhum dado recebido.');
    }

    const empresa = formatarNomeArquivo_(String(dados.empresa || '').trim());
    const topico = String(dados.topico || '').trim();
    const carga = normalizarCargaTurmas_(dados.carga);
    const inicial = String(dados.inicial || '').trim();
    const final = String(dados.final || '').trim();
    const instrutor = String(dados.instrutor || '').trim();
    const habilitacao = String(dados.habilitacao || '').trim();
    const registro = String(dados.registro || '').trim();
    const participantes = Array.isArray(dados.participantes)
      ? dados.participantes
      : [];

    let idAgenda = String(dados.idAgenda || '').trim();

    if (!empresa) throw new Error('Informe a empresa.');
    if (!topico) throw new Error('Informe o treinamento.');
    if (!carga) throw new Error('Informe a carga horária.');
    if (!inicial) throw new Error('Informe a data inicial.');
    if (!final) throw new Error('Informe a data final.');
    if (!instrutor) throw new Error('Informe o instrutor.');

    if (participantes.length === 0) {
      throw new Error('Adicione pelo menos um participante.');
    }

    if (idAgenda) {
      const existente = localizarTurmaPorIdAgenda_(ss, aba, idAgenda);

      if (existente.encontrada) {
        throw new Error(
          'Este agendamento já possui a turma ' +
          existente.idTurma +
          '. Abra a turma existente em vez de salvar novamente.'
        );
      }
    }

    const proximoId = gerarProximoIdTurmas_();
    const idTurma = gerarIdTurma_();
    const idsGerados = [];

    if (idAgenda) {
      vincularIdTurmaNaAgenda_(idAgenda, idTurma);
    } else {
      idAgenda = criarAgendamentoAPartirDaTurma_(dados, idTurma);
    }

    const linhas = participantes.map(function(p, index) {
      const id = proximoId + index;
      idsGerados.push(id);

      return [
        id,
        empresa,
        formatarNomeArquivo_(String(p.nome || '').trim()),
        limparCPFTurmas_(p.cpf || ''),
        '',
        '',
        topico,
        carga,
        inicial,
        final,
        instrutor,
        habilitacao,
        registro,
        idTurma,
        idAgenda
      ];
    });

    const linhaInicial = aba.getLastRow() + 1;
    aba.getRange(linhaInicial, 2, linhas.length, 15).setValues(linhas);
    SpreadsheetApp.flush();

    return {
      sucesso: true,
      quantidade: linhas.length,
      ids: idsGerados,
      idTurma: idTurma,
      idAgenda: idAgenda,
      linhaInicial: linhaInicial,
      mensagem: linhas.length + ' participante(s) salvo(s). Turma: ' + idTurma + '.'
    };

  } finally {
    lock.releaseLock();
  }
}

function localizarTurmaPorIdAgenda_(ss, abaProtocolo, idAgenda) {
  const idProcurado = String(idAgenda || '').trim();

  if (!idProcurado) {
    return { encontrada: false, idTurma: '' };
  }

  // 1) Confere primeiro a própria Agenda.
  const abaAgenda = ss.getSheetByName(AGENDA_ABA);

  if (abaAgenda && abaAgenda.getLastRow() >= 2) {
    const dadosAgenda = abaAgenda
      .getRange(2, 1, abaAgenda.getLastRow() - 1, 14)
      .getDisplayValues();

    for (let i = 0; i < dadosAgenda.length; i++) {
      if (String(dadosAgenda[i][0] || '').trim() === idProcurado) {
        const idTurmaAgenda = String(dadosAgenda[i][13] || '').trim();

        if (idTurmaAgenda) {
          return {
            encontrada: true,
            idTurma: idTurmaAgenda,
            origem: 'agenda'
          };
        }

        break;
      }
    }
  }

  // 2) Confere o Protocolo para cobrir inconsistências antigas.
  if (abaProtocolo && abaProtocolo.getLastRow() >= 2) {
    const ultimaColuna = abaProtocolo.getLastColumn();
    const cabecalho = abaProtocolo
      .getRange(1, 1, 1, ultimaColuna)
      .getDisplayValues()[0]
      .map(function(valor) {
        return String(valor || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ');
      });

    const colIdAgenda = cabecalho.indexOf('id agenda');
    const colIdTurma = cabecalho.indexOf('id turma');

    if (colIdAgenda !== -1) {
      const dados = abaProtocolo
        .getRange(2, 1, abaProtocolo.getLastRow() - 1, ultimaColuna)
        .getDisplayValues();

      for (let i = 0; i < dados.length; i++) {
        if (String(dados[i][colIdAgenda] || '').trim() === idProcurado) {
          return {
            encontrada: true,
            idTurma: colIdTurma !== -1
              ? String(dados[i][colIdTurma] || '').trim()
              : 'já cadastrada',
            origem: 'protocolo'
          };
        }
      }
    }
  }

  return { encontrada: false, idTurma: '' };
}
