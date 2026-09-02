//=====================================================
// AGENDA
//=====================================================

function carregarDadosBaseAgenda() {
  const dadosTurmas = carregarDadosTurmas();

  return {
    empresas: dadosTurmas.empresas,
    treinamentos: dadosTurmas.treinamentos.map(function(t) {
      return {
        nome: t.topico,
        carga: t.carga
      };
    }),
    instrutores: dadosTurmas.instrutores.map(function(i) {
      return i.nome;
    })
  };
}

function salvarAgendamentoAgendaServidor(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!dados) {
      throw new Error('Nenhum dado recebido.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(AGENDA_ABA);

    if (!aba) {
      throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
    }

    const empresa = formatarNomeArquivo_(
      String(dados.empresa || '').trim()
    );

    const treinamento = String(dados.treinamento || '').trim();
    const instrutor = String(dados.instrutor || '').trim();
    const dataInicialISO = String(dados.dataInicial || '').trim();
    const observacao = String(dados.observacao || '').trim();

    if (!empresa) throw new Error('Informe a empresa.');
    if (!treinamento) throw new Error('Informe o treinamento.');
    if (!instrutor) throw new Error('Informe o instrutor.');
    if (!dataInicialISO) throw new Error('Data inicial inválida.');

    const carga = normalizarCargaTurmas_(
      buscarCargaTreinamento_(treinamento)
    );

    if (!carga) {
      throw new Error('Carga horária não encontrada para o treinamento: ' + treinamento);
    }

    const dataInicial = criarDataLocalAgenda_(dataInicialISO);
    const dataFinal = calcularDataFinalAgenda_(dataInicial, carga);

    const idAgenda = gerarIdAgenda_(aba);

    aba.getRange('F:F').setNumberFormat('0');

    aba.appendRow([
      idAgenda,
      dataInicial,
      dataFinal,
      empresa,
      treinamento,
      Number(carga),
      instrutor,
      AGENDA_HORA_INICIAL,
      AGENDA_HORA_FINAL,
      STATUS_AGENDADO,
      1,
      observacao,
      new Date(),
      ''
    ]);

    return {
      sucesso: true,
      idAgenda: idAgenda,
      mensagem: 'Agendamento salvo com sucesso!'
    };

  } finally {
    lock.releaseLock();
  }
}
function listarAgendamentosAgenda() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(AGENDA_ABA);

  if (!aba) {
    throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    return [];
  }

  const dados = aba.getRange(2, 1, ultimaLinha - 1, 14).getValues();

  return dados
    .filter(function(linha) {
      return String(linha[0] || '').trim() !== '';
    })
    .map(function(linha) {
      return {
        id: linha[0],
        dataInicialISO: formatarDataISOAgenda_(linha[1]),
        dataFinalISO: formatarDataISOAgenda_(linha[2]),
        empresa: linha[3],
        treinamento: linha[4],
        carga: linha[5],
        instrutor: linha[6],
        horaInicial: linha[7],
        horaFinal: linha[8],
        status: linha[9],
        etapa: linha[10] || 1,
        observacao: linha[11],
        criadoEm: linha[12],
        idTurma: linha[13] || ''
      };
    });
}

function listarEventosAgendaV2() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(AGENDA_ABA);

  if (!aba) {
    throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  const dados = aba.getRange(2, 1, ultimaLinha - 1, 14).getDisplayValues();

  return dados
    .filter(function(linha) {
      return String(linha[0] || '').trim() !== '';
    })
    .map(function(linha) {
      return {
        id: String(linha[0] || ''),
        dataInicialISO: converterDataAgendaParaISO_(linha[1]),
        dataFinalISO: converterDataAgendaParaISO_(linha[2]),
        empresa: String(linha[3] || ''),
        treinamento: String(linha[4] || ''),
        carga: String(linha[5] || ''),
        instrutor: String(linha[6] || ''),
        horaInicial: String(linha[7] || ''),
        horaFinal: String(linha[8] || ''),
        status: String(linha[9] || ''),
        etapa: String(linha[10] || '1'),
        observacao: String(linha[11] || ''),
        criadoEm: String(linha[12] || ''),
        idTurma: String(linha[13] || '')
      };
    });
}

