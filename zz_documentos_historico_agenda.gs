//=====================================================
// HISTORICO DE DOCUMENTOS + SINCRONIZACAO COM AGENDA
// Lista de Presenca -> etapa 3
// Certificados -> etapa 4 somente quando todos os participantes da turma
// possuem certificado registrado no Historico.
//=====================================================

function registrarHistoricoDocumento_(dados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(ABA_HISTORICO);

  if (!aba) {
    aba = ss.insertSheet(ABA_HISTORICO);
    aba.appendRow([
      'Data/Hora',
      'Tipo',
      'ID Turma',
      'Empresa',
      'Treinamento',
      'Participante',
      'CPF',
      'Google Docs',
      'PDF',
      'Pasta'
    ]);
  }

  aba.appendRow([
    new Date(),
    dados.tipo || '',
    dados.idTurma || '',
    dados.empresa || '',
    dados.treinamento || '',
    dados.participante || '',
    dados.cpf || '',
    dados.googleDocs || '',
    dados.pdf || '',
    dados.pasta || ''
  ]);

  const tipo = normalizarTipoDocumentoAgenda_(dados.tipo);
  const idTurma = String(dados.idTurma || '').trim();

  if (!idTurma) return;

  if (tipo === 'lista de presenca') {
    atualizarEtapaAgendaPorIdTurma(idTurma, 3);
    return;
  }

  if (tipo === 'certificado' && turmaPossuiTodosCertificados_(idTurma, ss, aba)) {
    atualizarEtapaAgendaPorIdTurma(idTurma, 4);
  }
}

function turmaPossuiTodosCertificados_(idTurma, ss, abaHistorico) {
  const turma = obterTurmaParaDocumento_(idTurma);
  const participantes = turma.participantes || [];

  if (participantes.length === 0) return false;

  const ultimaLinha = abaHistorico.getLastRow();
  if (ultimaLinha < 2) return false;

  const dados = abaHistorico
    .getRange(2, 1, ultimaLinha - 1, Math.max(10, abaHistorico.getLastColumn()))
    .getDisplayValues();

  const cpfsCertificados = {};
  const nomesCertificados = {};

  dados.forEach(function(linha) {
    const tipo = normalizarTipoDocumentoAgenda_(linha[1]);
    const turmaLinha = String(linha[2] || '').trim();

    if (tipo !== 'certificado' || turmaLinha !== String(idTurma).trim()) return;

    const nome = normalizarTextoDocumentoAgenda_(linha[5]);
    const cpf = normalizarCpfDocumentoAgenda_(linha[6]);

    if (nome) nomesCertificados[nome] = true;
    if (cpf) cpfsCertificados[cpf] = true;
  });

  return participantes.every(function(participante) {
    const cpf = normalizarCpfDocumentoAgenda_(participante.cpf);
    const nome = normalizarTextoDocumentoAgenda_(participante.nome);

    return (cpf && cpfsCertificados[cpf]) || (nome && nomesCertificados[nome]);
  });
}

function normalizarTipoDocumentoAgenda_(texto) {
  return normalizarTextoDocumentoAgenda_(texto);
}

function normalizarTextoDocumentoAgenda_(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarCpfDocumentoAgenda_(cpf) {
  return String(cpf || '').replace(/\D/g, '').padStart(11, '0');
}
