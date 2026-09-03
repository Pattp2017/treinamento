(() => {
  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let dataAtual = new Date();
  let eventos = [];

  function cfg() {
    return window.SUPABASE_CONFIG || {};
  }

  function configurado() {
    return Boolean(cfg().url && cfg().anonKey);
  }

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

  function iso(data) {
    return data.getFullYear() + '-' + String(data.getMonth()+1).padStart(2,'0') + '-' + String(data.getDate()).padStart(2,'0');
  }

  function renderStatus() {
    return configurado()
      ? '<span class="status">Supabase configurado</span>'
      : '<span class="status status-alerta">Falta configurar Supabase</span>';
  }

  function htmlAgenda() {
    return `
      <div class="card">
        <div class="agenda-topo"><div>${renderStatus()}<h2 style="margin-top:12px">📅 Agenda de Treinamentos</h2></div>
          <div class="agenda-controles"><button class="btn" id="mesAnterior">◀</button><strong id="mesAno"></strong><button class="btn" id="mesSeguinte">▶</button></div>
        </div>
        <div id="avisoAgenda" class="aviso"></div>
        <div class="agenda-semana"><div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>
        <div id="gradeAgenda" class="agenda-grade"></div>
      </div>
      <div id="modalAgenda" class="modal oculto">
        <div class="modal-box">
          <h3>Novo agendamento</h3>
          <div class="grid-form">
            <label>Data inicial<input id="agData" type="date"></label>
            <label>Data final<input id="agDataFim" type="date"></label>
            <label>Empresa<input id="agEmpresa" type="text"></label>
            <label>Treinamento<input id="agTreinamento" type="text"></label>
            <label>Norma<input id="agNorma" type="text" placeholder="NR-35"></label>
            <label>Carga horária<input id="agCarga" type="number" step="0.5"></label>
            <label>Instrutor<input id="agInstrutor" type="text"></label>
            <label>Hora início<input id="agHoraInicio" type="time"></label>
            <label>Hora fim<input id="agHoraFim" type="time"></label>
            <label class="full">Observação<textarea id="agObservacao"></textarea></label>
          </div>
          <div class="acoes"><button class="btn secundario" id="fecharAgenda">Cancelar</button><button class="btn primario" id="salvarAgenda">Salvar</button></div>
        </div>
      </div>`;
  }

  function abrirModal(dataISO) {
    if (!configurado()) {
      document.getElementById('avisoAgenda').textContent = 'Para gravar dados, configure URL e chave anon/publishable do Supabase em supabase-config.js.';
      return;
    }
    document.getElementById('agData').value = dataISO;
    document.getElementById('agDataFim').value = dataISO;
    document.getElementById('modalAgenda').classList.remove('oculto');
  }

  function fecharModal() {
    document.getElementById('modalAgenda').classList.add('oculto');
  }

  async function salvar() {
    const dados = {
      codigo: 'AG' + Date.now(),
      data_inicio: document.getElementById('agData').value,
      data_fim: document.getElementById('agDataFim').value,
      empresa: document.getElementById('agEmpresa').value.trim(),
      treinamento: document.getElementById('agTreinamento').value.trim(),
      norma: document.getElementById('agNorma').value.trim() || null,
      carga_horaria: Number(document.getElementById('agCarga').value || 0) || null,
      instrutor: document.getElementById('agInstrutor').value.trim(),
      hora_inicio: document.getElementById('agHoraInicio').value || null,
      hora_fim: document.getElementById('agHoraFim').value || null,
      status: 'Agendado', etapa: 1,
      observacao: document.getElementById('agObservacao').value.trim() || null
    };
    if (!dados.data_inicio || !dados.data_fim || !dados.empresa || !dados.treinamento || !dados.instrutor) {
      alert('Preencha data, empresa, treinamento e instrutor.'); return;
    }
    try {
      await supabaseFetch('agenda', {method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(dados)});
      fecharModal(); await carregarEventos();
    } catch (e) { alert('Erro ao salvar: ' + e.message); }
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
    for (let i=0;i<primeiro.getDay();i++) grade.appendChild(document.createElement('div')).className='agenda-dia vazio';
    for (let d=1; d<=ultimo.getDate(); d++) {
      const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), d);
      const dataISO = iso(data);
      const cel = document.createElement('div'); cel.className='agenda-dia';
      cel.innerHTML = `<div class="agenda-numero">${d}</div>`;
      cel.addEventListener('click', () => abrirModal(dataISO));
      eventos.filter(ev => ev.data_inicio <= dataISO && ev.data_fim >= dataISO).forEach(ev => { const c=cardEvento(ev); c.onclick=(e)=>e.stopPropagation(); cel.appendChild(c); });
      grade.appendChild(cel);
    }
  }

  window.renderAgendaGithub = async function() {
    const area = document.getElementById('conteudoPrincipal');
    area.innerHTML = htmlAgenda();
    document.getElementById('mesAnterior').onclick=()=>{dataAtual.setMonth(dataAtual.getMonth()-1);desenhar();};
    document.getElementById('mesSeguinte').onclick=()=>{dataAtual.setMonth(dataAtual.getMonth()+1);desenhar();};
    document.getElementById('fecharAgenda').onclick=fecharModal;
    document.getElementById('salvarAgenda').onclick=salvar;
    desenhar();
    if (configurado()) {
      try { await carregarEventos(); }
      catch(e) { document.getElementById('avisoAgenda').textContent='Erro ao conectar no Supabase: '+e.message; }
    } else {
      document.getElementById('avisoAgenda').textContent='A interface da Agenda já está migrada. Falta apenas informar a URL e a chave pública do Supabase.';
    }
  };
})();