function excluirAgendamentoAgendaServidor(idAgenda) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const idProcurado = String(idAgenda || '').trim();

    if (!idProcurado) {
      throw new Error('ID do agendamento não informado.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // =====================================================
    // 1. LOCALIZA O AGENDAMENTO NA ABA AGENDA
    // =====================================================

    const abaAgenda = ss.getSheetByName(AGENDA_ABA);

    if (!abaAgenda) {
      throw new Error(
        'A aba "' + AGENDA_ABA + '" não foi encontrada.'
      );
    }

    const ultimaLinhaAgenda = abaAgenda.getLastRow();

    if (ultimaLinhaAgenda < 2) {
      throw new Error('Não existem agendamentos cadastrados.');
    }

    const idsAgenda = abaAgenda
      .getRange(2, 1, ultimaLinhaAgenda - 1, 1)
      .getDisplayValues();

    let linhaAgenda = -1;

    for (let i = 0; i < idsAgenda.length; i++) {
      const idLinha = String(idsAgenda[i][0] || '').trim();

      if (idLinha === idProcurado) {
        linhaAgenda = i + 2;
        break;
      }
    }

    if (linhaAgenda === -1) {
      throw new Error(
        'Agendamento não encontrado: ' + idProcurado
      );
    }

    // =====================================================
    // 2. EXCLUI DO PROTOCOLO PELO ID AGENDA
    // =====================================================

    const abaProtocolo = ss.getSheetByName(
      'Protocolo do Treinamento'
    );

    let quantidadeExcluida = 0;

    if (abaProtocolo) {
      const ultimaLinhaProtocolo = abaProtocolo.getLastRow();
      const ultimaColunaProtocolo = abaProtocolo.getLastColumn();

      if (
        ultimaLinhaProtocolo >= 2 &&
        ultimaColunaProtocolo >= 1
      ) {
        const cabecalho = abaProtocolo
          .getRange(1, 1, 1, ultimaColunaProtocolo)
          .getDisplayValues()[0]
          .map(function(valor) {
            return String(valor || '')
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, ' ');
          });

        const colunaIdAgenda = cabecalho.indexOf('id agenda');

        if (colunaIdAgenda !== -1) {
          const valoresIdAgenda = abaProtocolo
            .getRange(
              2,
              colunaIdAgenda + 1,
              ultimaLinhaProtocolo - 1,
              1
            )
            .getDisplayValues();

          // Exclui de baixo para cima
          for (
            let i = valoresIdAgenda.length - 1;
            i >= 0;
            i--
          ) {
            const idLinha = String(
              valoresIdAgenda[i][0] || ''
            ).trim();

            if (idLinha === idProcurado) {
              abaProtocolo.deleteRow(i + 2);
              quantidadeExcluida++;
            }
          }
        }
      }
    }

    // =====================================================
    // 3. EXCLUI DA AGENDA
    // =====================================================

    abaAgenda.deleteRow(linhaAgenda);

    return {
      sucesso: true,
      idAgenda: idProcurado,
      quantidadeExcluida: quantidadeExcluida,
      mensagem:
        quantidadeExcluida > 0
          ? 'Agendamento excluído. ' +
            quantidadeExcluida +
            ' registro(s) removido(s) do Protocolo do Treinamento.'
          : 'Agendamento excluído com sucesso.'
    };

  } finally {
    lock.releaseLock();
  }
}

