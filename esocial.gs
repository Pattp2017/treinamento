//=====================================================
// ESOCIAL
//=====================================================

function salvarLancamentoServidor(dados) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(ABA_BANCO_ESOCIAL);

  if (!aba) {
    throw new Error('A aba "' + ABA_BANCO_ESOCIAL + '" não foi encontrada.');
  }

  if (!dados) {
    throw new Error('Nenhum dado recebido.');
  }

  const ultimaLinha = aba.getLastRow();
  const proximoId = ultimaLinha < 2 ? 1 : ultimaLinha;

  aba.appendRow([
    proximoId,
    dados.empresa || '',
    dados.tipoAso || '',
    dados.dataAso || '',
    dados.nome || '',
    "'" + (dados.cpf || ''),
    dados.observacao || '',
    new Date()
  ]);

  return 'Lançamento salvo com sucesso!';
}

function atualizarLancamentoServidor(dados) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(ABA_BANCO_ESOCIAL);

  if (!aba) {
    throw new Error('A aba "' + ABA_BANCO_ESOCIAL + '" não foi encontrada.');
  }

  if (!dados || !dados.id) {
    throw new Error('ID do lançamento não informado.');
  }

  const valores = aba.getDataRange().getValues();
  const id = Number(dados.id);

  for (let i = 1; i < valores.length; i++) {
    if (Number(valores[i][0]) === id) {
      const linhaPlanilha = i + 1;

      aba.getRange(linhaPlanilha, 2, 1, 6).setValues([[
        dados.empresa || '',
        dados.tipoAso || '',
        dados.dataAso || '',
        dados.nome || '',
        "'" + (dados.cpf || ''),
        dados.observacao || ''
      ]]);

      return 'Lançamento atualizado com sucesso!';
    }
  }

  throw new Error('Registro não encontrado para atualização.');
}

function buscarLancamentoPorIdServidor(id) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(ABA_BANCO_ESOCIAL);

  if (!aba) {
    throw new Error('A aba "' + ABA_BANCO_ESOCIAL + '" não foi encontrada.');
  }

  const dados = aba.getDataRange().getValues();
  id = Number(id);

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];

    if (Number(linha[0]) === id) {
      return {
        id: linha[0],
        empresa: linha[1],
        tipoAso: linha[2],
        dataAso: formatarDataInputESocial(linha[3]),
        nome: linha[4],
        cpf: limparApostrofoESocial(linha[5]),
        observacao: linha[6],
        dataRegistro: formatarDataHoraESocial(linha[7])
      };
    }
  }

  throw new Error('Lançamento não encontrado.');
}

function consultarLancamentos(termo, registroInicio, registroFim) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(ABA_BANCO_ESOCIAL);

  if (!aba) {
    throw new Error('A aba "' + ABA_BANCO_ESOCIAL + '" não foi encontrada.');
  }

  const dados = aba.getDataRange().getValues();
  const resultado = [];

  termo = termo ? termo.toString().toLowerCase().trim() : '';

  const inicio = registroInicio ? new Date(registroInicio + 'T00:00:00') : null;
  const fim = registroFim ? new Date(registroFim + 'T23:59:59') : null;

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];

    const empresa = linha[1] || '';
    const tipoAso = linha[2] || '';
    const dataAso = linha[3] || '';
    const nome = linha[4] || '';
    const cpf = limparApostrofoESocial(linha[5] || '');
    const observacao = linha[6] || '';
    const dataRegistro = linha[7] || '';

    let dataReg = dataRegistro;

    if (!(dataReg instanceof Date)) {
      if (!dataRegistro) continue;

      const partesData = dataRegistro.toString().split(' ')[0].split('/');

      if (partesData.length === 3) {
        dataReg = new Date(partesData[2], partesData[1] - 1, partesData[0]);
      }
    }

    if (inicio && dataReg < inicio) continue;
    if (fim && dataReg > fim) continue;

    const textoLinha = (
      empresa + ' ' +
      tipoAso + ' ' +
      dataAso + ' ' +
      nome + ' ' +
      cpf + ' ' +
      observacao
    ).toLowerCase();

    if (termo && !textoLinha.includes(termo)) continue;

    resultado.push({
      id: linha[0],
      empresa: empresa,
      tipoAso: tipoAso,
      dataAso: formatarDataESocial(dataAso),
      nome: nome,
      cpf: cpf,
      observacao: observacao,
      dataRegistro: formatarDataHoraESocial(dataRegistro)
    });
  }

  return resultado;
}

function obterEmpresas() {
  const empresas = consultarSupabase_(
    'empresas',
    'select=nome&ativo=eq.true&order=nome.asc'
  );

  return empresas
    .map(function(emp) {
      return String(emp.nome || '').trim();
    })
    .filter(function(nome) {
      return nome !== '';
    });
}

//=====================================================
// UTILITÁRIOS DO ESOCIAL
//=====================================================

function formatarDataESocial(valor) {
  if (!valor) return '';

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }

  return valor;
}

function formatarDataHoraESocial(valor) {
  if (!valor) return '';

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  }

  return valor;
}

function formatarDataInputESocial(valor) {
  if (!valor) return '';

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  if (valor.toString().includes('/')) {
    const partes = valor.toString().split('/');
    return partes[2] + '-' + partes[1] + '-' + partes[0];
  }

  return valor;
}

function limparApostrofoESocial(valor) {
  return String(valor || '').replace(/^'/, '');
}