//=====================================================
// DOCUMENTOS - LISTA DE PRESENÇA
//=====================================================

function gerarListaPresencaPorIdTurma(idTurma) {
  const turma = obterTurmaParaDocumento_(idTurma);

  const estrutura = obterEstruturaTreinamento_(
    turma.empresa,
    turma.treinamento
  );

  const documento = criarListaPresencaGoogleDocs_(turma, estrutura.pastaLista);

  registrarHistoricoDocumento_({
    tipo: 'Lista de Presença',
    idTurma: turma.idTurma,
    empresa: turma.empresa,
    treinamento: turma.treinamento,
    participante: '',
    cpf: '',
    googleDocs: documento.url,
    pdf: '',
    pasta: estrutura.pastaListaUrl
  });

  return {
    sucesso: true,
    idTurma: turma.idTurma,
    quantidade: turma.participantes.length,
    url: documento.url,
    pastaUrl: estrutura.pastaListaUrl,
    mensagem: 'Lista de presença gerada com sucesso!'
  };
}

function criarListaPresencaGoogleDocs_(turma, pastaDestino) {
  const modelo = DriveApp.getFileById(ID_MODELO_LISTA);

  const nomeArquivo = normalizarNomeArquivoDrive_(
    'Lista de Presença',
    ''
  );

  const copia = modelo.makeCopy(nomeArquivo, pastaDestino);

  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();

  preencherMarcadoresLista_(body, turma);
  preencherTabelaParticipantesLista_(body, turma.participantes);

  doc.saveAndClose();

  return {
    id: copia.getId(),
    url: copia.getUrl(),
    nome: copia.getName()
  };
}

//=====================================================
// TURMA BASE PARA DOCUMENTOS
//=====================================================

function obterTurmaParaDocumento_(idTurma) {
  if (!idTurma) {
    throw new Error('ID da turma não informado.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABA_PROTOCOLO);

  if (!aba) {
    throw new Error('A aba "' + ABA_PROTOCOLO + '" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    throw new Error('Nenhuma turma cadastrada.');
  }

  const dados = aba.getRange(2, 2, ultimaLinha - 1, 14).getDisplayValues();

  const linhas = dados.filter(function(linha) {
    return String(linha[13] || '').trim() === String(idTurma).trim();
  });

  if (linhas.length === 0) {
    throw new Error('Nenhuma turma encontrada com o ID: ' + idTurma);
  }

  const primeira = linhas[0];

  const empresa = primeira[1];
  const treinamento = primeira[6];
  const dadosTreinamento = obterDadosTreinamentoDocumento_(treinamento);

  return {
    idTurma: idTurma,
    empresa: empresa,
    treinamento: treinamento,
    carga: dadosTreinamento.carga || primeira[7],
    dataInicio: primeira[8],
    dataFim: primeira[9],
    instrutor: primeira[10],
    habilitacao: primeira[11],
    registro: primeira[12],
    conteudo: dadosTreinamento.conteudo,
    participantes: linhas.map(function(linha) {
      return {
        nome: String(linha[2] || '').trim(),
        cpf: formatarCPFDocumento_(linha[3])
      };
    })
  };
}

//=====================================================
// MARCADORES
//=====================================================

function preencherMarcadoresLista_(body, turma) {
  const marcadores = {
    '<<INSTRUTOR>>': turma.instrutor,
    '<<HABILITACAO>>': turma.habilitacao,
    '<<EMPRESA>>': turma.empresa,

    '<<DATAINICIO>>': turma.dataInicio,
    '<<DATAFIM>>': turma.dataFim,
    '<<INICIAL>>': turma.dataInicio,
    '<<FINAL>>': turma.dataFim,

    '<<CARGA>>': turma.carga,
    '<<TREINAMENTO>>': turma.treinamento,
    '<<TOPICO>>': turma.treinamento,
    '<<CONTEUDO>>': turma.conteudo
  };

  Object.keys(marcadores).forEach(function(chave) {
    substituirMarcadorDocumento_(body, chave, marcadores[chave]);
  });
}

function preencherTabelaParticipantesLista_(body, participantes) {
  const tabela = localizarTabelaParticipantesDocumento_(body);
  const linhaModeloIndex = localizarLinhaModeloParticipantes_(tabela);

  if (linhaModeloIndex === -1) {
    throw new Error('Linha modelo com <<NOME>> e <<CPF>> não encontrada.');
  }

  const linhaModelo = tabela.getRow(linhaModeloIndex);

  participantes.forEach(function(participante, index) {
    const novaLinha = tabela.insertTableRow(
      linhaModeloIndex + index,
      linhaModelo.copy()
    );

    novaLinha.replaceText('<<NOME>>', participante.nome || '');
    novaLinha.replaceText('<<CPF>>', participante.cpf || '');
  });

  tabela.removeRow(linhaModeloIndex + participantes.length);
}

function localizarTabelaParticipantesDocumento_(body) {
  const tabelas = body.getTables();

  for (let i = 0; i < tabelas.length; i++) {
    const texto = tabelas[i].getText().toUpperCase();

    if (
      texto.indexOf('NOME') !== -1 &&
      texto.indexOf('CPF') !== -1 &&
      texto.indexOf('ASSINATURA') !== -1
    ) {
      return tabelas[i];
    }
  }

  throw new Error('Tabela de participantes não encontrada no modelo.');
}

function localizarLinhaModeloParticipantes_(tabela) {
  for (let i = 0; i < tabela.getNumRows(); i++) {
    const texto = tabela.getRow(i).getText();

    if (
      texto.indexOf('<<NOME>>') !== -1 ||
      texto.indexOf('<<CPF>>') !== -1
    ) {
      return i;
    }
  }

  return -1;
}

//=====================================================
// BANCO DE DADOS
//=====================================================

function obterDadosTreinamentoDocumento_(treinamento) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABA_BANCO);

  if (!aba) {
    throw new Error('A aba "' + ABA_BANCO + '" não foi encontrada.');
  }

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 17) {
    return {
      topico: treinamento || '',
      conteudo: '',
      carga: ''
    };
  }

  const dados = aba.getRange(17, 2, ultimaLinha - 16, 3).getDisplayValues();
  const chaveBusca = normalizarTextoDocumento_(treinamento);

  for (let i = 0; i < dados.length; i++) {
    const chaveLinha = normalizarTextoDocumento_(dados[i][0]);

    if (chaveLinha === chaveBusca) {
      return {
        topico: String(dados[i][0] || '').trim(),
        conteudo: String(dados[i][1] || '').trim(),
        carga: String(dados[i][2] || '').trim()
      };
    }
  }

  return {
    topico: treinamento || '',
    conteudo: '',
    carga: ''
  };
}

function buscarConteudoTreinamento_(treinamento) {
  return obterDadosTreinamentoDocumento_(treinamento).conteudo;
}

function buscarCargaTreinamento_(treinamento) {
  return obterDadosTreinamentoDocumento_(treinamento).carga;
}

//=====================================================
// HISTÓRICO
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
}

//=====================================================
// UTILITÁRIOS
//=====================================================

function substituirMarcadorDocumento_(body, marcador, valor) {
  body.replaceText(
    escaparRegexDocumento_(marcador),
    valor == null ? '' : String(valor)
  );
}

function escaparRegexDocumento_(texto) {
  return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatarCPFDocumento_(cpf) {
  cpf = String(cpf || '').replace(/\D/g, '');

  if (!cpf) return '';

  return cpf.padStart(11, '0');
}

function normalizarTextoDocumento_(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
