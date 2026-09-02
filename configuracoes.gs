//=====================================================
// CONFIGURAÇÕES DO SISTEMA
//=====================================================

function obterConfiguracoesSistema() {
  const props = PropertiesService.getScriptProperties();

  return {
    sucesso: true,
    pastaRaizTreinamentos: props.getProperty(PROP_PASTA_RAIZ_TREINAMENTOS) || ''
  };
}

function salvarConfiguracoesSistema(dados) {
  if (!dados) {
    throw new Error('Nenhuma configuração recebida.');
  }

  const pastaRaiz = String(dados.pastaRaizTreinamentos || '').trim();

  if (!pastaRaiz) {
    throw new Error('Informe o link ou ID da pasta raiz dos treinamentos.');
  }

  const idPasta = extrairIdDriveConfiguracao_(pastaRaiz);

  validarPastaDriveConfiguracao_(idPasta);

  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROP_PASTA_RAIZ_TREINAMENTOS, idPasta);

  return {
    sucesso: true,
    mensagem: 'Configurações salvas com sucesso.',
    pastaRaizTreinamentos: idPasta
  };
}

function testarPastaRaizTreinamentos() {
  const props = PropertiesService.getScriptProperties();
  const idPasta = props.getProperty(PROP_PASTA_RAIZ_TREINAMENTOS);

  if (!idPasta) {
    throw new Error('A pasta raiz dos treinamentos ainda não foi configurada.');
  }

  const pasta = DriveApp.getFolderById(idPasta);

  return {
    sucesso: true,
    nome: pasta.getName(),
    url: pasta.getUrl(),
    mensagem: 'Pasta localizada com sucesso.'
  };
}

//=====================================================
// UTILITÁRIOS INTERNOS
//=====================================================

function extrairIdDriveConfiguracao_(texto) {
  texto = String(texto || '').trim();

  if (!texto) {
    throw new Error('Informe o link ou ID da pasta.');
  }

  let match = texto.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];

  match = texto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];

  match = texto.match(/^[a-zA-Z0-9_-]{25,}$/);
  if (match) return texto;

  throw new Error('Link ou ID da pasta inválido.');
}

function validarPastaDriveConfiguracao_(idPasta) {
  try {
    DriveApp.getFolderById(idPasta);
  } catch (erro) {
    throw new Error('Não foi possível acessar a pasta informada. Verifique se o link é de uma pasta do Google Drive e se você tem permissão.');
  }
}