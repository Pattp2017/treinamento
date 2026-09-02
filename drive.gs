//=====================================================
// DRIVE - ESTRUTURA DE TREINAMENTOS
//=====================================================

//-----------------------------------------------------
// FUNÇÃO PRINCIPAL
//-----------------------------------------------------

function obterEstruturaTreinamento_(empresa, treinamento) {
  if (!empresa) {
    throw new Error('Empresa não informada para criação da estrutura no Drive.');
  }

  if (!treinamento) {
    throw new Error('Treinamento não informado para criação da estrutura no Drive.');
  }

  const pastaRaiz = obterPastaRaizTreinamentos_();

  const nomeEmpresa = normalizarNomePasta_(empresa, LIMITE_NOME_PASTA);
  const nomeTreinamento = normalizarNomePastaTreinamento_(treinamento);

  const pastaEmpresa = obterOuCriarPasta_(pastaRaiz, nomeEmpresa);
  const pastaLista = obterOuCriarPasta_(pastaEmpresa, PASTA_LISTA_PRESENCA);
  const pastaFotos = obterOuCriarPasta_(pastaEmpresa, PASTA_FOTOS);
  const pastaTreinamento = obterOuCriarPasta_(pastaEmpresa, nomeTreinamento);

  return {
    pastaRaiz: pastaRaiz,
    pastaEmpresa: pastaEmpresa,
    pastaLista: pastaLista,
    pastaFotos: pastaFotos,
    pastaTreinamento: pastaTreinamento,

    nomeEmpresa: nomeEmpresa,
    nomeTreinamento: nomeTreinamento,

    pastaRaizUrl: pastaRaiz.getUrl(),
    pastaEmpresaUrl: pastaEmpresa.getUrl(),
    pastaListaUrl: pastaLista.getUrl(),
    pastaFotosUrl: pastaFotos.getUrl(),
    pastaTreinamentoUrl: pastaTreinamento.getUrl()
  };
}

//-----------------------------------------------------
// PASTA RAIZ
//-----------------------------------------------------

function obterPastaRaizTreinamentos_() {
  const props = PropertiesService.getScriptProperties();
  const idPasta = props.getProperty(PROP_PASTA_RAIZ_TREINAMENTOS);

  if (!idPasta) {
    throw new Error('A pasta raiz dos treinamentos não foi configurada.');
  }

  try {
    return DriveApp.getFolderById(idPasta);
  } catch (erro) {
    throw new Error('Não foi possível acessar a pasta raiz dos treinamentos. Verifique a configuração.');
  }
}

//-----------------------------------------------------
// CRIAÇÃO / LOCALIZAÇÃO DE PASTAS
//-----------------------------------------------------

function obterOuCriarPasta_(pastaPai, nomePasta) {
  if (!pastaPai) {
    throw new Error('Pasta pai não informada.');
  }

nomePasta = formatarNomeArquivo_(
  normalizarNomePasta_(nomePasta, LIMITE_NOME_PASTA)
  );

  if (!nomePasta) {
    throw new Error('Nome da pasta não informado.');
  }

  const pastaExistente = procurarPastaPorNomeNormalizado_(pastaPai, nomePasta);

  if (pastaExistente) {
    return pastaExistente;
  }

  return pastaPai.createFolder(nomePasta);
}

function procurarPastaPorNomeNormalizado_(pastaPai, nomePasta) {
  const alvo = normalizarChaveComparacaoPasta_(nomePasta);
  const pastas = pastaPai.getFolders();

  while (pastas.hasNext()) {
    const pasta = pastas.next();
    const nomeAtual = pasta.getName();

    if (normalizarChaveComparacaoPasta_(nomeAtual) === alvo) {
      return pasta;
    }
  }

  return null;
}

//-----------------------------------------------------
// NORMALIZAÇÃO DE NOMES
//-----------------------------------------------------

