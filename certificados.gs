//=====================================================
// CERTIFICADOS
//=====================================================

function gerarCertificadosPorIdTurma(idTurma) {
  const turma = obterTurmaParaDocumento_(idTurma);

  const estrutura = obterEstruturaTreinamento_(
    turma.empresa,
    turma.treinamento
  );

  const resultados = [];

  turma.participantes.forEach(function(participante) {
    const certificado = criarCertificadoPDF_(
      turma,
      participante,
      estrutura.pastaTreinamento
    );

    resultados.push(certificado);
    
    registrarHistoricoDocumento_({
      tipo: 'Certificado',
      idTurma: turma.idTurma,
      empresa: turma.empresa,
      treinamento: turma.treinamento,
      participante: participante.nome,
      cpf: participante.cpf,
      pasta: certificado.pastaUrl || '',
      status: 'Gerado',
      observacao: '',
      nomeArquivo: certificado.nomeArquivo || ''
    });
  });
  

  return {
    sucesso: true,
    idTurma: turma.idTurma,
    quantidade: resultados.length,
    pastaUrl: estrutura.pastaTreinamento.getUrl(),
    resultados: resultados,
    mensagem: 'Certificados gerados com sucesso!'
  };
}


function criarCertificadoPDF_(turma, participante, pastaDestino) {
  const modelo = DriveApp.getFileById(ID_MODELO_CERTIFICADO);

  const nomeBase = formatarNomeArquivo_(
    normalizarNomeArquivoDrive_(
      participante.nome || 'Participante',
      ''
    )
  );

  const nomePdf = nomeBase + '.pdf';

  // Sobrescreve PDF antigo com o mesmo nome
  //excluirArquivoMesmoNomeNaPasta_(pastaDestino, nomePdf);

  // Cria Google Docs temporário
  const copia = modelo.makeCopy(nomeBase, pastaDestino);

  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();

  preencherMarcadoresCertificado_(body, turma, participante);

  doc.saveAndClose();

  const arquivoCopia = DriveApp.getFileById(copia.getId());

  const pdfBlob = arquivoCopia
    .getAs(MimeType.PDF)
    .setName(nomePdf);

  const pdf = pastaDestino.createFile(pdfBlob);

  arquivoCopia.setTrashed(true);

 return {
  participante: nomeBase,
  cpf: participante.cpf,
  nomeArquivo: nomePdf,
  pastaUrl: pastaDestino.getUrl()
};
}

//=====================================================
// AUXILIARES DE ARQUIVOS
//=====================================================

function excluirArquivoMesmoNomeNaPasta_(pasta, nomeArquivo) {
  const arquivos = pasta.getFilesByName(nomeArquivo);

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    arquivo.setTrashed(true);
  }
}

//=====================================================
// MARCADORES DO CERTIFICADO
//=====================================================

function preencherMarcadoresCertificado_(body, turma, participante) {
  const nomeParticipante = formatarNomeArquivo_(participante.nome);
  const nomeEmpresa = String(turma.empresa || '');
  const nomeTreinamento = obterNomeCompletoTreinamento_(turma.treinamento);

  const cpfFormatado = formatarCpfCertificado_(participante.cpf);
  const cargaFormatada = formatarCargaCertificado_(turma.carga);

  const marcadores = {
    '<<NOME>>': nomeParticipante,
    '<<CPF>>': cpfFormatado,
    '<<EMPRESA>>': nomeEmpresa,
    '<<TREINAMENTO>>': nomeTreinamento,
    '<<TOPICO>>': nomeTreinamento,
    '<<CARGA>>': cargaFormatada,
    '<<DATAINICIO>>': turma.dataInicio,
    '<<DATAFIM>>': turma.dataFim,
    '<<INICIAL>>': turma.dataInicio,
    '<<FINAL>>': turma.dataFim,
    '<<INSTRUTOR>>': formatarNomeArquivo_(turma.instrutor),
    '<<HABILITACAO>>': turma.habilitacao,
    '<<REGISTRO>>': turma.registro,
    '<<CONTEUDO>>': turma.conteudo
  };

  Object.keys(marcadores).forEach(function(chave) {
    substituirMarcadorDocumento_(
      body,
      chave,
      marcadores[chave] == null ? '' : String(marcadores[chave])
    );
  });

  inserirAssinaturaInstrutor_(body, turma.instrutor);
}


//=====================================================
// FORMATAÇÃO DOS DADOS DO CERTIFICADO
//=====================================================

function formatarCpfCertificado_(cpf) {
  if (cpf === null || cpf === undefined || cpf === '') {
    return '';
  }

  let numeros = String(cpf).replace(/\D/g, '');

  /*
   * Recupera zeros à esquerda quando o CPF veio da planilha
   * como número.
   */
  numeros = numeros.padStart(11, '0');

  if (numeros.length !== 11) {
    return String(cpf);
  }

  return numeros.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  );
}


