//=====================================================
// HISTÓRICO
//=====================================================

function proximoIdHistorico_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('Histórico');

  if (!aba) {
    throw new Error('A aba "Histórico" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    return 'H000000001';
  }

  const ultimoId = String(aba.getRange(ultimaLinha, 1).getValue()).trim();

  const numero = parseInt(
    ultimoId.replace(/^H/, ''),
    10
  ) || 0;

  return 'H' + Utilities.formatString('%09d', numero + 1);
}

function registrarHistoricoDocumento_(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!dados) {
      throw new Error('Nenhum dado recebido.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName('Histórico');

    if (!aba) {
      throw new Error('A aba "Histórico" não foi encontrada.');
    }

    const idHistorico = proximoIdHistorico_();

    const usuario = Session.getActiveUser().getEmail() || '';

    const dataHora = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd HH:mm:ss'
    );

    const linha = [[
      idHistorico,
      dataHora,
      dados.tipo || '',
      dados.idTurma || '',
      dados.empresa || '',
      dados.treinamento || '',
      dados.participante || '',
      dados.cpf || '',
      dados.pasta || '',
      usuario,
      dados.status || 'Gerado',
      dados.observacao || '',
      dados.nomeArquivo || ''
    ]];

    const linhaDestino = aba.getLastRow() + 1;

    aba.getRange(linhaDestino, 1, 1, linha[0].length).setValues(linha);

    SpreadsheetApp.flush();

    return {
      sucesso: true,
      idHistorico: idHistorico,
      linha: linhaDestino
    };

  } finally {
    lock.releaseLock();
  }
}

//=====================================================
// CONSULTAR HISTÓRICO
//=====================================================

function consultarHistoricoDocumentos(filtros) {
  filtros = filtros || {};

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('Histórico');

  if (!aba) {
    throw new Error('A aba "Histórico" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    return [];
  }

  const dados = aba.getRange(2, 1, ultimaLinha - 1, 13).getDisplayValues();

  const empresaFiltro = normalizarTextoHistorico_(filtros.empresa);
  const treinamentoFiltro = normalizarTextoHistorico_(filtros.treinamento);
  const tipoFiltro = normalizarTextoHistorico_(filtros.tipo);
  const turmaFiltro = normalizarTextoHistorico_(filtros.idTurma);
  const participanteFiltro = normalizarTextoHistorico_(filtros.participante);
  const cpfFiltro = String(filtros.cpf || '').replace(/\D/g, '');

  const resultado = dados
    .map(function(linha, index) {
      return {
        linha: index + 2,
        idHistorico: linha[0],
        dataHora: linha[1],
        tipo: linha[2],
        idTurma: linha[3],
        empresa: linha[4],
        treinamento: linha[5],
        participante: linha[6],
        cpf: linha[7],
        pasta: linha[8],
        usuario: linha[9],
        status: linha[10],
        observacao: linha[11],
        nomeArquivo: linha[12]
      };
    })
    .filter(function(item) {
      const cpfItem = String(item.cpf || '').replace(/\D/g, '');

      return (
        (!empresaFiltro || normalizarTextoHistorico_(item.empresa).includes(empresaFiltro)) &&
        (!treinamentoFiltro || normalizarTextoHistorico_(item.treinamento).includes(treinamentoFiltro)) &&
        (!tipoFiltro || normalizarTextoHistorico_(item.tipo).includes(tipoFiltro)) &&
        (!turmaFiltro || normalizarTextoHistorico_(item.idTurma).includes(turmaFiltro)) &&
        (!participanteFiltro || normalizarTextoHistorico_(item.participante).includes(participanteFiltro)) &&
        (!cpfFiltro || cpfItem.includes(cpfFiltro))
      );
    })
    .reverse();

  return resultado;
}

function normalizarTextoHistorico_(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

//=====================================================
// TESTES
//=====================================================

function testeConsultaHistorico() {
  const resultado = consultarHistoricoDocumentos({});
  Logger.log('Quantidade encontrada: ' + resultado.length);
  Logger.log(JSON.stringify(resultado.slice(0, 3), null, 2));
}

function consultarHistorico(filtros) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('Histórico');

  if (!aba) {
    throw new Error('A aba "Histórico" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    return [];
  }

  filtros = filtros || {};

  const dados = aba
    .getRange(2, 1, ultimaLinha - 1, aba.getLastColumn())
    .getDisplayValues();

  return dados
    .map(function(linha) {
      return {
        idHistorico: linha[0],
        dataHora: linha[1],
        tipo: linha[2],
        idTurma: linha[3],
        empresa: linha[4],
        treinamento: linha[5],
        participante: linha[6],
        cpf: linha[7],
        pasta: linha[8],
        usuario: linha[9],
        status: linha[10] || 'Gerado'
      };
    })
    .filter(function(item) {
      return filtrarHistorico_(item, filtros);
    });
}

function filtrarHistorico_(item, filtros) {
  const empresa = normalizarFiltroHistorico_(filtros.empresa);
  const treinamento = normalizarFiltroHistorico_(filtros.treinamento);
  const tipo = normalizarFiltroHistorico_(filtros.tipo);
  const idTurma = normalizarFiltroHistorico_(filtros.idTurma);
  const participante = normalizarFiltroHistorico_(filtros.participante);
  const cpf = String(filtros.cpf || '').replace(/\D/g, '');

  if (empresa && !normalizarFiltroHistorico_(item.empresa).includes(empresa)) return false;
  if (treinamento && !normalizarFiltroHistorico_(item.treinamento).includes(treinamento)) return false;
  if (tipo && normalizarFiltroHistorico_(item.tipo) !== tipo) return false;
  if (idTurma && !normalizarFiltroHistorico_(item.idTurma).includes(idTurma)) return false;
  if (participante && !normalizarFiltroHistorico_(item.participante).includes(participante)) return false;

  if (cpf) {
    const cpfItem = String(item.cpf || '').replace(/\D/g, '');
    if (!cpfItem.includes(cpf)) return false;
  }

  return true;
}

function normalizarFiltroHistorico_(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}