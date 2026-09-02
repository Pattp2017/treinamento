function testeServidor() {
  return {
    sucesso: true,
    mensagem: 'Servidor Apps Script funcionando corretamente.'
  };
}

function formatarNomeArquivo_(texto) {

  const excecoes = ['da', 'de', 'do', 'das', 'dos', 'e'];

  return String(texto || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, indice) => {

      if (indice > 0 && excecoes.includes(palavra)) {
        return palavra;
      }

      return palavra.charAt(0).toUpperCase() + palavra.slice(1);

    })
    .join(' ');
}

function obterNomeCompletoTreinamento_(treinamento) {
  const nome = String(treinamento || '').trim();
  const chave = criarChaveTreinamento_(nome);

  const mapa = {
    'seg em espacos confinados sup de entrada inicial':
      'Segurança em Espaços Confinados - Supervisor de Entrada Inicial',

    'seg espacos confinados sup de entrada inicial':
      'Segurança em Espaços Confinados - Supervisor de Entrada Inicial',

    'seg em espacos confinados sup de entrada periodico':
      'Segurança em Espaços Confinados - Supervisor de Entrada Periódico',

    'seg espacos confinados sup de entrada periodico':
      'Segurança em Espaços Confinados - Supervisor de Entrada Periódico',

    'seg em espacos confinados vigia e trab autorizado inicial':
      'Segurança em Espaços Confinados - Vigia e Trabalhador Autorizado Inicial',

    'seg espacos confinados vigia e trab autorizado inicial':
      'Segurança em Espaços Confinados - Vigia e Trabalhador Autorizado Inicial',

    'seg em espacos confinados vigia e trab autorizado periodico':
      'Segurança em Espaços Confinados - Vigia e Trabalhador Autorizado Periódico',

    'seg espacos confinados vigia e trab autorizado periodico':
      'Segurança em Espaços Confinados - Vigia e Trabalhador Autorizado Periódico'
  };

  if (mapa[chave]) {
    return mapa[chave];
  }

  return formatarNomeArquivo_(nome);
}

function criarChaveTreinamento_(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\-_/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}