function formatarCargaCertificado_(carga) {
  if (carga === null || carga === undefined || carga === '') {
    return '';
  }

  /*
   * Quando a duração da planilha é devolvida como objeto Date.
   */
  if (carga instanceof Date) {
    const horas = carga.getUTCHours();
    const minutos = carga.getUTCMinutes();

    if (minutos === 0) {
      return horas + ' horas';
    }

    return horas + 'h' + String(minutos).padStart(2, '0');
  }

  /*
   * Quando a duração é recebida como número decimal da planilha.
   * Exemplo:
   * 1 representa 24 horas;
   * 0,5 representa 12 horas.
   */
  if (typeof carga === 'number') {
    const horasTotais = Math.round(carga * 24);

    /*
     * Caso o valor já seja uma carga inteira, como 8, 16 ou 24,
     * não multiplica novamente.
     */
    const horas =
      carga > 2
        ? Math.round(carga)
        : horasTotais;

    return horas + (horas === 1 ? ' hora' : ' horas');
  }

  const texto = String(carga).trim();

  /*
   * Exemplos aceitos:
   * 24:00:00
   * 24:00
   * 08:30:00
   */
  const horaEncontrada = texto.match(
    /^(\d+):(\d{2})(?::\d{2})?$/
  );

  if (horaEncontrada) {
    const horas = Number(horaEncontrada[1]);
    const minutos = Number(horaEncontrada[2]);

    if (minutos === 0) {
      return horas + (horas === 1 ? ' hora' : ' horas');
    }

    return horas + 'h' + String(minutos).padStart(2, '0');
  }

  /*
   * Exemplos:
   * 24
   * 24h
   * 24 horas
   */
  const somenteNumero = texto.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:h|hora|horas)?$/i
  );

  if (somenteNumero) {
    const horas = Number(
      somenteNumero[1].replace(',', '.')
    );

    if (Number.isInteger(horas)) {
      return horas + (horas === 1 ? ' hora' : ' horas');
    }

    return String(horas).replace('.', ',') + ' horas';
  }

  return texto;
}

//=====================================================
// ASSINATURA DO INSTRUTOR
//=====================================================

function inserirAssinaturaInstrutor_(body, instrutor) {
  const marcador = '<<ASSINATURA>>';
  const local = body.findText(marcador);

  if (!local) return;

  const elemento = local.getElement();
  const texto = elemento.asText();

  const arquivoImagem = buscarArquivoAssinaturaInstrutor_(instrutor);

  texto.deleteText(
    local.getStartOffset(),
    local.getEndOffsetInclusive()
  );

  if (!arquivoImagem) return;

  const paragrafo = elemento.getParent().asParagraph();

  paragrafo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  paragrafo.setSpacingBefore(0);
  paragrafo.setSpacingAfter(0);
  paragrafo.setLineSpacing(1);

  const imagem = paragrafo.appendInlineImage(arquivoImagem.getBlob());

  const larguraDesejada = 200;
  const larguraOriginal = imagem.getWidth();
  const alturaOriginal = imagem.getHeight();

  imagem.setWidth(larguraDesejada);

  if (larguraOriginal > 0 && alturaOriginal > 0) {
    imagem.setHeight(
      Math.round((alturaOriginal / larguraOriginal) * larguraDesejada)
    );
  }
}

function buscarArquivoAssinaturaInstrutor_(instrutor) {
  if (!instrutor) return null;

  const chaveInstrutor = criarChaveAssinatura_(instrutor);
  const chaveCache = 'assinatura_' + chaveInstrutor;

  const cache = CacheService.getScriptCache();
  const idSalvo = cache.get(chaveCache);

  if (idSalvo) {
    try {
      return DriveApp.getFileById(idSalvo);
    } catch (e) {
      cache.remove(chaveCache);
    }
  }

  const pasta = DriveApp.getFolderById(ID_PASTA_ASSINATURAS);
  const arquivos = pasta.getFiles();

  const primeiroNome = chaveInstrutor.split(' ')[0];

  let melhorArquivo = null;
  let melhorPontuacao = 0;

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();

    const mime = arquivo.getMimeType();
    if (!mime || mime.indexOf('image/') !== 0) continue;

    const nomeSemExtensao = arquivo.getName().replace(/\.[^/.]+$/, '');
    let chaveArquivo = criarChaveAssinatura_(nomeSemExtensao);

    chaveArquivo = chaveArquivo
      .replace(/^assinatura\s+/, '')
      .replace(/^ass\s+/, '');

    let pontuacao = 0;

    if (chaveArquivo === chaveInstrutor) {
      pontuacao = 100;
    } else if (chaveArquivo.indexOf(chaveInstrutor) !== -1) {
      pontuacao = 90;
    } else if (chaveInstrutor.indexOf(chaveArquivo) !== -1) {
      pontuacao = 80;
    } else if (primeiroNome && chaveArquivo.indexOf(primeiroNome) !== -1) {
      pontuacao = 70;
    }

    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorArquivo = arquivo;
    }
  }

  if (melhorArquivo) {
    cache.put(chaveCache, melhorArquivo.getId(), 21600);
  }

  return melhorArquivo;
}

function criarChaveAssinatura_(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

//=====================================================
// TESTE
//=====================================================

function testeGerarCertificadosReal() {
  const resultado = gerarCertificadosPorIdTurma('202600001');
  Logger.log(resultado.quantidade);
  Logger.log(resultado.pastaUrl);
}