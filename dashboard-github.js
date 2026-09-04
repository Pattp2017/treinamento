(() => {
  function cfg(){return window.SUPABASE_CONFIG||{};}
  function configurado(){return Boolean(cfg().url&&cfg().anonKey);}
  async function supabaseFetch(path){if(!configurado())throw new Error('Supabase ainda não configurado.');const base=cfg().url.replace(/\/$/,'');const r=await fetch(base+'/rest/v1/'+path,{headers:{apikey:cfg().anonKey,Authorization:'Bearer '+cfg().anonKey,Accept:'application/json'}});const t=await r.text();if(!r.ok)throw new Error(t||('HTTP '+r.status));return t?JSON.parse(t):[];}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function dataBR(v){if(!v)return '—';const p=String(v).slice(0,10).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v;}
  function hojeISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function mesAtual(v){if(!v)return false;const d=new Date(String(v).slice(0,10)+'T12:00:00'),h=new Date();return d.getMonth()===h.getMonth()&&d.getFullYear()===h.getFullYear();}
  function abrirModulo(nome){[...document.querySelectorAll('.menu-item')].find(x=>x.dataset.modulo===nome)?.click();}
  function card(numero,titulo,sub,acao){return `<button type="button" class="card dash-card" data-acao="${acao}" style="text-align:left;cursor:pointer;margin:0;min-height:126px"><div style="font-size:32px;font-weight:800;color:var(--verde-escuro)">${numero}</div><div style="font-weight:700;margin-top:5px">${titulo}</div><div style="font-size:12px;color:#6c757d;margin-top:4px">${sub}</div></button>`;}
  function etapaTexto(a){if(String(a.status||'').toLowerCase()==='cancelado')return 'Cancelado';return ({1:'Agendado',2:'Turma cadastrada',3:'Lista gerada',4:'Concluído'})[Number(a.etapa||1)]||`Etapa ${a.etapa||1}`;}
  async function carregar(){
    const [agendas,turmas,participantes,historico]=await Promise.all([
      supabaseFetch('agenda?select=id,codigo,id_turma,data_inicio,data_fim,empresa,treinamento,instrutor,status,etapa&order=data_inicio.asc&limit=3000'),
      supabaseFetch('turmas?select=id,codigo,agenda_id,data_inicio&limit=3000'),
      supabaseFetch('turma_participantes?select=turma_id,cpf&limit=10000'),
      supabaseFetch('historico_documentos?select=turma_id,tipo,cpf,status,criado_em&limit=10000')
    ]);
    const hoje=hojeISO(),ativas=agendas.filter(a=>String(a.status||'').toLowerCase()!=='cancelado');
    const agMes=ativas.filter(a=>mesAtual(a.data_inicio));
    const turmasMes=turmas.filter(t=>mesAtual(t.data_inicio)||agMes.some(a=>String(a.id_turma||'')===String(t.id)||String(a.id||'')===String(t.agenda_id||'')));
    const idsMes=new Set(turmasMes.map(t=>String(t.id)));
    const partMes=participantes.filter(p=>idsMes.has(String(p.turma_id))).length;
    const certMes=historico.filter(h=>String(h.tipo||'').toLowerCase()==='certificado'&&['gerado','reemitido'].includes(String(h.status||'').toLowerCase())&&mesAtual(h.criado_em)).length;
    const proximos=ativas.filter(a=>a.data_fim>=hoje).slice(0,6);
    const semTurma=ativas.filter(a=>a.data_fim<hoje&&Number(a.etapa||1)<2).length;
    const semLista=ativas.filter(a=>a.data_fim<hoje&&Number(a.etapa||1)>=2&&Number(a.etapa||1)<3).length;
    let certPend=0;ativas.filter(a=>Number(a.etapa||1)>=3&&a.id_turma).forEach(a=>{const ps=participantes.filter(p=>String(p.turma_id)===String(a.id_turma));const hs=historico.filter(h=>String(h.turma_id)===String(a.id_turma)&&String(h.tipo||'').toLowerCase()==='certificado'&&['gerado','reemitido'].includes(String(h.status||'').toLowerCase()));const cpfs=new Set(hs.map(h=>String(h.cpf||'').replace(/\D/g,'')));certPend+=ps.filter(p=>!cpfs.has(String(p.cpf||'').replace(/\D/g,''))).length;});
    return {agMes,turmasMes,partMes,certMes,proximos,semTurma,semLista,certPend};
  }
  function render(d){const area=document.getElementById('conteudoPrincipal');area.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:16px"><div><h2 style="margin:0;color:var(--verde-escuro)">Dashboard</h2><div style="font-size:13px;color:#6c757d;margin-top:4px">Visão operacional do mês atual</div></div><button class="btn" id="dashAtualizar">↻ Atualizar</button></div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:22px" class="dash-resumo">
      ${card(d.agMes.length,'Agendamentos','neste mês','Agenda')}${card(d.turmasMes.length,'Turmas','neste mês','Turmas')}${card(d.partMes,'Participantes','nas turmas do mês','Turmas')}${card(d.certMes,'Certificados','gerados neste mês','Historico')}
    </div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">📅 Próximos treinamentos</h3><button class="btn" data-modulo-dash="Agenda">Abrir agenda</button></div><div style="margin-top:12px">${d.proximos.length?d.proximos.map(a=>`<div style="display:grid;grid-template-columns:90px minmax(140px,1fr) minmax(180px,1.3fr) minmax(120px,1fr) 130px;gap:12px;padding:10px 4px;border-top:1px solid #edf1ef;align-items:center"><strong>${dataBR(a.data_inicio)}</strong><span>${esc(a.empresa)}</span><span>${esc(a.treinamento)}</span><span style="font-size:12px;color:#6c757d">${esc(a.instrutor)}</span><span class="status${String(a.status||'').toLowerCase()==='cancelado'?' status-alerta':''}">${esc(etapaTexto(a))}</span></div>`).join(''):'<div style="padding:18px 0;color:#6c757d">Nenhum treinamento futuro agendado.</div>'}</div></div>
    <div class="card"><h3>⚠️ Pendências</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><button class="btn" data-modulo-dash="Agenda" style="text-align:left;padding:14px"><strong>${d.semTurma}</strong><br><span style="font-size:12px">agendamento(s) passado(s) sem turma</span></button><button class="btn" data-modulo-dash="Agenda" style="text-align:left;padding:14px"><strong>${d.semLista}</strong><br><span style="font-size:12px">turma(s) passada(s) sem lista gerada</span></button><button class="btn" data-modulo-dash="Historico" style="text-align:left;padding:14px"><strong>${d.certPend}</strong><br><span style="font-size:12px">certificado(s) pendente(s)</span></button></div></div>`;
    area.querySelectorAll('[data-acao]').forEach(b=>b.onclick=()=>abrirModulo(b.dataset.acao));area.querySelectorAll('[data-modulo-dash]').forEach(b=>b.onclick=()=>abrirModulo(b.dataset.moduloDash));document.getElementById('dashAtualizar').onclick=window.renderDashboardGithub;
  }
  window.renderDashboardGithub=async function(){const area=document.getElementById('conteudoPrincipal');area.innerHTML='<div class="card">Carregando dashboard...</div>';if(!configurado()){area.innerHTML='<div class="card"><h2>Dashboard</h2><div class="aviso">Supabase ainda não configurado.</div></div>';return;}try{render(await carregar());}catch(e){area.innerHTML=`<div class="card"><h2>Dashboard</h2><div class="aviso">Erro ao carregar: ${esc(e.message)}</div></div>`;}};
})();