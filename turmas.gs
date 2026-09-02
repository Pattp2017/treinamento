//=====================================================
// TURMAS
//=====================================================

function carregarDadosTurmas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaBanco = ss.getSheetByName(ABA_BANCO);
  const abaProtocolo = ss.getSheetByName(ABA_PROTOCOLO);
  const abaEmpresas = ss.getSheetByName(ABA_EMPRESAS);

  if (!abaBanco) throw new Error('A aba "' + ABA_BANCO + '" não foi encontrada.');
  if (!abaProtocolo) throw new Error('A aba "' + ABA_PROTOCOLO + '" não foi encontrada.');
  if (!abaEmpresas) throw new Error('A aba "' + ABA_EMPRESAS + '" não foi encontrada.');

  const instrutores = abaBanco.getRange('B7:D14').getDisplayValues()
    .filter(l => l[0])
    .map(l => ({
      nome: String(l[0]).trim(),
      habilitacao: String(l[1] || '').trim(),
      registro: String(l[2] || '').trim()
    }));

  const ultimaLinhaBanco = abaBanco.getLastRow();

  let treinamentos = [];

  if (ultimaLinhaBanco >= 17) {
    treinamentos = abaBanco
      .getRange(17, 2, ultimaLinhaBanco - 16, 3)
      .getDisplayValues()
      .filter(l => String(l[0] || '').trim() !== '')
      .map(l => ({
        topico: String(l[0]).trim(),
        conteudo: String(l[1] || '').trim(),
        carga: normalizarCargaTurmas_(l[2])
      }));
  }

  let empresas = [];

  const ultimaLinhaEmpresas = abaEmpresas.getLastRow();

  if (ultimaLinhaEmpresas >= 2) {
    empresas = abaEmpresas
      .getRange(2, 1, ultimaLinhaEmpresas - 1, 1)
      .getDisplayValues()
      .flat()
      .map(e => String(e || '').trim())
      .filter(e => e !== '')
      .filter((e, i, arr) => arr.indexOf(e) === i)
      .sort();
  }

  return {
    empresas,
    instrutores,
    treinamentos
  };
}

function salvarTurma(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(ABA_PROTOCOLO);

    if (!aba) {
      throw new Error('A aba "' + ABA_PROTOCOLO + '" não foi encontrada.');
    }

    if (!dados) {
      throw new Error('Nenhum dado recebido.');
    }

    const empresa = formatarNomeArquivo_(String(dados.empresa || '').trim());
    const topico = String(dados.topico || '').trim();
    const carga = normalizarCargaTurmas_(dados.carga);
    const inicial = String(dados.inicial || '').trim();
    const final = String(dados.final || '').trim();
    const instrutor = String(dados.instrutor || '').trim();
    const habilitacao = String(dados.habilitacao || '').trim();
    const registro = String(dados.registro || '').trim();
    const participantes = dados.participantes || [];

    let idAgenda = String(dados.idAgenda || '').trim();

    if (!empresa) throw new Error('Informe a empresa.');
    if (!topico) throw new Error('Informe o treinamento.');
    if (!carga) throw new Error('Informe a carga horária.');
    if (!inicial) throw new Error('Informe a data inicial.');
    if (!final) throw new Error('Informe a data final.');
    if (!instrutor) throw new Error('Informe o instrutor.');

    if (participantes.length === 0) {
      throw new Error('Adicione pelo menos um participante.');
    }

    const proximoId = gerarProximoIdTurmas_();
    const idTurma = gerarIdTurma_();
    const idsGerados = [];

    if (idAgenda) {
      vincularIdTurmaNaAgenda_(idAgenda, idTurma);
    } else {
      idAgenda = criarAgendamentoAPartirDaTurma_(dados, idTurma);
    }

    const linhas = participantes.map(function(p, index) {
      const id = proximoId + index;
      idsGerados.push(id);

      return [
        id,
        empresa,
        formatarNomeArquivo_(String(p.nome || '').trim()),
        limparCPFTurmas_(p.cpf || ''),
        '',
        '',
        topico,
        carga,
        inicial,
        final,
        instrutor,
        habilitacao,
        registro,
        idTurma,
        idAgenda
      ];
    });

    const linhaInicial = aba.getLastRow() + 1;

    aba.getRange(linhaInicial, 2, linhas.length, 15).setValues(linhas);
    SpreadsheetApp.flush();

    return {
      sucesso: true,
      quantidade: linhas.length,
      ids: idsGerados,
      idTurma: idTurma,
      idAgenda: idAgenda,
      linhaInicial: linhaInicial,
      mensagem: linhas.length + ' participante(s) salvo(s). Turma: ' + idTurma + '.'
    };

  } finally {
    lock.releaseLock();
  }
}

