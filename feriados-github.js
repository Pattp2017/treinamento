(() => {
  let feriados=[], carregado=false;
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  async function api(path='',options={}) {
    const c=window.SUPABASE_CONFIG||{};
    if(!c.url||!c.anonKey)throw new Error('Supabase ainda não configurado.');
    const r=await fetch(c.url.replace(/\/$/,'')+'/rest/v1/treinamento_feriados'+path,{...options,headers:{apikey:c.anonKey,Authorization:'Bearer '+c.anonKey,'Content-Type':'application/json',Prefer:'return=minimal'}});
    if(!r.ok)throw new Error('Não foi possível acessar os feriados. Execute a migração 016 no Supabase. '+await r.text());
    const t=await r.text();return t?JSON.parse(t):null;
  }
  async function carregar(){carregado=false;feriados=await api('?select=id,data,nome&order=data.asc')||[];carregado=true;}
  function nome(data){return feriados.find(f=>f.data===data)?.nome||'';}
  function diaUtil(d){return d.getDay()!==0&&d.getDay()!==6&&!nome(iso(d));}
  function proximo(d){if(!carregado)throw new Error('Aguarde o carregamento dos feriados.');while(!diaUtil(d))d.setDate(d.getDate()+1);return d;}
  async function abrirCadastro(){
    document.getElementById('modalFeriados')?.remove();
    const modal=document.createElement('div');modal.id='modalFeriados';modal.className='modal';
    modal.innerHTML=`<div class="modal-box"><h3>Feriados</h3><p>Cadastre cada data em que não haverá treinamento. Os feriados cadastrados valem para toda a agenda. Para outros anos, cadastre as respectivas datas.</p><form id="formFeriado"><div class="grid-form"><label>Data<input id="feriadoData" type="date" required></label><label>Nome do feriado<input id="feriadoNome" maxlength="120" required></label></div><button class="btn primario" type="submit">Cadastrar feriado</button></form><p id="feriadoStatus" role="status"></p><div id="feriadosLista" style="max-height:35vh;overflow:auto"></div><p>Agendamentos atuais e futuros serão recalculados ao abrir a agenda. Documentos já gerados precisam ser gerados novamente.</p><div class="acoes"><button class="btn" id="fecharFeriados">Fechar</button></div></div>`;
    document.body.appendChild(modal);
    const $=id=>modal.querySelector('#'+id);
    function listar(){
      $('feriadosLista').replaceChildren();
      if(!feriados.length)$('feriadosLista').textContent='Nenhum feriado cadastrado.';
      for(const f of feriados){
        const row=document.createElement('div');row.style='display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #ddd';
        const label=document.createElement('span');label.textContent=f.data.split('-').reverse().join('/')+' — '+f.nome;
        const b=document.createElement('button');b.className='btn';b.textContent='Excluir';
        b.onclick=async()=>{if(!confirm('Excluir o feriado '+f.nome+'?'))return;b.disabled=true;try{await api('?id=eq.'+encodeURIComponent(f.id),{method:'DELETE'});await carregar();listar();window.dispatchEvent(new Event('feriadosAtualizados'));}catch(e){$('feriadoStatus').textContent=e.message;}finally{b.disabled=false;}};
        row.append(label,b);$('feriadosLista').append(row);
      }
    }
    $('fecharFeriados').onclick=()=>modal.remove();
    $('formFeriado').onsubmit=async e=>{
      e.preventDefault();const data=$('feriadoData').value,nome=$('feriadoNome').value.trim();if(!data||!nome)return;
      const botao=e.submitter||$('formFeriado').querySelector('button');botao.disabled=true;
      try{await api('',{method:'POST',body:JSON.stringify({data,nome})});await carregar();listar();$('formFeriado').reset();$('feriadoStatus').textContent='Feriado cadastrado.';window.dispatchEvent(new Event('feriadosAtualizados'));}
      catch(err){$('feriadoStatus').textContent=err.message;}finally{botao.disabled=false;}
    };
    try{await carregar();listar();}catch(e){$('feriadoStatus').textContent=e.message;}
  }
  window.FeriadosTreinamento={carregar,nome,diaUtil,proximo,abrirCadastro,get pronto(){return carregado;}};
})();
