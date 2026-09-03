(() => {
  let participantes = [];
  let turmaAtual = null;
  let indiceEditando = -1;

  function cfg(){ return window.SUPABASE_CONFIG || {}; }
  function configurado(){ return Boolean(cfg().url && cfg().anonKey); }
  async function supabaseFetch(path, options={}){
    if(!configurado()) throw new Error('Supabase ainda não configurado.');
    const base=cfg().url.replace(/\/$/,'');
    const resposta=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:cfg().anonKey,Authorization:'Bearer '+cfg().anonKey,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})}});
    const texto=await resposta.text();
    if(!resposta.ok) throw new Error(texto||('HTTP '+resposta.status));
    return texto?JSON.parse(texto):null;
  }

  function limparCPF(v){ return String(v||'').replace(/\D/g,''); }
  function formatarCPF(v){v=limparCPF(v).slice(0,11);if(!v)return'';return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');}
  function normalizarNome(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,' ');}
  function validarCPF(cpf){cpf=limparCPF(cpf);if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;let soma=0,resto;for(let i=1;i<=9;i++)soma+=parseInt(cpf.substring(i-1,i),10)*(11-i);resto=(soma*10)%11;if(resto===10||resto===11)resto=0;if(resto!==parseInt(cpf.substring(9,10),10))return false;soma=0;for(let i=1;i<=10;i++)soma+=parseInt(cpf.substring(i-1,i),10)*(12-i);resto=(soma*10)%11;if(resto===10||resto===11)resto=0;return resto===parseInt(cpf.substring(10,11),10);}

  function htmlTurmas(){return `
    <style>
      .turmas-topo-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;width:100%}
      .turmas-topo-grid>.card{min-width:0;width:100%}
      .participante-divergente{background:#ffe8e8}
      .participante-alerta{display:block;color:#a61b1b;font-size:11px;font-weight:bold;margin-top:3px}
      .acoes-participante{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
      @media(max-width:900px){.turmas-topo-grid{grid-template-columns:1fr}}
    </style>
    <div class="turmas-topo-grid">
      <div class="card"><h3>📚 Dados do Treinamento</h3><label>Empresa<input id="turEmpresa" readonly></label><label>Turma<input id="turCodigo" readonly placeholder="Será gerado ao salvar"></label><label>Treinamento<input id="turTreinamento" readonly></label><label>Carga Horária<input id="turCarga" readonly></label><label>Data Inicial<input id="turDataInicio" type="date" readonly></label><label>Data Final<input id="turDataFim" type="date" readonly></label></div>
      <div class="card"><h3>👨‍🏫 Dados do Instrutor</h3><label>Instrutor<input id="turInstrutor" readonly></label><label>Habilitação<input id="turHabilitacao" placeholder="Será ligada ao cadastro de instrutores"></label><label>Registro Profissional<input id="turRegistro" placeholder="Será ligado ao cadastro de instrutores"></label><div id="turStatus" class="aviso">Turma ainda não salva.</div></div>
    </div>
    <div class="card"><h3 id="tituloParticipantes">👥 Participantes (0)</h3>
      <div class="grid-3"><label>Nome do Participante<input id="turNome" placeholder="Digite o nome"></label><label>CPF<input id="turCPF" maxlength="14" placeholder="000.000.000-00"></label><div style="display:flex;align-items:end"><button class="btn primario" id="btnAddParticipante">➕ Adicionar</button></div></div>
      <div style="margin-top:14px"><textarea id="turImportacao" rows="5" style="width:100%" placeholder="Importação rápida: Nome;CPF, um por linha"></textarea></div>
      <div style="margin-top:8px"><button class="btn" id="btnImportarParticipantes">📥 Importar participantes</button></div>
      <div id="turResumoImportacao" class="aviso"></div>
      <div style="overflow-x:auto;margin-top:14px"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Nome</th><th style="text-align:left">CPF</th><th>Ação</th></tr></thead><tbody id="turListaParticipantes"></tbody></table></div>
    </div>
    <div class="card"><div class="acoes"><button class="btn primario" id="btnSalvarTurma">💾 Salvar Turma</button></div><div id="turOrigem" style="margin-top:14px;padding-top:9px;border-top:1px solid #e5e7eb;text-align:right;color:#8a9299;font-size:11px"></div></div>`;}

  function atualizarTabela(){
    const tbody=document.getElementById('turListaParticipantes');
    if(!tbody)return;
    tbody.innerHTML='';
    participantes.forEach((p,i)=>{
      const tr=document.createElement('tr');
      if(p.divergente) tr.className='participante-divergente';
      const aviso=p.divergente?`<span class="participante-alerta">⚠ Cadastro existente: ${p.nomeCadastro||'nome diferente'}</span>`:'';
      tr.innerHTML=`<td style="padding:8px 4px">${p.nome}${aviso}</td><td style="padding:8px 4px">${p.cpf}</td><td><div class="acoes-participante"></div></td>`;
      const acoes=tr.querySelector('.acoes-participante');
      const editar=document.createElement('button'); editar.className='btn'; editar.textContent='✏️ Editar';
      editar.onclick=()=>editarParticipante(i);
      const excluir=document.createElement('button'); excluir.className='btn'; excluir.textContent='🗑️ Excluir';
      excluir.onclick=()=>{participantes.splice(i,1);if(indiceEditando===i)cancelarEdicao();atualizarTabela();};
      acoes.appendChild(editar);acoes.appendChild(excluir);tbody.appendChild(tr);
    });
    document.getElementById('tituloParticipantes').textContent='👥 Participantes ('+participantes.length+')';
  }

  function editarParticipante(i){
    const p=participantes[i]; if(!p)return;
    indiceEditando=i;
    document.getElementById('turNome').value=p.nome;
    document.getElementById('turCPF').value=p.cpf;
    document.getElementById('btnAddParticipante').textContent='💾 Salvar edição';
    document.getElementById('turNome').focus();
  }

  function cancelarEdicao(){indiceEditando=-1;const b=document.getElementById('btnAddParticipante');if(b)b.textContent='➕ Adicionar';}

  async function localizarOuCriarPessoa(nome,cpf){
    nome=normalizarNome(nome); cpf=limparCPF(cpf);
    const existentes=await supabaseFetch('pessoas?cpf=eq.'+encodeURIComponent(cpf)+'&select=id,nome,cpf&limit=1');
    if(existentes?.length){
      const pessoa=existentes[0];
      return {pessoaId:pessoa.id,nomeCadastro:normalizarNome(pessoa.nome),divergente:normalizarNome(pessoa.nome)!==nome,existente:true};
    }
    const resp=await supabaseFetch('pessoas',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({nome,cpf,ativo:true})});
    const pessoa=resp?.[0];
    if(!pessoa?.id) throw new Error('Não foi possível criar o cadastro da pessoa.');
    return {pessoaId:pessoa.id,nomeCadastro:nome,divergente:false,existente:false};
  }

  async function adicionarOuEditarParticipante(nome,cpf,consultarPessoa=true){
    nome=normalizarNome(nome); cpf=limparCPF(cpf);
    if(!nome||!cpf)throw new Error('Informe nome e CPF.');
    if(!validarCPF(cpf))throw new Error('CPF inválido.');
    const duplicado=participantes.some((p,index)=>limparCPF(p.cpf)===cpf&&index!==indiceEditando);
    if(duplicado)throw new Error('Este CPF já foi adicionado nesta turma.');
    let info={pessoaId:null,nomeCadastro:null,divergente:false};
    if(consultarPessoa) info=await localizarOuCriarPessoa(nome,cpf);
    const novo={nome,cpf:formatarCPF(cpf),pessoaId:info.pessoaId||null,nomeCadastro:info.nomeCadastro||null,divergente:Boolean(info.divergente)};
    if(indiceEditando>=0){participantes[indiceEditando]=novo;cancelarEdicao();}else participantes.push(novo);
    atualizarTabela();
  }

  function preencherAgendaSelecionada(){const ev=window.TREINAMENTO_AGENDA_SELECIONADA;if(!ev)return;document.getElementById('turEmpresa').value=ev.empresa||'';document.getElementById('turTreinamento').value=ev.treinamento||'';document.getElementById('turCarga').value=ev.carga_horaria?ev.carga_horaria+' horas':'';document.getElementById('turDataInicio').value=ev.data_inicio||'';document.getElementById('turDataFim').value=ev.data_fim||'';document.getElementById('turInstrutor').value=ev.instrutor||'';document.getElementById('turOrigem').textContent='🔗 Origem: '+(ev.codigo||ev.id||'agendamento selecionado');}

  async function carregarDadosTurma(turma){
    if(!turma)return false;turmaAtual=turma;
    document.getElementById('turCodigo').value=turmaAtual.codigo||'';
    document.getElementById('turHabilitacao').value=turmaAtual.habilitacao_instrutor||'';
    document.getElementById('turRegistro').value=turmaAtual.registro_instrutor||'';
    document.getElementById('turStatus').textContent='Turma salva.';
    const ps=await supabaseFetch('turma_participantes?turma_id=eq.'+encodeURIComponent(turmaAtual.id)+'&select=nome,cpf,pessoa_id&order=nome.asc');
    participantes=[];
    for(const p of (ps||[])){
      let nomeCadastro=null,divergente=false;
      if(p.pessoa_id){const cad=await supabaseFetch('pessoas?id=eq.'+encodeURIComponent(p.pessoa_id)+'&select=nome&limit=1');if(cad?.length){nomeCadastro=normalizarNome(cad[0].nome);divergente=nomeCadastro!==normalizarNome(p.nome);}}
      participantes.push({nome:normalizarNome(p.nome),cpf:formatarCPF(p.cpf),pessoaId:p.pessoa_id||null,nomeCadastro,divergente});
    }
    atualizarTabela();return true;
  }

  async function carregarTurmaExistente(){const ev=window.TREINAMENTO_AGENDA_SELECIONADA;if(!ev)return false;let turmas=[];if(ev.id_turma)turmas=await supabaseFetch('turmas?id=eq.'+encodeURIComponent(ev.id_turma)+'&select=*');if(!turmas?.length&&ev.id)turmas=await supabaseFetch('turmas?agenda_id=eq.'+encodeURIComponent(ev.id)+'&select=*&limit=1');if(!turmas?.length)return false;ev.id_turma=turmas[0].id;return carregarDadosTurma(turmas[0]);}

  async function garantirPessoasDosParticipantes(){
    for(let i=0;i<participantes.length;i++){
      const p=participantes[i];
      if(p.pessoaId)continue;
      const info=await localizarOuCriarPessoa(p.nome,p.cpf);
      participantes[i]={...p,pessoaId:info.pessoaId,nomeCadastro:info.nomeCadastro,divergente:info.divergente};
    }
    atualizarTabela();
  }

  async function salvarTurma(){
    const ev=window.TREINAMENTO_AGENDA_SELECIONADA;
    if(!ev){alert('Abra a turma a partir de um agendamento.');return;}
    if(!participantes.length){alert('Adicione pelo menos um participante.');return;}
    try{
      await garantirPessoasDosParticipantes();
      const agora=new Date().toISOString();
      if(!turmaAtual&&ev.id){const existentes=await supabaseFetch('turmas?agenda_id=eq.'+encodeURIComponent(ev.id)+'&select=*&limit=1');if(existentes?.length){turmaAtual=existentes[0];ev.id_turma=turmaAtual.id;}}
      if(!turmaAtual){
        const codigo='T'+new Date().getFullYear()+String(Date.now()).slice(-5);
        const payload={codigo,agenda_id:ev.id||null,empresa:ev.empresa||'',treinamento_id:ev.treinamento_id||null,treinamento:ev.treinamento||'',norma:ev.norma||null,carga_horaria:ev.carga_horaria||null,data_inicio:ev.data_inicio,data_fim:ev.data_fim,instrutor:ev.instrutor||'',habilitacao_instrutor:document.getElementById('turHabilitacao').value.trim()||null,registro_instrutor:document.getElementById('turRegistro').value.trim()||null,status:'Aberta',atualizado_em:agora};
        const resp=await supabaseFetch('turmas',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});turmaAtual=resp?.[0];
      }else{
        await supabaseFetch('turmas?id=eq.'+encodeURIComponent(turmaAtual.id),{method:'PATCH',body:JSON.stringify({habilitacao_instrutor:document.getElementById('turHabilitacao').value.trim()||null,registro_instrutor:document.getElementById('turRegistro').value.trim()||null,atualizado_em:agora})});
        await supabaseFetch('turma_participantes?turma_id=eq.'+encodeURIComponent(turmaAtual.id),{method:'DELETE'});
      }
      const linhas=participantes.map(p=>({turma_id:turmaAtual.id,pessoa_id:p.pessoaId||null,nome:p.nome,cpf:limparCPF(p.cpf)}));
      await supabaseFetch('turma_participantes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(linhas)});
      await supabaseFetch('agenda?'+(ev.id?'id=eq.'+encodeURIComponent(ev.id):'codigo=eq.'+encodeURIComponent(ev.codigo)),{method:'PATCH',body:JSON.stringify({id_turma:turmaAtual.id,etapa:2,atualizado_em:agora})});
      ev.id_turma=turmaAtual.id;ev.etapa=2;document.getElementById('turCodigo').value=turmaAtual.codigo||'';document.getElementById('turStatus').textContent='Turma salva com sucesso.';alert('Turma salva com sucesso.');
    }catch(e){alert('Erro ao salvar turma: '+e.message);}
  }

  async function importarParticipantes(){
    const botao=document.getElementById('btnImportarParticipantes');
    const resumo=document.getElementById('turResumoImportacao');
    const linhas=document.getElementById('turImportacao').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!linhas.length){alert('Cole pelo menos um participante para importar.');return;}
    botao.disabled=true;botao.textContent='Importando...';
    let novos=0,existentes=0,divergencias=0,jaNaTurma=0,erros=[];
    for(let n=0;n<linhas.length;n++){
      const partes=linhas[n].split(/[;\t,]/);
      if(partes.length<2){erros.push('Linha '+(n+1)+': formato inválido');continue;}
      const nome=normalizarNome(partes[0]);const cpf=limparCPF(partes[1]);
      try{
        if(!validarCPF(cpf))throw new Error('CPF inválido');
        const info=await localizarOuCriarPessoa(nome,cpf);
        if(info.existente)existentes++; else novos++;
        if(info.divergente)divergencias++;
        const indiceExistente=participantes.findIndex(p=>limparCPF(p.cpf)===cpf);
        const novoRegistro={nome,cpf:formatarCPF(cpf),pessoaId:info.pessoaId,nomeCadastro:info.nomeCadastro,divergente:info.divergente};
        if(indiceExistente>=0){participantes[indiceExistente]=novoRegistro;jaNaTurma++;}else{participantes.push(novoRegistro);}
      }catch(e){erros.push('Linha '+(n+1)+': '+e.message);}
    }
    atualizarTabela();
    document.getElementById('turImportacao').value='';
    resumo.textContent=`Importação concluída: ${novos} novo(s) cadastro(s), ${existentes} já existente(s), ${divergencias} divergência(s), ${jaNaTurma} já estava(m) na turma.`+(erros.length?' Erros: '+erros.join(' | '):'');
    botao.disabled=false;botao.textContent='📥 Importar participantes';
  }

  window.renderTurmasGithub=async function(){
    const area=document.getElementById('conteudoPrincipal');area.innerHTML=htmlTurmas();participantes=[];turmaAtual=null;indiceEditando=-1;atualizarTabela();preencherAgendaSelecionada();
    document.getElementById('turCPF').oninput=e=>{e.target.value=formatarCPF(e.target.value);};
    document.getElementById('btnAddParticipante').onclick=async()=>{try{await adicionarOuEditarParticipante(document.getElementById('turNome').value,document.getElementById('turCPF').value,true);document.getElementById('turNome').value='';document.getElementById('turCPF').value='';}catch(e){alert(e.message);}};
    document.getElementById('btnImportarParticipantes').onclick=importarParticipantes;
    document.getElementById('btnSalvarTurma').onclick=salvarTurma;
    if(configurado()){try{await carregarTurmaExistente();}catch(e){document.getElementById('turStatus').textContent='Erro ao carregar turma: '+e.message;}}
  };
})();