function gerarIdTurma_() {
  const ano = String(new Date().getFullYear());
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABA_PROTOCOLO);

  if (!aba) throw new Error('A aba "' + ABA_PROTOCOLO + '" não foi encontrada.');

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    return ano + '00001';
  }

  const ids = aba
    .getRange(2, 15, ultimaLinha - 1, 1)
    .getValues()
    .flat()
    .filter(String)
    .map(String);

  let maior = 0;

  ids.forEach(function(id) {
    if (id.startsWith(ano)) {
      const sequencia = Number(id.substring(4));
      if (sequencia > maior) maior = sequencia;
    }
  });

  return ano + String(maior + 1).padStart(5, '0');
}

function gerarProximoIdTurmas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(ABA_PROTOCOLO);

  if (!aba) throw new Error('A aba "' + ABA_PROTOCOLO + '" não foi encontrada.');

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) return 1;

  const ids = aba
    .getRange(2, 2, ultimaLinha - 1, 1)
    .getValues()
    .flat()
    .filter(id => id !== '' && !isNaN(id))
    .map(Number);

  if (ids.length === 0) return 1;

  return Math.max(...ids) + 1;
}

function limparCPFTurmas_(cpf) {
  return String(cpf || '').replace(/\D/g, '').padStart(11, '0');
}

function normalizarCargaTurmas_(valor) {
  valor = String(valor || '').trim();

  const encontrado = valor.match(/\d+/);

  if (!encontrado) return '';

  return Number(encontrado[0]);
}

function carregarTurmaAgendaPorId(idTurma) {
  return obterTurmaParaDocumento_(idTurma);
}

function gerarListaPresencaPelaAgenda(idAgenda, idTurma) {

  if (!idTurma) {
    throw new Error('ID da turma não informado.');
  }

  const retorno = gerarListaPresencaPorIdTurma(idTurma);

  if (idAgenda && typeof atualizarEtapaAgenda_ === 'function') {
    atualizarEtapaAgenda_(idAgenda, 3);
  }

  return retorno;
}

//=====================================================
// CARREGAR PRÓXIMO AGENDAMENTO NA TELA DE TURMAS
//=====================================================

