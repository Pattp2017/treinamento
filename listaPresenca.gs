//=====================================================
// LISTA DE PRESENÇA
//=====================================================

function gerarListaPresencaPorIdTurma(idTurma) {
  const turma = obterTurmaParaDocumento_(idTurma);

  const estrutura = obterEstruturaTreinamento_(
    turma.empresa,
    turma.treinamento
  );

  const pastaLista = estrutura.pastaLista;

  const lista = criarListaPresencaPDF_(turma, pastaLista);

  registrarHistoricoDocumento_({
    tipo: 'Lista de Presença',
    idTurma: turma.idTurma,
    empresa: turma.empresa,
    treinamento: turma.treinamento,
    participante: '',
    cpf: '',
    pasta: lista.pastaUrl || '',
    status: 'Gerado',
    observacao: '',
    nomeArquivo: lista.nomeArquivo || ''
  });

  return {
    sucesso: true,
    idTurma: turma.idTurma,
    quantidade: turma.participantes.length,
    pastaUrl: lista.pastaUrl,
    nomeArquivo: lista.nomeArquivo,
    mensagem: 'Lista de presença gerada com sucesso!'
  };
}

function criarListaPresencaPDF_(turma, pastaDestino) {
  const modelo = DriveApp.getFileById(ID_MODELO_LISTA);

  const nomeBase = normalizarNomeArquivoDrive_(
    turma.treinamento || 'Lista de Presença',
    ''
  );

  const nomePdf = nomeBase + '.pdf';

  excluirArquivoMesmoNomeNaPasta_(pastaDestino, nomePdf);

  const copia = modelo.makeCopy(nomeBase);

  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();

  preencherMarcadoresListaPresenca_(body, turma);
  preencherTabelaParticipantesLista_(body, turma.participantes);

  doc.saveAndClose();

  const arquivoCopia = DriveApp.getFileById(copia.getId());

  const pdfBlob = arquivoCopia
    .getAs(MimeType.PDF)
    .setName(nomePdf);

  const pdf = pastaDestino.createFile(pdfBlob);

  arquivoCopia.setTrashed(true);

    return {
      nomeArquivo: nomePdf,
      pastaUrl: pastaDestino.getUrl()
    };
}

//=====================================================
// MARCADORES DA LISTA DE PRESENÇA
//=====================================================

function preencherMarcadoresListaPresenca_(body, turma) {
  const marcadores = {
    '<<EMPRESA>>': turma.empresa,
    '<<TREINAMENTO>>': turma.treinamento,
    '<<TOPICO>>': turma.treinamento,
    '<<CARGA>>': turma.carga,
    '<<DATA>>': montarPeriodoLista_(turma.dataInicio, turma.dataFim),
    '<<DATAINICIO>>': turma.dataInicio,
    '<<DATAFIM>>': turma.dataFim,
    '<<INICIAL>>': turma.dataInicio,
    '<<FINAL>>': turma.dataFim,
    '<<INSTRUTOR>>': turma.instrutor,
    '<<HABILITACAO>>': turma.habilitacao,
    '<<REGISTRO>>': turma.registro,
    '<<CONTEUDO>>': turma.conteudo,
    '<<LOCAL>>': turma.empresa,
    '<<TURMA>>': turma.idTurma
  };

  Object.keys(marcadores).forEach(function(chave) {
    substituirMarcadorDocumento_(body, chave, marcadores[chave]);
  });
}

function montarPeriodoLista_(inicio, fim) {
  if (inicio && fim && inicio !== fim) {
    return inicio + ' a ' + fim;
  }

  return inicio || fim || '';
}

//=====================================================
// PARTICIPANTES DA LISTA
//=====================================================

function preencherTabelaParticipantesLista_(body, participantes) {
  const local = body.findText('<<NOME>>');

  if (!local) {
    throw new Error('Marcador <<NOME>> da tabela de participantes não encontrado.');
  }

  const elementoNome = local.getElement();
  const celulaNome = obterCelulaPai_(elementoNome);

  if (!celulaNome) {
    throw new Error('O marcador <<NOME>> precisa estar dentro de uma célula de tabela.');
  }

  const linhaModelo = celulaNome.getParent().asTableRow();
  const tabela = linhaModelo.getParent().asTable();
  const indiceLinhaModelo = obterIndiceLinhaTabela_(tabela, linhaModelo);

  if (indiceLinhaModelo < 0) {
    throw new Error('Não foi possível localizar a linha modelo dos participantes.');
  }

  const lista = (participantes || []).slice().sort(function(a, b) {
    return String(a.nome || '').localeCompare(
      String(b.nome || ''),
      'pt-BR',
      { sensitivity: 'base' }
    );
  });

  lista.forEach(function(participante, i) {
    const novaLinha = copiarLinhaTabela_(linhaModelo);
    tabela.insertTableRow(indiceLinhaModelo + i, novaLinha);
    preencherLinhaParticipanteLista_(novaLinha, participante);
  });

  tabela.removeRow(indiceLinhaModelo + lista.length);
}

function preencherLinhaParticipanteLista_(linha, participante) {
  substituirMarcadorNaLinha_(linha, '<<NOME>>', participante.nome || '');
  substituirMarcadorNaLinha_(linha, '<<CPF>>', participante.cpf || '');
}

function substituirMarcadorNaLinha_(linha, marcador, valor) {
  for (let i = 0; i < linha.getNumCells(); i++) {
    linha.getCell(i).replaceText(marcador, valor || '');
  }
}

function copiarLinhaTabela_(linhaOrigem) {
  return linhaOrigem.copy().asTableRow();
}

function obterCelulaPai_(elemento) {
  let atual = elemento;

  while (atual) {
    if (
      atual.getType &&
      atual.getType() === DocumentApp.ElementType.TABLE_CELL
    ) {
      return atual.asTableCell();
    }

    atual = atual.getParent();
  }

  return null;
}

function obterIndiceLinhaTabela_(tabela, linha) {
  try {
    return tabela.getChildIndex(linha);
  } catch (e) {
    for (let i = 0; i < tabela.getNumRows(); i++) {
      const textoLinha = tabela.getRow(i).getText();

      if (
        textoLinha.indexOf('<<NOME>>') !== -1 &&
        textoLinha.indexOf('<<CPF>>') !== -1
      ) {
        return i;
      }
    }
  }

  return -1;
}

//=====================================================
// TESTE
//=====================================================

function testeGerarListaPresencaReal() {
  const resultado = gerarListaPresencaPorIdTurma('202600001');
  Logger.log(resultado.pdfUrl);
  Logger.log(resultado.pastaUrl);
}