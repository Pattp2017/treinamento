//=====================================================
// SUPABASE - COMUNICAÇÃO COM A DATA API
//=====================================================

function obterConfiguracaoSupabase_() {
  const propriedades = PropertiesService.getScriptProperties();

  const url = propriedades.getProperty('SUPABASE_URL');
  const chave = propriedades.getProperty('SUPABASE_KEY');

  if (!url) {
    throw new Error(
      'A propriedade SUPABASE_URL não foi cadastrada nas propriedades do script.'
    );
  }

  if (!chave) {
    throw new Error(
      'A propriedade SUPABASE_KEY não foi cadastrada nas propriedades do script.'
    );
  }

  return {
    url: String(url).replace(/\/+$/, ''),
    chave: chave
  };
}

function executarSupabase_(tabela, opcoes) {
  const configuracao = obterConfiguracaoSupabase_();

  const parametros = opcoes || {};
  const metodo = parametros.metodo || 'get';
  const consulta = parametros.consulta || '';
  const dados = parametros.dados;

  let url =
    configuracao.url +
    '/rest/v1/' +
    encodeURIComponent(tabela);

  if (consulta) {
    url += '?' + consulta;
  }

  const requisicao = {
    method: metodo,
    headers: {
      apikey: configuracao.chave,
      Authorization: 'Bearer ' + configuracao.chave,
      Accept: 'application/json'
    },
    muteHttpExceptions: true
  };

  if (dados !== undefined) {
    requisicao.contentType = 'application/json';
    requisicao.payload = JSON.stringify(dados);
  }

  if (metodo === 'post' || metodo === 'patch') {
    requisicao.headers.Prefer = 'return=representation';
  }

  const resposta = UrlFetchApp.fetch(url, requisicao);
  const codigo = resposta.getResponseCode();
  const conteudo = resposta.getContentText();

  if (codigo < 200 || codigo >= 300) {
    throw new Error(
      'Erro Supabase HTTP ' + codigo + ': ' + conteudo
    );
  }

  if (!conteudo) {
    return null;
  }

  return JSON.parse(conteudo);
}

function consultarSupabase_(tabela, consulta) {
  return executarSupabase_(tabela, {
    metodo: 'get',
    consulta: consulta || ''
  });
}

function inserirSupabase_(tabela, dados) {
  return executarSupabase_(tabela, {
    metodo: 'post',
    dados: dados
  });
}

function atualizarSupabase_(tabela, consulta, dados) {
  return executarSupabase_(tabela, {
    metodo: 'patch',
    consulta: consulta,
    dados: dados
  });
}

function excluirSupabase_(tabela, consulta) {
  return executarSupabase_(tabela, {
    metodo: 'delete',
    consulta: consulta
  });
}