function normalizarNomePasta_(nome, limite) {
  limite = limite || LIMITE_NOME_PASTA;

  nome = String(nome || '').trim();

  if (!nome) return '';

  nome = removerAcentosDrive_(nome);
  nome = nome.replace(/[\\/:*?"<>|]/g, ' ');
  nome = nome.replace(/\s+/g, ' ').trim();

  if (/^seguranca\b/i.test(nome)) {
    nome = nome.replace(/^seguranca\b/i, ABREVIACAO_SEGURANCA);
  }

  nome = aplicarAbreviacoesComunsDrive_(nome);

  if (nome.length > limite) {
    nome = nome.substring(0, limite).trim();
  }

  nome = nome.replace(/\s+/g, ' ').trim();

  return nome;
}

function normalizarNomePastaTreinamento_(treinamento) {
  let nome = String(treinamento || '').trim();

  if (!nome) return '';

  const chave = normalizarChaveComparacaoPasta_(nome);

  if (/^nr\s*0?5\b/.test(chave) || /^nr05\b/.test(chave)) return 'NR05';
  if (/^nr\s*0?6\b/.test(chave) || /^nr06\b/.test(chave)) return 'NR06';
  if (/^nr\s*0?10\b/.test(chave) || /^nr10\b/.test(chave)) return 'NR10';
  if (/^nr\s*0?11\b/.test(chave) || /^nr11\b/.test(chave)) return 'NR11';
  if (/^nr\s*0?12\b/.test(chave) || /^nr12\b/.test(chave)) return 'NR12';
  if (/^nr\s*0?17\b/.test(chave) || /^nr17\b/.test(chave)) return 'NR17';
  if (/^nr\s*0?18\b/.test(chave) || /^nr18\b/.test(chave)) return 'NR18';
  if (/^nr\s*0?20\b/.test(chave) || /^nr20\b/.test(chave)) return 'NR20';
  if (/^nr\s*0?23\b/.test(chave) || /^nr23\b/.test(chave)) return 'NR23';
  if (/^nr\s*0?31\b/.test(chave) || /^nr31\b/.test(chave)) return 'NR31';
  if (/^nr\s*0?33\b/.test(chave) || /^nr33\b/.test(chave)) return 'NR33';
  if (/^nr\s*0?35\b/.test(chave) || /^nr35\b/.test(chave)) return 'NR35';

  return normalizarNomePasta_(nome, LIMITE_NOME_PASTA);
}

function normalizarNomeArquivoDrive_(nome, extensao) {
  extensao = extensao || '';

  nome = String(nome || '').trim();

  if (!nome) {
    nome = 'Documento';
  }

  nome = removerAcentosDrive_(nome);
  nome = nome.replace(/[\\/:*?"<>|]/g, ' ');
  nome = nome.replace(/\s+/g, ' ').trim();

  if (/^seguranca\b/i.test(nome)) {
    nome = nome.replace(/^seguranca\b/i, ABREVIACAO_SEGURANCA);
  }

  const limiteBase = LIMITE_NOME_ARQUIVO;

  if (nome.length > limiteBase) {
    nome = nome.substring(0, limiteBase).trim();
  }

  if (extensao) {
    extensao = String(extensao).trim();

    if (extensao.charAt(0) !== '.') {
      extensao = '.' + extensao;
    }

    return nome + extensao;
  }

  return nome;
}

function normalizarChaveComparacaoPasta_(nome) {
  nome = String(nome || '').trim();

  nome = removerAcentosDrive_(nome);
  nome = nome.toLowerCase();

  nome = nome.replace(/^seguranca\b/i, 'seg');
  nome = nome.replace(/^seg\./i, 'seg');

  nome = nome.replace(/nr[\s\-.]*/g, 'nr');
  nome = nome.replace(/[\\/:*?"<>|]/g, ' ');
  nome = nome.replace(/[^a-z0-9]/g, '');

  return nome;
}

function removerAcentosDrive_(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

//-----------------------------------------------------
// ABREVIAÇÕES
//-----------------------------------------------------

function aplicarAbreviacoesComunsDrive_(nome) {
  nome = String(nome || '');

  nome = nome.replace(/\bSEGURANCA\b/gi, 'Seg.');
  nome = nome.replace(/\bSEGURANÇA\b/gi, 'Seg.');

  nome = nome.replace(/\bEQUIPAMENTOS\b/gi, 'Equip.');
  nome = nome.replace(/\bEQUIPAMENTO\b/gi, 'Equip.');
  nome = nome.replace(/\bMAQUINAS\b/gi, 'Máquinas');
  nome = nome.replace(/\bMÁQUINAS\b/gi, 'Máquinas');
  nome = nome.replace(/\bINSTALACOES\b/gi, 'Inst.');
  nome = nome.replace(/\bINSTALAÇÕES\b/gi, 'Inst.');
  nome = nome.replace(/\bELETRICAS\b/gi, 'Elétricas');
  nome = nome.replace(/\bELÉTRICAS\b/gi, 'Elétricas');
  nome = nome.replace(/\bTRABALHO\b/gi, 'Trab.');
  nome = nome.replace(/\bTRABALHOS\b/gi, 'Trabs.');
  nome = nome.replace(/\bOPERADOR\b/gi, 'Op.');
  nome = nome.replace(/\bOPERADORES\b/gi, 'Ops.');
  nome = nome.replace(/\bAGRICOLAS\b/gi, 'Agrícolas');
  nome = nome.replace(/\bAGRÍCOLAS\b/gi, 'Agrícolas');

  nome = nome.replace(/\s+/g, ' ').trim();

  return nome;
}

//-----------------------------------------------------
// TESTES MANUAIS
//-----------------------------------------------------

function testeObterEstruturaTreinamento() {
  const estrutura = obterEstruturaTreinamento_(
    'Fazenda Cerrado Grande',
    'Primeiros Socorros'
  );

  Logger.log(estrutura.pastaEmpresaUrl);
  Logger.log(estrutura.pastaListaUrl);
  Logger.log(estrutura.pastaFotosUrl);
  Logger.log(estrutura.pastaTreinamentoUrl);
}