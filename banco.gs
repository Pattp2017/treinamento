

//=====================================================
// BANCO DE DADOS
//=====================================================

//=====================================================
// BANCO DE DADOS
//=====================================================

var Banco = {};


//=====================================================
// INSPEÇÕES
//=====================================================

Banco.Inspecoes = {

  listar: function() {
    return consultarSupabase_(
      'inspecoes',
      [
        'select=*',
        'order=criado_em.desc'
      ].join('&')
    );
  },

  buscarPorId: function(idInspecao) {
    if (!idInspecao) {
      throw new Error(
        'ID da inspeção não informado.'
      );
    }

    const resultado = consultarSupabase_(
      'inspecoes',
      [
        'select=*',
        'id_inspecao=eq.' +
          encodeURIComponent(idInspecao),
        'limit=1'
      ].join('&')
    );

    return resultado && resultado.length
      ? resultado[0]
      : null;
  },

  salvar: function(dados) {
    validarInspecaoBanco_(dados);

    const registro =
      prepararInspecaoBanco_(dados);

    const resultado = inserirSupabase_(
      'inspecoes',
      registro
    );

    return resultado && resultado.length
      ? resultado[0]
      : null;
  },

  atualizar: function(idInspecao, dados) {
    if (!idInspecao) {
      throw new Error(
        'ID da inspeção não informado.'
      );
    }

    const registro =
      prepararAtualizacaoInspecaoBanco_(dados);

    const resultado = atualizarSupabase_(
      'inspecoes',
      'id_inspecao=eq.' +
        encodeURIComponent(idInspecao),
      registro
    );

    return resultado && resultado.length
      ? resultado[0]
      : null;
  }

};


function validarInspecaoBanco_(dados) {
  if (!dados) {
    throw new Error(
      'Nenhum dado da inspeção foi recebido.'
    );
  }

  if (!dados.id_inspecao) {
    throw new Error(
      'O ID da inspeção não foi informado.'
    );
  }

  if (!dados.empresa) {
    throw new Error(
      'Informe a empresa.'
    );
  }

  if (!dados.data_inspecao) {
    throw new Error(
      'Informe a data da inspeção.'
    );
  }

  if (!dados.responsavel_inspecao) {
    throw new Error(
      'Informe o responsável pela inspeção.'
    );
  }
}


function prepararInspecaoBanco_(dados) {
  return {
    id_inspecao: String(dados.id_inspecao).trim(),

    empresa_id:
      dados.empresa_id || null,

    empresa:
      String(dados.empresa || '').trim(),

    tipo_inspecao:
      String(
        dados.tipo_inspecao || 'Armazém'
      ).trim(),

    setor:
      textoOuNulo_(dados.setor),

    data_inspecao:
      dados.data_inspecao,

    responsavel_inspecao:
      String(
        dados.responsavel_inspecao || ''
      ).trim(),

    responsavel_setor:
      textoOuNulo_(dados.responsavel_setor),

    status:
      String(
        dados.status || 'Em andamento'
      ).trim(),

    total_itens:
      Number(dados.total_itens || 0),

    itens_conformes:
      Number(dados.itens_conformes || 0),

    itens_nao_conformes:
      Number(dados.itens_nao_conformes || 0),

    itens_nao_aplicaveis:
      Number(dados.itens_nao_aplicaveis || 0),

    percentual_conformidade:
      Number(dados.percentual_conformidade || 0),

    classificacao:
      String(
        dados.classificacao || 'Não avaliada'
      ).trim(),

    observacoes:
      textoOuNulo_(dados.observacoes)
  };
}


function prepararAtualizacaoInspecaoBanco_(dados) {
  const registro = {};

  if (dados.empresa_id !== undefined) {
    registro.empresa_id =
      dados.empresa_id || null;
  }

  if (dados.empresa !== undefined) {
    registro.empresa =
      String(dados.empresa || '').trim();
  }

  if (dados.tipo_inspecao !== undefined) {
    registro.tipo_inspecao =
      String(dados.tipo_inspecao || '').trim();
  }

  if (dados.setor !== undefined) {
    registro.setor =
      textoOuNulo_(dados.setor);
  }

  if (dados.data_inspecao !== undefined) {
    registro.data_inspecao =
      dados.data_inspecao;
  }

  if (dados.responsavel_inspecao !== undefined) {
    registro.responsavel_inspecao =
      String(
        dados.responsavel_inspecao || ''
      ).trim();
  }

  if (dados.responsavel_setor !== undefined) {
    registro.responsavel_setor =
      textoOuNulo_(dados.responsavel_setor);
  }

  if (dados.status !== undefined) {
    registro.status =
      String(dados.status || '').trim();
  }

  if (dados.total_itens !== undefined) {
    registro.total_itens =
      Number(dados.total_itens || 0);
  }

  if (dados.itens_conformes !== undefined) {
    registro.itens_conformes =
      Number(dados.itens_conformes || 0);
  }

  if (dados.itens_nao_conformes !== undefined) {
    registro.itens_nao_conformes =
      Number(dados.itens_nao_conformes || 0);
  }

  if (dados.itens_nao_aplicaveis !== undefined) {
    registro.itens_nao_aplicaveis =
      Number(dados.itens_nao_aplicaveis || 0);
  }

  if (dados.percentual_conformidade !== undefined) {
    registro.percentual_conformidade =
      Number(dados.percentual_conformidade || 0);
  }

  if (dados.classificacao !== undefined) {
    registro.classificacao =
      String(dados.classificacao || '').trim();
  }

  if (dados.observacoes !== undefined) {
    registro.observacoes =
      textoOuNulo_(dados.observacoes);
  }

  registro.atualizado_em =
    new Date().toISOString();

  return registro;
}


//=====================================================
// FUNÇÕES PÚBLICAS - INSPEÇÕES
//=====================================================

function listarInspecoesBanco() {
  return Banco.Inspecoes.listar();
}


function buscarInspecaoBanco(idInspecao) {
  return Banco.Inspecoes.buscarPorId(
    idInspecao
  );
}


function salvarInspecaoBanco(dados) {
  return Banco.Inspecoes.salvar(dados);
}


function atualizarInspecaoBanco(
  idInspecao,
  dados
) {
  return Banco.Inspecoes.atualizar(
    idInspecao,
    dados
  );
}