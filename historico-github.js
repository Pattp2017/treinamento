(() => {
  function cfg(){return window.SUPABASE_CONFIG||{};}
  function configurado(){return Boolean(cfg().url&&cfg().anonKey);}
  async function supabaseFetch(path,options={}){
    if(!configurado()) throw new Error('Supabase ainda não configurado.');
    const base=cfg().url.replace(/\/$/,'');
    const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:cfg().anonKey,Authorization:'Bearer '+cfg().anonKey,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})}});
    const t=await r.text();
    if(!r.ok) throw new Error(t||('HTTP '+r.status));
    return t?JSON.parse(t):null;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
  function cpfNum(v){return String(v||'').replace(/\D/g,'');}
  function cpfMask(v){const d=cpfNum(v);return d.length===11?d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):v||'';}
  function dataCurta(v){if(!v)return'';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString('pt-BR');}
  function dataHora(v){if(!v)return'';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
  function statusCor(s){const n=norm(s);if(n==='gerado'||n==='gerada')return'#18794e';if(n==='reemitido')return'#a15c00';if(n==='cancelado')return'#b42318';return'#667085';}

  let historico=[];
  let empresas=[];
  let treinamentos=[];
  let turmas=[];
  let participantes=[];
  let agendas=[];

  function opcoes(lista,valorFn,textoFn,placeholder){return `<option value="">${esc(placeholder)}</option>`+lista.map(x=>`<option value="${esc(valorFn(x))}">${esc(textoFn(x))}</option>`).join('');}

  function html(){return `<div class="card" style="max-width:1200px"><h2>📂 Histórico</h2><p style="color:#6c757d;margin-top:-6px">Os filtros usam os próprios cadastros do sistema. Se um campo já estiver filtrado, ele não é repetido nos resultados.</p><div class="grid-3"><label>Empresa<select id="histEmpresa"><option value="">Todas as empresas</option></select></label><label>Treinamento<select id="histTreinamento"><option value="">Todos os treinamentos</option></select></label><label>Tipo<select id="histTipo"><option value="">Todos</option><option value="Certificado">Certificado</option><option value="Lista de Presença">Lista de Presença</option></select></label></div><div class="grid-3"><label>Turma<select id="histTurma"><option value="">Todas as turmas</option></select></label><label>Participante<select id="histParticipante"><option value="">Todos os participantes</option></select></label><label>CPF<select id="histCpf"><option value="">Todos os CPFs</option></select></label></div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn primario" id="btnHistPesquisar">🔍 Pesquisar</button><button class="btn" id="btnHistLimpar">🧹 Limpar</button></div><div id="histMsg" class="aviso"></div><div id="histArvore" style="margin-top:16px"></div></div>`;}

  function preencherFiltrosBase(){
    document.getElementById('histEmpresa').innerHTML=opcoes(empresas,x=>x.nome,x=>x.nome,'Todas as empresas');
    document.getElementById('histTreinamento').innerHTML=opcoes(treinamentos,x=>x.nome,x=>x.nome,'Todos os treinamentos');
    atualizarFiltrosDependentes();
  }

  function turmasContextuais(){
    const emp=norm(document.getElementById('histEmpresa').value),tr=norm(document.getElementById('histTreinamento').value);
    return turmas.filter(t=>(!emp||norm(t.empresa)===emp)&&(!tr||norm(t.treinamento)===tr));
  }
  function participantesContextuais(listaTurmas){
    const ids=new Set(listaTurmas.map(t=>String(t.id))),turmaSelecionada=document.getElementById('histTurma')?.value||'';
    return participantes.filter(p=>ids.has(String(p.turma_id))&&(!turmaSelecionada||String(p.turma_id)===String(turmaSelecionada)));
  }
  function atualizarFiltrosDependentes(){
    const selTurma=document.getElementById('histTurma'),selPart=document.getElementById('histParticipante'),selCpf=document.getElementById('histCpf');
    const turmaAnterior=selTurma.value,partAnterior=selPart.value,cpfAnterior=selCpf.value,ts=turmasContextuais();
    selTurma.innerHTML=opcoes(ts,x=>x.id,x=>x.codigo||x.id,'Todas as turmas');
    if(ts.some(x=>String(x.id)===String(turmaAnterior)))selTurma.value=turmaAnterior;
    const ps=participantesContextuais(ts);
    const unicosNome=[...new Map(ps.map(p=>[norm(p.nome)+'|'+cpfNum(p.cpf),p])).values()].sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
    const unicosCpf=[...new Map(ps.map(p=>[cpfNum(p.cpf),p])).values()].filter(p=>cpfNum(p.cpf)).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
    selPart.innerHTML=opcoes(unicosNome,x=>x.nome,x=>x.nome,'Todos os participantes');
    selCpf.innerHTML=opcoes(unicosCpf,x=>cpfNum(x.cpf),x=>`${cpfMask(x.cpf)} - ${x.nome||''}`,'Todos os CPFs');
    if(unicosNome.some(x=>x.nome===partAnterior))selPart.value=partAnterior;
    if(unicosCpf.some(x=>cpfNum(x.cpf)===cpfAnterior))selCpf.value=cpfAnterior;
  }

  function filtrosAtuais(){return {empresa:norm(document.getElementById('histEmpresa').value),treinamento:norm(document.getElementById('histTreinamento').value),tipo:norm(document.getElementById('histTipo').value),turmaId:document.getElementById('histTurma').value,participante:norm(document.getElementById('histParticipante').value),cpf:cpfNum(document.getElementById('histCpf').value)};}

  function ultimoHistorico(turmaId,tipo,cpf=''){
    const lista=historico.filter(h=>String(h.turma_id||'')===String(turmaId)&&norm(h.tipo)===norm(tipo)&&(!cpf||cpfNum(h.cpf)===cpf));
    return lista.sort((a,b)=>new Date(b.criado_em||0)-new Date(a.criado_em||0))[0]||null;
  }
  function agendaDaTurma(t){return agendas.find(a=>String(a.id_turma||'')===String(t.id)||String(a.id||'')===String(t.agenda_id||''))||null;}

  function montarGrupos(f){
    return turmas.filter(t=>(!f.empresa||norm(t.empresa)===f.empresa)&&(!f.treinamento||norm(t.treinamento)===f.treinamento)&&(!f.turmaId||String(t.id)===String(f.turmaId))).map(t=>{
      const agenda=agendaDaTurma(t);
      let ps=participantes.filter(p=>String(p.turma_id)===String(t.id));
      if(f.participante)ps=ps.filter(p=>norm(p.nome)===f.participante);
      if(f.cpf)ps=ps.filter(p=>cpfNum(p.cpf)===f.cpf);
      if((f.participante||f.cpf)&&!ps.length)return null;
      const listaHist=ultimoHistorico(t.id,'Lista de Presença');
      const listaStatus=listaHist?.status||(Number(agenda?.etapa||0)>=3?'Gerada':'Não gerada');
      const lista={status:listaStatus,criado_em:listaHist?.criado_em||null,arquivo_url:listaHist?.arquivo_url||null,nome_arquivo:listaHist?.nome_arquivo||null};
      const certs=ps.map(p=>{
        const h=ultimoHistorico(t.id,'Certificado',cpfNum(p.cpf));
        const status=h?.status||(Number(agenda?.etapa||0)>=4?'Gerado':'Não gerado');
        return {participante:p.nome,cpf:p.cpf,status,criado_em:h?.criado_em||null,arquivo_url:h?.arquivo_url||null,nome_arquivo:h?.nome_arquivo||null};
      }).sort((a,b)=>String(a.participante||'').localeCompare(String(b.participante||''),'pt-BR'));
      const data=t.data_inicio||t.criado_em||agenda?.data_inicio||'';
      return {turma:t,agenda,lista,certs,data};
    }).filter(Boolean).filter(g=>{
      if(!f.tipo)return true;
      if(f.tipo===norm('Certificado'))return g.certs.length>0;
      if(f.tipo===norm('Lista de Presença'))return true;
      return true;
    }).sort((a,b)=>new Date(b.data||0)-new Date(a.data||0));
  }

  function blocoArquivo(x){if(x?.arquivo_url)return `<button class="btn btnHistAbrir" data-url="${esc(x.arquivo_url)}" style="padding:6px 9px">📂 Abrir</button>`;return `<span style="color:#8a9299;font-size:12px">${x?.nome_arquivo?'Arquivo não vinculado':'Não armazenado'}</span>`;}

  function filtrar(){renderArvore(montarGrupos(filtrosAtuais()),filtrosAtuais());}

  function renderArvore(grupos,f){
    const area=document.getElementById('histArvore');
    if(!grupos.length){area.innerHTML='<div style="padding:18px;text-align:center;border:1px dashed #d7dfdc;border-radius:12px;color:#6c757d">Nenhuma turma encontrada para os filtros selecionados.</div>';document.getElementById('histMsg').textContent='Nenhum registro encontrado.';return;}
    area.innerHTML=grupos.map((g,idx)=>{
      const t=g.turma,gerados=g.certs.filter(x=>['gerado','reemitido'].includes(norm(x.status))).length,cab=[];
      if(!f.treinamento&&t.treinamento)cab.push(`<strong>${esc(t.treinamento)}</strong>`);
      if(!f.empresa&&t.empresa)cab.push(esc(t.empresa));
      cab.push(`Turma ${esc(t.codigo||'—')}`);
      if(g.data)cab.push(dataCurta(g.data));
      const resumo=f.tipo===norm('Lista de Presença')?g.lista.status:`${gerados} de ${g.certs.length} certificado(s)`;
      const blocoLista=f.tipo===norm('Certificado')?'':`<div style="display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #eef2f0"><div><strong>📋 Lista de presença</strong><div style="font-size:12px;color:${statusCor(g.lista.status)};margin-top:3px;font-weight:600">${esc(g.lista.status)}${g.lista.criado_em?' • '+esc(dataHora(g.lista.criado_em)):''}</div></div><div>${blocoArquivo(g.lista)}</div></div>`;
      const blocoCert=f.tipo===norm('Lista de Presença')?'':`<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><strong>📜 Certificados</strong><span style="font-size:12px;color:#6c757d">${gerados} de ${g.certs.length} gerado(s)</span></div><div style="margin-top:7px">${g.certs.map(x=>`<div style="display:grid;grid-template-columns:minmax(180px,1fr) 130px auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid #f0f2f1"><div>${esc(x.participante)}<div style="font-size:11px;color:#7b8580">${esc(cpfMask(x.cpf))}</div></div><div style="font-size:12px;color:${statusCor(x.status)};font-weight:600">${esc(x.status)}</div><div>${blocoArquivo(x)}</div></div>`).join('')}</div></div>`;
      return `<div class="hist-grupo" style="border:1px solid #dde6e3;border-radius:12px;margin-bottom:10px;overflow:hidden;background:#fff"><button class="hist-toggle" data-alvo="histDet${idx}" style="width:100%;border:0;background:#f8faf9;padding:13px 14px;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px"><span><span class="hist-sinal" style="display:inline-block;width:22px;font-weight:bold">+</span>${cab.join(' <span style="color:#a0a8a4">•</span> ')}</span><span style="font-size:12px;color:#667085;white-space:nowrap">${esc(resumo)}</span></button><div id="histDet${idx}" style="display:none;padding:12px 14px 14px">${blocoLista}${blocoCert}</div></div>`;
    }).join('');
    area.querySelectorAll('.hist-toggle').forEach(btn=>btn.onclick=()=>{const d=document.getElementById(btn.dataset.alvo),s=btn.querySelector('.hist-sinal'),abrir=d.style.display==='none';d.style.display=abrir?'block':'none';s.textContent=abrir?'−':'+';});
    area.querySelectorAll('.btnHistAbrir').forEach(b=>b.onclick=e=>{e.stopPropagation();window.open(b.dataset.url,'_blank');});
    document.getElementById('histMsg').textContent=grupos.length+' turma(s) encontrada(s).';
  }

  async function carregarTudo(){
    const [e,t,tu,p,a,h]=await Promise.all([
      supabaseFetch('empresas?ativo=eq.true&select=id,nome&order=nome.asc'),
      supabaseFetch('treinamentos?ativo=eq.true&select=id,nome&order=nome.asc'),
      supabaseFetch('turmas?select=id,codigo,agenda_id,empresa,treinamento,data_inicio,criado_em&order=criado_em.desc&limit=2000'),
      supabaseFetch('turma_participantes?select=turma_id,nome,cpf&order=nome.asc&limit=5000'),
      supabaseFetch('agenda?select=id,id_turma,etapa,data_inicio&limit=2000'),
      supabaseFetch('historico_documentos?select=*&order=criado_em.desc&limit=5000')
    ]);
    empresas=e||[];treinamentos=t||[];turmas=tu||[];participantes=p||[];agendas=a||[];historico=h||[];
    preencherFiltrosBase();filtrar();
  }

  window.registrarHistoricoDocumentoGithub=async function(item){try{return await supabaseFetch('historico_documentos',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});}catch(e){console.warn('Falha ao registrar histórico:',e);return null;}};

  window.renderHistoricoGithub=async function(){
    const area=document.getElementById('conteudoPrincipal');area.innerHTML=html();
    document.getElementById('btnHistPesquisar').onclick=filtrar;
    document.getElementById('btnHistLimpar').onclick=()=>{['histEmpresa','histTreinamento','histTipo','histTurma','histParticipante','histCpf'].forEach(id=>document.getElementById(id).value='');atualizarFiltrosDependentes();filtrar();};
    document.getElementById('histEmpresa').onchange=()=>{document.getElementById('histTurma').value='';document.getElementById('histParticipante').value='';document.getElementById('histCpf').value='';atualizarFiltrosDependentes();filtrar();};
    document.getElementById('histTreinamento').onchange=()=>{document.getElementById('histTurma').value='';document.getElementById('histParticipante').value='';document.getElementById('histCpf').value='';atualizarFiltrosDependentes();filtrar();};
    document.getElementById('histTurma').onchange=()=>{document.getElementById('histParticipante').value='';document.getElementById('histCpf').value='';atualizarFiltrosDependentes();filtrar();};
    document.getElementById('histParticipante').onchange=()=>{const nome=document.getElementById('histParticipante').value;if(nome){const ps=participantesContextuais(turmasContextuais()).filter(p=>p.nome===nome);if(ps.length===1)document.getElementById('histCpf').value=cpfNum(ps[0].cpf);}filtrar();};
    document.getElementById('histCpf').onchange=()=>{const c=document.getElementById('histCpf').value;if(c){const ps=participantesContextuais(turmasContextuais()).filter(p=>cpfNum(p.cpf)===cpfNum(c));if(ps.length===1)document.getElementById('histParticipante').value=ps[0].nome;}filtrar();};
    document.getElementById('histTipo').onchange=filtrar;
    try{await carregarTudo();}catch(e){document.getElementById('histMsg').textContent='Erro ao carregar histórico: '+e.message;document.getElementById('histArvore').innerHTML='';}
  };
})();