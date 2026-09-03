(() => {
  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const HORAS_DIA = 8; // 08:00-13:00 e 14:00-17:00
  let dataAtual = new Date();
  let eventos = [];
  let treinamentos = [];

  function cfg() { return window.SUPABASE_CONFIG || {}; }
  function configurado() { return Boolean(cfg().url && cfg().anonKey); }

  async function supabaseFetch(path, options = {}) {
    if (!configurado()) throw new Error('Supabase ainda não configurado.');
    const base = cfg().url.replace(/\/$/, '');
    const resposta = await fetch(base + '/rest/v1/' + path, {
      ...options,
      headers: {
        apikey: cfg().anonKey,
        Authorization: 'Bearer ' + cfg().anonKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });
    const texto = await resposta.text();
    if (!resposta.ok) throw new Error(texto || ('HTTP ' + resposta.status));
    return texto ? JSON.parse(texto) : null;
  }

  async function carregarEventos() {
    eventos = await supabaseFetch('agenda?select=*&order=data_inicio.asc,codigo.asc');
    desenhar();
  }

  async function carregarTreinamentos() {
    treinamentos = await supabaseFetch(
      'treinamentos?select=id,nome,norma,carga_horaria_padrao,validade_meses&ativo=eq.true&order=nome.asc'
    ) || [];
  }

  function iso(data) {
    return data.getFullYear() + '-' + String(data.getMonth()+1).padStart(2,'0') + '-' + String(data.getDate()).padStart(2,'0');
  }

  function criarDataLocal(dataISO) {
    if (!dataISO) return null;
    const p = dataISO.split('-').map(Number);
    return new Date(p[0], p[1]-1, p[2]);
  }

  function proximoDiaUtil(data) {
    while (data.getDay() === 0 || data.getDay() === 6) data.setDate(data.getDate() + 1);
    return data;
  }

  function calcularDataFinal() {
    const inicio = document.getElementById('agData')?.value || '';
    const carga = Number(document.getElementById('agCarga')?.value || 0);
    const campoFim = document.getElementById('agDataFim');
    if (!inicio || !carga || !campoFim) return;

    let data = proximoDiaUtil(criarDataLocal(inicio));
    const diasNecessarios = Math.ceil(carga / HORAS_DIA);

    for (let i = 1; i < diasNecessarios; i++) {
      data.setDate(data.getDate() + 1);
      proximoDiaUtil(data);
    }

    campoFim.value = iso(data);
  }

  function preencherDadosTreinamento() {
    const select = document.getElementById('agTreinamento');
    const id = select?.value || '';
    const treinamento = treinamentos.find(t => String(t.id) === String(id));

    document.getElementById('agNorma').value = treinamento?.norma || '';
    document.getElementById('agCarga').value = treinamento?.carga_horaria_padrao ?? '';
    calcularDataFinal();
  }

  function preencherSelectTreinamentos() {
    const select = document.getElementById('agTreinamento');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione...</option>';
    treinamentos.forEach(t => {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.nome;
      select.appendChild(option);
    });
  }

  function renderStatus() {
    return configurado()
      ? '<span class="status">Supabase configurado</span>'
      : '<span class="status status-alerta">Falta configurar Supabase</span>';
  }

  function htmlAgenda() {
    return `
      <div class="card">
        <div class="agenda-topo">
          <div>${renderStatus()}<h2 style="margin-top:12px">📅 Agenda de Treinamentos</h2></div>
          <div class="agenda-controles">
            <button class="btn" id="mesAnterior">◀</button>
            <strong id="mesAno"></strong>
            <button class="btn" id="mesSeguinte">▶</button>
          </div>
        </div>
        <div id="avisoAgenda" class="aviso"></div>
        <div class="agenda-semana"><div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>
        <div id="gradeAgenda" class="agenda-grade"></div>
      </div>

      <div id="modalAgenda" class="modal oculto">
        <div class="modal-box">
          <h3>Novo agendamento</h3>
          <p style="margin-top:-6px;color:#6c757d;font-size:13px">Jornada padrão: 08:00 às 13:00 e 14:00 às 17:00 (8 horas/dia).</p>
          <div class="grid-form">
            <label>Data inicial<input id="agData" type="date"></label>
            <label>Data final<input id="agDataFim" type="date" readonly></label>
            <label>Empresa<input id="agEmpresa" type="text"></label>
            <label>Treinamento<select id="agTreinamento"><option value="">Carregando...</option></select></label>
            <label>Norma<input id="agNorma" type="text" readonly></label>
            <label>Carga horária<input id="agCarga" type="number" readonly></label>
            <label>Instrutor<input id="agInstrutor" type="text"></label>
            <label class="full">Observação<textarea id="agObservacao"></textarea></label>
          </div>
          <div class="acoes">
            <button class="btn secundario" id="fecharAgenda">Cancelar</button>
            <button class="btn primario" id="salvarAgenda">Salvar</button>
          </div>
        </div>
      </div>`;
  }

  function abrirModal(dataISO) {
    if (!configurado()) {
      document.getElementById('avisoAgenda').textContent = 'Supabase não configurado.';
      return;
    }

    document.getElementById('agData').value = dataISO;
    document.getElementById('agDataFim').value = dataISO;
    document.getElementById('agTreinamento').value = '';
    document.getElementById('agNorma').value = '';
    document.getElementById('agCarga').value = '';
    document.getElementById('modalAgenda').classList.remove('oculto');

    document.getElementById('agData').onchange = calcularDataFinal;
    document.getElementById('agTreinamento').onchange = preencherDadosTreinamento;
  }

  function fecharModal() {
    document.getElementById('modalAgenda').classList.add('oculto');
  }

  async function salvar() {
    calcularDataFinal();

    const treinamentoId = document.getElementById('agTreinamento').value;
    const treinamento = treinamentos.find(t => String(t.id) === String(treinamentoId));

    const dados = {
      codigo: 'AG' + Date.now(),
      data_inicio: document.getElementById('agData').value,
      data_fim: document.getElementById('agDataFim').value,
      empresa: document.getElementById('agEmpresa').value.trim(),
      treinamento: treinamento?.nome || '',
      treinamento_id: treinamentoId || null,
      norma: document.getElementById('agNorma').value.trim() || null,
      carga_horaria: Number(document.getElementById('agCarga').value || 0) || null,
      instrutor: document.getElementById('agInstrutor').value.trim(),
      hora_inicio: '08:00:00',
      hora_fim: '17:00:00',
      status: 'Agendado',
      etapa: 1,
      observacao: document.getElementById('agObservacao').value.trim() || null
    };

    if (!dados.data_inicio || !dados.data_fim || !dados.empresa || !dados.treinamento_id || !dados.instrutor) {
      alert('Preencha data, empresa, treinamento e instrutor.');
      return;
    }

    try {
      await supabaseFetch('agenda', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(dados)
      });
      fecharModal();
      await carregarEventos();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  }

  function cardEvento(ev) {
    const div = document.createElement('div');
    div.className = 'agenda-card';
    div.innerHTML = `<strong>${ev.empresa || ''}</strong><span>${ev.treinamento || ''}</span><small>${ev.instrutor || ''}</small><div class="etapa">Etapa ${ev.etapa || 1}/4</div>`;
    return div;
  }

  function desenhar() {
    const grade = document.getElementById('gradeAgenda');
    if (!grade) return;

    grade.innerHTML = '';
    document.getElementById('mesAno').textContent = nomesMeses[dataAtual.getMonth()] + ' / ' + dataAtual.getFullYear();

    const primeiro = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const ultimo = new Date(dataAtual.getFullYear(), dataAtual.getMonth()+1, 0);

    for (let i = 0; i < primeiro.getDay(); i++) {
      grade.appendChild(document.createElement('div')).className = 'agenda-dia vazio';
    }

    for (let d = 1; d <= ultimo.getDate(); d++) {
      const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), d);
      const dataISO = iso(data);
      const cel = document.createElement('div');
      cel.className = 'agenda-dia';
      cel.innerHTML = `<div class="agenda-numero">${d}</div>`;
      cel.addEventListener('click', () => abrirModal(dataISO));

      eventos
        .filter(ev => ev.data_inicio <= dataISO && ev.data_fim >= dataISO)
        .forEach(ev => {
          const c = cardEvento(ev);
          c.onclick = e => e.stopPropagation();
          cel.appendChild(c);
        });

      grade.appendChild(cel);
    }
  }

  window.renderAgendaGithub = async function() {
    const area = document.getElementById('conteudoPrincipal');
    area.innerHTML = htmlAgenda();

    document.getElementById('mesAnterior').onclick = () => { dataAtual.setMonth(dataAtual.getMonth()-1); desenhar(); };
    document.getElementById('mesSeguinte').onclick = () => { dataAtual.setMonth(dataAtual.getMonth()+1); desenhar(); };
    document.getElementById('fecharAgenda').onclick = fecharModal;
    document.getElementById('salvarAgenda').onclick = salvar;

    desenhar();

    if (!configurado()) {
      document.getElementById('avisoAgenda').textContent = 'Supabase não configurado.';
      return;
    }

    try {
      await carregarTreinamentos();
      preencherSelectTreinamentos();
      await carregarEventos();
    } catch (e) {
      document.getElementById('avisoAgenda').textContent = 'Erro ao carregar dados do Supabase: ' + e.message;
    }
  };
})();