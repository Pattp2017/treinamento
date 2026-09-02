//=====================================================
// INSPEÇÕES
//=====================================================

function salvarInspecao(dados) {
  validarDadosInspecao_(dados);

  const idInspecao = gerarIdInspecao_();

  const registro = {
    id_inspecao: idInspecao,

    empresa_id:
      dados.empresaId || null,

    empresa:
      String(dados.empresa || '').trim(),

    tipo_inspecao:
      String(
        dados.tipoInspecao || 'Armazém'
      ).trim(),

    setor:
      String(dados.setor || '').trim(),

    data_inspecao:
      dados.dataInspecao,

    responsavel_inspecao:
      String(
        dados.responsavelInspecao || ''
      ).trim(),

    responsavel_setor:
      String(
        dados.responsavelSetor || ''
      ).trim(),

    status:
      'Em andamento',

    total_itens:
      0,

    itens_conformes:
      0,

    itens_nao_conformes:
      0,

    itens_nao_aplicaveis:
      0,

    percentual_conformidade:
      0,

    classificacao:
      'Não avaliada',

    observacoes:
      ''
  };

  const inspecaoSalva =
    salvarInspecaoBanco(registro);

  if (!inspecaoSalva) {
    throw new Error(
      'O banco não retornou a inspeção cadastrada.'
    );
  }

  return inspecaoSalva;
}


function listarInspecoes() {
  return listarInspecoesBanco();
}


function buscarInspecaoPorId(idInspecao) {
  return buscarInspecaoBanco(idInspecao);
}


function validarDadosInspecao_(dados) {
  if (!dados) {
    throw new Error(
      'Os dados da inspeção não foram informados.'
    );
  }

  if (!dados.empresaId) {
    throw new Error(
      'Selecione uma empresa cadastrada.'
    );
  }

  if (!String(dados.empresa || '').trim()) {
    throw new Error(
      'A empresa é obrigatória.'
    );
  }

  if (
    !String(
      dados.tipoInspecao || ''
    ).trim()
  ) {
    throw new Error(
      'O tipo de inspeção é obrigatório.'
    );
  }

  if (!dados.dataInspecao) {
    throw new Error(
      'A data da inspeção é obrigatória.'
    );
  }

  if (
    !String(
      dados.responsavelInspecao || ''
    ).trim()
  ) {
    throw new Error(
      'O responsável pela inspeção é obrigatório.'
    );
  }
}


function gerarIdInspecao_() {
  const agora = new Date();

  const fuso =
    Session.getScriptTimeZone() ||
    'America/Sao_Paulo';

  const ano =
    Utilities.formatDate(
      agora,
      fuso,
      'yyyy'
    );

  const dataHora =
    Utilities.formatDate(
      agora,
      fuso,
      'MMdd-HHmmss'
    );

  const aleatorio =
    Math.floor(
      Math.random() * 900 + 100
    );

  return (
    'INS-' +
    ano +
    '-' +
    dataHora +
    '-' +
    aleatorio
  );
}