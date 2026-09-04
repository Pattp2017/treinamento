(() => {
  function cfg(){ return window.SUPABASE_CONFIG || {}; }
  function configurado(){ return Boolean(cfg().url && cfg().anonKey); }
  async function supabaseFetch(path){
    if(!configurado()) throw new Error('Supabase ainda não configurado.');
    const base=cfg().url.replace(/\/$/,'');
    const r=await fetch(base+'/rest/v1/'+path,{headers:{apikey:cfg().anonKey,Authorization:'Bearer '+cfg().anonKey,Accept:'application/json'}});
    const t=await r.text();
    if(!r.ok) throw new Error(t||('HTTP '+r.status));
    return t?JSON.parse(t):null;
  }

  function substituirPorSelect(id, itens, valorAtual, vazio='Selecione...'){
    const atual=document.getElementById(id);
    if(!atual) return null;
    const select=document.createElement('select');
    select.id=id;
    select.innerHTML=`<option value="">${vazio}</option>`;
    itens.forEach(item=>{
      const o=document.createElement('option');
      o.value=item.nome;
      o.textContent=item.nome;
      o.dataset.id=item.id;
      select.appendChild(o);
    });
    if(valorAtual && !itens.some(i=>i.nome===valorAtual)){
      const o=document.createElement('option');
      o.value=valorAtual;
      o.textContent=valorAtual+' (cadastro antigo)';
      select.appendChild(o);
    }
    select.value=valorAtual||'';
    atual.replaceWith(select);
    return select;
  }

  async function carregarOpcoesAgenda(){
    const [empresas, pessoas, instrutores] = await Promise.all([
      supabaseFetch('empresas?select=id,nome&ativo=eq.true&order=nome.asc'),
      supabaseFetch('pessoas?select=id,nome&ativo=eq.true&instrutor=eq.true&order=nome.asc'),
      supabaseFetch('instrutores?select=id,pessoa_id&ativo=eq.true')
    ]);

    const pessoasPorId=new Map((pessoas||[]).map(p=>[String(p.id),p]));
    const instrutoresAtivos=(instrutores||[])
      .map(i=>{const p=pessoasPorId.get(String(i.pessoa_id));return p?{id:i.id,nome:p.nome}:null;})
      .filter(Boolean)
      .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));

    const campoEmpresa=document.getElementById('agEmpresa');
    const campoInstrutor=document.getElementById('agInstrutor');
    const valorEmpresa=campoEmpresa?.value||'';
    const valorInstrutor=campoInstrutor?.value||'';

    substituirPorSelect('agEmpresa', empresas||[], valorEmpresa, 'Selecione a empresa/fazenda...');
    substituirPorSelect('agInstrutor', instrutoresAtivos, valorInstrutor, 'Selecione o instrutor...');
  }

  function aplicarPatch(){
    if(typeof window.renderAgendaGithub!=='function') return false;
    if(window.renderAgendaGithub.__cadastrosIntegrados) return true;
    const original=window.renderAgendaGithub;
    const envolvida=async function(){
      await original.apply(this,arguments);
      try{ await carregarOpcoesAgenda(); }
      catch(e){
        const aviso=document.getElementById('avisoAgenda');
        if(aviso) aviso.textContent='Não foi possível carregar empresas/instrutores cadastrados: '+e.message;
      }
    };
    envolvida.__cadastrosIntegrados=true;
    window.renderAgendaGithub=envolvida;
    return true;
  }

  if(!aplicarPatch()){
    window.addEventListener('load',()=>aplicarPatch(),{once:true});
  }
})();