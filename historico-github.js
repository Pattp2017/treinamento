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
  function statusCor(s){const n=norm(s);if(n==='gerado')return'#18794e';if(n==='reemitido')return'#a15c00';if(n==='cancelado')return'#b42318';return'#667085';}

  let dados=[];
  let empresas=[];
  let treinamentos=[];
  let turmas=[];
  let participantes=[];

  function opcoes(lista,valorFn,textoFn,placeholder){
    return `<option value="">${esc(placeholder)}</option>`+lista.map(x=>`<option value="${esc(valorFn(x))}">${esc(textoFn(x))}</option>`).join('');
  }

  function html(){return `<div class="card" style="max-width:1200px"><h2>📂 Histórico</h2><p style="color:#6c757d;margin-top:-6px">Os filtros usam os próprios cadastros do sistema. Se um campo já estiver filtrado, ele não é repetido nos resultados.</p><div class="grid-3"><label>Empresa<select id="histEmpresa"><option value="">Todas as empresas</option></select></label><label>Treinamento<select id="histTreinamento"><option value="">Todos os treinamentos</option></select></label><label>Tipo<select id="histTipo"><option value="">Todos</option><option value="Certificado">Certificado</option><option value="Lista de Presença">Lista de Presença</option></select></label></div><div class="grid-3"><label>Turma<select id="histTurma"><option value="">Todas as turmas</option></select></label><label>Participante<select id="histParticipante"><option value="">Todos os participantes</option></select></label><label>CPF<select id="histCpf"><option value="">Todos os CPFs</option></select></label></div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn primario" id="btnHistPesquisar">🔍 Pesquisar</button><button class="btn" id="btnHistLimpar">🧹 Limpar</button></div><div id="histMsg" class="aviso"></div><div id="histArvore" style="margin-top:16px"></div></div>`;}

  function preencherFiltrosBase(){
    const selEmp=document.getElementById('histEmpresa');
    const selTr=document.getElementById('histTreinamento');
    selEmp.innerHTML=opcoes(empresas,x=>x.nome,x=>x.nome,'Todas as empresas');
    selTr.innerHTML=opcoes(treinamentos,x=>x.nome,x=>x.nome,'Todos os treinamentos');
    atualizarFiltrosDependentes();
  }

  function turmasContextuais(){
    const emp=norm(document.getElementById('histEmpresa').value);
    const tr=norm(document.getElementById('histTreinamento').value);
    return turmas.filter(t=>(!emp||norm(t.empresa)===emp)&&(!tr||norm(t.treinamento)===tr));
  }

  function participantesContextuais(listaTurmas){
    const ids=new Set(listaTurmas.map(t=>String(t.id)));
    const turmaSelecionada=document.getElementById('histTurma')?.value||'';
    return participantes.filter(p=>ids.has(String(p.turma_id))&&(!turmaSelecionada||String(p.turma_id)===String(turmaSelecionada)));
  }

  function atualizarFiltrosDependentes(){
    const selTurma=document.getElementById('histTurma');
    const selPart=document.getElementById('histParticipante');
    const selCpf=document.getElementById('histCpf');
    const turmaAnterior=selTurma.value;
    const partAnterior=selPart.value;
    const cpfAnterior=selCpf.value;
    const ts=turmasContextuais();
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

  function filtrosAtuais(){
    const turmaId=document.getElementById('histTurma').value;
    const turma=turmas.find(t=>String(t.id)===String(turmaId));
    return {
      empresa:norm(document.getElementById('histEmpresa').value),
      treinamento:norm(document.getElementById('histTreinamento').value),
      tipo:norm(document.getElementById('histTipo').value),
      turmaId:turmaId,
      turma:norm(turma?.codigo||''),
      participante:norm(document.getElementById('histParticipante').value),
      cpf:cpfNum(document.getElementById('histCpf').value)
    };
  }

  function filtrar(){
    const f=filtrosAtuais();
    const out=dados.filter(x=>(!f.empresa||norm(x.empresa)===f.empresa)&&(!f.treinamento||norm(x.treinamento)===f.treinamento)&&(!f.tipo||norm(x.tipo)===f.tipo)&&(!f.turmaId||String(x.turma_id||'')===String(f.turmaId)||(!x.turma_id&&norm(x.id_turma)===f.turma))&&(!f.participante||norm(x.participante)===f.participante)&&(!f.cpf||cpfNum(x.cpf)===f.cpf));
    renderArvore(out,f);
  }

  function agrupar(lista){const mapa=new Map();lista.forEach(x=>{const chave=x.turma_id||[x.id_turma,x.empresa,x.treinamento].join('|');if(!mapa.has(chave))mapa.set(chave,{chave,id_turma:x.id_turma||'',empresa:x.empresa||'',treinamento:x.treinamento||'',data:x.criado_em||'',itens:[]});const g=mapa.get(chave);g.itens.push(x);if(x.criado_em&&(!g.data||new Date(x.criado_em)>new Date(g.data)))g.data=x.criado_em;});return [...mapa.values()].sort((a,b)=>new Date(b.data||0)-new Date(a.data||0));}

  function resumoCertificados(itens){const certs=itens.filter(x=>x.tipo==='Certificado');const pessoas=new Map();certs.forEach(x=>{const chave=cpfNum(x.cpf)||norm(x.participante)||x.id;const atual=pessoas.get(chave);if(!atual||new Date(x.criado_em||0)>new Date(atual.criado_em||0))pessoas.set(chave,x);});const vals=[...pessoas.values()];return {total:vals.length,gerados:vals.filter(x=>['gerado','reemitido'].includes(norm(x.status))).length,itens:vals.sort((a,b)=>String(a.participante||'').localeCompare(String(b.participante||''),'pt-BR'))};}

  function blocoArquivo(x){if(x.arquivo_url)return `<button class="btn btnHistAbrir" data-url="${esc(x.arquivo_url)}" style="padding:6px 9px">📂 Abrir</button>`;return `<span style="color:#8a9299;font-size:12px">${x.nome_arquivo?'Arquivo não vinculado':'Não armazenado'}</span>`;}

  function renderArvore(lista,f){
    const area=document.getElementById('histArvore');
    if(!lista.length){area.innerHTML='<div style="padding:18px;text-align:center;border:1px dashed #d7dfdc;border-radius:12px;color:#6c757d">Nenhum registro encontrado.</div>';document.getElementById('histMsg').textContent='Nenhum registro encontrado.';return;}
    const grupos=agrupar(lista);
    area.innerHTML=grupos.map((g,idx)=>{
      const cert=resumoCertificados(g.itens);
      const listaPres=g.itens.filter(x=>x.tipo==='Lista de Presença').sort((a,b)=>new Date(b.criado_em||0)-new Date(a.criado_em||0))[0]||null;
      const mostrarEmpresa=!f.empresa&&g.empresa;
      const mostrarTreino=!f.treinamento&&g.treinamento;
      const cab=[];
      if(mostrarTreino)cab.push(`<strong>${esc(g.treinamento)}</strong>`);
      if(mostrarEmpresa)cab.push(esc(g.empresa));
      cab.push(`Turma ${esc(g.id_turma||'—')}`);
      if(g.data)cab.push(dataCurta(g.data));
      const detalheCert=cert.total?`${cert.gerados} de ${cert.total} certificado(s)`:'Sem certificados registrados';
      return `<div class="hist-grupo" style="border:1px solid #dde6e3;border-radius:12px;margin-bottom:10px;overflow:hidden;background:#fff"><button class="hist-toggle" data-alvo="histDet${idx}" style="width:100%;border:0;background:#f8faf9;padding:13px 14px;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px"><span><span class="hist-sinal" style="display:inline-block;width:22px;font-weight:bold">+</span>${cab.join(' <span style="color:#a0a8a4">•</span> ')}</span><span style="font-size:12px;color:#667085;white-space:nowrap">${esc(detalheCert)}</span></button><div id="histDet${idx}" style="display:none;padding:12px 14px 14px"><div style="display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #eef2f0"><div><strong>📋 Lista de presença</strong><div style="font-size:12px;color:#6c757d;margin-top:3px">${listaPres?`${esc(listaPres.status||'Gerado')} • ${esc(dataHora(listaPres.criado_em))}`:'Não gerada'}</div></div><div>${listaPres?blocoArquivo(listaPres):''}</div></div><div style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><strong>📜 Certificados</strong><span style="font-size:12px;color:#6c757d">${cert.gerados} de ${cert.total} registrado(s)</span></div><div style="margin-top:7px">${cert.itens.length?cert.itens.map(x=>`<div style="display:grid;grid-template-columns:minmax(180px,1fr) 130px auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid #f0f2f1"><div>${esc(x.participante||'Participante')}<div style="font-size:11px;color:#7b8580">${esc(cpfMask(x.cpf))}</div></div><div style="font-size:12px;color:${statusCor(x.status)};font-weight:600">${esc(x.status||'Gerado')}</div><div>${blocoArquivo(x)}</div></div>`).join(''):'<div style="padding:10px 0;color:#8a9299;font-size:13px">Nenhum certificado registrado para esta turma.</div>'}</div></div></div></div>`;
    }).join('');
    area.querySelectorAll('.hist-toggle').forEach(btn=>btn.onclick=()=>{const d=document.getElementById(btn.dataset.alvo);const s=btn.querySelector('.hist-sinal');const abrir=d.style.display==='none';d.style.display=abrir?'block':'none';s.textContent=abrir?'−':'+';});
    area.querySelectorAll('.btnHistAbrir').forEach(b=>b.onclick=e=>{e.stopPropagation();window.open(b.dataset.url,'_blank');});
    document.getElementById('histMsg').textContent=grupos.length+' turma(s) encontrada(s).';
  }

  async function carregarCadastros(){
    const [e,t,tu,p]=await Promise.all([
      supabaseFetch('empresas?ativo=eq.true&select=id,nome&order=nome.asc'),
      supabaseFetch('treinamentos?ativo=eq.true&select=id,nome&order=nome.asc'),
      supabaseFetch('turmas?select=id,codigo,empresa,treinamento&order=criado_em.desc&limit=2000'),
      supabaseFetch('turma_participantes?select=turma_id,nome,cpf&order=nome.asc&limit=5000')
    ]);
    empresas=e||[];treinamentos=t||[];turmas=tu||[];participantes=p||[];
    preencherFiltrosBase();
  }

  async function carregarHistorico(){dados=await supabaseFetch('historico_documentos?select=*&order=criado_em.desc&limit=2000')||[];filtrar();}
  window.registrarHistoricoDocumentoGithub=async function(item){try{return await supabaseFetch('historico_documentos',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(item)});}catch(e){console.warn('Falha ao registrar histórico:',e);return null;}};

  window.renderHistoricoGithub=async function(){
    const area=document.getElementById('conteudoPrincipal');
    area.innerHTML=html();
    document.getElementById('btnHistPesquisar').onclick=filtrar;
    document.getElementById('btnHistLimpar').onclick=()=>{
      ['histEmpresa','histTreinamento','histTipo','histTurma','histParticipante','histCpf'].forEach(id=>document.getElementById(id).value='');
      atualizarFiltrosDependentes();
      filtrar();
    };
    document.getElementById('histEmpresa').onchange=()=>{document.getElementById('histTurma').value='';document.getElementById('histParticipante').value='';document.getElementById('histCpf').value='';atualizarFiltrosDependentes();filtrar();};
    document.getElementById('histTreinamento').onchange=()=>{document.getElementById('histTurma').value='';document.getElementById('histParticipante').value='';document.getElementById('histCpf').value='';atualizarFiltrosDependentes();filtrar();};
    document.getElementById('histTurma').onchange=()=>{document.getElementById('histParticipante').value='';document.getElementById('histCpf').value='';atualizarFiltrosDependentes();filtrar();};
    document.getElementById('histParticipante').onchange=()=>{
      const nome=document.getElementById('histParticipante').value;
      if(nome){const ps=participantesContextuais(turmasContextuais()).filter(p=>p.nome===nome);if(ps.length===1)document.getElementById('histCpf').value=cpfNum(ps[0].cpf);}
      filtrar();
    };
    document.getElementById('histCpf').onchange=()=>{
      const c=document.getElementById('histCpf').value;
      if(c){const ps=participantesContextuais(turmasContextuais()).filter(p=>cpfNum(p.cpf)===cpfNum(c));if(ps.length===1)document.getElementById('histParticipante').value=ps[0].nome;}
      filtrar();
    };
    document.getElementById('histTipo').onchange=filtrar;
    try{
      await carregarCadastros();
      await carregarHistorico();
    }catch(e){
      document.getElementById('histMsg').textContent='Erro ao carregar histórico: '+e.message;
      document.getElementById('histArvore').innerHTML='';
    }
  };
})();