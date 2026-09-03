//=====================================================
// HISTORICO DE DOCUMENTOS + SINCRONIZACAO COM AGENDA
// Ao gerar a Lista de Presenca, avanca a Agenda para etapa 3.
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

  const tipo = String(dados.tipo || '').trim().toLowerCase();
  const idTurma = String(dados.idTurma || '').trim();

  if (tipo === 'lista de presença' && idTurma) {
    atualizarEtapaAgendaPorIdTurma(idTurma, 3);
  }
}