function normalizarCabecalhoAgenda_(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function escaparHtmlAgenda(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function converterDataAgendaParaISO_(valor) {
  valor = String(valor || '').trim();

  if (!valor) return '';

  if (valor.indexOf('/') !== -1) {
    const partes = valor.split('/');
    return partes[2] + '-' + partes[1].padStart(2, '0') + '-' + partes[0].padStart(2, '0');
  }

  if (valor.indexOf('-') !== -1) {
    return valor;
  }

  return '';
}

//=====================================================
// ATUALIZAÇÃO DE ETAPAS
//=====================================================

function atualizarEtapaAgendaPorIdTurma(idTurma, etapa) {
  if (!idTurma) return false;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(AGENDA_ABA);

  if (!aba) {
    throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return false;

  const idsTurma = aba.getRange(2, 14, ultimaLinha - 1, 1).getValues();

  for (let i = 0; i < idsTurma.length; i++) {
    if (String(idsTurma[i][0] || '').trim() === String(idTurma).trim()) {
      aba.getRange(i + 2, 11).setValue(etapa);
      return true;
    }
  }

  return false;
}

function vincularTurmaNaAgenda(idAgenda, idTurma) {
  if (!idAgenda || !idTurma) return false;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(AGENDA_ABA);

  if (!aba) {
    throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return false;

  const idsAgenda = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues();

  for (let i = 0; i < idsAgenda.length; i++) {
    if (String(idsAgenda[i][0] || '').trim() === String(idAgenda).trim()) {
      aba.getRange(i + 2, 11).setValue(2);
      aba.getRange(i + 2, 14).setValue(idTurma);
      return true;
    }
  }

  return false;
}

//=====================================================
// UTILITÁRIOS DA AGENDA
//=====================================================

function gerarIdAgenda_(aba) {
  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    return 'AG000001';
  }

  const ids = aba
    .getRange(2, 1, ultimaLinha - 1, 1)
    .getValues()
    .flat()
    .filter(String)
    .map(String);

  let maior = 0;

  ids.forEach(function(id) {
    const numero = Number(String(id).replace(/\D/g, ''));
    if (numero > maior) maior = numero;
  });

  return 'AG' + String(maior + 1).padStart(6, '0');
}

function calcularDataFinalAgenda_(dataInicial, carga) {
  const diasNecessarios = Math.ceil(Number(carga) / 8);
  const data = new Date(dataInicial);

  let adicionados = 0;

  while (adicionados < diasNecessarios - 1) {
    data.setDate(data.getDate() + 1);

    const diaSemana = data.getDay();

    if (diaSemana !== 0 && diaSemana !== 6) {
      adicionados++;
    }
  }

  return data;
}

function criarDataLocalAgenda_(dataISO) {
  const partes = String(dataISO).split('-');

  if (partes.length !== 3) {
    throw new Error('Data inválida: ' + dataISO);
  }

  return new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );
}

function formatarDataISOAgenda_(data) {
  if (!data) return '';

  if (!(data instanceof Date)) {
    data = new Date(data);
  }

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return ano + '-' + mes + '-' + dia;
}

//=====================================================
// AGENDA - VÍNCULO COM TURMA
//=====================================================

function vincularIdTurmaNaAgenda_(idAgenda, idTurma) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('Agenda');

  if (!aba) {
    throw new Error('A aba "Agenda" não foi encontrada.');
  }

  const dados = aba.getDataRange().getValues();

  const cabecalho = dados[0].map(function(c) {
    return String(c || '').trim();
  });

  const colIdAgenda = cabecalho.indexOf('ID Agenda');
  const colIdTurma = cabecalho.indexOf('ID Turma');
  const colStatus = cabecalho.indexOf('Status');

  if (colIdAgenda === -1) {
    throw new Error('A coluna "ID Agenda" não foi encontrada.');
  }

  if (colIdTurma === -1) {
    throw new Error('A coluna "ID Turma" não foi encontrada.');
  }

  for (let i = 1; i < dados.length; i++) {
    const idLinha = String(dados[i][colIdAgenda] || '').trim();

    if (idLinha === String(idAgenda || '').trim()) {
      aba.getRange(i + 1, colIdTurma + 1).setValue(idTurma);

      if (colStatus !== -1) {
        aba.getRange(i + 1, colStatus + 1).setValue('Turma criada');
      }

      return true;
    }
  }

  throw new Error(
    'Agendamento não encontrado na Agenda. ID recebido: ' + idAgenda
  );
}

function criarAgendamentoAPartirDaTurma_(dados, idTurma) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(AGENDA_ABA);

  if (!aba) {
    throw new Error('A aba "' + AGENDA_ABA + '" não foi encontrada.');
  }

  const empresa = formatarNomeArquivo_(String(dados.empresa || '').trim());
  const treinamento = String(dados.topico || dados.treinamento || '').trim();
  const instrutor = String(dados.instrutor || '').trim();
  const carga = normalizarCargaTurmas_(dados.carga);
  const observacao = String(dados.observacao || '').trim();

  const dataInicial = converterDataBRTurmaParaData_(dados.inicial);
  const dataFinal = converterDataBRTurmaParaData_(dados.final);

  const idAgenda = gerarIdAgenda_(aba);

  aba.appendRow([
    idAgenda,
    dataInicial,
    dataFinal,
    empresa,
    treinamento,
    Number(carga),
    instrutor,
    AGENDA_HORA_INICIAL,
    AGENDA_HORA_FINAL,
    'Turma criada',
    2,
    observacao,
    new Date(),
    idTurma
  ]);

  return idAgenda;
}

function converterDataBRTurmaParaData_(dataBR) {
  const partes = String(dataBR || '').split('/');

  if (partes.length !== 3) {
    throw new Error('Data inválida para Agenda: ' + dataBR);
  }

  return new Date(
    Number(partes[2]),
    Number(partes[1]) - 1,
    Number(partes[0])
  );
}