function buscarProximoAgendamentoParaTurma() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaAgenda = ss.getSheetByName('Agenda');

  if (!abaAgenda) {
    throw new Error('A aba "Agenda" não foi encontrada.');
  }

  const ultimaLinha = abaAgenda.getLastRow();

  if (ultimaLinha < 2) {
    return null;
  }

  const dados = abaAgenda
    .getRange(2, 1, ultimaLinha - 1, 14)
    .getValues();

  const hoje = zerarHorarioData_(new Date());

  const agendamentosDisponiveis = dados
    .map(function(linha, indice) {
      return {
        linhaPlanilha: indice + 2,

        id: String(linha[0] || '').trim(),
        dataInicial: linha[1],
        dataFinal: linha[2],

        empresa: String(linha[3] || '').trim(),
        treinamento: String(linha[4] || '').trim(),
        carga: linha[5],

        instrutor: String(linha[6] || '').trim(),

        horaInicial: linha[7],
        horaFinal: linha[8],

        status: String(linha[9] || '').trim(),
        etapa: Number(linha[10] || 0),

        observacao: String(linha[11] || '').trim(),
        criadoEm: linha[12],

        idTurma: String(linha[13] || '').trim()
      };
    })
    .filter(function(agendamento) {
      const statusNormalizado = normalizarTextoAgenda_(agendamento.status);

      const estaCancelado =
        statusNormalizado === 'cancelado' ||
        statusNormalizado === 'cancelada';

      return (
        agendamento.id &&
        !agendamento.idTurma &&
        agendamento.etapa === 1 &&
        !estaCancelado &&
        agendamento.dataInicial
      );
    });

  if (agendamentosDisponiveis.length === 0) {
    return null;
  }

  const futuros = agendamentosDisponiveis
    .filter(function(agendamento) {
      const data = converterDataAgenda_(agendamento.dataInicial);

      return data && data.getTime() >= hoje.getTime();
    })
    .sort(function(a, b) {
      const dataA = converterDataAgenda_(a.dataInicial);
      const dataB = converterDataAgenda_(b.dataInicial);

      const diferencaData = dataA.getTime() - dataB.getTime();

      if (diferencaData !== 0) {
        return diferencaData;
      }

      const criadoA = converterDataAgenda_(a.criadoEm);
      const criadoB = converterDataAgenda_(b.criadoEm);

      return criadoA.getTime() - criadoB.getTime();
    });

  let proximoAgendamento;

  if (futuros.length > 0) {
    proximoAgendamento = futuros[0];
  } else {
    // Caso não existam agendas futuras, carrega a agenda passada
    // mais recente que ainda não foi vinculada a uma turma.
    const passados = agendamentosDisponiveis.sort(function(a, b) {
      const dataA = converterDataAgenda_(a.dataInicial);
      const dataB = converterDataAgenda_(b.dataInicial);

      return dataB.getTime() - dataA.getTime();
    });

    proximoAgendamento = passados[0];
  }

  return {
    id: proximoAgendamento.id,
    idAgenda: proximoAgendamento.id,

    empresa: proximoAgendamento.empresa,
    treinamento: proximoAgendamento.treinamento,
    carga: proximoAgendamento.carga,
    instrutor: proximoAgendamento.instrutor,

    dataInicial: formatarDataAgendaParaTela_(
      proximoAgendamento.dataInicial
    ),

    dataFinal: formatarDataAgendaParaTela_(
      proximoAgendamento.dataFinal
    ),

    horaInicial: formatarHoraAgendaParaTela_(
      proximoAgendamento.horaInicial
    ),

    horaFinal: formatarHoraAgendaParaTela_(
      proximoAgendamento.horaFinal
    ),

    observacao: proximoAgendamento.observacao
  };
}


//=====================================================
// FUNÇÕES AUXILIARES
//=====================================================

function converterDataAgenda_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return zerarHorarioData_(valor);
  }

  const texto = String(valor || '').trim();

  if (!texto) {
    return null;
  }

  const partesBrasileiras = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (partesBrasileiras) {
    return new Date(
      Number(partesBrasileiras[3]),
      Number(partesBrasileiras[2]) - 1,
      Number(partesBrasileiras[1])
    );
  }

  const dataConvertida = new Date(texto);

  if (isNaN(dataConvertida.getTime())) {
    return null;
  }

  return zerarHorarioData_(dataConvertida);
}


function zerarHorarioData_(data) {
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  );
}


function formatarDataAgendaParaTela_(valor) {
  const data = converterDataAgenda_(valor);

  if (!data) {
    return '';
  }

  return Utilities.formatDate(
    data,
    Session.getScriptTimeZone(),
    'dd/MM/yyyy'
  );
}


function formatarHoraAgendaParaTela_(valor) {
  if (!valor) {
    return '';
  }

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(
      valor,
      Session.getScriptTimeZone(),
      'HH:mm'
    );
  }

  return String(valor).trim();
}


function normalizarTextoAgenda_(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}